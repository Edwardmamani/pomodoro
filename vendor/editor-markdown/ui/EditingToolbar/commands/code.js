import { EditorSelection } from "@codemirror/state";
import { wrapSelection } from "./_helpers.js";

/**
 * Sin selección / una línea → código en línea `…`.
 * Varias líneas → bloque fenced ```…```.
 */
export function code(view) {
  const range = view.state.selection.main;
  const selected = view.state.doc.sliceString(range.from, range.to);
  const multiline =
    selected.includes("\n") ||
    (!range.empty &&
      view.state.doc.lineAt(range.from).number !==
        view.state.doc.lineAt(range.to).number);

  if (!multiline && !range.empty) {
    wrapSelection(view, "`");
    return;
  }

  if (range.empty) {
    const insert = "```\n\n```";
    view.dispatch({
      changes: { from: range.from, insert },
      selection: EditorSelection.cursor(range.from + 4),
      userEvent: "input",
    });
    view.focus();
    return;
  }

  const insert = "```\n" + selected.replace(/\n$/, "") + "\n```";
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.cursor(range.from + 4),
    userEvent: "input",
  });
  view.focus();
}
