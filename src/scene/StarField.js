import { log } from '../config.js'

const SHADER_URL = 'shaders/stars.glsl'

export class StarField {
  constructor(options = {}) {
    this.density = options.density !== undefined ? options.density : 0.5
    this.seed = options.seed !== undefined ? options.seed : 1.0
    this.twinkleSpeed = options.twinkleSpeed !== undefined ? options.twinkleSpeed : 0.5

    this._source = null
    this._sourcePromise = null
  }

  async loadShaderSource() {
    if (this._source !== null) return this._source
    if (this._sourcePromise) return this._sourcePromise
    this._sourcePromise = fetch(SHADER_URL, { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} loading ${SHADER_URL}`)
        return res.text()
      })
      .then((text) => {
        this._source = text
        log(`StarField shader source loaded (${text.length} bytes)`, 'info')
        return text
      })
      .catch((err) => {
        this._sourcePromise = null
        log(`Failed to load StarField shader source: ${err.message}`, 'error')
        throw err
      })
    return this._sourcePromise
  }

  async getShaderSource() {
    return this.loadShaderSource()
  }

  getUniforms() {
    return {
      uStarDensity: this.density,
      uStarSeed: this.seed,
      uStarTime: 0.0,
      uStarTwinkleSpeed: this.twinkleSpeed,
    }
  }

  setDensity(v) {
    this.density = v
  }

  setSeed(v) {
    this.seed = v
  }
}
