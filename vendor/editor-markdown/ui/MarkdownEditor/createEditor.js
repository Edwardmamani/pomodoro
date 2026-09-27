import { basicSetup, minimalSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { livePreview, setDocumentPath, sourceMarkHighlight } from "./livePreview.js";
import {
  bold,
  italic,
  underline,
  fontColor,
  highlight,
  heading,
  link,
  image,
  list,
  quote,
  code,
} from "../EditingToolbar/commands/index.js";

export const commandMap = {
  bold,
  italic,
  underline,
  fontColor,
  highlight,
  heading,
  link,
  image,
  list,
  quote,
  code,
};

/**
 * @param {object} opts
 * @param {string} opts.doc
 * @param {HTMLElement} opts.parent
 * @param {boolean} opts.live — Live Preview (oculta sintaxis)
 * @param {string|null} [opts.documentPath]
 * @param {(text: string) => void} opts.onChange
 * @param {() => void} [opts.onFocus]
 */
export function createMarkdownCm({
  doc,
  parent,
  live,
  documentPath = null,
  onChange,
  onFocus,
}) {
  let applyingExternal = false;

  // Preview: sin numeración ni gutter (minimalSetup). Fuente: basicSetup.
  const extensions = [
    live ? minimalSetup : basicSetup,
    markdown({ base: markdownLanguage }),
    oneDark,
    keymap.of([
      {
        key: "Mod-b",
        run: (v) => {
          bold(v);
          return true;
        },
      },
      {
        key: "Mod-i",
        run: (v) => {
          italic(v);
          return true;
        },
      },
      {
        key: "Mod-u",
        run: (v) => {
          underline(v);
          return true;
        },
      },
      {
        key: "Mod-k",
        run: (v) => {
          link(v);
          return true;
        },
      },
    ]),
    EditorView.updateListener.of((update) => {
      if (update.focusChanged && update.view.hasFocus) onFocus?.();
      if (!update.docChanged || applyingExternal) return;
      onChange(update.state.doc.toString());
    }),
    EditorView.theme({
      "&": { height: "100%", width: "100%", maxWidth: "100%" },
      ".cm-scroller": live
        ? {
            overflowX: "hidden",
            overflowY: "auto",
          }
        : {
            overflow: "auto",
            fontFamily: '"IBM Plex Mono", Consolas, monospace',
          },
      "&.cm-focused": { outline: "none" },
      ...(live
        ? {
            ".cm-gutters": { display: "none" },
            ".cm-activeLine": { backgroundColor: "transparent" },
          }
        : {}),
    }),
  ];

  if (live) {
    // Ancho = contenedor; evita scroll horizontal por líneas largas
    extensions.push(EditorView.lineWrapping, ...livePreview());
  } else {
    extensions.push(...sourceMarkHighlight());
  }

  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions,
    }),
    parent,
  });

  if (live && documentPath) {
    view.dispatch({ effects: setDocumentPath.of(documentPath) });
  }

  return {
    view,
    runCommand(name, ...args) {
      if (!commandMap[name]) return;
      commandMap[name](view, ...args);
    },
    setDoc(text) {
      const current = view.state.doc.toString();
      if (text === current) return;
      applyingExternal = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: text ?? "" },
      });
      applyingExternal = false;
    },
    setDocumentPath(nextPath) {
      if (!live) return;
      view.dispatch({ effects: setDocumentPath.of(nextPath ?? null) });
    },
    destroy() {
      view.destroy();
    },
  };
}
