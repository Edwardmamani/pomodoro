import { insertAtCursor } from "./_helpers.js";

export function link(view) {
  const range = view.state.selection.main;
  const selected = view.state.doc.sliceString(range.from, range.to) || "texto";
  const insert = `[${selected}](url)`;
  insertAtCursor(view, insert, selected.length + 3, 3);
}
