<template>
  <div ref="host" class="md-editor-root cm-host" data-mode="source"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { createMarkdownCm } from "./createEditor.js";

const model = defineModel({ type: String, default: "" });
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
    live: false,
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

onBeforeUnmount(() => {
  editor?.destroy();
  editor = null;
});
</script>

<style scoped>
.cm-host {
  height: 100%;
  min-height: 0;
}

.cm-host :deep(.cm-editor) {
  height: 100%;
}
</style>
