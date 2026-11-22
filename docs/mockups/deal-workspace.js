(() => {
  const dock = $("deal-dock");
  const home = dialog.parentElement;
  const starterNotes = [
    "Check the buyer's priorities before scheduling the first call.",
    "Confirm the decision process and who needs to review the scope.",
    "Follow up on the proposal and record any requested changes.",
    "Confirm the remaining terms and the date for a decision.",
    "Send the agreed scope to the delivery team.",
    "Record the buyer's feedback before closing out this opportunity.",
  ];
  const defaultNotes = Object.fromEntries(fixtures.map((fixture, index) => [
    "d" + index, [{ id: "sample-" + index, text: starterNotes[fixture[2]], date: near(-3) }],
  ]));
  defaultNotes.d7 = [
    { id: "warehouse-scope", text: "Theo confirmed that Phase 1 covers the north loading bays. Keep the south bay equipment as an optional item.", date: near(-1) },
    { id: "warehouse-terms", text: "Send revised payment terms before the budget meeting. Include a start date for each phase.", date: near(-3) },
  ];
  state.dealNotes ??= defaultNotes;

  let selectedId = null;
  let returnFocus;
  let nextNoteId = 0;
  const notesFor = (id) => state.dealNotes[id] ?? [];
  const noteLabel = (id) => {
    const count = notesFor(id).length;
    return count + (count === 1 ? " note" : " notes");
  };
  const noteCount = (id) => '<p class="note-count">' + noteLabel(id) + '</p>';
  const selectedCard = () => $("board").querySelector('[data-id="' + selectedId + '"]');
  const focusTitle = () => $("dialog-title").focus({ preventScroll: true });
  const focusNotes = () => $("deal-notes-title").focus({ preventScroll: true });

  function summaryFields(deal) {
    return '<div><dt>Value</dt><dd class="numbers">' + money(deal.value) +
      '</dd></div><div><dt>Probability</dt><dd class="numbers">' + deal.probability + '%</dd></div>' +
      '<div><dt>' + (deal.stage < 4 ? "Expected close" : "Actual close") + '</dt><dd>' + closeDate(deal) + '</dd></div>';
  }

  function syncBoard() {
    const previous = $("board").querySelector(".is-selected-deal");
    previous?.classList.remove("is-selected-deal");
    previous?.querySelector(".deal-title").removeAttribute("aria-current");
    if (dock.hidden || !selectedId) return;
    const card = selectedCard();
    if (!card) return;
    card.classList.add("is-selected-deal");
    card.querySelector(".deal-title").setAttribute("aria-current", "true");
    const deal = dealById(selectedId);
    dialog.querySelector(".deal-window-stage").innerHTML = statusBadge(stages[deal.stage].name);
    dialog.querySelector(".deal-summary").innerHTML = summaryFields(deal);
    dialog.querySelector(".deal-history").innerHTML = renderTimeline("deal", selectedId);
  }

  function close(restoreFocus = false) {
    if (!selectedId) return;
    const target = dock.hidden ? returnFocus : selectedCard()?.querySelector(".deal-title");
    selectedId = null;
    returnFocus = null;
    if (dialog.open) dialog.close();
    if (dialog.parentElement === dock) home.append(dialog);
    dock.hidden = true;
    dialog.classList.remove("deal-window", "deal-window-docked");
    syncBoard();
    if (restoreFocus && target?.isConnected) target.focus({ preventScroll: true });
  }

  function dockDeal() {
    if (dialog.parentElement !== dock) {
      if (dialog.open) dialog.close();
      dock.append(dialog);
      dock.hidden = false;
      dialog.classList.add("deal-window-docked");
    }
    if (!dialog.open) dialog.show();
    dialog.querySelector("[data-show-in-pipeline]").hidden = true;
    syncBoard();
    selectedCard()?.scrollIntoView({ block: "nearest", inline: "nearest" });
    focusTitle();
    $("move-status").textContent = dealById(selectedId).name + " is in " + stages[dealById(selectedId).stage].name + ".";
  }

  function open(deal) {
    const current = document.activeElement;
    close();
    if (dialog.open) dialog.close();
    selectedId = deal.id;
    returnFocus = current;
    dialog.classList.add("deal-window");
    dialog.innerHTML = '<div class="deal-window-content"><header class="deal-window-header"><div>' +
      '<p class="deal-window-stage">' + statusBadge(stages[deal.stage].name) + '</p>' +
      '<h2 id="dialog-title" tabindex="-1">' + escape(deal.name) + '</h2></div>' +
      '<button type="button" class="icon-button" data-workspace-close aria-label="Close deal details">×</button></header>' +
      '<dl class="deal-summary">' + summaryFields(deal) + '</dl>' +
      '<dl class="deal-links"><div><dt>Organization</dt><dd>' + linkedName("organizations", deal.organization) +
      '</dd></div><div><dt>Main contact</dt><dd>' + linkedName("contacts", deal.contact) + '</dd></div></dl>' +
      '<button type="button" class="button pipeline-jump" data-show-in-pipeline>Show in pipeline <span aria-hidden="true">↗</span></button>' +
      '<section class="deal-notes" aria-labelledby="deal-notes-title"><div class="note-header">' +
      '<h3 id="deal-notes-title" tabindex="-1">Notes</h3><button type="button" class="button subtle" data-edit-note="">+ Add note</button></div>' +
      '<div id="note-list"></div><div id="note-editor"></div><p id="note-feedback" class="sr-only" role="status"></p></section>' +
      '<div class="deal-history">' + renderTimeline("deal", deal.id) + '</div></div>';
    renderNotes();
    if (location.hash === "#pipeline") {
      dockDeal();
    } else {
      dialog.showModal();
      focusTitle();
    }
  }

  function renderNotes() {
    const notes = notesFor(selectedId);
    $("note-list").innerHTML = notes.length ? notes.map((note) =>
      '<article class="deal-note"><p class="note-text">' + escape(note.text) + '</p>' +
      '<div class="note-meta"><time datetime="' + note.date + '">' + shortDate(note.date) + '</time>' +
      '<div class="note-actions"><button type="button" class="text-link" data-edit-note="' + note.id + '">Edit</button>' +
      '<button type="button" class="text-link note-remove" data-remove-note="' + note.id + '">Remove</button></div></div></article>'
    ).join("") : '<p class="muted">No notes yet</p>';
    const cardCount = selectedCard()?.querySelector(".note-count");
    if (cardCount) cardCount.textContent = noteLabel(selectedId);
  }

  function editNote(id) {
    const dealId = selectedId;
    const notes = notesFor(dealId);
    const note = notes.find((item) => item.id === id);
    $("note-editor").innerHTML = '<form class="note-form"><label>' + (note ? "Edit note" : "New note") +
      '<textarea name="note" required maxlength="1000" rows="3">' + escape(note?.text ?? "") + '</textarea></label>' +
      '<div class="dialog-actions"><button type="button" class="button subtle" data-cancel-note>Cancel</button>' +
      '<button type="submit" class="button">Save note</button></div></form>';
    const form = $("note-editor").querySelector("form");
    const textarea = form.elements.note;
    textarea.addEventListener("input", () => textarea.setCustomValidity(""));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = textarea.value.trim();
      if (!text) {
        textarea.setCustomValidity("Enter a note.");
        textarea.reportValidity();
        return;
      }
      const replacement = { id: note?.id ?? "note-" + Date.now() + "-" + nextNoteId++, text, date: near(0) };
      state.dealNotes[dealId] = note ? notes.map((item) => item.id === id ? replacement : item) : [replacement, ...notes];
      save();
      $("note-editor").replaceChildren();
      renderNotes();
      focusNotes();
      $("note-feedback").textContent = "Note saved.";
    });
    textarea.focus();
  }

  function confirmRemoval(id) {
    $("note-editor").innerHTML = '<div class="note-form" role="group" aria-label="Remove note">' +
      '<p>Remove this note from the deal?</p><div class="dialog-actions">' +
      '<button type="button" class="button subtle" data-cancel-note>Cancel</button>' +
      '<button type="button" class="button danger" data-confirm-note="' + id + '">Remove note</button></div></div>';
    $("note-editor").querySelector("[data-cancel-note]").focus();
  }

  dialog.addEventListener("click", (event) => {
    if (!selectedId) return;
    const button = event.target.closest("button");
    if (!button) return;
    const data = button.dataset;
    if (data.workspaceClose !== undefined) close(true);
    if (data.showInPipeline !== undefined) location.hash = "pipeline";
    if (data.editNote !== undefined) editNote(data.editNote);
    if (data.removeNote) confirmRemoval(data.removeNote);
    if (data.confirmNote) {
      state.dealNotes[selectedId] = notesFor(selectedId).filter((note) => note.id !== data.confirmNote);
      save();
      renderNotes();
      $("note-feedback").textContent = "Note removed.";
    }
    if (data.cancelNote !== undefined || data.confirmNote) {
      $("note-editor").replaceChildren();
      focusNotes();
    }
  });

  dialog.addEventListener("close", () => {
    if (!dialog.open) close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dock.hidden) {
      event.preventDefault();
      close(true);
    }
  });

  dealWorkspace = {
    open,
    close,
    syncBoard,
    noteCount,
    routeChanged(section) {
      if (!selectedId) return;
      if (section === "pipeline") dockDeal();
      else close();
    },
  };
  renderBoard();
})();
