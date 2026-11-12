<template>
  <div class="flex flex-col gap-2.5">
    <div class="flex items-center gap-1.5 text-on-surface-variant">
      <span class="material-symbols-outlined text-[16px] text-primary">terminal</span>
      <span class="font-label-mono-sm uppercase tracking-wider text-outline">Servidor MCP</span>
    </div>
    <div class="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col gap-2.5">
      <div class="flex items-center justify-between">
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full" :class="draft.mcp_enabled ? 'bg-primary' : 'bg-outline'"></span>
            <span class="font-body-sm text-on-surface">{{ draft.mcp_enabled ? 'Activo (stdio)' : 'Desactivado' }}</span>
          </div>
          <span class="font-label-mono-sm text-[10px] text-outline">Sincronización local</span>
        </div>
        <ToggleSwitch v-model="draft.mcp_enabled" />
      </div>
      <div class="flex items-center p-0.5 bg-surface-container-low rounded-lg border border-outline-variant/30 gap-1 text-[11px] font-label-mono-sm">
        <button
          v-for="tab in mcpTabs" :key="tab" type="button"
          class="flex-1 py-1 rounded text-center transition-all"
          :class="mcpTab === tab ? 'bg-surface-container-highest text-primary font-medium shadow-xs' : 'text-on-surface-variant hover:text-on-surface'"
          @click="mcpTab = tab"
        >{{ tab }}</button>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-2.5 relative flex flex-col gap-1">
        <div class="flex items-center justify-between pb-1 border-b border-outline-variant/20">
          <span class="font-label-mono-sm text-[10px] text-outline">{{ snippetFile }}</span>
          <button type="button" class="flex items-center gap-1 text-[10px] font-label-mono-sm text-primary hover:text-primary-fixed-dim transition-colors bg-primary/10 px-1.5 py-0.5 rounded" @click="copySnippet">
            <span class="material-symbols-outlined text-[12px]">content_copy</span>
            <span>{{ copied ? 'Copiado' : 'Copiar' }}</span>
          </button>
        </div>
        <pre class="font-label-mono-sm text-[10px] text-on-surface-variant overflow-x-auto leading-relaxed pt-1 select-all"><code>{{ snippet }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

defineProps({ draft: { type: Object, required: true } })
const mcpTabs = ['Claude', 'ChatGPT', 'Cursor']
const mcpTab = ref('Claude')
const copied = ref(false)
const snippetFile = computed(() => (mcpTab.value === 'Claude' ? 'claude_desktop_config.json' : mcpTab.value === 'Cursor' ? 'mcp.json' : 'config'))
const snippet = computed(() => JSON.stringify({ mcpServers: { pomodoro: { command: 'node', args: ['mcp/index.js'], env: {} } } }, null, 2))

async function copySnippet() {
  try {
    await navigator.clipboard.writeText(snippet.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch { /* ignore */ }
}
</script>
