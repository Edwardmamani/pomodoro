import { WidgetType } from "@codemirror/view";
import { languageLabel } from "./hljsSetup.js";

/**
 * Etiqueta de lenguaje (p. ej. "Python") en la esquina del bloque.
 * Widget en línea — no reemplaza saltos de línea (no rompe ↑/↓).
 */
export class LangLabelWidget extends WidgetType {
  constructor(lang) {
    super();
    this.lang = lang || "";
    this.label = languageLabel(lang);
  }

  eq(other) {
    return other instanceof LangLabelWidget && other.lang === this.lang;
  }

  toDOM() {
    const el = document.createElement("span");
    el.className = "cm-md-code-lang";
    el.textContent = this.label;
    el.setAttribute("contenteditable", "false");
    return el;
  }

  ignoreEvent() {
    return true;
  }
}

/**
 * Extrae idioma y cuerpo de un nodo FencedCode.
 * @param {import("@codemirror/state").EditorState} state
 * @param {import("@lezer/common").SyntaxNode} fenceNode
 */
export function readFencedCode(state, fenceNode) {
  let lang = "";
  let codeFrom = fenceNode.from;
  let codeTo = fenceNode.to;

  for (let c = fenceNode.firstChild; c; c = c.nextSibling) {
    if (c.name === "CodeInfo") {
      lang = state.doc.sliceString(c.from, c.to).trim();
    } else if (c.name === "CodeMark") {
      if (codeFrom === fenceNode.from) {
        const line = state.doc.lineAt(c.from);
        codeFrom = line.to + (line.to < state.doc.length ? 1 : 0);
      } else {
        const line = state.doc.lineAt(c.from);
        codeTo = line.from;
      }
    }
  }

  if (codeFrom === fenceNode.from) {
    const raw = state.doc.sliceString(fenceNode.from, fenceNode.to);
    const m = raw.match(/^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n(?:\1)[ \t]*$/);
    if (m) {
      const info = raw.slice(m[1].length, raw.indexOf("\n")).trim();
      const openEnd = fenceNode.from + m[0].indexOf("\n") + 1;
      return {
        lang: info || lang,
        code: m[2],
        codeFrom: openEnd,
        codeTo: openEnd + m[2].length,
      };
    }
    return {
      lang,
      code: raw,
      codeFrom: fenceNode.from,
      codeTo: fenceNode.to,
    };
  }

  if (codeTo > codeFrom && state.doc.sliceString(codeTo - 1, codeTo) === "\n") {
    codeTo -= 1;
  }

  return {
    lang,
    code: state.doc.sliceString(codeFrom, codeTo),
    codeFrom,
    codeTo,
  };
}
