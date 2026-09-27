# Editor Markdown

Librería Vue 3 + CodeMirror 6 para editar Markdown.

| Carpeta | Rol |
|---------|-----|
| **`ui/`** | Librería (Source, Preview, Toolbar, `createDocument`) |
| **`electron/`** | Demo local de escritorio (no va en el zip de share) |
| **`examples/vite-host/`** | Smoke test: Preview + Toolbar en Vite |

```
editor-markdown/
├── ui/                 ← lo que consumes
│   ├── index.js
│   ├── editor.css      ← estilos seguros para el host
│   ├── style.css       ← SOLO demo (reset global) → demo.css
│   ├── document/
│   ├── MarkdownEditor/
│   ├── MarkdownPreview/
│   ├── EditingToolbar/
│   └── presets/
└── examples/vite-host/
```

---

## Integrar en tu proyecto (Vite + pnpm)

### 1. Copiar / descomprimir

```
tu-proyecto/
├── package.json
└── vendor/
    └── editor-markdown/
```

### 2. Dependencias

```bash
pnpm add vue@^3.5.0
pnpm add file:./vendor/editor-markdown
```

`vue` es **peerDependency** (debe existir una sola instancia en el host).  
CodeMirror y `highlight.js` vienen como dependencies del paquete; no hace falta declararlas en la raíz ni meterlas en `optimizeDeps.include`.

En `vite.config.js` del host:

```js
export default defineConfig({
  plugins: [vue()],
  resolve: {
    dedupe: ["vue"], // evita Vue duplicado con pnpm + file:
  },
});
```

### 3. Estilos

```js
import "editor-markdown/editor.css"; // variables + botones bajo .md-editor-root
```

**No** importes `editor-markdown/demo.css` / `style.css` en un host con Tailwind: resetean `html`/`body`/`#app`.

### 4. Uso (Preview + Toolbar)

```vue
<script setup>
import { ref } from "vue";
import {
  MarkdownPreview,
  EditingToolbar,
  createDocument,
} from "editor-markdown";
// Subpaths (menos arrastre):
// import MarkdownPreview from "editor-markdown/preview"
// import EditingToolbar from "editor-markdown/toolbar"
// import { createDocument } from "editor-markdown/document"

const doc = createDocument({
  async load(path) {
    const text = await fetch(path).then((r) => r.text());
    return { content: text, filePath: path };
  },
  async save({ path, content }) {
    await fetch(path, { method: "PUT", body: content });
    return { filePath: path };
  },
});

const content = ref("");
const filePath = ref(null);
const previewRef = ref(null);

function onChange() {
  doc.setContent(content.value);
}

function onCommand(name, arg) {
  // El host implementa pickAsset para "image"; el resto va al preview.
  if (name === "image" && !arg) {
    /* tu picker → previewRef.runCommand("image", relativePath) */
    return;
  }
  previewRef.value?.runCommand(name, arg);
}
</script>

<template>
  <EditingToolbar @command="onCommand" />
  <MarkdownPreview
    ref="previewRef"
    v-model="content"
    :document-path="filePath"
    @change="onChange"
  />
</template>
```

Preset listo (toolbar + preview):

```vue
import { MarkdownPreviewKit } from "editor-markdown";
// o: import MarkdownPreviewKit from "editor-markdown/preview-kit"
```

### 5. API pública

| Export / subpath | Rol |
|------------------|-----|
| `MarkdownEditor` / `./source` | Fuente (.md crudo) |
| `MarkdownPreview` / `./preview` | Preview editable |
| `EditingToolbar` / `./toolbar` | Emite `@command` |
| `MarkdownPreviewKit` / `./preview-kit` | Toolbar + Preview |
| `createDocument` / `./document` | `load` / `save` / dirty |
| `./editor.css` | Estilos de librería |
| `./demo.css` | Reset global (solo demo Electron) |

#### `createDocument({ load, save })`

```js
await doc.load(path);
doc.getContent();
doc.setContent(md);
doc.getPath();
doc.isDirty();
await doc.save();
await doc.saveAs();
```

- `load(path?)` → `{ content, filePath }` o `null`
- `save({ path, content })` → `{ filePath }` o `null`

**I/O e imágenes no vienen en la librería.** El host implementa `load` / `save` / picker de assets (como `window.api` en la demo Electron).

### 6. Checklist post-integración

1. `pnpm add file:./vendor/editor-markdown`
2. `import "editor-markdown/editor.css"` (no `demo.css`)
3. `resolve.dedupe: ['vue']` en Vite
4. Importar Preview + Toolbar (o `MarkdownPreviewKit`)
5. `pnpm exec vite build` sin pantalla negra / errores de `highlight.js`

> El resaltado de código usa `ui/vendor/hljs.js` (ESM embebido). El host **no** debe importar `highlight.js` ni parchear Vite por ese paquete.

Smoke de referencia en este repo:

```bash
pnpm run test:integrate
```

---

## Empaquetar para enviar

```bash
pnpm run pack:share
```

Genera `release/editor-markdown-1.2.0-YYYYMMDD.zip` con **`ui/`** + README + example (sin `electron/`, sin `node_modules`).

---

## Demo Electron (desarrollo local)

Package manager: **pnpm**. Vite de la demo en el puerto **5174**.

```bash
pnpm install
pnpm run dev
```

- `pnpm run build` — UI
- `pnpm start` — build + Electron

La demo usa `ui/style.css` (demo.css) y `window.api` para abrir/guardar/imágenes.
