export class FloatingMenuPositioner {
  constructor(triggerRef, menuStyleRef, { width = 184, height = 168, align = 'left' } = {}) {
    this.triggerRef = triggerRef
    this.menuStyleRef = menuStyleRef
    this.width = width
    this.height = height
    this.align = align
  }

  place(customHeight) {
    const trigger = this.triggerRef.value
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const menuH = customHeight ?? this.height
    const pad = 8
    let top = rect.bottom + 4
    let left = this.align === 'right' ? rect.right - this.width : rect.left
    if (top + menuH > window.innerHeight - pad) top = Math.max(pad, rect.top - menuH - 4)
    if (left + this.width > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - this.width - pad)
    if (left < pad) left = pad
    this.menuStyleRef.value = { top: `${top}px`, left: `${left}px` }
  }
}
