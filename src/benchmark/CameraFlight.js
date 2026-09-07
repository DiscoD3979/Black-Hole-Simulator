// Cinematic SHOWCASE flight for the benchmark — NOT a continuous spin.
// Cycle (~13s), camera always aims at the hole center:
//   Phase 1 (0.00-0.23): frontal view, slow dolly in/out.
//   Phase 2 (0.23-0.46): swing ~35 deg to the side, show the disk profile.
//   Phase 3 (0.46-0.69): gentle arc around the hole, dip near the disk plane.
//   Phase 4 (0.69-1.00): sweep back to the frontal view.
// All motion uses smoothstep easing; angles stay small so the hole is always
// framed nicely, while still moving enough to expose any frame trails.
const FLIGHT_KEYS = [
  { u: 0.00, a: 0.00, r: 33.0, y: 3.0 },
  { u: 0.11, a: 0.00, r: 28.0, y: 3.0 },
  { u: 0.23, a: 0.00, r: 25.5, y: 3.4 },
  { u: 0.34, a: 0.28, r: 27.0, y: 4.6 },
  { u: 0.46, a: 0.62, r: 29.0, y: 5.4 },
  { u: 0.58, a: 0.92, r: 30.0, y: 3.2 },
  { u: 0.69, a: 1.15, r: 31.0, y: 1.2 },
  { u: 0.84, a: 0.70, r: 32.0, y: 3.0 },
  { u: 1.00, a: 0.00, r: 33.0, y: 3.0 },
]

function ease(t) {
  return t * t * (3.0 - 2.0 * t)
}

export class CameraFlight {
  constructor(options = {}) {
    this.duration = options.duration !== undefined ? options.duration : 30
    this.period = options.period !== undefined ? options.period : 13
    this.baseAngle = options.baseAngle !== undefined ? options.baseAngle : -Math.PI / 2
    this.time = 0
    this.complete = false
    this._lastResult = null
  }

  _sampleKeys(u) {
    for (let i = 0; i < FLIGHT_KEYS.length - 1; i++) {
      const a = FLIGHT_KEYS[i]
      const b = FLIGHT_KEYS[i + 1]
      if (u >= a.u && u <= b.u) {
        const span = b.u - a.u || 1
        const t = ease((u - a.u) / span)
        return {
          a: a.a + (b.a - a.a) * t,
          r: a.r + (b.r - a.r) * t,
          y: a.y + (b.y - a.y) * t,
        }
      }
    }
    return FLIGHT_KEYS[0]
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

    const u = (this.time % this.period) / this.period
    const s = this._sampleKeys(u)
    const worldAngle = this.baseAngle + s.a

    const result = {
      position: [s.r * Math.cos(worldAngle), s.y, s.r * Math.sin(worldAngle)],
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
