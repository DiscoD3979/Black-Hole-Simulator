import { clamp } from '../config.js'

const SCHWARZSCHILD_FACTOR = 3.0

export class BlackHole {
  constructor(options = {}) {
    this.position = options.position ? options.position.slice() : [0, 0, 0]
    this.mass = options.mass !== undefined ? options.mass : 0.3
    this.spin = clamp(options.spin !== undefined ? options.spin : 1.0, 0.0, 1.0)
    this.lensStrength = clamp(options.lensStrength !== undefined ? options.lensStrength : 0.9, 0.0, 2.0)
    this.ringStrength = options.ringStrength !== undefined ? options.ringStrength : 1.0
    this.schwarzschildRadius = this.mass * 2.0 * SCHWARZSCHILD_FACTOR
  }

  getUniforms() {
    return {
      uBHPosition: this.position,
      uBHRadius: this.schwarzschildRadius,
      uBHLensStrength: this.lensStrength,
      uBHSpin: this.spin,
      uRingStrength: this.ringStrength,
    }
  }

  setPosition(pos) {
    this.position[0] = pos[0]
    this.position[1] = pos[1]
    this.position[2] = pos[2]
  }

  setMass(mass) {
    this.mass = mass
    this.schwarzschildRadius = mass * 2.0 * SCHWARZSCHILD_FACTOR
  }

  setLensStrength(s) {
    this.lensStrength = clamp(s, 0.0, 2.0)
  }

  setSpin(s) {
    this.spin = clamp(s, 0.0, 1.0)
  }

  setRingStrength(v) {
    this.ringStrength = v
  }
}