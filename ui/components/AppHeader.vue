<template>
  <header
    class="h-16 bg-surface-container-low border-b border-outline-variant/30 px-6 flex items-center justify-between z-10 app-drag"
  >
    <div class="flex items-center gap-6 app-no-drag">
      <div class="flex items-center gap-2.5">
        <span class="font-headline-md text-on-surface tracking-tight"
          >Pomodoro Serene Focus</span
        >
      </div>
    </div>
    <div
      class="flex items-center bg-surface-container px-3 py-1 rounded-full gap-2 app-no-drag"
    >
      <span class="material-symbols-outlined text-secondary text-[16px]"
        >local_fire_department</span
      >
      <span class="font-label-mono text-secondary-fixed"
        >{{ streak.days }} {{ streak.days === 1 ? 'día' : 'días' }} de
        racha</span
      >
    </div>
    <div class="flex items-center gap-3 app-no-drag">
      <nav class="flex items-center gap-1.5">
        <RouterLink
          to="/"
          class="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
          :class="
            panel === 'tasks' || panel === 'task-edit'
              ? 'bg-surface-container-high text-primary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
          "
          title="Tareas"
        >
          <span class="material-symbols-outlined text-[18px]">checklist</span>
        </RouterLink>
        <button
          type="button"
          class="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container text-on-surface-variant/40 cursor-not-allowed"
          title="Música (próximamente)"
          disabled
        >
          <span class="material-symbols-outlined text-[18px]">headphones</span>
        </button>
        <button
          type="button"
          class="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container text-on-surface-variant/40 cursor-not-allowed"
          title="Estadísticas (próximamente)"
          disabled
        >
          <span class="material-symbols-outlined text-[18px]">bar_chart</span>
        </button>
        <RouterLink
          to="/configuracion"
          class="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
          :class="
            panel === 'settings'
              ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
          "
          title="Configuración"
        >
          <span class="material-symbols-outlined text-[18px]">settings</span>
        </RouterLink>
      </nav>
      <button
        type="button"
        class="w-9 h-9 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary flex items-center justify-center transition-all shadow-sm ml-1"
        title="Cuenta / Perfil"
      >
        <span class="material-symbols-outlined text-[18px]">person</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { useStreakStore } from '../stores/streak.store'

defineProps({
  panel: { type: String, default: 'tasks' }
})

const streak = useStreakStore()
</script>
