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
        class="w-full max-w-sm rounded-xl border border-outline-variant/30 bg-surface-container shadow-xl"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div class="px-5 pt-5 pb-3">
          <div class="flex items-start gap-3">
            <div
              class="w-9 h-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0"
            >
              <span class="material-symbols-outlined text-[20px]">warning</span>
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
          class="px-5 py-4 border-t border-outline-variant/30 flex items-center justify-end gap-2"
        >
          <button
            type="button"
            class="h-9 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-label-md transition-colors"
            @click="onCancel"
          >
            {{ cancelLabel }}
          </button>
          <button
            ref="confirmBtn"
            type="button"
            class="h-9 px-4 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md transition-colors shadow-sm"
            @click="onConfirm"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onMounted, ref, useId, watch } from 'vue'

const open = defineModel('open', { type: Boolean, default: false })

defineProps({
  title: { type: String, default: 'Confirmar' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirmar' },
  cancelLabel: { type: String, default: 'Cancelar' }
})

const emit = defineEmits(['confirm', 'cancel'])
const confirmBtn = ref(null)
const titleId = useId()

function onCancel() {
  open.value = false
  emit('cancel')
}

function onConfirm() {
  open.value = false
  emit('confirm')
}

watch(open, async (v) => {
  if (v) {
    await nextTick()
    confirmBtn.value?.focus()
  }
})

onMounted(() => {
  if (open.value) confirmBtn.value?.focus()
})
</script>
