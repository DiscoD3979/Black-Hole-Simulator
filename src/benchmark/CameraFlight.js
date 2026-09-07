// Cinematic showcase flight for the benchmark — a SINGLE continuous motion,
// never pausing or jittering. Discrete phase keyframes + smoothstep used to
// give an easing that reaches ZERO speed at every keyframe (each phase "stops"
// before the next one) — that was the jerkiness. Instead the camera uses
// continuous sinusoid parameters around a slow orbit:
//   angle:  steady orbit speed + small lateral sway
//   radius: slow breathing (dolly in/out)
//   height: gentle rise/fall (shows the disk from above, edge-on and below)
// Position always aims at the hole center, so the showcase keeps the hole
// framed while slowly sweeping through every viewing angle.
export class CameraFlight {
  constructor(options = {}) {
    this.duration = options.duration !== undefined ? options.duration : Infinity
    this.orbitSpeed = options.orbitSpeed !== undefined ? options.orbitSpeed : 0.085   // rad/s (full circle ~74s)
    this.baseAngle = options.baseAngle !== undefined ? options.baseAngle : -Math.PI / 2
    this.baseRadius = options.baseRadius !== undefined ? options.baseRadius : 30
    this.time = 0
    this.complete = false
    this._lastResult = null
  }

  update(dt) {
    if (this.complete) {
      return this._lastResult
    }

    this.time += dt
    if (this.duration !== Infinity && this.time >= this.duration) {
      this.time = this.duration
      this.complete = true
    }

    const t = this.time
    // Always-advancing orbit angle with a gentle sway — never comes to rest.
    const a = this.baseAngle + this.orbitSpeed * t + 0.30 * Math.sin(0.17 * t + 1.0)
    const r = this.baseRadius + 3.0 * Math.sin(0.11 * t + 0.4)
    const y = 3.0 + 2.6 * Math.sin(0.24 * t + 2.0)

    const result = {
      position: [r * Math.cos(a), y, r * Math.sin(a)],
      target: [0, 0, 0],
    }
    this._lastResult = result
    return result
  }

  isComplete() {
    return this.complete
  }

  reset() {
    this.time = 0
    this.complete = false
    this._lastResult = null
  }
}