import { CameraFlight } from './CameraFlight.js'

const MAX_BENCHMARK_SAMPLES = 1800

export class Benchmark {
  constructor(timer, qualityManager) {
    this._timer = timer
    this._qm = qualityManager
    this._flight = new CameraFlight({ duration: Infinity, radius: 20, height: 14, speed: 0.05 })
    this._active = false
    this._frameTimes = []
    this._fpsSamples = []
    this._previousProfile = null
  }

  start() {
    if (this._active) return
    this._previousProfile = this._qm.getProfile()
    this._qm.setProfile('MAXIMUM')
    this._flight.reset()
    this._frameTimes = []
    this._fpsSamples = []
    this._active = true
  }

  update(dt) {
    if (!this._active) return null

    if (dt > 0) {
      const ms = dt * 1000
      this._frameTimes.push(ms)
      if (this._frameTimes.length > MAX_BENCHMARK_SAMPLES) this._frameTimes.shift()
    }

    const fps = this._timer.getFPS()
    this._fpsSamples.push(fps)
    if (this._fpsSamples.length > MAX_BENCHMARK_SAMPLES) this._fpsSamples.shift()

    const result = this._flight.update(dt)

    return result
  }

  _finish() {
    this._active = false
    if (this._previousProfile) {
      this._qm.setProfile(this._previousProfile)
      this._previousProfile = null
    }
  }

  stop() {
    if (!this._active) return
    this._active = false
    if (this._previousProfile) {
      this._qm.setProfile(this._previousProfile)
      this._previousProfile = null
    }
  }

  isComplete() {
    return false
  }

  isActive() {
    return this._active
  }

  getFlight() {
    return this._flight
  }

  getResults() {
    if (this._frameTimes.length === 0) return null

    const sorted = [...this._frameTimes].sort((a, b) => a - b)
    const fpsSorted = this._fpsSamples.filter((fps) => fps > 0).sort((a, b) => a - b)

    const avgFrameTime = sorted.reduce((a, b) => a + b, 0) / sorted.length
    const maxFrameTime = sorted[sorted.length - 1]
    const p1Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))
    const onePercentLowMs = sorted[p1Index]
    const onePercentLowFps = onePercentLowMs > 0 ? 1000 / onePercentLowMs : 0

    const avgFps = fpsSorted.length > 0
      ? fpsSorted.reduce((a, b) => a + b, 0) / fpsSorted.length
      : 0
    const minFps = fpsSorted.length > 0 ? fpsSorted[0] : 0

    return {
      avgFps: Math.round(avgFps * 100) / 100,
      onePercentLow: Math.round(onePercentLowFps * 100) / 100,
      minFps: Math.round(minFps * 100) / 100,
      avgFrameTimeMs: Math.round(avgFrameTime * 100) / 100,
      maxFrameTimeMs: Math.round(maxFrameTime * 100) / 100,
      duration: 'continuous',
      profileUsed: 'MAXIMUM',
    }
  }

  formatResults() {
    const r = this.getResults()
    if (!r) return 'Benchmark: no data'
    return [
      `=== CONTINUOUS MAX QUALITY BENCHMARK ===`,
      `Avg FPS:   ${r.avgFps}`,
      `1% Low:    ${r.onePercentLow}`,
      `Min FPS:   ${r.minFps}`,
      `Avg Frame: ${r.avgFrameTimeMs}ms`,
      `Max Frame: ${r.maxFrameTimeMs}ms`,
      `Profile:   ${r.profileUsed}`,
    ].join('\n')
  }
}
