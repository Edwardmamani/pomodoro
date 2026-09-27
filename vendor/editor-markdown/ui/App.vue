<template>
  <div class="app md-editor-root">
    <header class="topbar">
      <div class="brand">
        <strong>Editor Markdown</strong>
        <span class="path">{{ displayPath }}</span>
      </div>
      <div class="actions">
        <div class="view-modes" role="group" aria-label="Vista">
          <button
            type="button"
            :class="{ active: viewMode === 'edit' }"
            @click="setView('edit')"
          >
            Fuente
          </button>
          <button
            type="button"
            :class="{ active: viewMode === 'split' }"
            @click="setView('split')"
          >
            Split
          </button>
          <button
            type="button"
            :class="{ active: viewMode === 'preview' }"
            @click="setView('preview')"
          >
            Preview
          </button>
        </div>
        <button type="button" @click="onOpen">Abrir .md</button>
        <button type="button" class="primary" :disabled="!dirty" @click="onSave">
          Guardar
        </button>
        <button type="button" @click="onSaveAs">Guardar como…</button>
      </div>
    </header>

    <EditingToolbar @command="onToolbarCommand" />

    <main class="workspace" :class="viewMode">
      <section v-show="viewMode !== 'preview'" class="pane editor-pane">
        <MarkdownEditor
          ref="editorRef"
          v-model="content"
          @change="onEditorChange"
          @focus="activePane = 'source'"
        />
      </section>
      <section v-show="viewMode !== 'edit'" class="pane preview-pane">
        <MarkdownPreview
          ref="previewRef"
          v-model="content"
          :document-path="filePath"
          @change="onEditorChange"
          @focus="activePane = 'preview'"
        />
      </section>
    </main>

    <footer class="status">
      <span>{{ dirty ? "Sin guardar" : "Guardado" }}</span>
      <span>{{ paneLabel }} · {{ content.length }} caracteres</span>
    </footer>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";
import {
  MarkdownEditor,
  MarkdownPreview,
  EditingToolbar,
  createDocument,
} from "./index.js";

const DEFAULT_DOC = `# Bienvenido

Edita en **Preview** (Live Preview) o en **Fuente** (Markdown crudo).

## Vistas

- **Fuente** — ves el \`.md\`
- **Preview** — editas sin ver la sintaxis (editable)
- **Split** — ambas a la vez; la toolbar actúa en el panel enfocado

> Guarda el documento antes de insertar imágenes en \`assets/\`.
`;

const doc = createDocument({
  async load() {
    if (!window.api?.openMarkdown) {
      window.alert("API de Electron no disponible.");
      return null;
    }
    return window.api.openMarkdown();
  },
  async save({ path, content: md }) {
    if (!window.api?.saveMarkdown) {
      window.alert("API de Electron no disponible.");
      return null;
    }
    return window.api.saveMarkdown({ filePath: path, content: md });
  },
});

doc.setContent(DEFAULT_DOC);

const content = ref(doc.getContent());
const filePath = ref(doc.getPath());
const dirty = ref(doc.isDirty());
const viewMode = ref("preview");
const activePane = ref("preview");
const editorRef = ref(null);
const previewRef = ref(null);

const displayPath = computed(() => filePath.value ?? "documento sin guardar.md");

const paneLabel = computed(() => {
  if (viewMode.value === "edit") return "Fuente";
  if (viewMode.value === "preview") return "Preview (editable)";
  return activePane.value === "source" ? "Split · Fuente" : "Split · Preview";
});

function syncFromDoc() {
  content.value = doc.getContent();
  filePath.value = doc.getPath();
  dirty.value = doc.isDirty();
}

function setView(mode) {
  viewMode.value = mode;
  if (mode === "edit") activePane.value = "source";
  if (mode === "preview") activePane.value = "preview";
}

function activeEditor() {
  if (viewMode.value === "edit") return editorRef.value;
  if (viewMode.value === "preview") return previewRef.value;
  return activePane.value === "source" ? editorRef.value : previewRef.value;
}

function onEditorChange() {
  doc.setContent(content.value);
  dirty.value = true;
}

async function onToolbarCommand(name, arg) {
  if (name === "image") {
    await insertImage();
    return;
  }
  activeEditor()?.runCommand(name, arg);
}

async function insertImage() {
  if (!window.api?.pickAsset) {
    window.alert("API de Electron no disponible.");
    return;
  }

  const result = await window.api.pickAsset({ documentPath: filePath.value });
  if (!result) return;

  if (!result.ok) {
    window.alert(result.error || "No se pudo insertar la imagen.");
    return;
  }

  activeEditor()?.runCommand("image", result.relativePath);
}

async function onOpen() {
  const result = await doc.load();
  if (!result) return;

  syncFromDoc();
  await nextTick();
}

async function onSave() {
  doc.setContent(content.value);
  const result = await doc.save();
  if (!result) return;
  syncFromDoc();
}

async function onSaveAs() {
  doc.setContent(content.value);
  const result = await doc.saveAs();
  if (!result) return;
  syncFromDoc();
}
</script>

<style scoped>
.app {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  height: 100%;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, #1c2230, #161a22);
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.path {
  color: var(--muted);
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex-shrink: 0;
  align-items: center;
}

.view-modes {
  display: flex;
  gap: 0.25rem;
  margin-right: 0.35rem;
}

.view-modes button.active {
  border-color: var(--accent);
  background: rgba(110, 168, 254, 0.15);
}

.workspace {
  display: grid;
  min-height: 0;
}

.workspace.edit,
.workspace.preview {
  grid-template-columns: 1fr;
}

.workspace.split {
  grid-template-columns: 1fr 1fr;
}

.pane {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.preview-pane {
  border-left: 1px solid var(--border);
}

.workspace.preview .preview-pane {
  border-left: none;
}

.status {
  display: flex;
  justify-content: space-between;
  padding: 0.45rem 1rem;
  border-top: 1px solid var(--border);
  background: #141820;
  color: var(--muted);
  font-size: 0.85rem;
}
</style>
