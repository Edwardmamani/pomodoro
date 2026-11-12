<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/70 p-4 backdrop-blur-[2px]"
      role="presentation"
      @click.self="onCancel"
      @keydown.escape="onCancel"
    >
      <div
        class="w-full max-w-sm rounded-xl border border-outline-variant/30 bg-surface-container shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div class="px-5 pt-5 pb-3">
          <div class="flex items-start gap-3">
            <div
              class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              :class="action === 'delete' ? 'bg-error/15 text-error' : 'bg-primary/15 text-primary'"
            >
              <span class="material-symbols-outlined text-[20px]">
                {{ action === 'delete' ? 'delete_sweep' : 'edit_calendar' }}
              </span>
            </div>
            <div class="min-w-0">
              <h2
                :id="titleId"
                class="font-headline-md text-[18px] text-on-surface tracking-tight"
              >
                {{ title }}
              </h2>
              <p class="mt-1.5 font-body-sm text-on-surface-variant leading-relaxed">
                {{ message }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="px-5 py-4 border-t border-outline-variant/30 flex flex-col gap-2"
        >
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="h-9 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-label-md transition-colors cursor-pointer"
              @click="onCancel"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="h-9 px-3.5 rounded-xl border border-outline-variant/50 hover:bg-surface-container-high text-on-surface font-label-md transition-colors cursor-pointer"
              @click="onSelect('instance')"
            >
              Solo hoy
            </button>
            <button
              ref="allBtn"
              type="button"
              class="h-9 px-3.5 rounded-xl font-label-md transition-colors shadow-sm cursor-pointer"
              :class="
                action === 'delete'
                  ? 'bg-error hover:bg-error/90 text-on-error'
                  : 'bg-primary hover:bg-primary-fixed-dim text-on-primary'
              "
              @click="onSelect('all')"
            >
              Toda la rutina
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'

const open = defineModel('open', { type: Boolean, default: false })

const props = defineProps({
  action: {
    type: String,
    default: 'edit',
    validator: (v) => ['edit', 'delete'].includes(v)
  },
  taskTitle: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select', 'cancel'])
const allBtn = ref(null)
const titleId = useId()

const title = computed(() =>
  props.action === 'delete'
    ? '¿Eliminar tarea rutinaria?'
    : '¿Modificar tarea rutinaria?'
)

const message = computed(() => {
  const prefix = props.taskTitle ? `«${props.taskTitle}» es una tarea rutinaria. ` : ''
  return props.action === 'delete'
    ? `${prefix}¿Deseas eliminar solo la tarea de hoy o toda la serie rutinaria?`
    : `${prefix}¿Deseas aplicar estos cambios solo a la tarea de hoy o a todas las ocurrencias futuras de la rutina?`
})

function onCancel() {
  open.value = false
  emit('cancel')
}

function onSelect(scope) {
  open.value = false
  emit('select', scope)
}

watch(open, async (v) => {
  if (v) {
    await nextTick()
    allBtn.value?.focus()
  }
})

onMounted(() => {
  if (open.value) allBtn.value?.focus()
})
</script>
