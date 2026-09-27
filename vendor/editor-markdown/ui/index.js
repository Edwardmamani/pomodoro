/**
 * API pública del editor Markdown (librería UI).
 *
 * Preferir subpaths si solo usas una pieza (menos arrastre de CodeMirror/hljs):
 *   import MarkdownPreview from "editor-markdown/preview"
 *   import { createDocument } from "editor-markdown/document"
 *
 * Estilos del host: `import "editor-markdown/editor.css"` (NO demo.css).
 */

export { default as MarkdownEditor } from "./MarkdownEditor/MarkdownEditor.vue";
export { default as MarkdownPreview } from "./MarkdownPreview/MarkdownPreview.vue";
export { default as EditingToolbar } from "./EditingToolbar/EditingToolbar.vue";
export { default as MarkdownPreviewKit } from "./presets/MarkdownPreviewKit.vue";
export { createDocument } from "./document/createDocument.js";
