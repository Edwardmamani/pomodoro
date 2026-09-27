import { EditorSelection } from "@codemirror/state";

const FONT_WRAP = /^<font\s+color="(#[0-9a-fA-F]{3,8})">([\s\S]*)<\/font>$/i;

/**
 * Aplica o quita color de letra vía <font color="#hex">.
 * @param {import("@codemirror/view").EditorView} view
 * @param {string|null} color — hex (#rgb / #rrggbb). null limpia el color.
 */
export function fontColor(view, color = null) {
  const changes = [];
  const selections = [];

  for (const range of view.state.selection.ranges) {
    const selected = view.state.doc.sliceString(range.from, range.to);
    const wrapped = selected.match(FONT_WRAP);

    if (!color) {
      if (wrapped) {
        changes.push({ from: range.from, to: range.to, insert: wrapped[2] });
        selections.push(
          EditorSelection.range(range.from, range.from + wrapped[2].length)
        );
      } else {
        selections.push(EditorSelection.range(range.from, range.to));
      }
      continue;
    }

    const open = `<font color="${color}">`;
    const close = "</font>";

    if (wrapped) {
      if (wrapped[1].toLowerCase() === color.toLowerCase()) {
        changes.push({ from: range.from, to: range.to, insert: wrapped[2] });
        selections.push(
          EditorSelection.range(range.from, range.from + wrapped[2].length)
        );
      } else {
        const insert = open + wrapped[2] + close;
        changes.push({ from: range.from, to: range.to, insert });
        selections.push(
          EditorSelection.range(
            range.from + open.length,
            range.from + open.length + wrapped[2].length
          )
        );
      }
    } else if (range.empty) {
      changes.push({ from: range.from, insert: open + close });
      selections.push(EditorSelection.cursor(range.from + open.length));
    } else {
      changes.push({
        from: range.from,
        to: range.to,
        insert: open + selected + close,
      });
      selections.push(
        EditorSelection.range(
          range.from + open.length,
          range.from + open.length + selected.length
        )
      );
    }
  }

  if (!changes.length) {
    view.focus();
    return;
  }

  view.dispatch({
    changes,
    selection: EditorSelection.create(selections),
    userEvent: "input",
  });
  view.focus();
}
