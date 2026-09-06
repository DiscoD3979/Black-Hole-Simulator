import { INTERNAL_ASPECT, clamp } from '../config.js'
import { InputManager } from '../input/InputManager.js'

const DEFAULTS = {
  position: [0, 2.4, 30],
  yaw: -Math.PI / 2,
  pitch: -0.075,
  baseSpeed: 5,
  boostMultiplier: 4,
  sensitivity: 0.0022,
  damping: 0.88,
  minSpeed: 0.5,
  maxSpeed: 250,
  fovY: 60 * Math.PI / 180,
  near: 0.05,
  far: 5000,
}

const PITCH_LIMIT = (89 * Math.PI) / 180

function identity(m) {
  m[0]=1; m[1]=0; m[2]=0; m[3]=0
  m[4]=0; m[5]=1; m[6]=0; m[7]=0
  m[8]=0; m[9]=0; m[10]=1; m[11]=0
  m[12]=0; m[13]=0; m[14]=0; m[15]=1
  return m
}

function multiply(out, a, b) {
  const a00=a[0],a01=a[1],a02=a[2],a03=a[3]
  const a10=a[4],a11=a[5],a12=a[6],a13=a[7]
  const a20=a[8],a21=a[9],a22=a[10],a23=a[11]
  const a30=a[12],a31=a[13],a32=a[14],a33=a[15]

  let b0=b[0],b1=b[1],b2=b[2],b3=b[3]
  out[0]=b0*a00+b1*a10+b2*a20+b3*a30
  out[1]=b0*a01+b1*a11+b2*a21+b3*a31
  out[2]=b0*a02+b1*a12+b2*a22+b3*a32
  out[3]=b0*a03+b1*a13+b2*a23+b3*a33

  b0=b[4];b1=b[5];b2=b[6];b3=b[7]
  out[4]=b0*a00+b1*a10+b2*a20+b3*a30
  out[5]=b0*a01+b1*a11+b2*a21+b3*a31
  out[6]=b0*a02+b1*a12+b2*a22+b3*a32
  out[7]=b0*a03+b1*a13+b2*a23+b3*a33

  b0=b[8];b1=b[9];b2=b[10];b3=b[11]
  out[8]=b0*a00+b1*a10+b2*a20+b3*a30
  out[9]=b0*a01+b1*a11+b2*a21+b3*a31
  out[10]=b0*a02+b1*a12+b2*a22+b3*a32
  out[11]=b0*a03+b1*a13+b2*a23+b3*a33

  b0=b[12];b1=b[13];b2=b[14];b3=b[15]
  out[12]=b0*a00+b1*a10+b2*a20+b3*a30
  out[13]=b0*a01+b1*a11+b2*a21+b3*a31
  out[14]=b0*a02+b1*a12+b2*a22+b3*a32
  out[15]=b0*a03+b1*a13+b2*a23+b3*a33
  return out
}

function perspective(out, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2)
  const nf = 1 / (near - far)
  out[0]=f/aspect; out[1]=0; out[2]=0; out[3]=0
  out[4]=0; out[5]=f; out[6]=0; out[7]=0
  out[8]=0; out[9]=0; out[10]=(far+near)*nf; out[11]=-1
  out[12]=0; out[13]=0; out[14]=2*far*near*nf; out[15]=0
  return out
}

function lookAt(out, eye, target, up) {
  const ex=eye[0],ey=eye[1],ez=eye[2]
  const tx=target[0],ty=target[1],tz=target[2]
  const ux=up[0],uy=up[1],uz=up[2]

  let zx=ex-tx, zy=ey-ty, zz=ez-tz
  let zl = Math.hypot(zx, zy, zz)
  if (zl < 1e-8) { zx=0; zy=0; zz=1; zl=1 }
  zx/=zl; zy/=zl; zz/=zl

  let xx = uy*zz - uz*zy
  let xy = uz*zx - ux*zz
  let xz = ux*zy - uy*zx
  let xl = Math.hypot(xx, xy, xz)
  if (xl < 1e-8) { xx=1; xy=0; xz=0; xl=1 }
  xx/=xl; xy/=xl; xz/=xl

  const yx = zy*xz - zz*xy
  const yy = zz*xx - zx*xz
  const yz = zx*xy - zy*xx

  out[0]=xx; out[1]=yx; out[2]=zx; out[3]=0
  out[4]=xy; out[5]=yy; out[6]=zy; out[7]=0
  out[8]=xz; out[9]=yz; out[10]=zz; out[11]=0
  out[12]=-(xx*ex+xy*ey+xz*ez)
  out[13]=-(yx*ex+yy*ey+yz*ez)
  out[14]=-(zx*ex+zy*ey+zz*ez)
  out[15]=1
  return out
}

export class Camera {
  constructor(opts = {}) {
    this._defaults = {
      position: [...DEFAULTS.position],
      yaw: DEFAULTS.yaw,
      pitch: DEFAULTS.pitch,
    }

    this.position = new Float32Array(3)
    this.velocity = new Float32Array(3)
    this.forward = new Float32Array(3)
    this.right = new Float32Array(3)
    this.up = new Float32Array(3)
    this.worldUp = new Float32Array([0, 1, 0])

    this.yaw = 0
    this.pitch = 0
    this._baseSpeed = DEFAULTS.baseSpeed
    this._boostMultiplier = DEFAULTS.boostMultiplier
    this._sensitivity = DEFAULTS.sensitivity
    this._damping = DEFAULTS.damping
    this._minSpeed = DEFAULTS.minSpeed
    this._maxSpeed = DEFAULTS.maxSpeed

    this._fovY = DEFAULTS.fovY
    this._near = DEFAULTS.near
    this._far = DEFAULTS.far
    this._aspect = INTERNAL_ASPECT

    this._viewMatrix = new Float32Array(16)
    this._projMatrix = new Float32Array(16)
    this._viewDirty = true
    this._projDirty = true

    this._resetRequested = false

    if (opts.position && opts.position.length === 3) {
      this._defaults.position = [opts.position[0], opts.position[1], opts.position[2]]
    }
    if (typeof opts.yaw === 'number') this._defaults.yaw = opts.yaw
    if (typeof opts.pitch === 'number') this._defaults.pitch = opts.pitch
    if (typeof opts.baseSpeed === 'number') this._baseSpeed = opts.baseSpeed
    if (typeof opts.boostMultiplier === 'number') this._boostMultiplier = opts.boostMultiplier
    if (typeof opts.sensitivity === 'number') this._sensitivity = opts.sensitivity
    if (typeof opts.damping === 'number') this._damping = opts.damping
    if (typeof opts.fovY === 'number') this._fovY = opts.fovY
    if (typeof opts.near === 'number') this._near = opts.near
    if (typeof opts.far === 'number') this._far = opts.far

    this._reset()
    this._recomputeBasis()
    this._viewDirty = true
    this._projDirty = true
  }

  setAspect(aspect) {
    if (aspect > 0 && aspect !== this._aspect) {
      this._aspect = aspect
      this._projDirty = true
    }
  }

  setFovY(fovY) {
    if (fovY > 0 && fovY !== this._fovY) {
      this._fovY = fovY
      this._projDirty = true
    }
  }

  setNearFar(near, far) {
    if (near > 0 && far > near) {
      this._near = near
      this._far = far
      this._projDirty = true
    }
  }

  getBaseSpeed() { return this._baseSpeed }
  setBaseSpeed(s) {
    this._baseSpeed = clamp(s, this._minSpeed, this._maxSpeed)
  }
  getMinSpeed() { return this._minSpeed }
  getMaxSpeed() { return this._maxSpeed }

  adjustSpeedFromWheel(wheelDelta) {
    if (!wheelDelta) return
    const step = Math.max(0.05, this._baseSpeed * 0.12)
    let next = this._baseSpeed - wheelDelta * 0.01 * step
    next = clamp(next, this._minSpeed, this._maxSpeed)
    this._baseSpeed = next
  }

  _reset() {
    this.position[0] = this._defaults.position[0]
    this.position[1] = this._defaults.position[1]
    this.position[2] = this._defaults.position[2]
    this.yaw = this._defaults.yaw
    this.pitch = this._defaults.pitch
    this.velocity[0] = 0
    this.velocity[1] = 0
    this.velocity[2] = 0
    this._viewDirty = true
  }

  reset() { this._reset() }

  _recomputeBasis() {
    const cy = Math.cos(this.yaw)
    const sy = Math.sin(this.yaw)
    const cp = Math.cos(this.pitch)
    const sp = Math.sin(this.pitch)

    this.forward[0] = cy * cp
    this.forward[1] = sp
    this.forward[2] = sy * cp

    this.right[0] = -sy
    this.right[1] = 0
    this.right[2] = cy

    this.up[0] = -cy * sp
    this.up[1] = cp
    this.up[2] = -sy * sp
  }

  update(dt, input) {
    if (dt <= 0) return

    if (input && input.isKeyDown('reset')) {
      if (!this._resetRequested) {
        this._reset()
        this._resetRequested = true
      }
    } else {
      this._resetRequested = false
    }

    if (input) {
      const m = input.getMouseDelta()
      if (m.dx !== 0 || m.dy !== 0) {
        this.yaw -= m.dx * this._sensitivity
        this.pitch += m.dy * this._sensitivity
        if (this.pitch > PITCH_LIMIT) this.pitch = PITCH_LIMIT
        else if (this.pitch < -PITCH_LIMIT) this.pitch = -PITCH_LIMIT
        if (this.yaw > Math.PI) this.yaw -= 2 * Math.PI
        else if (this.yaw < -Math.PI) this.yaw += 2 * Math.PI
        this._viewDirty = true
      }

      const wheel = input.consumeWheelDelta()
      if (wheel !== 0) this.adjustSpeedFromWheel(wheel)
    }

    this._recomputeBasis()

    const speed = this._baseSpeed * (input && input.isKeyDown('boost') ? this._boostMultiplier : 1)

    let dirX = 0, dirY = 0, dirZ = 0
    if (input) {
      if (input.isKeyDown('forward')) { dirX += this.forward[0]; dirY += this.forward[1]; dirZ += this.forward[2] }
      if (input.isKeyDown('back'))    { dirX -= this.forward[0]; dirY -= this.forward[1]; dirZ -= this.forward[2] }
      if (input.isKeyDown('right'))   { dirX += this.right[0];   dirY += this.right[1];   dirZ += this.right[2] }
      if (input.isKeyDown('left'))    { dirX -= this.right[0];   dirY -= this.right[1];   dirZ -= this.right[2] }
      if (input.isKeyDown('up'))      { dirY += 1 }
      if (input.isKeyDown('down'))    { dirY -= 1 }
    }

    const dirLen = Math.hypot(dirX, dirY, dirZ)
    let desiredVX = 0, desiredVY = 0, desiredVZ = 0
    if (dirLen > 1e-6) {
      const inv = 1 / dirLen
      desiredVX = dirX * inv * speed
      desiredVY = dirY * inv * speed
      desiredVZ = dirZ * inv * speed
    }

    const damp = Math.pow(this._damping, dt * 60)
    this.velocity[0] = this.velocity[0] * damp + desiredVX * (1 - damp)
    this.velocity[1] = this.velocity[1] * damp + desiredVY * (1 - damp)
    this.velocity[2] = this.velocity[2] * damp + desiredVZ * (1 - damp)

    const vlen = Math.hypot(this.velocity[0], this.velocity[1], this.velocity[2])
    if (vlen < 1e-5) {
      this.velocity[0] = 0; this.velocity[1] = 0; this.velocity[2] = 0
    }

    this.position[0] += this.velocity[0] * dt
    this.position[1] += this.velocity[1] * dt
    this.position[2] += this.velocity[2] * dt
    this._viewDirty = true
  }

  buildViewMatrix() {
    const tx = this.position[0] + this.forward[0]
    const ty = this.position[1] + this.forward[1]
    const tz = this.position[2] + this.forward[2]
    lookAt(this._viewMatrix, this.position, [tx, ty, tz], this.worldUp)
    this._viewDirty = false
    return this._viewMatrix
  }

  buildProjectionMatrix() {
    perspective(this._projMatrix, this._fovY, this._aspect, this._near, this._far)
    this._projDirty = false
    return this._projMatrix
  }

  getViewMatrix() {
    if (this._viewDirty) this.buildViewMatrix()
    return this._viewMatrix
  }

  getProjMatrix() {
    if (this._projDirty) this.buildProjectionMatrix()
    return this._projMatrix
  }

  getUniforms() {
    if (this._viewDirty) this.buildViewMatrix()
    if (this._projDirty) this.buildProjectionMatrix()
    return {
      uCameraPos: this.position,
      uCameraView: this._viewMatrix,
      uCameraProj: this._projMatrix,
      uCameraFovY: this._fovY,
      uCameraNearFar: [this._near, this._far],
    }
  }
}

export function createCamera(opts) {
  return new Camera(opts)
}

export function bootstrapCamera(canvas, opts) {
  const input = new InputManager()
  input.attach(canvas)
  const camera = new Camera(opts)
  if (typeof window !== 'undefined') {
    window.__bhCamera = camera
    window.__bhInput = input
  }
  return { camera, input }
}
