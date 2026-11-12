<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40" aria-hidden="true" @click="$emit('close')" @contextmenu.prevent="$emit('close')"></div>
    <div v-if="open" role="menu" class="fixed z-50 w-[15.5rem] max-h-[min(24rem,70vh)] overflow-y-auto rounded-xl bg-surface-container-highest border border-outline-variant/40 shadow-xl py-1.5" :style="menuStyle">
      <button
        v-for="opt in PRIORITY_OPTIONS" :key="'p-' + opt.value" type="button" role="menuitemcheckbox"
        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
        :aria-checked="tasks.filters.priority === opt.value" @click.stop="$emit('pick', 'priority', opt.value)"
      >
        <span class="w-4 h-4 flex items-center justify-center shrink-0 text-on-surface-variant" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="10" width="2.5" height="4" rx="0.5" :opacity="opt.bars >= 1 ? 1 : 0.25" />
            <rect x="6.75" y="6.5" width="2.5" height="7.5" rx="0.5" :opacity="opt.bars >= 2 ? 1 : 0.25" />
            <rect x="11.5" y="3" width="2.5" height="11" rx="0.5" :opacity="opt.bars >= 3 ? 1 : 0.25" />
          </svg>
        </span>
        <span class="flex-1">{{ opt.label }}</span>
        <span v-if="tasks.filters.priority === opt.value" class="material-symbols-outlined text-[16px] text-primary">check</span>
      </button>

      <div class="my-1.5 mx-2 border-t border-outline-variant/30"></div>
      <div class="px-2.5 py-1 font-label-mono-sm uppercase tracking-wider text-outline flex items-center gap-1.5">
        <StatusGlyph status="blocked" :size="12" /> Estado
      </div>
      <button
        v-for="opt in STATUS_OPTIONS" :key="'s-' + opt.value" type="button" role="menuitemcheckbox"
        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
        :aria-checked="tasks.filters.status === opt.value" @click.stop="$emit('pick', 'status', opt.value)"
      >
        <span class="w-4 h-4 flex items-center justify-center shrink-0" :class="statusIconClass(opt.value)"><StatusGlyph :status="opt.value" /></span>
        <span class="flex-1">{{ opt.label }}</span>
        <span v-if="tasks.filters.status === opt.value" class="material-symbols-outlined text-[16px] text-primary">check</span>
      </button>

      <div class="my-1.5 mx-2 border-t border-outline-variant/30"></div>
      <div class="px-2.5 py-1 font-label-mono-sm uppercase tracking-wider text-outline flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[12px]">event</span> Fecha
      </div>
      <button
        v-for="opt in DUE_OPTIONS" :key="'d-' + opt.value" type="button" role="menuitemcheckbox"
        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
        :aria-checked="tasks.filters.due === opt.value" @click.stop="$emit('pick', 'due', opt.value)"
      >
        <span class="material-symbols-outlined text-[16px] shrink-0" :class="opt.iconClass">{{ opt.icon }}</span>
        <span class="flex-1">{{ opt.label }}</span>
        <span v-if="tasks.filters.due === opt.value" class="material-symbols-outlined text-[16px] text-primary">check</span>
      </button>

      <div class="my-1.5 mx-2 border-t border-outline-variant/30"></div>
      <div class="px-2.5 py-1 font-label-mono-sm uppercase tracking-wider text-outline flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[12px]">repeat</span> Tipo
      </div>
      <button
        type="button" role="menuitemcheckbox"
        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
        :aria-checked="tasks.filters.routine === true" @click.stop="$emit('pick', 'routine', true)"
      >
        <span class="material-symbols-outlined text-[16px] shrink-0 text-primary">repeat</span>
        <span class="flex-1">Solo rutinarias</span>
        <span v-if="tasks.filters.routine" class="material-symbols-outlined text-[16px] text-primary">check</span>
      </button>

      <template v-if="tags.length">
        <div class="my-1.5 mx-2 border-t border-outline-variant/30"></div>
        <div class="px-2.5 py-1 font-label-mono-sm uppercase tracking-wider text-outline flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[12px]">sell</span> Etiqueta
        </div>
        <button
          v-for="name in tags" :key="'t-' + name" type="button" role="menuitemcheckbox"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
          :aria-checked="tasks.filters.tag === name" @click.stop="$emit('pick', 'tag', name)"
        >
          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: tagDotColor(name) }" aria-hidden="true"></span>
          <span class="flex-1 truncate">{{ name }}</span>
          <span v-if="tasks.filters.tag === name" class="material-symbols-outlined text-[16px] text-primary">check</span>
        </button>
      </template>

      <div class="my-1.5 mx-2 border-t border-outline-variant/30"></div>
      <button
        type="button" role="menuitem" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm transition-colors"
        :class="tasks.hasActiveFilters ? 'text-on-surface hover:bg-surface-container-high' : 'text-outline cursor-default'"
        :disabled="!tasks.hasActiveFilters" @click.stop="$emit('clear')"
      >
        <span class="material-symbols-outlined text-[16px]">close</span>
        <span class="flex-1">Limpiar</span>
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { useTasksStore } from '@/stores/tasks.store'
import { tagDotColor } from '@/lib/tag-color'
import StatusGlyph from '@/components/StatusGlyph.vue'
import { PRIORITY_OPTIONS, STATUS_OPTIONS, DUE_OPTIONS, statusIconClass } from '@/lib/task-filter-options'

defineProps({ open: Boolean, menuStyle: Object, tags: Array })
defineEmits(['close', 'pick', 'clear'])
const tasks = useTasksStore()
</script>
