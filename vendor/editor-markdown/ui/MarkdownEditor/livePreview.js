import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
} from "@codemirror/view";
import {
  EditorSelection,
  EditorState,
  Facet,
  Prec,
  StateEffect,
  StateField,
} from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { LangLabelWidget, readFencedCode } from "./codeBlockWidget.js";
import { highlightTokens } from "./hljsSetup.js";

/** Prefijo GFM de checklist: `- [ ] ` / `- [x] `. */
const TASK_LINE_PREFIX = /^([-*+]\s+\[[ xX]\]\s+)/;

/** Ruta absoluta del .md abierto (para resolver assets/). */
export const documentPathFacet = Facet.define({
  combine: (values) => values[values.length - 1] ?? null,
});

export const setDocumentPath = StateEffect.define();

export const documentPathField = StateField.define({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setDocumentPath)) return effect.value;
    }
    return value;
  },
  provide: (field) => documentPathFacet.from(field),
});

/** Marks/sintaxis a ocultar cuando el cursor no está en el nodo padre. */
const HIDE_MARKS = new Set([
  "HeaderMark",
  "EmphasisMark",
  "StrikethroughMark",
  "CodeMark",
  "CodeInfo",
  "LinkMark",
  "QuoteMark",
  "URL",
]);

/** Nodos de formato: si el cursor está dentro, se revelan sus marcas. */
const FORMAT_PARENTS = new Set([
  "StrongEmphasis",
  "Emphasis",
  "Strikethrough",
  "InlineCode",
  "Link",
  "Image",
  "ATXHeading1",
  "ATXHeading2",
  "ATXHeading3",
  "ATXHeading4",
  "ATXHeading5",
  "ATXHeading6",
  "SetextHeading1",
  "SetextHeading2",
  "Blockquote",
  "FencedCode",
  "HorizontalRule",
]);

const HEADING_CLASS = {
  ATXHeading1: "cm-md-h1",
  ATXHeading2: "cm-md-h2",
  ATXHeading3: "cm-md-h3",
  ATXHeading4: "cm-md-h4",
  ATXHeading5: "cm-md-h5",
  ATXHeading6: "cm-md-h6",
  SetextHeading1: "cm-md-h1",
  SetextHeading2: "cm-md-h2",
};

class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-md-bullet";
    span.textContent = "•";
    span.setAttribute("aria-hidden", "true");
    return span;
  }
  ignoreEvent() {
    return true;
  }
  eq() {
    return true;
  }
}

class TaskCheckboxWidget extends WidgetType {
  /**
   * @param {boolean} checked
   * @param {number} markerFrom — inicio de `[ ]` / `[x]` en el documento
   */
  constructor(checked, markerFrom) {
    super();
    this.checked = checked;
    this.markerFrom = markerFrom;
  }

  eq(other) {
    return (
      other instanceof TaskCheckboxWidget &&
      other.checked === this.checked &&
      other.markerFrom === this.markerFrom
    );
  }

  toDOM(view) {
    const btn = document.createElement("span");
    btn.className = this.checked
      ? "cm-md-task-check checked"
      : "cm-md-task-check";
    btn.setAttribute("aria-checked", this.checked ? "true" : "false");
    btn.setAttribute("role", "checkbox");
    btn.setAttribute("tabindex", "-1");
    btn.title = this.checked ? "Marcar como pendiente" : "Marcar como hecha";

    if (this.checked) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", "M3.5 8.5l3 3 6-6.5");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "2.2");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      svg.appendChild(path);
      btn.appendChild(svg);
    }

    btn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const from = this.markerFrom;
      const next = this.checked ? "[ ]" : "[x]";
      view.dispatch({
        changes: { from, to: from + 3, insert: next },
        userEvent: "input",
      });
    });

    return btn;
  }

  ignoreEvent(event) {
    // El checkbox maneja el clic; CodeMirror no debe mover el cursor ahí.
    return (
      event.type === "mousedown" ||
      event.type === "mouseup" ||
      event.type === "click"
    );
  }
}

function listItemHasTask(listItemNode) {
  for (let c = listItemNode.firstChild; c; c = c.nextSibling) {
    if (c.name === "Task") return true;
  }
  return false;
}

/** Incluye el espacio tras `[ ]` / `[x]` al ocultar el marcador. */
function taskMarkerEnd(state, from, to) {
  if (to < state.doc.length && /\s/.test(state.doc.sliceString(to, to + 1))) {
    return to + 1;
  }
  return to;
}

class RuleWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement("hr");
    hr.className = "cm-md-hr";
    return hr;
  }
  ignoreEvent() {
    return true;
  }
  eq() {
    return true;
  }
}

class ImageWidget extends WidgetType {
  constructor(src, alt, href) {
    super();
    this.src = src;
    this.alt = alt;
    this.href = href;
  }

  eq(other) {
    return (
      other instanceof ImageWidget &&
      other.src === this.src &&
      other.alt === this.alt &&
      other.href === this.href
    );
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "cm-md-image-wrap";
    wrap.title = this.href || this.alt || "";

    if (!this.src) {
      const missing = document.createElement("span");
      missing.className = "cm-md-image-missing";
      missing.textContent = this.alt
        ? `[imagen: ${this.alt}]`
        : "[imagen no encontrada — guarda el .md]";
      wrap.appendChild(missing);
      return wrap;
    }

    const img = document.createElement("img");
    img.className = "cm-md-image";
    img.src = this.src;
    img.alt = this.alt || "";
    img.loading = "lazy";
    img.addEventListener("error", () => {
      const missing = document.createElement("span");
      missing.className = "cm-md-image-missing";
      missing.textContent = `No se pudo cargar: ${this.href || this.alt}`;
      img.replaceWith(missing);
    });
    wrap.appendChild(img);
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

function selectionTouches(state, from, to) {
  for (const range of state.selection.ranges) {
    if (range.from <= to && range.to >= from) return true;
  }
  return false;
}

function findFormatParent(node) {
  for (let cur = node; cur; cur = cur.parent) {
    if (FORMAT_PARENTS.has(cur.name)) return cur;
  }
  return null;
}

/** Amplía el rango oculto para incluir el espacio tras #, > o -. */
function hideEnd(state, from, to, name) {
  if (name === "HeaderMark" || name === "QuoteMark" || name === "ListMark") {
    if (to < state.doc.length && state.doc.sliceString(to, to + 1) === " ") {
      return to + 1;
    }
  }
  return to;
}

function normalizeImageHref(href) {
  let out = href.trim().replace(/^<|>$/g, "");
  if (/%[0-9A-Fa-f]{2}/.test(out)) {
    try {
      out = decodeURIComponent(out);
    } catch {
      /* dejar href tal cual si no es URI válida */
    }
  }
  return out;
}

/**
 * CommonMark corta URLs en el primer espacio: `![alt](a b.png)` queda como
 * Image=`![alt]` + texto `(a b.png)`. Extendemos el rango si hay `(...)` justo después.
 */
function readImageMeta(state, imageNode) {
  let href = "";
  let alt = "";
  let from = imageNode.from;
  let to = imageNode.to;
  const raw = state.doc.sliceString(imageNode.from, imageNode.to);
  const m = raw.match(/^!\[([^\]]*)\]\(([^)]*)\)/);
  if (m) {
    alt = m[1];
    href = normalizeImageHref(m[2]);
  } else {
    const altOnly = raw.match(/^!\[([^\]]*)\]$/);
    if (altOnly) {
      alt = altOnly[1];
      const after = state.doc.sliceString(
        imageNode.to,
        Math.min(imageNode.to + 800, state.doc.length)
      );
      const urlMatch = after.match(/^\(([^)\n]*)\)/);
      if (urlMatch) {
        href = normalizeImageHref(urlMatch[1]);
        to = imageNode.to + urlMatch[0].length;
      }
    }
  }
  return { href, alt, from, to };
}

function resolveSrc(documentPath, href) {
  if (!href) return "";
  if (/^(https?:|data:|blob:|mdmedia:)/i.test(href)) return href;
  if (typeof window !== "undefined" && window.api?.mediaUrl) {
    return window.api.mediaUrl(documentPath, href) || "";
  }
  return href;
}

const INLINE_HTML_PATTERNS = [
  {
    re: /<font\s+color="(#[0-9a-fA-F]{3,8})">([\s\S]*?)<\/font>/gi,
    kind: "font",
  },
  {
    re: /<u>([\s\S]*?)<\/u>/gi,
    kind: "u",
  },
  {
    re: /<mark\s+style="background:\s*(#[0-9a-fA-F]{3,8})\s*">([\s\S]*?)<\/mark>/gi,
    kind: "mark",
  },
];

/** Solo estilos (color/subrayado/fondo). Debe ir con Prec.lowest para quedar por dentro del highlight. */
function decorateInlineHtmlStyles(state, from, to, ranges) {
  const text = state.doc.sliceString(from, to);

  for (const { re, kind } of INLINE_HTML_PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(text)) !== null) {
      const absFrom = from + match.index;
      const absTo = absFrom + match[0].length;

      if (kind === "font") {
        const color = match[1];
        const openLen = match[0].indexOf(">") + 1;
        const contentFrom = absFrom + openLen;
        const contentTo = absTo - "</font>".length;
        if (contentFrom < contentTo) {
          ranges.push(
            Decoration.mark({
              class: "cm-md-font-color",
              attributes: { style: `color: ${color} !important` },
            }).range(contentFrom, contentTo)
          );
        }
      } else if (kind === "u") {
        const contentFrom = absFrom + 3;
        const contentTo = absTo - 4;
        if (contentFrom < contentTo) {
          ranges.push(
            Decoration.mark({ class: "cm-md-underline" }).range(
              contentFrom,
              contentTo
            )
          );
        }
      } else if (kind === "mark") {
        const bg = match[1];
        const openLen = match[0].indexOf(">") + 1;
        const contentFrom = absFrom + openLen;
        const contentTo = absTo - "</mark>".length;
        if (contentFrom < contentTo) {
          ranges.push(
            Decoration.mark({
              class: "cm-md-mark",
              attributes: {
                style: `background-color: ${bg}; color: #000`,
              },
            }).range(contentFrom, contentTo)
          );
        }
      }
    }
  }
}

/** Oculta etiquetas HTML si el cursor no está dentro del span. */
function hideInlineHtmlTags(state, from, to, ranges) {
  const text = state.doc.sliceString(from, to);

  for (const { re, kind } of INLINE_HTML_PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(text)) !== null) {
      const absFrom = from + match.index;
      const absTo = absFrom + match[0].length;
      if (selectionTouches(state, absFrom, absTo)) continue;

      let openLen;
      let closeLen;
      if (kind === "font") {
        openLen = match[0].indexOf(">") + 1;
        closeLen = "</font>".length;
      } else if (kind === "u") {
        openLen = 3;
        closeLen = 4;
      } else {
        openLen = match[0].indexOf(">") + 1;
        closeLen = "</mark>".length;
      }

      const contentFrom = absFrom + openLen;
      const contentTo = absTo - closeLen;
      ranges.push(Decoration.replace({}).range(absFrom, contentFrom));
      ranges.push(Decoration.replace({}).range(contentTo, absTo));
    }
  }
}

function buildHtmlStyleDecorations(view) {
  const ranges = [];
  for (const { from, to } of view.visibleRanges) {
    decorateInlineHtmlStyles(view.state, from, to, ranges);
  }
  return safeDecoSet(ranges);
}

function buildDecorations(view) {
  const ranges = [];
  const { state } = view;
  const documentPath = state.facet(documentPathFacet);

  for (const { from, to } of view.visibleRanges) {
    hideInlineHtmlTags(state, from, to, ranges);

    syntaxTree(state).iterate({
      from,
      to,
      enter(node) {
        const name = node.name;

        if (name === "Image") {
          const { href, alt, from, to: imgTo } = readImageMeta(state, node);
          if (!selectionTouches(state, from, imgTo)) {
            const src = resolveSrc(documentPath, href);
            ranges.push(
              Decoration.replace({
                widget: new ImageWidget(src, alt, href),
              }).range(from, imgTo)
            );
          }
          return false;
        }

        if (HEADING_CLASS[name]) {
          ranges.push(
            Decoration.mark({ class: HEADING_CLASS[name] }).range(
              node.from,
              node.to
            )
          );
        } else if (name === "StrongEmphasis") {
          ranges.push(
            Decoration.mark({ class: "cm-md-strong" }).range(node.from, node.to)
          );
        } else if (name === "Emphasis") {
          ranges.push(
            Decoration.mark({ class: "cm-md-em" }).range(node.from, node.to)
          );
        } else if (name === "Strikethrough") {
          ranges.push(
            Decoration.mark({ class: "cm-md-strike" }).range(node.from, node.to)
          );
        } else if (name === "InlineCode") {
          ranges.push(
            Decoration.mark({ class: "cm-md-inline-code" }).range(
              node.from,
              node.to
            )
          );
        } else if (name === "Link" || name === "Autolink") {
          ranges.push(
            Decoration.mark({ class: "cm-md-link" }).range(node.from, node.to)
          );
        } else if (name === "Blockquote") {
          ranges.push(
            Decoration.mark({ class: "cm-md-quote" }).range(node.from, node.to)
          );
        } else if (name === "FencedCode") {
          // Vista renderizada y modo edición: codeBlockField
          return false;
        } else if (name === "CodeBlock") {
          ranges.push(
            Decoration.mark({ class: "cm-md-codeblock" }).range(
              node.from,
              node.to
            )
          );
        } else if (name === "HorizontalRule") {
          if (!selectionTouches(state, node.from, node.to)) {
            ranges.push(
              Decoration.replace({ widget: new RuleWidget() }).range(
                node.from,
                node.to
              )
            );
          }
        } else if (name === "ListMark") {
          const parent = node.node.parent;
          const text = state.doc.sliceString(node.from, node.to).trim();
          const isTaskItem = parent && listItemHasTask(parent);
          const end = hideEnd(state, node.from, node.to, name);

          // No revelar al enfocar: evita salto de layout y cursor desfasado.
          if (isTaskItem && /^[-*+]$/.test(text)) {
            ranges.push(Decoration.replace({}).range(node.from, end));
          } else if (/^[-*+]$/.test(text)) {
            ranges.push(
              Decoration.replace({ widget: new BulletWidget() }).range(
                node.from,
                end
              )
            );
          }
        } else if (name === "Task") {
          const markerText = state.doc.sliceString(node.from, node.from + 3);
          const checked = /^\[[xX]\]/.test(markerText);
          if (checked) {
            let contentFrom = node.from + 3;
            if (
              contentFrom < node.to &&
              /\s/.test(state.doc.sliceString(contentFrom, contentFrom + 1))
            ) {
              contentFrom += 1;
            }
            if (contentFrom < node.to) {
              ranges.push(
                Decoration.mark({ class: "cm-md-task-done" }).range(
                  contentFrom,
                  node.to
                )
              );
            }
          }
        } else if (name === "TaskMarker") {
          const marker = state.doc.sliceString(node.from, node.to);
          const checked = /^\[[xX]\]$/.test(marker);
          const end = taskMarkerEnd(state, node.from, node.to);
          ranges.push(
            Decoration.replace({
              widget: new TaskCheckboxWidget(checked, node.from),
            }).range(node.from, end)
          );
        }

        if (HIDE_MARKS.has(name)) {
          if (name === "CodeMark" || name === "CodeInfo") {
            const fence = node.node.parent;
            if (fence?.name === "FencedCode") {
              if (!selectionTouches(state, fence.from, fence.to)) {
                ranges.push(Decoration.replace({}).range(node.from, node.to));
              }
              return;
            }
          }

          if (name === "ListMark") return;

          const parent = findFormatParent(node.node) ?? node.node.parent;
          const revealFrom = parent?.from ?? node.from;
          const revealTo = parent?.to ?? node.to;

          if (!selectionTouches(state, revealFrom, revealTo)) {
            const end = hideEnd(state, node.from, node.to, name);
            ranges.push(Decoration.replace({}).range(node.from, end));
          }
        }
      },
    });
  }

  return safeDecoSet(ranges);
}

function safeDecoSet(ranges) {
  try {
    return Decoration.set(ranges, true);
  } catch (err) {
    console.warn("[livePreview] decoraciones en conflicto:", err);
    return Decoration.none;
  }
}

/**
 * Estilos HTML. Prec.highest para que el wrap de <font> envuelva al highlight.
 * El CSS `.cm-md-font-color * { color: inherit !important }` hace que el
 * color del heading no pise el de la fuente.
 */
const htmlStylePlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = buildHtmlStyleDecorations(view);
    }

    update(update) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet
      ) {
        this.decorations = buildHtmlStyleDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = buildDecorations(view);
    }

    update(update) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(setDocumentPath))
        )
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

/** Widgets de bloque (reemplazan saltos de línea) → StateField, no ViewPlugin. */
function pushMarkSplitLines(state, from, to, className, ranges) {
  let pos = from;
  while (pos < to) {
    const line = state.doc.lineAt(pos);
    const end = Math.min(to, line.to);
    if (end > pos) {
      ranges.push(Decoration.mark({ class: className }).range(pos, end));
    }
    if (end >= to) break;
    pos = line.to + 1;
  }
}

/**
 * Bloques de código siempre como líneas reales (caja + hljs).
 * Sin Decoration.replace multilínea: eso rompía ↑/↓ y el caret.
 * Fuera del bloque se ocultan solo los fences (inline) y se muestra la etiqueta.
 */
function decorateFencedCode(state, fenceNode, ranges, editing) {
  const startLine = state.doc.lineAt(fenceNode.from);
  const endLine = state.doc.lineAt(Math.max(fenceNode.to - 1, fenceNode.from));

  for (let n = startLine.number; n <= endLine.number; n++) {
    const line = state.doc.line(n);
    const parts = ["cm-md-code-edit"];
    if (!editing) parts.push("cm-md-code-preview");
    if (startLine.number === endLine.number) {
      parts.push("cm-md-code-edit-alone");
    } else if (n === startLine.number) {
      parts.push("cm-md-code-edit-first");
    } else if (n === endLine.number) {
      parts.push("cm-md-code-edit-last");
    } else {
      parts.push("cm-md-code-edit-mid");
    }
    ranges.push(Decoration.line({ class: parts.join(" ") }).range(line.from));
  }

  const { lang, code, codeFrom } = readFencedCode(state, fenceNode);

  for (let c = fenceNode.firstChild; c; c = c.nextSibling) {
    if (c.name !== "CodeMark" && c.name !== "CodeInfo") continue;
    if (editing) {
      ranges.push(
        Decoration.mark({ class: "cm-md-code-fence" }).range(c.from, c.to)
      );
    } else {
      // Solo el token (sin salto de línea) — seguro para el height map
      ranges.push(Decoration.replace({}).range(c.from, c.to));
    }
  }

  if (!editing && lang) {
    ranges.push(
      Decoration.widget({
        widget: new LangLabelWidget(lang),
        side: 1,
      }).range(startLine.to)
    );
  }

  if (!code || codeFrom == null) return;

  for (const tok of highlightTokens(lang, code)) {
    pushMarkSplitLines(
      state,
      codeFrom + tok.from,
      codeFrom + tok.to,
      tok.className,
      ranges
    );
  }
}

function buildCodeBlockDecorations(state) {
  const ranges = [];
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "FencedCode") return;
      const editing = selectionTouches(state, node.from, node.to);
      decorateFencedCode(state, node.node, ranges, editing);
      return false;
    },
  });
  return safeDecoSet(ranges);
}

const codeBlockField = StateField.define({
  create: (state) => buildCodeBlockDecorations(state),
  update(deco, tr) {
    if (tr.docChanged || tr.selection) {
      return buildCodeBlockDecorations(tr.state);
    }
    return deco;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/**
 * Si el cursor cae dentro de `- [ ] ` / `- [x] `, lo empuja al texto
 * (donde el widget ya sustituyó el marcador).
 */
function clampOutOfTaskPrefix(doc, pos) {
  if (pos < 0 || pos > doc.length) return pos;
  const safePos = Math.min(pos, Math.max(doc.length - 1, 0));
  const line = doc.lineAt(safePos);
  const match = line.text.match(TASK_LINE_PREFIX);
  if (!match) return pos;
  const contentStart = line.from + match[1].length;
  return pos < contentStart ? contentStart : pos;
}

const taskCursorExtender = EditorState.transactionExtender.of((tr) => {
  if (!tr.selection) return null;
  const doc = tr.newDoc;
  let changed = false;
  const ranges = tr.newSelection.ranges.map((range) => {
    const anchor = clampOutOfTaskPrefix(doc, range.anchor);
    const head = clampOutOfTaskPrefix(doc, range.head);
    if (anchor === range.anchor && head === range.head) return range;
    changed = true;
    return anchor === head
      ? EditorSelection.cursor(head)
      : EditorSelection.range(anchor, head);
  });
  if (!changed) return null;
  return {
    selection: EditorSelection.create(ranges, tr.newSelection.mainIndex),
  };
});

/** Backspace al inicio del texto de una tarea quita el prefijo `- [ ] `. */
function deleteTaskPrefix(view) {
  const { state } = view;
  if (!state.selection.main.empty) return false;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const match = line.text.match(TASK_LINE_PREFIX);
  if (!match) return false;
  const contentStart = line.from + match[1].length;
  if (pos !== contentStart) return false;
  view.dispatch({
    changes: { from: line.from, to: contentStart, insert: "" },
    selection: EditorSelection.cursor(line.from),
    userEvent: "delete.backward",
  });
  return true;
}

const taskKeymap = keymap.of([{ key: "Backspace", run: deleteTaskPrefix }]);

/** Tema tipográfico del live preview (prosa, no mono). */
export const livePreviewTheme = EditorView.theme({
  "&": {
    width: "100%",
    maxWidth: "100%",
    height: "100%",
  },
  ".cm-scroller": {
    overflowX: "hidden",
    overflowY: "auto",
  },
  ".cm-content": {
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    fontSize: "1.05rem",
    lineHeight: "1.7",
    padding: "1.25rem 1.25rem",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  ".cm-line": {
    padding: "0 2px",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  ".cm-md-h1": {
    fontSize: "1.85rem",
    fontWeight: "700",
    lineHeight: "1.3",
    letterSpacing: "-0.02em",
  },
  ".cm-md-h2": {
    fontSize: "1.45rem",
    fontWeight: "700",
    lineHeight: "1.35",
  },
  ".cm-md-h3": {
    fontSize: "1.2rem",
    fontWeight: "650",
  },
  ".cm-md-h4, .cm-md-h5, .cm-md-h6": {
    fontSize: "1.05rem",
    fontWeight: "650",
  },
  ".cm-md-font-color": {
    /* color en style inline del span */
  },
  /* Spans internos del highlight de heading heredan el color de <font>. */
  ".cm-md-font-color *": {
    color: "inherit !important",
  },
  ".cm-md-mark": {},
  ".cm-md-strong": { fontWeight: "700" },
  ".cm-md-em": { fontStyle: "italic" },
  ".cm-md-strike": { textDecoration: "line-through", opacity: "0.85" },
  ".cm-md-underline": { textDecoration: "underline", textUnderlineOffset: "2px" },
  ".cm-md-inline-code": {
    fontFamily: '"IBM Plex Mono", Consolas, monospace',
    fontSize: "0.9em",
    background: "rgba(110, 168, 254, 0.12)",
    borderRadius: "4px",
    padding: "0.1em 0.35em",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  ".cm-md-codeblock": {
    fontFamily: '"IBM Plex Mono", Consolas, monospace',
    fontSize: "0.9rem",
    background: "rgba(0, 0, 0, 0.25)",
    borderRadius: "6px",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  /* Modo código: caja por líneas. Sin margin (rompe ↑/↓). */
  ".cm-line.cm-md-code-edit": {
    fontFamily: '"IBM Plex Mono", Consolas, monospace',
    fontSize: "0.88rem",
    lineHeight: "1.55",
    backgroundColor: "#262b33",
    color: "#e8ecf4",
    paddingLeft: "1rem",
    paddingRight: "1rem",
  },
  ".cm-line.cm-md-code-edit-first": {
    position: "relative",
    borderRadius: "8px 8px 0 0",
    borderTop: "1px solid #323843",
    borderLeft: "1px solid #323843",
    borderRight: "1px solid #323843",
    paddingTop: "0.65rem",
    minHeight: "1.5em",
  },
  ".cm-line.cm-md-code-edit-mid": {
    borderLeft: "1px solid #323843",
    borderRight: "1px solid #323843",
  },
  ".cm-line.cm-md-code-edit-last": {
    borderRadius: "0 0 8px 8px",
    borderBottom: "1px solid #323843",
    borderLeft: "1px solid #323843",
    borderRight: "1px solid #323843",
    paddingBottom: "0.65rem",
    minHeight: "0.85em",
  },
  ".cm-line.cm-md-code-edit-alone": {
    position: "relative",
    borderRadius: "8px",
    border: "1px solid #323843",
    paddingTop: "0.65rem",
    paddingBottom: "0.65rem",
  },
  ".cm-md-code-fence": {
    color: "#9aa3b5",
    fontFamily: '"IBM Plex Mono", Consolas, monospace',
  },
  ".cm-md-code-lang": {
    position: "absolute",
    top: "0.4rem",
    right: "0.75rem",
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    fontSize: "0.72rem",
    fontWeight: "500",
    color: "#9aa3b5",
    letterSpacing: "0.02em",
    userSelect: "none",
    pointerEvents: "none",
  },
  /* Tokens highlight.js — look type Obsidian / one-dark */
  ".cm-line.cm-md-code-edit .hljs-keyword, .cm-line.cm-md-code-edit .hljs-selector-tag, .cm-line.cm-md-code-edit .hljs-section, .cm-line.cm-md-code-edit .hljs-link":
    {
      color: "#c678dd",
    },
  ".cm-line.cm-md-code-edit .hljs-function .hljs-keyword": {
    color: "#c678dd",
  },
  ".cm-line.cm-md-code-edit .hljs-string, .cm-line.cm-md-code-edit .hljs-title, .cm-line.cm-md-code-edit .hljs-name, .cm-line.cm-md-code-edit .hljs-type, .cm-line.cm-md-code-edit .hljs-attribute, .cm-line.cm-md-code-edit .hljs-symbol, .cm-line.cm-md-code-edit .hljs-bullet, .cm-line.cm-md-code-edit .hljs-addition, .cm-line.cm-md-code-edit .hljs-variable, .cm-line.cm-md-code-edit .hljs-template-tag, .cm-line.cm-md-code-edit .hljs-template-variable":
    {
      color: "#98c379",
    },
  ".cm-line.cm-md-code-edit .hljs-comment, .cm-line.cm-md-code-edit .hljs-quote, .cm-line.cm-md-code-edit .hljs-deletion, .cm-line.cm-md-code-edit .hljs-meta":
    {
      color: "#7d8799",
    },
  ".cm-line.cm-md-code-edit .hljs-number, .cm-line.cm-md-code-edit .hljs-regexp, .cm-line.cm-md-code-edit .hljs-literal":
    {
      color: "#d19a66",
    },
  ".cm-line.cm-md-code-edit .hljs-built_in, .cm-line.cm-md-code-edit .hljs-title.class_, .cm-line.cm-md-code-edit .hljs-title.function_":
    {
      color: "#e5c07b",
    },
  ".cm-line.cm-md-code-edit .hljs-params, .cm-line.cm-md-code-edit .hljs-property, .cm-line.cm-md-code-edit .hljs-attr":
    {
      color: "#56b6c2",
    },
  ".cm-line.cm-md-code-edit .hljs-subst": {
    color: "#56b6c2",
  },
  ".cm-line.cm-md-code-edit .hljs-doctag, .cm-line.cm-md-code-edit .hljs-formula":
    {
      color: "#c678dd",
    },
  ".cm-line.cm-md-code-edit .hljs-emphasis": {
    fontStyle: "italic",
  },
  ".cm-line.cm-md-code-edit .hljs-strong": {
    fontWeight: "700",
  },
  ".cm-md-link": {
    color: "#6ea8fe",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },
  ".cm-md-quote": {
    color: "#9aa3b5",
    borderLeft: "3px solid #3d4a63",
    paddingLeft: "0.75rem",
  },
  ".cm-md-bullet": {
    color: "#6ea8fe",
    display: "inline-block",
    width: "1.25em",
    textAlign: "center",
  },
  ".cm-md-hr": {
    border: "none",
    borderTop: "1px solid #2b3240",
    margin: "0.6rem 0",
    width: "100%",
  },
  ".cm-md-task-check": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    width: "1.05em",
    height: "1.05em",
    margin: "0 0.5em 0 0",
    padding: "0",
    verticalAlign: "-0.12em",
    border: "1.5px solid #9aa3b5",
    borderRadius: "3px",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    lineHeight: "1",
  },
  ".cm-md-task-check:hover": {
    borderColor: "#c4b5fd",
  },
  ".cm-md-task-check.checked": {
    background: "#7c5cfc",
    borderColor: "#7c5cfc",
  },
  ".cm-md-task-check svg": {
    width: "0.72em",
    height: "0.72em",
    display: "block",
  },
  ".cm-md-task-done": {
    textDecoration: "line-through",
    color: "#9aa3b5",
    opacity: "0.9",
  },
  ".cm-md-image-wrap": {
    display: "block",
    margin: "0.75rem 0",
    maxWidth: "100%",
    overflow: "hidden",
  },
  ".cm-md-image": {
    display: "block",
    maxWidth: "100%",
    width: "auto",
    height: "auto",
    borderRadius: "6px",
  },
  ".cm-md-image-missing": {
    display: "block",
    maxWidth: "100%",
    boxSizing: "border-box",
    color: "#9aa3b5",
    fontSize: "0.9rem",
    fontStyle: "italic",
    border: "1px dashed #2b3240",
    borderRadius: "6px",
    padding: "0.5rem 0.75rem",
    overflowWrap: "anywhere",
  },
});

/**
 * Anula colores de oneDark que chocan con live preview:
 * - heading (coral) pisa <font color>
 * - processingInstruction (verde) pinta los #
 */
const neutralMdHighlight = HighlightStyle.define([
  {
    tag: [
      tags.heading,
      tags.heading1,
      tags.heading2,
      tags.heading3,
      tags.heading4,
      tags.heading5,
      tags.heading6,
    ],
    color: "#e8ecf4",
    fontWeight: "bold",
  },
  { tag: tags.processingInstruction, color: "#9aa3b5" },
]);

export function livePreview() {
  return [
    documentPathField,
    codeBlockField,
    taskCursorExtender,
    Prec.high(taskKeymap),
    livePreviewPlugin,
    livePreviewTheme,
    Prec.highest(syntaxHighlighting(neutralMdHighlight)),
    Prec.highest(htmlStylePlugin),
  ];
}

/** En modo Fuente: aplica <font>, <u> y <mark> sin ocultar etiquetas. */
function buildSourceHtmlDecorations(view) {
  const ranges = [];
  const { state } = view;

  for (const { from, to } of view.visibleRanges) {
    const text = state.doc.sliceString(from, to);

    const fontRe =
      /<font\s+color="(#[0-9a-fA-F]{3,8})">([\s\S]*?)<\/font>/gi;
    let match;
    while ((match = fontRe.exec(text)) !== null) {
      const absFrom = from + match.index;
      const absTo = absFrom + match[0].length;
      const openLen = match[0].indexOf(">") + 1;
      const contentFrom = absFrom + openLen;
      const contentTo = absTo - "</font>".length;
      if (contentFrom >= contentTo) continue;
      ranges.push(
        Decoration.mark({
          class: "cm-md-font-color",
          attributes: { style: `color: ${match[1]} !important` },
        }).range(contentFrom, contentTo)
      );
    }

    const uRe = /<u>([\s\S]*?)<\/u>/gi;
    while ((match = uRe.exec(text)) !== null) {
      const absFrom = from + match.index;
      const absTo = absFrom + match[0].length;
      const contentFrom = absFrom + 3;
      const contentTo = absTo - 4;
      if (contentFrom >= contentTo) continue;
      ranges.push(
        Decoration.mark({ class: "cm-md-underline" }).range(
          contentFrom,
          contentTo
        )
      );
    }

    const markRe =
      /<mark\s+style="background:\s*(#[0-9a-fA-F]{3,8})\s*">([\s\S]*?)<\/mark>/gi;
    while ((match = markRe.exec(text)) !== null) {
      const absFrom = from + match.index;
      const absTo = absFrom + match[0].length;
      const openLen = match[0].indexOf(">") + 1;
      const contentFrom = absFrom + openLen;
      const contentTo = absTo - "</mark>".length;
      if (contentFrom >= contentTo) continue;
      ranges.push(
        Decoration.mark({
          attributes: {
            style: `background-color: ${match[1]}; color: #000`,
          },
        }).range(contentFrom, contentTo)
      );
    }
  }

  return safeDecoSet(ranges);
}

const sourceHtmlPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = buildSourceHtmlDecorations(view);
    }

    update(update) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet
      ) {
        this.decorations = buildSourceHtmlDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

const sourceHtmlTheme = EditorView.theme({
  ".cm-md-underline": {
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },
  ".cm-md-font-color *": {
    color: "inherit !important",
  },
});

export function sourceMarkHighlight() {
  return [
    Prec.highest(sourceHtmlPlugin),
    sourceHtmlTheme,
    Prec.highest(syntaxHighlighting(neutralMdHighlight)),
  ];
}
