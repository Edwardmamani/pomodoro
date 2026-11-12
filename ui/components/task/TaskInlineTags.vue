<template>
  <div class="relative flex items-center gap-1.5 flex-wrap min-w-0" @click.stop>
    <span
      v-for="(name, index) in tags"
      :key="`${name}-${index}`"
      class="group/tag relative inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded bg-surface-container text-outline"
    >
      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: tagDotColor(name) }" aria-hidden="true"></span>
      <span class="max-w-[7rem] truncate">{{ name }}</span>
      <button
        type="button"
        class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-surface-container-highest text-outline opacity-0 group-hover/tag:opacity-100 hover:text-error hover:bg-error/15 flex items-center justify-center shadow-sm transition-opacity"
        :title="`Quitar ${name}`"
        :aria-label="`Quitar etiqueta ${name}`"
        @click="removeTag(index)"
      >
        <span class="material-symbols-outlined text-[8px] leading-none">close</span>
      </button>
    </span>
    <button
      v-if="!addingTag"
      type="button"
      class="w-5 h-5 rounded-md bg-surface-container-highest text-on-surface-variant hover:text-primary hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors"
      title="Añadir etiqueta"
      aria-label="Añadir etiqueta"
      @click="startAddTag"
    >
      <span class="material-symbols-outlined text-[16px]">add</span>
    </button>
    <div v-else class="relative">
      <input
        ref="tagInput"
        v-model="tagQuery"
        type="text"
        maxlength="40"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="open-tag-suggestions"
        :aria-expanded="showSuggestions"
        :aria-activedescendant="activeSuggestion >= 0 ? `open-tag-option-${activeSuggestion}` : undefined"
        autocomplete="off"
        placeholder="Etiqueta"
        class="w-[5.5rem] h-5 px-1.5 rounded-md bg-surface-container-highest text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40"
        @focus="tagFocused = true"
        @keydown="onTagKeydown"
        @blur="onTagBlur"
      />
      <ul
        v-if="showSuggestions"
        id="open-tag-suggestions"
        role="listbox"
        class="absolute left-0 top-[calc(100%+4px)] z-20 min-w-[9rem] max-h-40 overflow-y-auto rounded-lg border border-outline-variant/40 bg-surface-container-high shadow-lg py-1"
      >
        <li
          v-for="(name, index) in suggestions"
          :id="`open-tag-option-${index}`"
          :key="name"
          role="option"
          :aria-selected="index === activeSuggestion"
          class="px-2.5 py-1.5 font-label-mono-sm cursor-pointer transition-colors flex items-center gap-1.5"
          :class="index === activeSuggestion ? 'bg-primary/15 text-primary' : 'text-on-surface hover:bg-surface-container-highest'"
          @mousedown.prevent="commitTag(name)"
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

const props = defineProps({ tags: { type: Array, default: () => [] } })
const emit = defineEmits(['update'])
const tagQuery = ref(''), addingTag = ref(false), tagInput = ref(null), knownTags = ref([]), tagFocused = ref(false), activeSuggestion = ref(-1)
const suggestions = computed(() => suggestTags(tagQuery.value, knownTags.value, { limit: 6, exclude: props.tags }))
const showSuggestions = computed(() => addingTag.value && tagFocused.value && suggestions.value.length > 0)
watch(suggestions, () => { activeSuggestion.value = suggestions.value.length ? 0 : -1 })

function resetInput() { tagQuery.value = ''; addingTag.value = false; tagFocused.value = false; activeSuggestion.value = -1 }
function commitTag(rawName) {
  const name = String(rawName || '').trim()
  resetInput()
  if (name && !props.tags.some((t) => t.toLowerCase() === name.toLowerCase())) emit('update', [...props.tags, name])
}
function removeTag(index) { const next = [...props.tags]; next.splice(index, 1); emit('update', next) }
async function startAddTag() {
  addingTag.value = true; tagFocused.value = true; activeSuggestion.value = -1
  const res = await window.pomodoroAPI.tasks.listTags()
  if (res?.ok) knownTags.value = res.data || []
  await nextTick(); tagInput.value?.focus()
}
function onTagBlur() {
  setTimeout(() => {
    tagFocused.value = false; activeSuggestion.value = -1
    if (!addingTag.value) return
    if (tagQuery.value.trim()) commitTag(tagQuery.value)
    else addingTag.value = false
  }, 120)
}
function onTagKeydown(e) {
  if (e.key === 'Backspace' && !tagQuery.value) { e.preventDefault(); resetInput(); return }
  if (!showSuggestions.value) {
    if (e.key === 'ArrowDown' && suggestions.value.length) { tagFocused.value = true; activeSuggestion.value = 0; e.preventDefault() }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commitTag(tagQuery.value) }
    else if (e.key === 'Escape') { e.preventDefault(); resetInput() }
    return
  }
  if (e.key === 'ArrowDown') { e.preventDefault(); activeSuggestion.value = (activeSuggestion.value + 1) % suggestions.value.length }
  else if (e.key === 'ArrowUp') { e.preventDefault(); activeSuggestion.value = (activeSuggestion.value - 1 + suggestions.value.length) % suggestions.value.length }
  else if (e.key === 'Enter') { e.preventDefault(); commitTag(activeSuggestion.value >= 0 ? suggestions.value[activeSuggestion.value] : tagQuery.value) }
  else if (e.key === ' ') { e.preventDefault(); commitTag(tagQuery.value) }
  else if (e.key === 'Escape') { e.preventDefault(); tagFocused.value = false; activeSuggestion.value = -1; if (!tagQuery.value.trim()) addingTag.value = false }
}
</script>
