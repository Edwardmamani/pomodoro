import { EditorSelection } from "@codemirror/state";

export function wrapSelection(view, before, after = before) {
  const changes = [];
  const selections = [];

  for (const range of view.state.selection.ranges) {
    const selected = view.state.doc.sliceString(range.from, range.to);
    const openLen = before.length;
    const closeLen = after.length;

    const already =
      selected.startsWith(before) &&
      selected.endsWith(after) &&
      selected.length >= openLen + closeLen;

    if (already) {
      const inner = selected.slice(openLen, selected.length - closeLen);
      changes.push({ from: range.from, to: range.to, insert: inner });
      selections.push(
        EditorSelection.range(range.from, range.from + inner.length)
      );
    } else if (range.empty) {
      changes.push({ from: range.from, insert: before + after });
      selections.push(EditorSelection.cursor(range.from + openLen));
    } else {
      changes.push({
        from: range.from,
        to: range.to,
        insert: before + selected + after,
      });
      selections.push(
        EditorSelection.range(
          range.from + openLen,
          range.from + openLen + selected.length
        )
      );
    }
  }

  view.dispatch({
    changes,
    selection: EditorSelection.create(selections),
    userEvent: "input",
  });
  view.focus();
}

export function toggleLinePrefix(view, prefix) {
  const changes = [];
  const seen = new Set();

  for (const range of view.state.selection.ranges) {
    const start = view.state.doc.lineAt(range.from).number;
    const end = view.state.doc.lineAt(range.to).number;

    for (let n = start; n <= end; n++) {
      if (seen.has(n)) continue;
      seen.add(n);
      const line = view.state.doc.line(n);
      const text = line.text;

      if (text.startsWith(prefix)) {
        changes.push({
          from: line.from,
          to: line.from + prefix.length,
          insert: "",
        });
      } else {
        const stripped = text.replace(
          /^(#{1,6}\s+|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+|>\s+)/,
          ""
        );
        changes.push({
          from: line.from,
          to: line.to,
          insert: prefix + stripped,
        });
      }
    }
  }

  view.dispatch({ changes, userEvent: "input" });
  view.focus();
}

export function insertAtCursor(view, insert, selectFromOffset, selectLen) {
  const range = view.state.selection.main;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.range(
      range.from + selectFromOffset,
      range.from + selectFromOffset + selectLen
    ),
    userEvent: "input",
  });
  view.focus();
}

/**
 * Envuelve o desenvuelve con etiquetas HTML asimétricas (<u>, <font>, …).
 * Si `matchWrapped` encuentra un envoltorio existente, lo reemplaza por el grupo 1.
 * @param {(selected: string) => string|null} [matchWrapped]
 */
export function wrapHtml(view, open, close, matchWrapped) {
  const changes = [];
  const selections = [];

  for (const range of view.state.selection.ranges) {
    const selected = view.state.doc.sliceString(range.from, range.to);
    const unwrapped = matchWrapped?.(selected) ?? null;

    if (unwrapped !== null) {
      changes.push({ from: range.from, to: range.to, insert: unwrapped });
      selections.push(
        EditorSelection.range(range.from, range.from + unwrapped.length)
      );
      continue;
    }

    if (
      selected.startsWith(open) &&
      selected.endsWith(close) &&
      selected.length >= open.length + close.length
    ) {
      const inner = selected.slice(open.length, selected.length - close.length);
      changes.push({ from: range.from, to: range.to, insert: inner });
      selections.push(
        EditorSelection.range(range.from, range.from + inner.length)
      );
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

  view.dispatch({
    changes,
    selection: EditorSelection.create(selections),
    userEvent: "input",
  });
  view.focus();
}
