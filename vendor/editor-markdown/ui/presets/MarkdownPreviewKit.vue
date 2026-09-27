<template>
  <div class="md-editor-root md-preview-kit">
    <EditingToolbar @command="onCommand" />
    <div class="md-preview-kit__pane">
      <MarkdownPreview
        ref="previewRef"
        v-model="model"
        :document-path="documentPath"
        @change="emit('change')"
        @focus="emit('focus')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import MarkdownPreview from "../MarkdownPreview/MarkdownPreview.vue";
import EditingToolbar from "../EditingToolbar/EditingToolbar.vue";

const model = defineModel({ type: String, default: "" });
defineProps({
  documentPath: { type: String, default: null },
});
const emit = defineEmits(["change", "focus", "command"]);

const previewRef = ref(null);

function runCommand(name, ...args) {
  previewRef.value?.runCommand(name, ...args);
}

function getView() {
  return previewRef.value?.getView?.() ?? null;
}

function onCommand(name, arg) {
  emit("command", name, arg);
  if (name === "image") {
    // El host debe manejar el picker; si ya viene relativePath, insertar.
    if (arg) runCommand("image", arg);
    return;
  }
  runCommand(name, arg);
}

defineExpose({ runCommand, getView, previewRef });
</script>

<style scoped>
.md-preview-kit {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.md-preview-kit__pane {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
