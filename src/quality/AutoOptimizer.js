const ROLLING_WINDOW = 120
const DOWN_THRESHOLD = 58
const UP_THRESHOLD = 100
const COOLDOWN_FRAMES = 300

export class AutoOptimizer {
  constructor(qualityManager) {
    this._qm = qualityManager
    this._enabled = false
    this._fpsBuffer = new Float32Array(ROLLING_WINDOW)
    this._bufferHead = 0
    this._bufferFilled = 0
    this._cooldownFrames = 0
  }

  update(fps) {
    if (!this._enabled) return

    this._fpsBuffer[this._bufferHead] = fps
    this._bufferHead = (this._bufferHead + 1) % ROLLING_WINDOW
    if (this._bufferFilled < ROLLING_WINDOW) this._bufferFilled++

    if (this._cooldownFrames > 0) {
      this._cooldownFrames--
      return
    }

    if (this._bufferFilled < ROLLING_WINDOW) return

    let sum = 0
    for (let i = 0; i < ROLLING_WINDOW; i++) sum += this._fpsBuffer[i]
    const avg = sum / ROLLING_WINDOW

    if (avg < DOWN_THRESHOLD) {
      this._qm.downgrade()
      this._cooldownFrames = COOLDOWN_FRAMES
    } else if (avg > UP_THRESHOLD) {
      this._qm.upgrade()
      this._cooldownFrames = COOLDOWN_FRAMES
    }
  }

  isEnabled() {
    return this._enabled
  }

  setEnabled(v) {
    this._enabled = v
    if (!v) {
      this._bufferHead = 0
      this._bufferFilled = 0
      this._cooldownFrames = 0
    }
  }

  getStats() {
    let avgFps = 0
    if (this._bufferFilled > 0) {
      let sum = 0
      for (let i = 0; i < this._bufferFilled; i++) sum += this._fpsBuffer[i]
      avgFps = sum / this._bufferFilled
    }

    return {
      currentProfile: this._qm.getProfile(),
      avgFps,
      downThreshold: DOWN_THRESHOLD,
      upThreshold: UP_THRESHOLD,
      cooldownRemaining: this._cooldownFrames,
    }
  }
}
