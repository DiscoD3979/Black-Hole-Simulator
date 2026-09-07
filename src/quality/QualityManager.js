import { INTERNAL_WIDTH, INTERNAL_HEIGHT } from '../config.js'

const PROFILES = {
  MAXIMUM: {
    name: 'MAXIMUM',
    raymarchSteps: 256,
    secondaryStepScale: 0.75,
    starDensity: 0.9,
    bloom: 1.5,
    chromaticAberration: 0.0,
    temporalAA: true,
    exposure: 1.0,
    diskDensity: 0.65,
    diskTemperature: 0.6,
    accretionSpeed: 0.0,
    lensStrength: 0.9,
    diskBrightness: 1.0,
    diskHue: 0.0,
    diskThickness: 1.0,
    ringStrength: 1.0,
    starTwinkleSpeed: 0.5,
  },
  HIGH: {
    name: 'HIGH',
    raymarchSteps: 128,
    secondaryStepScale: 0.4,
    starDensity: 0.7,
    bloom: 1.2,
    chromaticAberration: 0.0,
    temporalAA: true,
    exposure: 1.0,
    diskDensity: 0.65,
    diskTemperature: 0.6,
    accretionSpeed: 0.0,
    lensStrength: 0.9,
    diskBrightness: 1.0,
    diskHue: 0.0,
    diskThickness: 1.0,
    ringStrength: 1.0,
    starTwinkleSpeed: 0.5,
  },
  PERFORMANCE: {
    name: 'PERFORMANCE',
    raymarchSteps: 64,
    secondaryStepScale: 0.3,
    starDensity: 0.4,
    bloom: 0.6,
    chromaticAberration: 0.0,
    temporalAA: false,
    exposure: 1.0,
    diskDensity: 0.65,
    diskTemperature: 0.6,
    accretionSpeed: 0.0,
    lensStrength: 0.9,
    diskBrightness: 1.0,
    diskHue: 0.0,
    diskThickness: 1.0,
    ringStrength: 1.0,
    starTwinkleSpeed: 0.5,
  },
}

const PROFILE_ORDER = ['MAXIMUM', 'HIGH', 'PERFORMANCE']

export class QualityManager {
  constructor() {
    this._currentProfile = 'MAXIMUM'
    this._scene = null
    this._postfx = null
    this._ui = null
    this._camera = null
    this._renderLoop = null
  }

  setProfile(name) {
    if (!PROFILES[name]) return
    this._currentProfile = name
    this.applyParams()
  }

  getProfile() {
    return this._currentProfile
  }

  getParams() {
    return { ...PROFILES[this._currentProfile] }
  }

  bind(scene, postfx, ui) {
    this._scene = scene
    this._postfx = postfx
    this._ui = ui
  }

  bindCamera(camera) {
    this._camera = camera
  }

  bindRenderLoop(fn) {
    this._renderLoop = fn
  }

  applyParams() {
    const params = this.getParams()

    if (this._scene) {
      this._scene._raymarchSteps = params.raymarchSteps
      this._scene._secondaryStepScale = params.secondaryStepScale
      if (this._scene.stars) {
        if (typeof this._scene.stars.setDensity === 'function') {
          this._scene.stars.setDensity(params.starDensity)
        } else {
          this._scene.stars.density = params.starDensity
        }
      }
      if (this._scene.blackHole) {
        if (typeof this._scene.blackHole.setLensStrength === 'function') {
          this._scene.blackHole.setLensStrength(params.lensStrength)
        }
        if (typeof this._scene.blackHole.setRingStrength === 'function') {
          this._scene.blackHole.setRingStrength(params.ringStrength)
        }
      }
      if (this._scene.accretionDisk) {
        if (typeof this._scene.accretionDisk.setParam === 'function') {
          this._scene.accretionDisk.setParam('density', params.diskDensity)
          this._scene.accretionDisk.setParam('temperature', params.diskTemperature)
          this._scene.accretionDisk.setParam('accretionSpeed', params.accretionSpeed)
          this._scene.accretionDisk.setParam('brightness', params.diskBrightness)
          this._scene.accretionDisk.setParam('hue', params.diskHue)
          this._scene.accretionDisk.setParam('thickness', params.diskThickness)
        }
      }
    }

    if (this._postfx) {
      if (typeof this._postfx.setExposure === 'function') this._postfx.setExposure(params.exposure)
      if (typeof this._postfx.setBloomIntensity === 'function') this._postfx.setBloomIntensity(params.bloom)
      if (typeof this._postfx.setChromaticAberration === 'function') {
        this._postfx.setChromaticAberration(params.chromaticAberration)
      }
      if (typeof this._postfx.setAntiAliasing === 'function') {
        this._postfx.setAntiAliasing(params.temporalAA)
      }
    }
  }

  setParam(name, value) {
    const params = PROFILES[this._currentProfile]
    if (params && name in params) {
      params[name] = value
      this.applyParams()
    }
  }

  getCurrentIndex() {
    return PROFILE_ORDER.indexOf(this._currentProfile)
  }

  downgrade() {
    const idx = this.getCurrentIndex()
    if (idx < PROFILE_ORDER.length - 1) {
      this.setProfile(PROFILE_ORDER[idx + 1])
      return true
    }
    return false
  }

  upgrade() {
    const idx = this.getCurrentIndex()
    if (idx > 0) {
      this.setProfile(PROFILE_ORDER[idx - 1])
      return true
    }
    return false
  }
}

export { PROFILES, PROFILE_ORDER }
