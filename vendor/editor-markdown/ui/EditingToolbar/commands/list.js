import { EditorSelection } from "@codemirror/state";
import { toggleLinePrefix } from "./_helpers.js";

const STRIP_PREFIX =
  /^(#{1,6}\s+|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+|>\s+)/;

const LIST_TYPES = {
  bullet: "- ",
  checklist: "- [ ] ",
};

/**
 * Alterna lista en las líneas seleccionadas.
 * @param {import("@codemirror/view").EditorView} view
 * @param {"bullet"|"numbered"|"checklist"} [type="bullet"]
 */
export function list(view, type = "bullet") {
  if (type === "numbered") {
    toggleNumberedList(view);
    return;
  }
  if (type === "checklist") {
    toggleChecklist(view);
    return;
  }
  toggleLinePrefix(view, LIST_TYPES.bullet);
}

function forSelectedLines(view, apply) {
  const changes = [];
  const selections = [];
  const seen = new Set();

  for (const range of view.state.selection.ranges) {
    const start = view.state.doc.lineAt(range.from).number;
    const end = view.state.doc.lineAt(range.to).number;
    const lines = [];

    for (let n = start; n <= end; n++) {
      if (seen.has(n)) continue;
      seen.add(n);
      lines.push(view.state.doc.line(n));
    }

    apply(lines, changes, selections);
  }

  const spec = { changes, userEvent: "input" };
  if (selections.length > 0) {
    spec.selection = EditorSelection.create(selections);
  }
  view.dispatch(spec);
  view.focus();
}

function toggleChecklist(view) {
  forSelectedLines(view, (lines, changes, selections) => {
    const allChecklist = lines.every((line) =>
      /^[-*+]\s+\[[ xX]\]\s+/.test(line.text)
    );

    for (const line of lines) {
      if (allChecklist) {
        const match = line.text.match(/^[-*+]\s+\[[ xX]\]\s+/);
        if (!match) continue;
        changes.push({
          from: line.from,
          to: line.from + match[0].length,
          insert: "",
        });
        selections.push(EditorSelection.cursor(line.from));
      } else {
        const stripped = line.text.replace(STRIP_PREFIX, "");
        const insert = `- [ ] ${stripped}`;
        changes.push({
          from: line.from,
          to: line.to,
          insert,
        });
        // Cursor al final del texto (después del prefijo oculto por el widget).
        selections.push(EditorSelection.cursor(line.from + insert.length));
      }
    }
  });
}

function toggleNumberedList(view) {
  forSelectedLines(view, (lines, changes, selections) => {
    const allNumbered = lines.every((line) => /^\d+\.\s+/.test(line.text));

    lines.forEach((line, i) => {
      if (allNumbered) {
        const match = line.text.match(/^\d+\.\s+/);
        if (!match) return;
        changes.push({
          from: line.from,
          to: line.from + match[0].length,
          insert: "",
        });
        selections.push(EditorSelection.cursor(line.from));
      } else {
        const stripped = line.text.replace(STRIP_PREFIX, "");
        const insert = `${i + 1}. ${stripped}`;
        changes.push({
          from: line.from,
          to: line.to,
          insert,
        });
        selections.push(EditorSelection.cursor(line.from + insert.length));
      }
    });
  });
}
