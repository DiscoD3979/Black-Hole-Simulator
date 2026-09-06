/**
 * Slider — creates a labelled range input with live value display.
 *
 * @param {HTMLElement} container — parent element
 * @param {object}      options
 * @param {string}      options.label
 * @param {number}      options.min
 * @param {number}      options.max
 * @param {number}      options.step
 * @param {number}      options.value
 * @param {function}    options.onChange — callback(value)
 * @returns {{ element, getValue, setValue, destroy }}
 */
export function createSlider(container, options) {
  const { label, min, max, step, value, onChange } = options

  const row = document.createElement('div')
  row.className = 'bh-slider'

  const lbl = document.createElement('span')
  lbl.className = 'bh-slider__label'
  lbl.textContent = label

  const input = document.createElement('input')
  input.className = 'bh-slider__input'
  input.type = 'range'
  input.min = min
  input.max = max
  input.step = step
  input.value = value

  const val = document.createElement('span')
  val.className = 'bh-slider__value'
  val.textContent = formatVal(value)

  row.appendChild(lbl)
  row.appendChild(input)
  row.appendChild(val)
  container.appendChild(row)

  let currentValue = value

  function formatVal(v) {
    const s = Number(v)
    return step >= 1 ? String(Math.round(s)) : s.toFixed(String(step).split('.')[1]?.length ?? 2)
  }

  input.addEventListener('input', () => {
    const v = parseFloat(input.value)
    currentValue = v
    val.textContent = formatVal(v)
    if (onChange) onChange(v)
  }, { passive: true })

  // Prevent UI clicks from triggering PointerLock
  row.addEventListener('pointerdown', (e) => e.stopPropagation())
  row.addEventListener('mousedown', (e) => e.stopPropagation())

  return {
    element: row,
    getValue() { return currentValue },
    setValue(v) {
      currentValue = v
      input.value = v
      val.textContent = formatVal(v)
    },
    destroy() {
      row.remove()
    }
  }
}
