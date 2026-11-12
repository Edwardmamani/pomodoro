<template>
  <div class="flex flex-col gap-1.5">
    <span id="tag-field-label" class="font-label-mono-sm uppercase tracking-wider text-on-surface-variant text-[11px]">Etiquetas</span>
    <div class="relative">
      <div
        class="min-h-10 px-2 py-1.5 rounded-xl bg-[#28282b] border border-white/10 flex flex-wrap items-center gap-1.5 focus-within:border-primary transition-colors cursor-text"
        @click="tagInput?.focus()"
      >
        <span
          v-for="(name, index) in modelValue"
          :key="`${name}-${index}`"
          class="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-lg bg-white/10 text-white font-body-sm max-w-full"
        >
          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: tagDotColor(name) }" aria-hidden="true"></span>
          <span class="truncate">{{ name }}</span>
          <button
            type="button"
            class="w-4 h-4 rounded-full flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
            :title="`Quitar ${name}`"
            @click.stop="removeTag(index)"
          ><span class="material-symbols-outlined text-[12px]">close</span></button>
        </span>

        <input
          id="tag-input"
          ref="tagInput"
          v-model="query"
          type="text"
          maxlength="40"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="tag-suggestions"
          :aria-expanded="showSuggestions"
          :aria-activedescendant="activeSuggestion >= 0 ? `tag-option-${activeSuggestion}` : undefined"
          aria-labelledby="tag-field-label"
          :placeholder="modelValue.length ? 'Añadir otra…' : 'Separadas por espacio · Ej. Urgente'"
          autocomplete="off"
          class="flex-1 min-w-[7rem] h-7 px-1 bg-transparent border-0 text-white font-body-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-0"
          @focus="tagFocused = true"
          @blur="onBlur"
          @keydown="onKeydown"
          @input="onInput"
        />
      </div>

      <ul v-if="showSuggestions" id="tag-suggestions" role="listbox" class="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#252528] shadow-xl py-1 backdrop-blur-md">
        <li
          v-for="(name, index) in suggestions"
          :id="`tag-option-${index}`"
          :key="name"
          role="option"
          :aria-selected="index === activeSuggestion"
          class="px-3 py-2 font-body-sm cursor-pointer transition-colors flex items-center gap-2"
          :class="index === activeSuggestion ? 'bg-primary/20 text-primary' : 'text-white hover:bg-white/10'"
          @mousedown.prevent="applySuggestion(name)"
          @mouseenter="activeSuggestion = index"
        >
          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: tagDotColor(name) }" aria-hidden="true"></span>
          {{ name }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { suggestTags } from '@/lib/levenshtein'
import { tagDotColor } from '@/lib/tag-color'

const props = defineProps({ modelValue: { type: Array, default: () => [] }, knownTags: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue'])
const query = defineModel('query', { type: String, default: '' })

const tagInput = ref(null)
const tagFocused = ref(false)
const activeSuggestion = ref(-1)

const suggestions = computed(() => suggestTags(query.value, props.knownTags, { limit: 6, exclude: props.modelValue }))
const showSuggestions = computed(() => tagFocused.value && suggestions.value.length > 0)
watch(suggestions, () => { activeSuggestion.value = suggestions.value.length ? 0 : -1 })

function commitTag(rawName) {
  const name = String(rawName || '').trim()
  if (!name) return
  if (!props.modelValue.some((t) => t.toLowerCase() === name.toLowerCase())) emit('update:modelValue', [...props.modelValue, name])
  query.value = ''; activeSuggestion.value = -1
}

function removeTag(index) {
  const next = [...props.modelValue]; next.splice(index, 1); emit('update:modelValue', next); tagInput.value?.focus()
}

function applySuggestion(name) {
  commitTag(name); tagFocused.value = true; nextTick(() => tagInput.value?.focus())
}

function onInput() {
  if (query.value.endsWith(' ') || query.value.endsWith(',')) { const raw = query.value.slice(0, -1).trim(); if (raw) commitTag(raw) }
}

function onBlur() {
  setTimeout(() => { if (query.value.trim()) commitTag(query.value); tagFocused.value = false }, 180)
}

function onKeydown(e) {
  if (e.key === 'Backspace' && !query.value && props.modelValue.length) emit('update:modelValue', props.modelValue.slice(0, -1))
  else if (e.key === 'Tab' && query.value.trim()) { e.preventDefault(); commitTag(query.value) }
  else if (e.key === 'ArrowDown' && suggestions.value.length) { e.preventDefault(); activeSuggestion.value = (activeSuggestion.value + 1) % suggestions.value.length }
  else if (e.key === 'ArrowUp' && suggestions.value.length) { e.preventDefault(); activeSuggestion.value = (activeSuggestion.value - 1 + suggestions.value.length) % suggestions.value.length }
  else if (e.key === 'Enter') { e.preventDefault(); activeSuggestion.value >= 0 ? applySuggestion(suggestions.value[activeSuggestion.value]) : commitTag(query.value) }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tagFocused.value = false; activeSuggestion.value = -1 }
}

defineExpose({ reset: () => { query.value = ''; tagFocused.value = false; activeSuggestion.value = -1 } })
</script>
