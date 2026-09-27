<script setup>
import { ref } from "vue";
import {
  MarkdownPreview,
  EditingToolbar,
  createDocument,
} from "editor-markdown";

const doc = createDocument({
  async load(path) {
    return {
      content: "# Smoke host\n\nPreview + Toolbar OK.\n\n```js\nconsole.log(1)\n```\n",
      filePath: path || "/smoke.md",
    };
  },
  async save({ path, content }) {
    return { filePath: path || "/smoke.md" };
  },
});

const content = ref("# Loading…");
const filePath = ref(null);
const previewRef = ref(null);

async function boot() {
  await doc.load("/smoke.md");
  content.value = doc.getContent();
  filePath.value = doc.getPath();
}

function onChange() {
  doc.setContent(content.value);
}

function onCommand(name, arg) {
  previewRef.value?.runCommand(name, arg);
}

boot();
</script>

<template>
  <div class="host">
    <EditingToolbar @command="onCommand" />
    <div class="pane">
      <MarkdownPreview
        ref="previewRef"
        v-model="content"
        :document-path="filePath"
        @change="onChange"
      />
    </div>
  </div>
</template>

<style>
html,
body,
#app {
  margin: 0;
  height: 100%;
}
.host {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.pane {
  flex: 1;
  min-height: 0;
}
</style>
