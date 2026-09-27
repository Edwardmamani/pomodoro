<template>
  <div class="md-editor-root editing-toolbar" role="toolbar" aria-label="Editing Toolbar">
    <button type="button" title="Negrita (Ctrl+B)" @click="emit('command', 'bold')">
      <strong>B</strong>
    </button>
    <button type="button" title="Cursiva (Ctrl+I)" @click="emit('command', 'italic')">
      <em>I</em>
    </button>
    <button type="button" title="Subrayado (Ctrl+U)" @click="emit('command', 'underline')">
      <span class="underline-label">U</span>
    </button>

    <div ref="colorMenuRef" class="color-menu">
      <button
        type="button"
        class="color-trigger"
        title="Color de letra"
        :aria-expanded="colorMenuOpen"
        aria-haspopup="menu"
        @click="colorMenuOpen = !colorMenuOpen"
      >
        <span class="color-letter" :style="{ borderBottomColor: lastColor }">A</span>
        <span class="chevron" aria-hidden="true">▾</span>
      </button>

      <div v-if="colorMenuOpen" class="color-flyout" role="menu">
        <div class="color-section-label">Colores</div>
        <div class="color-grid">
          <button
            v-for="c in fontColors"
            :key="c"
            type="button"
            role="menuitem"
            class="swatch"
            :title="c"
            :style="{ background: c }"
            @click="pickColor(c)"
          />
        </div>
        <button
          type="button"
          class="clear-color"
          role="menuitem"
          title="Quitar color"
          @click="pickColor(null)"
        >
          Quitar color
        </button>
      </div>
    </div>

    <div ref="highlightMenuRef" class="color-menu">
      <button
        type="button"
        class="color-trigger"
        title="Resaltado"
        :aria-expanded="highlightMenuOpen"
        aria-haspopup="menu"
        @click="highlightMenuOpen = !highlightMenuOpen"
      >
        <svg class="icon highlight-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 20h7l9.5-9.5a2.1 2.1 0 0 0 0-3L16.5 3.5a2.1 2.1 0 0 0-3 0L4 13v7z"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path d="M13 6.5l4.5 4.5" stroke="currentColor" stroke-width="2" />
          <path
            d="M3 21h8"
            :stroke="lastHighlight"
            stroke-width="3"
            stroke-linecap="round"
          />
        </svg>
        <span class="chevron" aria-hidden="true">▾</span>
      </button>

      <div v-if="highlightMenuOpen" class="color-flyout highlight-flyout" role="menu">
        <div class="color-section-label">Resaltado</div>
        <div class="color-grid highlight-grid">
          <button
            v-for="c in highlightColors"
            :key="c"
            type="button"
            role="menuitem"
            class="swatch"
            :title="c"
            :style="{ background: c }"
            @click="pickHighlight(c)"
          />
        </div>
        <button
          type="button"
          class="clear-color"
          role="menuitem"
          title="Quitar resaltado"
          @click="pickHighlight(null)"
        >
          Quitar resaltado
        </button>
      </div>
    </div>

    <span class="sep" />
    <button type="button" title="Título 1" @click="emit('command', 'heading', 1)">H1</button>
    <button type="button" title="Título 2" @click="emit('command', 'heading', 2)">H2</button>
    <button type="button" title="Título 3" @click="emit('command', 'heading', 3)">H3</button>
    <span class="sep" />
    <button type="button" title="Enlace (Ctrl+K)" @click="emit('command', 'link')">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M10 13a5 5 0 0 0 7.54.54l1.92-1.92a5 5 0 0 0-7.07-7.07L10.8 6.1"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M14 11a5 5 0 0 0-7.54-.54L4.54 12.38a5 5 0 0 0 7.07 7.07L13.2 17.9"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <button type="button" title="Imagen → assets/" @click="emit('command', 'image')">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
        <path
          d="M21 16l-5.5-5.5L9 17l-3-3-3 3"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div ref="listMenuRef" class="list-menu">
      <button
        type="button"
        class="list-trigger"
        title="Listas"
        :aria-expanded="listMenuOpen"
        aria-haspopup="menu"
        @click="listMenuOpen = !listMenuOpen"
      >
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="4" cy="6" r="1.5" fill="currentColor" />
          <circle cx="4" cy="12" r="1.5" fill="currentColor" />
          <circle cx="4" cy="18" r="1.5" fill="currentColor" />
          <path
            d="M9 6h12M9 12h12M9 18h12"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
        <span class="chevron" aria-hidden="true">▾</span>
      </button>

      <div v-if="listMenuOpen" class="list-flyout" role="menu">
        <button
          type="button"
          role="menuitem"
          title="Lista de tareas"
          @click="pickList('checklist')"
        >
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="3"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M7 12l3.5 3.5L17 8"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          role="menuitem"
          title="Lista numerada"
          @click="pickList('numbered')"
        >
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <text
              x="3"
              y="8"
              fill="currentColor"
              font-size="7"
              font-family="system-ui,sans-serif"
              font-weight="700"
            >
              1
            </text>
            <text
              x="3"
              y="14.5"
              fill="currentColor"
              font-size="7"
              font-family="system-ui,sans-serif"
              font-weight="700"
            >
              2
            </text>
            <text
              x="3"
              y="21"
              fill="currentColor"
              font-size="7"
              font-family="system-ui,sans-serif"
              font-weight="700"
            >
              3
            </text>
            <path
              d="M10 6h11M10 12.5h11M10 19h11"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              fill="none"
            />
          </svg>
        </button>
        <button
          type="button"
          role="menuitem"
          title="Lista con viñetas"
          @click="pickList('bullet')"
        >
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="4" cy="6" r="1.5" fill="currentColor" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" />
            <path
              d="M9 6h12M9 12h12M9 18h12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              fill="none"
            />
          </svg>
        </button>
      </div>
    </div>

    <button type="button" title="Cita" @click="emit('command', 'quote')">Cita</button>
    <button type="button" title="Código" @click="emit('command', 'code')">
      <code>&lt;/&gt;</code>
    </button>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const emit = defineEmits(["command"]);

const listMenuOpen = ref(false);
const listMenuRef = ref(null);
const colorMenuOpen = ref(false);
const colorMenuRef = ref(null);
const highlightMenuOpen = ref(false);
const highlightMenuRef = ref(null);
const lastColor = ref("#e06666");
const lastHighlight = ref("#40a9ff");

/** Paleta estándar (similar a editores WYSIWYG). */
const fontColors = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#b7b7b7",
  "#cccccc",
  "#d9d9d9",
  "#efefef",
  "#f3f3f3",
  "#ffffff",
  "#980000",
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#4a86e8",
  "#0000ff",
  "#9900ff",
  "#ff00ff",
  "#e6b8af",
  "#f4cccc",
  "#fce5cd",
  "#fff2cc",
  "#d9ead3",
  "#d0e0e3",
  "#c9daf8",
  "#cfe2f3",
  "#d9d2e9",
  "#ead1dc",
  "#dd7e6b",
  "#ea9999",
  "#f9cb9c",
  "#ffe599",
  "#b6d7a8",
  "#a2c4c9",
  "#a4c2f4",
  "#9fc5e8",
  "#b4a7d6",
  "#d5a6bd",
  "#cc4125",
  "#e06666",
  "#f6b26b",
  "#ffd966",
  "#93c47d",
  "#76a5af",
  "#6d9eeb",
  "#6fa8dc",
  "#8e7cc3",
  "#c27ba0",
  "#a61c00",
  "#cc0000",
  "#e69138",
  "#f1c232",
  "#6aa84f",
  "#45818e",
  "#3c78d8",
  "#3d85c6",
  "#674ea7",
  "#a64d79",
];

/** Colores de resaltado (tipo marcador). */
const highlightColors = [
  "#fff59d",
  "#c8e6c9",
  "#b2dfdb",
  "#bbdefb",
  "#f8bbd0",
  "#e1bee7",
  "#b3e5fc",
  "#ffcdd2",
  "#ffe082",
  "#d1c4e9",
  "#40a9ff",
  "#69f0ae",
  "#ffab40",
  "#ff5252",
  "#ea80fc",
  "#ffff8d",
  "#ccff90",
  "#80d8ff",
  "#ff80ab",
  "#b388ff",
];

function pickList(type) {
  emit("command", "list", type);
  listMenuOpen.value = false;
}

function pickColor(color) {
  if (color) lastColor.value = color;
  emit("command", "fontColor", color);
  colorMenuOpen.value = false;
}

function pickHighlight(color) {
  if (color) lastHighlight.value = color;
  emit("command", "highlight", color);
  highlightMenuOpen.value = false;
}

function onDocClick(event) {
  if (!listMenuRef.value?.contains(event.target)) {
    listMenuOpen.value = false;
  }
  if (!colorMenuRef.value?.contains(event.target)) {
    colorMenuOpen.value = false;
  }
  if (!highlightMenuRef.value?.contains(event.target)) {
    highlightMenuOpen.value = false;
  }
}

onMounted(() => document.addEventListener("mousedown", onDocClick));
onBeforeUnmount(() => document.removeEventListener("mousedown", onDocClick));
</script>

<style scoped>
.editing-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid var(--border);
  background: #171b24;
}

.editing-toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  padding: 0.3rem 0.55rem;
  font-size: 0.85rem;
  border-radius: 6px;
}

.editing-toolbar button code {
  font-family: "IBM Plex Mono", Consolas, monospace;
  font-size: 0.75rem;
}

.underline-label {
  text-decoration: underline;
  text-underline-offset: 2px;
  font-weight: 600;
}

.sep {
  width: 1px;
  height: 1.25rem;
  background: var(--border);
  margin: 0 0.2rem;
}

.list-menu,
.color-menu {
  position: relative;
  display: inline-flex;
}

.list-trigger,
.color-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.25rem 0.4rem;
}

.list-trigger[aria-expanded="true"],
.color-trigger[aria-expanded="true"] {
  border-color: var(--accent);
  background: #222836;
}

.color-letter {
  display: inline-block;
  font-weight: 700;
  line-height: 1;
  border-bottom: 3px solid #e06666;
  padding-bottom: 1px;
}

.icon {
  width: 1.1rem;
  height: 1.1rem;
  display: block;
}

.chevron {
  font-size: 0.65rem;
  line-height: 1;
  opacity: 0.75;
}

.list-flyout,
.color-flyout {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  z-index: 20;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #1c212c;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.list-flyout {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem;
}

.list-flyout button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.1rem;
  height: 2.1rem;
  padding: 0.3rem;
}

.color-flyout {
  width: 15.5rem;
  padding: 0.55rem;
}

.highlight-flyout {
  width: 11rem;
}

.highlight-grid {
  grid-template-columns: repeat(5, 1fr);
}

.highlight-icon {
  overflow: visible;
}

.color-section-label {
  font-size: 0.7rem;
  color: var(--muted);
  margin-bottom: 0.35rem;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 3px;
}

.swatch {
  width: 1.2rem;
  height: 1.2rem;
  min-width: 0;
  padding: 0;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.swatch:hover {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.clear-color {
  width: 100%;
  margin-top: 0.45rem;
  font-size: 0.75rem;
  padding: 0.35rem 0.5rem;
}
</style>
