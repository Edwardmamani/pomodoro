const STORAGE_KEY = 'pomodoro.sidebarWidth'
const DEFAULT_WIDTH = 320
const MIN_SIDEBAR = 260
const MIN_TIMER = 420

export class SidebarSplitter {
  constructor(splitRowRef, sidebarWidthRef, draggingRef) {
    this.splitRow = splitRowRef
    this.sidebarWidth = sidebarWidthRef
    this.dragging = draggingRef
    this.dragStartX = 0
    this.dragStartWidth = 0
    this.onDragMove = (e) => this._move(e.clientX)
    this.onDragEnd = () => this._endMouse()
    this.onTouchMove = (e) => {
      if (!this.dragging.value) return
      e.preventDefault()
      if (e.touches[0]) this._move(e.touches[0].clientX)
    }
    this.onTouchEnd = () => this._endTouch()
    this.onWindowResize = () => this.applyWidth(this.sidebarWidth.value)
  }

  loadWidth() {
    try {
      const n = Number(localStorage.getItem(STORAGE_KEY))
      if (Number.isFinite(n) && n >= MIN_SIDEBAR) this.sidebarWidth.value = n
    } catch { /* ignore */ }
    this.applyWidth(this.sidebarWidth.value)
  }

  saveWidth() {
    try { localStorage.setItem(STORAGE_KEY, String(Math.round(this.sidebarWidth.value))) } catch { /* ignore */ }
  }

  applyWidth(width) {
    const rowW = this.splitRow.value?.clientWidth || window.innerWidth
    const max = Math.max(MIN_SIDEBAR, rowW - MIN_TIMER)
    this.sidebarWidth.value = Math.min(max, Math.max(MIN_SIDEBAR, width))
  }

  _move(clientX) {
    if (this.dragging.value) this.applyWidth(this.dragStartWidth + (this.dragStartX - clientX))
  }

  startMouse(e) {
    this.dragging.value = true
    this.dragStartX = e.clientX
    this.dragStartWidth = this.sidebarWidth.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', this.onDragMove)
    window.addEventListener('mouseup', this.onDragEnd)
  }

  _endMouse() {
    if (!this.dragging.value) return
    this.dragging.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', this.onDragMove)
    window.removeEventListener('mouseup', this.onDragEnd)
    this.saveWidth()
  }

  startTouch(e) {
    const touch = e.touches[0]
    if (!touch) return
    this.dragging.value = true
    this.dragStartX = touch.clientX
    this.dragStartWidth = this.sidebarWidth.value
    window.addEventListener('touchmove', this.onTouchMove, { passive: false })
    window.addEventListener('touchend', this.onTouchEnd)
  }

  _endTouch() {
    if (!this.dragging.value) return
    this.dragging.value = false
    window.removeEventListener('touchmove', this.onTouchMove)
    window.removeEventListener('touchend', this.onTouchEnd)
    this.saveWidth()
  }

  handleKey(e) {
    const step = e.shiftKey ? 40 : 16
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.applyWidth(this.sidebarWidth.value + step); this.saveWidth() }
    else if (e.key === 'ArrowRight') { e.preventDefault(); this.applyWidth(this.sidebarWidth.value - step); this.saveWidth() }
  }

  mount() {
    this.loadWidth()
    window.addEventListener('resize', this.onWindowResize)
  }

  unmount() {
    window.removeEventListener('resize', this.onWindowResize)
    window.removeEventListener('mousemove', this.onDragMove)
    window.removeEventListener('mouseup', this.onDragEnd)
    window.removeEventListener('touchmove', this.onTouchMove)
    window.removeEventListener('touchend', this.onTouchEnd)
  }
}

export { DEFAULT_WIDTH }
