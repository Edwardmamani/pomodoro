<template>
  <div class="flex flex-col gap-2.5">
    <div class="flex items-center gap-1.5 text-on-surface-variant">
      <span class="material-symbols-outlined text-[16px] text-primary">notifications_active</span>
      <span class="font-label-mono-sm uppercase tracking-wider text-outline">Sonido y Notificaciones</span>
    </div>
    <div class="bg-surface-container p-3 rounded-xl border border-outline-variant/30 flex flex-col gap-2.5">
      <div class="flex items-center justify-between">
        <span class="font-body-sm text-on-surface">Sonido campana</span>
        <ToggleSwitch v-model="draft.sound_enabled" />
      </div>
      <div class="flex flex-col gap-1.5 pt-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-on-surface">
            <span class="material-symbols-outlined text-[15px] text-primary">volume_up</span>
            <span class="font-body-sm">Volumen sonido</span>
          </div>
          <span class="font-label-mono-sm text-[11px] text-primary font-medium">{{ draft.sound_volume }}%</span>
        </div>
        <input
          v-model.number="draft.sound_volume" type="range" min="0" max="100"
          class="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-surface-container-highest"
          style="accent-color: #3d9970"
        />
      </div>
      <div class="flex items-center justify-between">
        <span class="font-body-sm text-on-surface">Notificaciones nativas</span>
        <ToggleSwitch v-model="draft.notifications_enabled" />
      </div>
      <div class="flex items-center justify-between">
        <span class="font-body-sm text-on-surface">Modo No Molestar auto</span>
        <ToggleSwitch v-model="draft.do_not_disturb_auto" />
      </div>
    </div>
  </div>
</template>

<script setup>
import ToggleSwitch from '@/components/ToggleSwitch.vue'
defineProps({ draft: { type: Object, required: true } })
</script>
