// Cinematic benchmark flight: wide establishing orbit, a close dive toward the
// disk plane, a pass UNDER the disk, a climbing close flyby on the other side,
// then a pull-back out to the wide orbit. Loops forever while benchmark runs.
const FLIGHT_KEYS = [
  { u: 0.00, r: 30.0, y: -6.0, w: 0.10 },
  { u: 0.18, r: 27.0, y: -2.0, w: 0.18 },
  { u: 0.34, r: 25.0, y: 3.0, w: 0.26 },
  { u: 0.50, r: 28.0, y: 7.0, w: 0.22 },
  { u: 0.66, r: 32.0, y: 4.0, w: 0.16 },
  { u: 0.80, r: 34.0, y: -3.0, w: 0.12 },
  { u: 1.00, r: 30.0, y: -6.0, w: 0.10 },
]

function ease(t) {
  return t * t * (3.0 - 2.0 * t)
}

export class CameraFlight {
  constructor(options = {}) {
    this.duration = options.duration !== undefined ? options.duration : 30
    this.period = options.period !== undefined ? options.period : 55
    this.time = 0
    this.complete = false
    this.angle = -Math.PI / 2
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
          r: a.r + (b.r - a.r) * t,
          y: a.y + (b.y - a.y) * t,
          w: a.w + (b.w - a.w) * t,
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
    this.angle += s.w * dt

    const result = {
      position: [s.r * Math.cos(this.angle), s.y, s.r * Math.sin(this.angle)],
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
    this.angle = -Math.PI / 2
    this._lastResult = null
  }
}
