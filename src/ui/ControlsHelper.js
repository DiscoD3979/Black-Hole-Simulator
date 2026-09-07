/**
 * ControlsHelper — компактная кликабельная шпаргалка по управлению
 * в левом нижнем углу. Клавиши-чипы можно кликать:
 *  - W/A/S/D/Q/E/Shift: зажатие чипа = удержание клавиши;
 *  - R/B/F3/T/H: клик = нажатие клавиши (события уходят в window);
 *  - ЛКМ: клик = захват мыши (pointer lock).
 *
 * События генерируются как настоящие KeyboardEvent, поэтому вся
 * существующая обработка ввода (InputManager, main.js) работает без изменений.
 */

const HOLD_KEYS = [
  { code: 'KeyW', label: 'W', desc: 'вперёд' },
  { code: 'KeyA', label: 'A', desc: 'влево' },
  { code: 'KeyS', label: 'S', desc: 'назад' },
  { code: 'KeyD', label: 'D', desc: 'вправо' },
  { code: 'KeyQ', label: 'Q', desc: 'вниз' },
  { code: 'KeyE', label: 'E', desc: 'вверх' },
  { code: 'ShiftLeft', label: '⇧', desc: 'ускорение' },
]

const TAP_KEYS = [
  { code: 'KeyR', label: 'R', desc: 'сброс камеры' },
  { code: 'KeyB', label: 'B', desc: 'бенчмарк вкл/выкл' },
  { code: 'F3', label: 'F3', desc: 'режим без постобработки' },
  { code: 'KeyH', label: 'H', desc: 'скрыть интерфейс' },
]

export class ControlsHelper {
  constructor() {
    this._element = null
    this._activeChips = new Map()
  }

  init(parent = document.body) {
    if (this._element) return this._element

    const root = document.createElement('div')
    root.className = 'bh-controls'

    const titleRow = document.createElement('div')
    titleRow.className = 'bh-controls__title'

    const title = document.createElement('span')
    title.textContent = 'Управление'

    const collapseBtn = document.createElement('button')
    collapseBtn.className = 'bh-controls__collapse'
    collapseBtn.type = 'button'
    collapseBtn.textContent = '—'
    collapseBtn.title = 'Свернуть / развернуть'
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      const collapsed = root.classList.toggle('collapsed')
      collapseBtn.textContent = collapsed ? '+' : '—'
    })

    titleRow.appendChild(title)
    titleRow.appendChild(collapseBtn)
    root.appendChild(titleRow)

    // Mouse look row (pointer lock on click)
    root.appendChild(this._makeRow([this._makeMouseChip()], 'мышь — обзор (клик)'))

    // Hold keys: press and hold to move
    const holdRow = document.createElement('div')
    holdRow.className = 'bh-controls__row'
    const holdDesc = document.createElement('span')
    holdDesc.className = 'bh-controls__desc'
    holdDesc.textContent = 'движение'
    holdRow.appendChild(holdDesc)
    for (const k of HOLD_KEYS) {
      holdRow.appendChild(this._makeHoldChip(k))
    }
    root.appendChild(holdRow)

    // Tap keys
    for (const k of TAP_KEYS) {
      root.appendChild(this._makeRow([this._makeTapChip(k)], k.desc))
    }

    // Wheel row (info only)
    root.appendChild(this._makeRow([this._makeStaticChip('⇕')], 'колесо — скорость'))

    // Block canvas pointer lock / input leakage
    root.addEventListener('pointerdown', (e) => e.stopPropagation())
    root.addEventListener('mousedown', (e) => e.stopPropagation())

    parent.appendChild(root)
    this._element = root
    return root
  }

  _makeRow(chips, desc) {
    const row = document.createElement('div')
    row.className = 'bh-controls__row'
    for (const c of chips) row.appendChild(c)
    const d = document.createElement('span')
    d.className = 'bh-controls__desc'
    d.textContent = desc
    row.appendChild(d)
    return row
  }

  _makeStaticChip(label) {
    const chip = document.createElement('span')
    chip.className = 'bh-key'
    chip.textContent = label
    return chip
  }

  _makeMouseChip() {
    const chip = document.createElement('button')
    chip.className = 'bh-key bh-key--clickable'
    chip.type = 'button'
    chip.textContent = '🖱'
    chip.title = 'Клик: захват мыши для обзора (Esc — отпустить)'
    chip.addEventListener('click', (e) => {
      e.stopPropagation()
      if (typeof this._onRequestPointerLock === 'function') {
        this._onRequestPointerLock()
      }
    })
    return chip
  }

  _makeHoldChip(keyDef) {
    const chip = document.createElement('button')
    chip.className = 'bh-key bh-key--clickable'
    chip.type = 'button'
    chip.textContent = keyDef.label
    chip.title = `Зажми: ${keyDef.desc}`

    const press = (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (this._activeChips.has(keyDef.code)) return
      chip.classList.add('bh-key--active')
      window.dispatchEvent(new KeyboardEvent('keydown', { code: keyDef.code, bubbles: true }))
      this._activeChips.set(keyDef.code, chip)
    }
    const release = () => {
      if (!this._activeChips.has(keyDef.code)) return
      chip.classList.remove('bh-key--active')
      window.dispatchEvent(new KeyboardEvent('keyup', { code: keyDef.code, bubbles: true }))
      this._activeChips.delete(keyDef.code)
    }

    chip.addEventListener('pointerdown', press)
    chip.addEventListener('pointerup', release)
    chip.addEventListener('pointerleave', release)
    chip.addEventListener('pointercancel', release)
    return chip
  }

  _makeTapChip(keyDef) {
    const chip = document.createElement('button')
    chip.className = 'bh-key bh-key--clickable'
    chip.type = 'button'
    chip.textContent = keyDef.label
    chip.title = `Клик: ${keyDef.desc}`
    chip.addEventListener('click', (e) => {
      e.stopPropagation()
      chip.classList.add('bh-key--active')
      window.dispatchEvent(new KeyboardEvent('keydown', { code: keyDef.code, bubbles: true }))
      window.setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: keyDef.code, bubbles: true }))
        chip.classList.remove('bh-key--active')
      }, 80)
    })
    return chip
  }

  /**
   * @param {{ requestPointerLock: Function }} input
   */
  bindInput(input) {
    if (input && typeof input.requestPointerLock === 'function') {
      this._onRequestPointerLock = () => input.requestPointerLock()
    }
  }

  setVisible(v) {
    if (this._element) {
      this._element.classList.toggle('hidden', !v)
    }
  }

  destroy() {
    if (this._element) this._element.remove()
    this._element = null
  }
}
