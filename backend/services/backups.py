import hashlib
import json
import os
import re
import tempfile
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import Boolean, Integer, delete, insert, select, update
from sqlalchemy.exc import IntegrityError

from backend.db import OPEN, STAGES, TABLES, Problem, Store, now, state, tickets, uid
from backend.seed import sample

FORMAT = 1
ID_PATTERN = re.compile(r"backup-[0-9a-f]{32}")


def snapshot(conn):
    return {
        table.name: [dict(r) for r in conn.execute(select(table).order_by(table.c.id)).mappings()]
        for table in Store.data_tables
    }


def digest(data):
    encoded = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    return hashlib.sha256(encoded).hexdigest()


def path_for(store, identifier):
    if not isinstance(identifier, str) or not ID_PATTERN.fullmatch(identifier):
        raise Problem("Select an Accountable backup.", 404)
    path = store.backups / (identifier + ".json")
    if path.is_symlink():
        raise Problem("Select a regular backup file.", 404)
    return path


def publish(store, data):
    identifier = "backup-" + uid().replace("-", "")
    path = path_for(store, identifier)
    created = now()
    document = {
        "format": FORMAT,
        "id": identifier,
        "created_at": created,
        "checksum": digest(data),
        "data": data,
    }
    store.backups.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            dir=store.backups, mode="w", encoding="utf-8", delete=False, suffix=".tmp"
        ) as file:
            temporary = Path(file.name)
            json.dump(document, file, ensure_ascii=False)
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary, path)
    finally:
        if temporary:
            temporary.unlink(missing_ok=True)
    return {"id": identifier, "path": str(path.resolve()), "created_at": created}


def validate(data):
    if not isinstance(data, dict) or set(data) != {t.name for t in Store.data_tables}:
        raise ValueError
    indexed = {}
    used = set()
    for table in Store.data_tables:
        rows = data[table.name]
        if not isinstance(rows, list):
            raise ValueError
        index = {}
        for row in rows:
            if not isinstance(row, dict) or set(row) != set(table.c.keys()):
                raise ValueError
            for column in table.c:
                value = row[column.name]
                if value is None and column.nullable:
                    continue
                typ = (
                    bool
                    if isinstance(column.type, Boolean)
                    else int
                    if isinstance(column.type, Integer)
                    else str
                )
                if type(value) is not typ:
                    raise ValueError
                if (
                    column.name.endswith("_at")
                    and datetime.fromisoformat(value).utcoffset() is None
                ):
                    raise ValueError
            identifier = row["id"]
            if (
                not identifier
                or identifier in index
                or (table.name in TABLES and identifier in used)
            ):
                raise ValueError
            if table.name in TABLES:
                used.add(identifier)
                if bool(row["deleted_at"]) != bool(row["deletion"]):
                    raise ValueError
                if not (row.get("name") or row.get("description") or "").strip():
                    raise ValueError
            index[identifier] = row
        indexed[table.name] = index
    for table in Store.data_tables:
        for row in data[table.name]:
            for fk in table.foreign_keys:
                identifier = row[fk.parent.name]
                if identifier is None:
                    continue
                owner = indexed[fk.column.table.name].get(identifier)
                if owner is None or (
                    table.name in TABLES and not row["deleted_at"] and owner["deleted_at"]
                ):
                    raise ValueError
    for row in data["contacts"]:
        if row["status"] not in ("Lead", "Qualified", "Customer"):
            raise ValueError
    for row in data["deals"]:
        if (
            row["stage"] not in STAGES
            or row["initial_stage"] not in STAGES
            or not 0 <= row["probability"] <= 100
            or row["value_cents"] < 0
            or row["position"] < 0
            or not (row["contact_id"] or row["organization_id"])
        ):
            raise ValueError
        if row["stage"] in OPEN:
            if row["actual_date"] or not row["expected_date"]:
                raise ValueError
        elif not row["actual_date"]:
            raise ValueError
        for key in ("actual_date", "expected_date"):
            if row[key] and date.fromisoformat(row[key]).isoformat() != row[key]:
                raise ValueError
    for row in data["activities"]:
        if bool(row["deal_id"]) == bool(row["contact_id"]) or row["type"] not in (
            "Note",
            "Call",
            "Email",
        ):
            raise ValueError
        if row["follow_up"]:
            date.fromisoformat(row["follow_up"])
    for row in data["events"]:
        if not row["deal_id"] or row["previous"] not in STAGES or row["stage"] not in STAGES:
            raise ValueError
    for row in data["detached"]:
        if not row["organization_id"] or bool(row["deal_id"]) == bool(row["contact_id"]):
            raise ValueError


def read_document(store, identifier):
    path = path_for(store, identifier)
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
        if (
            obj["format"] != FORMAT
            or obj["id"] != identifier
            or obj["checksum"] != digest(obj["data"])
        ):
            raise ValueError
        datetime.fromisoformat(obj["created_at"])
        validate(obj["data"])
        return obj
    except FileNotFoundError as exc:
        raise Problem("Backup not found.", 404) from exc
    except (KeyError, TypeError, ValueError) as exc:
        raise Problem("Invalid or damaged Accountable backup.") from exc


def read_backup(store, identifier):
    return read_document(store, identifier)["data"]


def list_backups(store):
    result = []
    for path in store.backups.glob("backup-*.json"):
        try:
            doc = read_document(store, path.stem)
            result.append({"id": doc["id"], "created_at": doc["created_at"]})
        except Problem:
            continue
    return sorted(result, key=lambda r: r["created_at"], reverse=True)


def save_backup(store):
    with store.write(advance=False) as conn:
        return publish(store, snapshot(conn))


def clear_data(conn):
    for table in reversed(Store.data_tables):
        conn.execute(delete(table))


def replace(store, identifier=None):
    with store.write() as conn:
        data = read_backup(store, identifier) if identifier is not None else None
        backup = publish(store, snapshot(conn))
        clear_data(conn)
        if data is None:
            sample(conn)
        else:
            try:
                for table in Store.data_tables:
                    if data[table.name]:
                        conn.execute(insert(table), data[table.name])
            except IntegrityError as exc:
                raise Problem("Invalid record links in the backup.") from exc
        conn.execute(delete(tickets))
        conn.execute(update(state).values(dataset=state.c.dataset + 1))
        return backup


def confirm(store, conn, identifier):
    read_document(store, identifier)
    token = uid()
    conn.execute(insert(tickets).values(id=token, backup=identifier))
    return {"token": token}


def finish(store, conn, identifier, token, cancel=False):
    matched = conn.execute(
        delete(tickets).where(tickets.c.id == token, tickets.c.backup == identifier)
    )
    if matched.rowcount != 1:
        raise Problem("Start both confirmations for this backup again.", 409)
    if not cancel:
        read_document(store, identifier)
        path_for(store, identifier).unlink()
        conn.execute(delete(tickets).where(tickets.c.backup == identifier))
    return {"ok": True}
