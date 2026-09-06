import { createSlider } from './Slider.js'

/**
 * Panel — collapsible section that groups controls.
 *
 * @param {HTMLElement} container
 * @param {object}      options
 * @param {string}      options.title
 * @param {boolean}     [options.collapsible=true]
 * @returns {{ element, addSlider, addButtonGroup, addToggle, addDisplay, setVisible, destroy }}
 */
export function createPanel(container, options) {
  const { title, collapsible = true } = options

  const panel = document.createElement('div')
  panel.className = 'bh-panel'

  const header = document.createElement('div')
  header.className = 'bh-panel__header'

  const titleEl = document.createElement('span')
  titleEl.className = 'bh-panel__title'
  titleEl.textContent = title

  const chevron = document.createElement('span')
  chevron.className = 'bh-panel__chevron'

  header.appendChild(titleEl)
  if (collapsible) header.appendChild(chevron)

  const body = document.createElement('div')
  body.className = 'bh-panel__body'

  panel.appendChild(header)
  panel.appendChild(body)
  container.appendChild(panel)

  let collapsed = false
  const sliders = []

  if (collapsible) {
    header.addEventListener('click', () => {
      collapsed = !collapsed
      panel.classList.toggle('collapsed', collapsed)
    })
  }

  // Prevent pointer events from leaking to canvas
  panel.addEventListener('pointerdown', (e) => e.stopPropagation())
  panel.addEventListener('mousedown', (e) => e.stopPropagation())

  return {
    element: panel,

    addSlider(opts) {
      const s = createSlider(body, opts)
      sliders.push(s)
      return s
    },

    addButtonGroup(options) {
      const { label, items, value, onChange } = options
      const wrap = document.createElement('div')
      wrap.style.margin = '4px 0'

      const lbl = document.createElement('span')
      lbl.className = 'bh-slider__label'
      lbl.textContent = label
      wrap.appendChild(lbl)

      const group = document.createElement('div')
      group.className = 'bh-btn-group'

      let current = value
      const btns = []

      items.forEach((item) => {
        const btn = document.createElement('button')
        btn.className = 'bh-btn-group__btn' + (item.value === current ? ' active' : '')
        btn.textContent = item.label
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          current = item.value
          btns.forEach((b) => b.classList.toggle('active', b === btn))
          if (onChange) onChange(current)
        })
        btns.push(btn)
        group.appendChild(btn)
      })

      wrap.appendChild(group)
      body.appendChild(wrap)

      return {
        element: wrap,
        getValue() { return current },
        setValue(v) {
          current = v
          btns.forEach((b) => {
            const item = items[btns.indexOf(b)]
            b.classList.toggle('active', item.value === v)
          })
        }
      }
    },

    addToggle(opts) {
      const { label, value, onChange } = opts
      const row = document.createElement('div')
      row.className = 'bh-toggle'

      const lbl = document.createElement('span')
      lbl.className = 'bh-toggle__label'
      lbl.textContent = label

      const sw = document.createElement('button')
      sw.className = 'bh-toggle__switch' + (value ? ' on' : '')
      sw.type = 'button'

      let current = value

      sw.addEventListener('click', (e) => {
        e.stopPropagation()
        current = !current
        sw.classList.toggle('on', current)
        if (onChange) onChange(current)
      })

      row.appendChild(lbl)
      row.appendChild(sw)
      body.appendChild(row)

      return {
        element: row,
        getValue() { return current },
        setValue(v) {
          current = v
          sw.classList.toggle('on', v)
        }
      }
    },

    addDisplay(opts) {
      const { label, value } = opts
      const row = document.createElement('div')
      row.className = 'bh-display'

      const lbl = document.createElement('span')
      lbl.className = 'bh-display__label'
      lbl.textContent = label

      const val = document.createElement('span')
      val.className = 'bh-display__value'
      val.textContent = value

      row.appendChild(lbl)
      row.appendChild(val)
      body.appendChild(row)

      return {
        element: row,
        setValue(v) { val.textContent = v }
      }
    },

    setVisible(v) {
      panel.style.display = v ? '' : 'none'
    },

    destroy() {
      sliders.forEach((s) => s.destroy())
      panel.remove()
    }
  }
}
