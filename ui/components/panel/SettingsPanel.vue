<template>
  <aside
    class="h-full w-full bg-surface-container-low p-5 flex flex-col justify-between overflow-y-auto"
  >
    <div class="flex flex-col gap-5">
      <div
        class="flex items-center justify-between pb-3 border-b border-outline-variant/30"
      >
        <div class="flex items-center gap-2">
          <div
            class="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"
          >
            <span class="material-symbols-outlined text-[18px]">settings</span>
          </div>
          <h2
            class="font-headline-md text-[18px] text-on-surface tracking-tight leading-tight"
          >
            Configuración
          </h2>
        </div>
        <RouterLink
          to="/"
          class="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          title="Cerrar panel"
        >
          <span class="material-symbols-outlined text-[16px]">close</span>
        </RouterLink>
      </div>

      <div class="flex flex-col gap-2.5">
        <div class="flex items-center gap-1.5 text-on-surface-variant">
          <span class="material-symbols-outlined text-[16px] text-primary"
            >timer</span
          >
          <span
            class="font-label-mono-sm uppercase tracking-wider text-outline"
            >Temporizador</span
          >
        </div>
        <div
          class="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col gap-2.5"
        >
          <DurationRow
            label="Concentración"
            :value="draft.focus_minutes"
            @dec="bump('focus_minutes', -1)"
            @inc="bump('focus_minutes', 1)"
          />
          <DurationRow
            label="Descanso corto"
            :value="draft.short_break_minutes"
            @dec="bump('short_break_minutes', -1)"
            @inc="bump('short_break_minutes', 1)"
          />
          <DurationRow
            label="Descanso largo"
            :value="draft.long_break_minutes"
            @dec="bump('long_break_minutes', -1)"
            @inc="bump('long_break_minutes', 1)"
          />
          <div
            class="pt-2 border-t border-outline-variant/30 flex items-center justify-between text-xs"
          >
            <span class="text-on-surface-variant font-body-sm text-[12px]"
              >Intervalo descanso largo</span
            >
            <span
              class="font-label-mono-sm text-primary bg-primary/10 px-2 py-0.5 rounded-full"
              >Cada {{ draft.pomodoros_until_long_break }} pomos</span
            >
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <div class="flex items-center gap-1.5 text-on-surface-variant">
          <span class="material-symbols-outlined text-[16px] text-primary"
            >notifications_active</span
          >
          <span
            class="font-label-mono-sm uppercase tracking-wider text-outline"
            >Sonido y Notificaciones</span
          >
        </div>
        <div
          class="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col gap-2.5"
        >
          <div class="flex items-center justify-between">
            <span class="font-body-sm text-on-surface">Sonido campana</span>
            <ToggleSwitch v-model="draft.sound_enabled" />
          </div>
          <div class="flex flex-col gap-1.5 pt-1">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-on-surface">
                <span class="material-symbols-outlined text-[15px] text-primary"
                  >volume_up</span
                >
                <span class="font-body-sm">Volumen sonido</span>
              </div>
              <span class="font-label-mono-sm text-[11px] text-primary font-medium"
                >{{ draft.sound_volume }}%</span
              >
            </div>
            <input
              v-model.number="draft.sound_volume"
              type="range"
              min="0"
              max="100"
              class="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-surface-container-highest"
              style="accent-color: #3d9970"
            />
          </div>
          <div class="flex items-center justify-between">
            <span class="font-body-sm text-on-surface"
              >Notificaciones nativas</span
            >
            <ToggleSwitch v-model="draft.notifications_enabled" />
          </div>
          <div class="flex items-center justify-between">
            <span class="font-body-sm text-on-surface"
              >Modo No Molestar auto</span
            >
            <ToggleSwitch v-model="draft.do_not_disturb_auto" />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <div class="flex items-center gap-1.5 text-on-surface-variant">
          <span class="material-symbols-outlined text-[16px] text-primary"
            >headphones</span
          >
          <span
            class="font-label-mono-sm uppercase tracking-wider text-outline"
            >Audio y Música</span
          >
        </div>
        <div
          class="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col gap-2.5"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span class="font-body-sm text-on-surface">Spotify (enlace)</span>
            </div>
            <span
              class="font-label-mono-sm text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded"
              >MVP</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span class="font-body-sm text-on-surface"
              >Atenuar en descanso</span
            >
            <ToggleSwitch v-model="draft.attenuate_on_break" />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <div class="flex items-center gap-1.5 text-on-surface-variant">
          <span class="material-symbols-outlined text-[16px] text-primary"
            >terminal</span
          >
          <span
            class="font-label-mono-sm uppercase tracking-wider text-outline"
            >Servidor MCP</span
          >
        </div>
        <div
          class="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col gap-2.5"
        >
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <div class="flex items-center gap-1.5">
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="draft.mcp_enabled ? 'bg-primary' : 'bg-outline'"
                ></span>
                <span class="font-body-sm text-on-surface">{{
                  draft.mcp_enabled ? 'Activo (stdio)' : 'Desactivado'
                }}</span>
              </div>
              <span class="font-label-mono-sm text-[10px] text-outline"
                >Sincronización local</span
              >
            </div>
            <ToggleSwitch v-model="draft.mcp_enabled" />
          </div>
          <div
            class="flex items-center p-0.5 bg-surface-container-low rounded-lg border border-outline-variant/30 gap-1 text-[11px] font-label-mono-sm"
          >
            <button
              v-for="tab in mcpTabs"
              :key="tab"
              type="button"
              class="flex-1 py-1 rounded text-center transition-all"
              :class="
                mcpTab === tab
                  ? 'bg-surface-container-highest text-primary font-medium shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              "
              @click="mcpTab = tab"
            >
              {{ tab }}
            </button>
          </div>
          <div
            class="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-2.5 relative flex flex-col gap-1"
          >
            <div
              class="flex items-center justify-between pb-1 border-b border-outline-variant/20"
            >
              <span class="font-label-mono-sm text-[10px] text-outline">{{
                snippetFile
              }}</span>
              <button
                type="button"
                class="flex items-center gap-1 text-[10px] font-label-mono-sm text-primary hover:text-primary-fixed-dim transition-colors bg-primary/10 px-1.5 py-0.5 rounded"
                @click="copySnippet"
              >
                <span class="material-symbols-outlined text-[12px]"
                  >content_copy</span
                >
                <span>{{ copied ? 'Copiado' : 'Copiar' }}</span>
              </button>
            </div>
            <pre
              class="font-label-mono-sm text-[10px] text-on-surface-variant overflow-x-auto leading-relaxed pt-1 select-all"
              ><code>{{ snippet }}</code></pre
            >
          </div>
        </div>
      </div>
    </div>

    <div
      class="pt-4 mt-auto border-t border-outline-variant/30 flex items-center gap-2"
    >
      <button
        type="button"
        class="h-10 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-md transition-colors"
        @click="onReset"
      >
        Restablecer
      </button>
      <button
        type="button"
        class="flex-1 h-10 px-4 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md flex items-center justify-center gap-1.5 shadow-sm transition-all"
        @click="onSave"
      >
        <span class="material-symbols-outlined text-[18px]">check</span>
        <span>Guardar cambios</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, toRef } from 'vue'
import { useSettingsStore } from '@/stores/settings.store'
import { useTimerStore } from '@/stores/timer.store'
import DurationRow from '@/components/DurationRow.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const settingsStore = useSettingsStore()
const timer = useTimerStore()
const draft = toRef(settingsStore, 'draft')

const mcpTabs = ['Claude', 'ChatGPT', 'Cursor']
const mcpTab = ref('Claude')
const copied = ref(false)

function bump(key, delta) {
  const next = Math.max(1, Math.min(90, Number(draft.value[key]) + delta))
  draft.value[key] = next
}

const snippetFile = computed(() => {
  if (mcpTab.value === 'Claude') return 'claude_desktop_config.json'
  if (mcpTab.value === 'Cursor') return 'mcp.json'
  return 'config'
})

const snippet = computed(() => {
  const cfg = {
    mcpServers: {
      pomodoro: {
        command: 'node',
        args: ['mcp/index.js'],
        env: {}
      }
    }
  }
  return JSON.stringify(cfg, null, 2)
})

async function copySnippet() {
  try {
    await navigator.clipboard.writeText(snippet.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    /* ignore */
  }
}

async function onSave() {
  await settingsStore.save()
  await timer.refresh()
}

async function onReset() {
  await settingsStore.reset()
  await timer.refresh()
}
</script>
