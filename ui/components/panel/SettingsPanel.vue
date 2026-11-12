<template>
  <aside class="h-full w-full bg-surface-container-low p-5 flex flex-col justify-between overflow-y-auto">
    <div class="flex flex-col gap-5">
      <div class="flex items-center justify-between pb-3 border-b border-outline-variant/30">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[18px]">settings</span>
          </div>
          <h2 class="font-headline-md text-[18px] text-on-surface tracking-tight leading-tight">Configuración</h2>
        </div>
        <RouterLink to="/" class="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors" title="Cerrar panel">
          <span class="material-symbols-outlined text-[16px]">close</span>
        </RouterLink>
      </div>

      <div class="flex flex-col gap-2.5">
        <div class="flex items-center gap-1.5 text-on-surface-variant">
          <span class="material-symbols-outlined text-[16px] text-primary">timer</span>
          <span class="font-label-mono-sm uppercase tracking-wider text-outline">Cronómetro de Enfoque</span>
        </div>
        <div class="bg-surface-container p-3.5 rounded-xl border border-outline-variant/30 flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-on-surface font-body-sm font-medium">Modo de tiempo</span>
            <span class="font-label-mono-sm text-primary bg-primary/10 px-2.5 py-0.5 rounded-full font-medium">Libre continuo</span>
          </div>
          <p class="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
            El cronómetro registra el tiempo trabajado de forma continua y lo atribuye a la tarea seleccionada.
          </p>
        </div>
      </div>

      <SettingsSoundSection :draft="draft" />

      <div class="flex flex-col gap-2.5">
        <div class="flex items-center gap-1.5 text-on-surface-variant">
          <span class="material-symbols-outlined text-[16px] text-primary">headphones</span>
          <span class="font-label-mono-sm uppercase tracking-wider text-outline">Audio y Música</span>
        </div>
        <div class="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span class="font-body-sm text-on-surface">Spotify (enlace)</span>
          </div>
          <span class="font-label-mono-sm text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">MVP</span>
        </div>
      </div>

      <SettingsMcpSection :draft="draft" />
    </div>

    <div class="pt-4 mt-auto border-t border-outline-variant/30 flex items-center gap-2">
      <button type="button" class="h-10 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-md transition-colors" @click="onReset">Restablecer</button>
      <button type="button" class="flex-1 h-10 px-4 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md flex items-center justify-center gap-1.5 shadow-sm transition-all" @click="onSave">
        <span class="material-symbols-outlined text-[18px]">check</span>
        <span>Guardar cambios</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { toRef } from 'vue'
import { useSettingsStore } from '@/stores/settings.store'
import { useTimerStore } from '@/stores/timer.store'
import SettingsSoundSection from './SettingsSoundSection.vue'
import SettingsMcpSection from './SettingsMcpSection.vue'

const settingsStore = useSettingsStore()
const timer = useTimerStore()
const draft = toRef(settingsStore, 'draft')

const onSave = async () => { await settingsStore.save(); await timer.refresh() }
const onReset = async () => { await settingsStore.reset(); await timer.refresh() }
</script>
