import argparse
import sys

from sqlalchemy.exc import SQLAlchemyError

from backend.db import Problem, Store
from backend.services.backups import replace, save_backup


def main():
    parser = argparse.ArgumentParser(description="Manage Accountable data on this computer.")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("save")
    commands.add_parser("load").add_argument("backup_id")
    commands.add_parser("seed")
    args = parser.parse_args()
    if args.command == "seed":
        print(
            "Reset active records and Trash to sample data? A full backup is saved first. Type yes to reset."
        )
        if sys.stdin.readline().strip().lower() != "yes":
            print("Reset cancelled.")
            return 0
    try:
        store = Store()
        if args.command == "save":
            backup = save_backup(store)
        else:
            identifier = args.backup_id if args.command == "load" else None
            backup = replace(store, identifier)
            print("Loaded " + identifier if identifier else "Restored sample data.")
        print(f"Saved {backup['id']} at {backup['path']}")
        return 0
    except (Problem, OSError, SQLAlchemyError) as exc:
        print(f"Data command failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
