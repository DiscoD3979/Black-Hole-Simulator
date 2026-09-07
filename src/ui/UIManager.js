import { createPanel } from './Panel.js'
import { ControlsHelper } from './ControlsHelper.js'

/**
 * UIManager — owns all UI panels, exposes bind/update/toggle.
 *
 * Usage:
 *   const ui = new UIManager()
 *   ui.init(document.getElementById('ui'))
 *   ui.bind(blackHole, accretionDisk, postfx, qualityManager)
 *   // render loop:  ui.updatePerfDisplay(fps, frameTime)
 *   // H key:        ui.toggleVisibility()
 */
export class UIManager {
  constructor() {
    this._container = null
    this._panels = {}
    this._sliders = {}
    this._displays = {}
    this._visible = true
    this._bound = false
    this._controls = new ControlsHelper()
  }

  init(container) {
    this._container = container
    this._buildBlackHolePanel()
    this._buildGraphicsPanel()
    this._buildPerformancePanel()
    this._controls.init(document.body)
  }

  /* ── Black Hole ──────────────────────────────────────────────── */
  _buildBlackHolePanel() {
    const p = createPanel(this._container, { title: 'Black Hole', collapsible: true })

    this._sliders.mass = p.addSlider({
      label: 'Mass', min: 0.1, max: 5.0, step: 0.1, value: 0.3,
      onChange: (v) => this._apply('mass', v)
    })
    this._sliders.spin = p.addSlider({
      label: 'Spin', min: 0.0, max: 1.0, step: 0.01, value: 1.0,
      onChange: (v) => this._apply('spin', v)
    })
    this._sliders.diskDensity = p.addSlider({
      label: 'Disk Density', min: 0.0, max: 2.0, step: 0.05, value: 1.0,
      onChange: (v) => this._apply('diskDensity', v)
    })
    this._sliders.diskTemp = p.addSlider({
      label: 'Disk Temperature', min: 0.0, max: 2.0, step: 0.05, value: 1.0,
      onChange: (v) => this._apply('diskTemperature', v)
    })
    this._sliders.accretionSpeed = p.addSlider({
      label: 'Accretion Speed', min: 0.0, max: 1.0, step: 0.05, value: 0.3,
      onChange: (v) => this._apply('accretionSpeed', v)
    })
    this._sliders.lensStrength = p.addSlider({
      label: 'Lens Strength', min: 0.0, max: 2.0, step: 0.05, value: 0.9,
      onChange: (v) => this._apply('lensStrength', v)
    })
    this._sliders.diskHue = p.addSlider({
      label: 'Disk Color', min: 0.0, max: 1.0, step: 0.05, value: 0.0,
      onChange: (v) => this._apply('diskHue', v)
    })
    this._sliders.diskBrightness = p.addSlider({
      label: 'Disk Brightness', min: 0.0, max: 2.0, step: 0.05, value: 1.0,
      onChange: (v) => this._apply('diskBrightness', v)
    })
    this._sliders.diskThickness = p.addSlider({
      label: 'Disk Thickness', min: 0.2, max: 2.0, step: 0.05, value: 1.0,
      onChange: (v) => this._apply('diskThickness', v)
    })
    this._sliders.ringStrength = p.addSlider({
      label: 'Ring Brightness', min: 0.0, max: 2.0, step: 0.05, value: 1.0,
      onChange: (v) => this._apply('ringStrength', v)
    })

    this._panels.blackHole = p
  }

  /* ── Graphics ────────────────────────────────────────────────── */
  _buildGraphicsPanel() {
    const p = createPanel(this._container, { title: 'Graphics', collapsible: true })

    this._qualityGroup = p.addButtonGroup({
      label: 'Quality',
      items: [
        { label: 'MAX', value: 'MAXIMUM' },
        { label: 'HIGH', value: 'HIGH' },
        { label: 'PERF', value: 'PERFORMANCE' }
      ],
      value: 'MAXIMUM',
      onChange: (v) => this._applyQuality(v)
    })

    this._sliders.raymarchSteps = p.addSlider({
      label: 'Raymarch Steps', min: 32, max: 256, step: 8, value: 128,
      onChange: (v) => this._apply('raymarchSteps', Math.round(v))
    })
    this._sliders.bloom = p.addSlider({
      label: 'Bloom', min: 0.0, max: 2.0, step: 0.1, value: 1.0,
      onChange: (v) => this._apply('bloom', v)
    })
    this._sliders.starDensity = p.addSlider({
      label: 'Star Density', min: 0.0, max: 1.0, step: 0.05, value: 0.5,
      onChange: (v) => this._apply('starDensity', v)
    })
    this._toggleAA = p.addToggle({
      label: 'Anti-Aliasing',
      value: true,
      onChange: (v) => this._apply('antiAliasing', v)
    })
    this._sliders.exposure = p.addSlider({
      label: 'Exposure', min: 0.1, max: 3.0, step: 0.1, value: 1.0,
      onChange: (v) => this._apply('exposure', v)
    })

    this._panels.graphics = p
  }

  /* ── Performance (read-only) ─────────────────────────────────── */
  _buildPerformancePanel() {
    const p = createPanel(this._container, { title: 'Performance', collapsible: true })

    this._displays.fps = p.addDisplay({ label: 'FPS', value: '--' })
    this._displays.frameTime = p.addDisplay({ label: 'Frame Time', value: '-- ms' })
    this._displays.resolution = p.addDisplay({ label: 'Render Resolution', value: '1920 × 1080' })

    this._panels.performance = p
  }

  /* ── Bind to scene objects ───────────────────────────────────── */
  bind(blackHole, accretionDisk, postfx, qualityManager, input) {
    this._bh = blackHole
    this._disk = accretionDisk
    this._postfx = postfx
    this._qm = qualityManager
    this._bound = true

    if (input) {
      this._controls.bindInput(input)
    }

    if (this._qm && this._qm.getProfile) {
      const q = this._qm.getProfile()
      if (this._qualityGroup) this._qualityGroup.setValue(q)
      const cfg = this._qm.getParams?.()
      if (cfg) {
        if (cfg.raymarchSteps != null) this._sliders.raymarchSteps?.setValue(cfg.raymarchSteps)
        if (cfg.starDensity != null) this._sliders.starDensity?.setValue(cfg.starDensity)
        if (cfg.bloom != null) this._sliders.bloom?.setValue(cfg.bloom)
        if (cfg.exposure != null) this._sliders.exposure?.setValue(cfg.exposure)
      }
    }
  }

  /* ── Internal setter dispatch ────────────────────────────────── */
  _apply(key, value) {
    if (!this._bound) return
    switch (key) {
      case 'mass':
        if (this._bh) this._bh.setMass?.(value) ?? (this._bh.mass = value)
        break
      case 'spin':
        if (this._bh) this._bh.setSpin?.(value) ?? (this._bh.spin = value)
        break
      case 'diskDensity':
        if (this._disk) this._disk.setParam?.('density', value) ?? (this._disk.density = value)
        break
      case 'diskTemperature':
        if (this._disk) this._disk.setParam?.('temperature', value) ?? (this._disk.temperature = value)
        break
      case 'accretionSpeed':
        if (this._disk) this._disk.setParam?.('accretionSpeed', value) ?? (this._disk.speed = value)
        break
      case 'lensStrength':
        if (this._bh) this._bh.setLensStrength?.(value) ?? (this._bh.lensStrength = value)
        break
      case 'diskHue':
        if (this._disk) this._disk.setParam?.('hue', value) ?? (this._disk.hue = value)
        break
      case 'diskBrightness':
        if (this._disk) this._disk.setParam?.('brightness', value) ?? (this._disk.brightness = value)
        break
      case 'diskThickness':
        if (this._disk) this._disk.setParam?.('thickness', value) ?? (this._disk.thickness = value)
        break
      case 'ringStrength':
        if (this._bh) this._bh.setRingStrength?.(value) ?? (this._bh.ringStrength = value)
        break
      case 'raymarchSteps':
        if (this._qm) this._qm.setParam?.('raymarchSteps', Math.round(value))
        break
      case 'bloom':
        if (this._postfx) this._postfx.setBloomIntensity?.(value)
        break
      case 'starDensity':
        if (this._qm) this._qm.setParam?.('starDensity', value)
        break
      case 'antiAliasing':
        if (this._postfx) this._postfx.setAntiAliasing?.(value) ?? (this._postfx.antiAliasing = value)
        break
      case 'exposure':
        if (this._postfx) this._postfx.setExposure?.(value)
        break
    }
  }

  _applyQuality(preset) {
    if (this._qm && this._qm.setProfile) {
      this._qm.setProfile(preset)
      const cfg = this._qm.getParams?.()
      if (cfg) {
        if (cfg.raymarchSteps != null && this._sliders.raymarchSteps)
          this._sliders.raymarchSteps.setValue(cfg.raymarchSteps)
        if (cfg.starDensity != null && this._sliders.starDensity)
          this._sliders.starDensity.setValue(cfg.starDensity)
        if (cfg.exposure != null && this._sliders.exposure)
          this._sliders.exposure.setValue(cfg.exposure)
        if (cfg.bloom != null && this._sliders.bloom)
          this._sliders.bloom.setValue(cfg.bloom)
      }
    }
  }

  /* ── Public API ──────────────────────────────────────────────── */
  updatePerfDisplay(fps, frameTime) {
    if (this._displays.fps) this._displays.fps.setValue(String(Math.round(fps)))
    if (this._displays.frameTime) this._displays.frameTime.setValue(frameTime.toFixed(2) + ' ms')
  }

  toggleVisibility() {
    this._visible = !this._visible
    this._container.classList.toggle('hidden', !this._visible)
    this._controls.setVisible(this._visible)
  }

  destroy() {
    Object.values(this._panels).forEach((p) => p.destroy())
    this._panels = {}
    this._sliders = {}
    this._displays = {}
    this._controls.destroy()
  }
}
