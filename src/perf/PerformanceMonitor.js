import { INTERNAL_WIDTH, INTERNAL_HEIGHT } from '../config.js'

export class PerformanceMonitor {
  constructor(timer) {
    this._timer = timer
    this._gpuInfo = null
    this._quality = 'MAXIMUM'
    this._resolution = `${INTERNAL_WIDTH}x${INTERNAL_HEIGHT}`
    this._raymarchSteps = 196
    this._starDensity = 0.6
    this._bloom = 1.2
  }

  update() {}

  setQuality(profile) {
    this._quality = profile
  }

  setRaymarchSteps(v) {
    this._raymarchSteps = v
  }

  setStarDensity(v) {
    this._starDensity = v
  }

  setBloom(v) {
    this._bloom = v
  }

  getStats() {
    return {
      fps: Math.round(this._timer.getFPS()),
      frameTime: Math.round(this._timer.getFrameTimeMs() * 100) / 100,
      raymarchSteps: this._raymarchSteps,
      starDensity: this._starDensity,
      bloom: this._bloom,
      resolution: this._resolution,
      quality: this._quality,
      gpuInfo: this._gpuInfo,
    }
  }

  getFormattedHudText() {
    const s = this.getStats()
    return [
      `FPS: ${s.fps} | Frame: ${s.frameTime}ms | ${INTERNAL_WIDTH}\u00d7${INTERNAL_HEIGHT} | ${s.quality}`,
      `Steps: ${s.raymarchSteps} | Stars: ${s.starDensity} | Bloom: ${s.bloom}`,
    ].join('\n')
  }

  getGpuInfo(gl) {
    if (this._gpuInfo) return this._gpuInfo

    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) {
      this._gpuInfo = 'Unknown GPU'
      return this._gpuInfo
    }

    const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
    this._gpuInfo = `${vendor} | ${renderer}`
    return this._gpuInfo
  }
}
