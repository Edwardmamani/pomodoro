import { createDocument } from '@edward-dev/editor-markdown-vue'

export class NoteEditorController {
  constructor(getTaskId, refs) {
    this.getTaskId = getTaskId
    this.refs = refs
    this.saveTimer = null
    this.loadToken = 0
    this.doc = createDocument({
      load: async () => {
        const res = await window.pomodoroAPI.notes.load(this.getTaskId())
        return res?.ok ? { content: res.data.content ?? '', filePath: res.data.filePath } : null
      },
      save: async ({ content }) => {
        const res = await window.pomodoroAPI.notes.save(this.getTaskId(), content ?? '')
        return res?.ok ? { filePath: res.data.filePath } : null
      }
    })
  }

  clearTimer() {
    if (this.saveTimer != null) { clearTimeout(this.saveTimer); this.saveTimer = null }
  }

  async load() {
    this.clearTimer()
    const token = ++this.loadToken
    this.refs.loading.value = true
    this.refs.status.value = ''
    try {
      const result = await this.doc.load()
      if (token !== this.loadToken) return
      this.refs.content.value = result?.content ?? ''
      this.refs.filePath.value = result?.filePath ?? null
    } catch {
      if (token !== this.loadToken) return
      this.refs.content.value = ''
      this.refs.filePath.value = null
      this.refs.status.value = 'No se pudo cargar'
    } finally {
      if (token === this.loadToken) this.refs.loading.value = false
    }
  }

  onChange() {
    this.doc.setContent(this.refs.content.value)
    this.refs.status.value = 'Sin guardar'
    this.clearTimer()
    this.saveTimer = setTimeout(() => { void this.persist() }, 450)
  }

  async persist() {
    this.clearTimer()
    if (this.refs.loading.value || !this.getTaskId()) return
    this.doc.setContent(this.refs.content.value)
    if (!this.doc.isDirty()) return
    this.refs.status.value = 'Guardando…'
    try {
      const result = await this.doc.save()
      if (result?.filePath) this.refs.filePath.value = result.filePath
      this.refs.status.value = 'Guardado'
    } catch {
      this.refs.status.value = 'Error al guardar'
    }
  }

  async handleCommand(name, arg, kitRef) {
    if (name !== 'image' || arg) return
    const res = await window.pomodoroAPI.notes.pickAsset(this.getTaskId())
    if (res?.ok && res.data?.relativePath) kitRef.value?.runCommand('image', res.data.relativePath)
  }

  destroy() {
    this.clearTimer()
    if (this.doc.isDirty()) void this.persist()
  }
}
