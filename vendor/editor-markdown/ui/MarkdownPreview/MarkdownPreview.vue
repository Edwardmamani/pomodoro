<template>
  <div ref="host" class="md-editor-root cm-host preview-editable" data-mode="live"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { createMarkdownCm } from "../MarkdownEditor/createEditor.js";

const model = defineModel({ type: String, default: "" });
const props = defineProps({
  documentPath: { type: String, default: null },
});
const emit = defineEmits(["change", "focus"]);

const host = ref(null);
let editor = null;

function runCommand(name, ...args) {
  editor?.runCommand(name, ...args);
}

function getView() {
  return editor?.view ?? null;
}

defineExpose({ runCommand, getView });

onMounted(() => {
  editor = createMarkdownCm({
    doc: model.value,
    parent: host.value,
    live: true,
    documentPath: props.documentPath,
    onChange(text) {
      model.value = text;
      emit("change");
    },
    onFocus() {
      emit("focus");
    },
  });
});

watch(model, (next) => {
  editor?.setDoc(next ?? "");
});

watch(
  () => props.documentPath,
  (next) => {
    editor?.setDocumentPath(next ?? null);
  }
);

onBeforeUnmount(() => {
  editor?.destroy();
  editor = null;
});
</script>

<style scoped>
.cm-host {
  height: 100%;
  width: 100%;
  max-width: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: #141820;
}

.cm-host :deep(.cm-editor) {
  height: 100%;
  width: 100%;
  max-width: 100%;
}
</style>
