import { INTERNAL_WIDTH, INTERNAL_HEIGHT } from '../config.js'
import { createProgram } from '../core/ShaderProgram.js'
import { createFramebuffer } from '../core/Framebuffer.js'
import { BlackHole } from './BlackHole.js'
import { StarField } from './StarField.js'
import { AccretionDisk } from './AccretionDisk.js'

const DEFAULT_CAMERA = {
  position: [0, 2.4, 30],
  yaw: -Math.PI / 2,
  pitch: -0.075,
}

function mat4Invert(m) {
  const out = new Float32Array(16)
  const a00=m[0],a01=m[1],a02=m[2],a03=m[3]
  const a10=m[4],a11=m[5],a12=m[6],a13=m[7]
  const a20=m[8],a21=m[9],a22=m[10],a23=m[11]
  const a30=m[12],a31=m[13],a32=m[14],a33=m[15]
  const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10
  const b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12
  const b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30
  const b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32
  let det = b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06
  if (Math.abs(det) < 1e-12) return m.slice()
  det = 1.0 / det
  out[0]=(a11*b11-a12*b10+a13*b09)*det
  out[1]=(a02*b10-a01*b11-a03*b09)*det
  out[2]=(a31*b05-a32*b04+a33*b03)*det
  out[3]=(a22*b04-a21*b05-a23*b03)*det
  out[4]=(a12*b08-a10*b11-a13*b07)*det
  out[5]=(a00*b11-a02*b08+a03*b07)*det
  out[6]=(a32*b02-a30*b05-a33*b01)*det
  out[7]=(a20*b05-a22*b02+a23*b01)*det
  out[8]=(a10*b10-a11*b08+a13*b06)*det
  out[9]=(a01*b08-a00*b10-a03*b06)*det
  out[10]=(a30*b04-a31*b02+a33*b00)*det
  out[11]=(a21*b02-a20*b04-a23*b00)*det
  out[12]=(a11*b07-a10*b09-a12*b06)*det
  out[13]=(a00*b09-a01*b07+a02*b06)*det
  out[14]=(a31*b01-a30*b03-a32*b00)*det
  out[15]=(a20*b03-a21*b01+a22*b00)*det
  return out
}

function buildDefaultView() {
  const { position, yaw, pitch } = DEFAULT_CAMERA
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const forward = [cy * cp, sp, sy * cp]
  const target = [position[0] + forward[0], position[1] + forward[1], position[2] + forward[2]]

  const ex = position[0], ey = position[1], ez = position[2]
  let zx = ex - target[0], zy = ey - target[1], zz = ez - target[2]
  let zl = Math.hypot(zx, zy, zz)
  if (zl < 1e-8) { zx = 0; zy = 0; zz = 1; zl = 1 }
  zx /= zl; zy /= zl; zz /= zl

  let xx = 1*zz - 0*zy, xy = 0*zx - 0*zz, xz = 0*zy - 1*zx
  let xl = Math.hypot(xx, xy, xz)
  if (xl < 1e-8) { xx = 1; xy = 0; xz = 0; xl = 1 }
  xx /= xl; xy /= xl; xz /= xl

  const yx = zy*xz - zz*xy, yy = zz*xx - zx*xz, yz = zx*xy - zy*xx

  const view = new Float32Array(16)
  view[0]=xx; view[1]=yx; view[2]=zx; view[3]=0
  view[4]=xy; view[5]=yy; view[6]=zy; view[7]=0
  view[8]=xz; view[9]=yz; view[10]=zz; view[11]=0
  view[12]=-(xx*ex+xy*ey+xz*ez)
  view[13]=-(yx*ex+yy*ey+yz*ez)
  view[14]=-(zx*ex+zy*ey+zz*ez)
  view[15]=1

  return { position: new Float32Array(position), view, target }
}

function buildDefaultProj() {
  const fovY = 60 * Math.PI / 180
  const aspect = INTERNAL_WIDTH / INTERNAL_HEIGHT
  const f = 1 / Math.tan(fovY / 2)
  const near = 0.05, far = 5000
  const nf = 1 / (near - far)
  const proj = new Float32Array(16)
  proj[0]=f/aspect; proj[5]=f; proj[10]=(far+near)*nf; proj[11]=-1; proj[14]=2*far*near*nf; proj[15]=0
  return proj
}

export class Scene {
  constructor(gl, renderer) {
    this.gl = gl
    this.renderer = renderer
    this.blackHole = new BlackHole()
    this.stars = new StarField()
    this.accretionDisk = new AccretionDisk(this.blackHole.schwarzschildRadius)
    this.program = null
    this.uniforms = {}
    this.ready = false
    this._invViewCache = null
    this._invProjCache = null
    this._raymarchSteps = 196
    this._secondaryStepScale = 0.5
  }

  async init() {
    const gl = this.gl
    const [vs, fs, starsSrc, commonSrc, diskSrc] = await Promise.all([
      fetch('shaders/bh_main.vert').then(r => r.text()),
      fetch('shaders/bh_main.frag').then(r => r.text()),
      this.stars.getShaderSource(),
      fetch('shaders/common.glsl').then(r => r.text()),
      this.accretionDisk.getShaderSource(),
    ])

    const fullFs = commonSrc + '\n' + starsSrc + '\n' + diskSrc + '\n' + fs

    this.program = createProgram(gl, vs, fullFs)

    const loc = (name) => gl.getUniformLocation(this.program, name)
    this.uniforms = {
      uTime: loc('uTime'),
      uResolution: loc('uResolution'),
      uCameraPos: loc('uCameraPos'),
      uInvCameraView: loc('uInvCameraView'),
      uInvCameraProj: loc('uInvCameraProj'),
      uBHPosition: loc('uBHPosition'),
      uBHRadius: loc('uBHRadius'),
      uBHLensStrength: loc('uBHLensStrength'),
      uRaymarchSteps: loc('uRaymarchSteps'),
      uSecondaryStepScale: loc('uSecondaryStepScale'),
      uAspect: loc('uAspect'),
      uStarDensity: loc('uStarDensity'),
      uStarSeed: loc('uStarSeed'),
      uStarTime: loc('uStarTime'),
      uStarTwinkleSpeed: loc('uStarTwinkleSpeed'),
      uDiskInnerRadius: loc('uDiskInnerRadius'),
      uDiskOuterRadius: loc('uDiskOuterRadius'),
      uDiskDensity: loc('uDiskDensity'),
      uDiskTemperature: loc('uDiskTemperature'),
      uDiskAccretionSpeed: loc('uDiskAccretionSpeed'),
      uDiskSpiralTightness: loc('uDiskSpiralTightness'),
      uDiskDopplerStrength: loc('uDiskDopplerStrength'),
    }

    this.ready = true
  }

  getRenderPass() {
    const self = this
    return {
      name: 'bh_main',
      run(gl, renderer) {
        if (!self.ready) return

        const cam = self.renderer._activeCamera
        let camPos, camView, camProj, aspect

        if (cam) {
          const cu = cam.getUniforms()
          camPos = cu.uCameraPos
          camView = cu.uCameraView
          camProj = cu.uCameraProj
          aspect = INTERNAL_WIDTH / INTERNAL_HEIGHT
        } else {
          const dc = buildDefaultView()
          camPos = dc.position
          camView = dc.view
          camProj = buildDefaultProj()
          aspect = INTERNAL_WIDTH / INTERNAL_HEIGHT
        }

        const invView = mat4Invert(camView)
        const invProj = mat4Invert(camProj)

        gl.bindFramebuffer(gl.FRAMEBUFFER, renderer._sceneFbo.framebuffer)
        gl.viewport(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT)
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.useProgram(self.program)

        const u = self.uniforms
        gl.uniform1f(u.uTime, renderer._time || 0)
        gl.uniform2f(u.uResolution, INTERNAL_WIDTH, INTERNAL_HEIGHT)
        gl.uniform3fv(u.uCameraPos, camPos)
        gl.uniformMatrix4fv(u.uInvCameraView, false, invView)
        gl.uniformMatrix4fv(u.uInvCameraProj, false, invProj)
        gl.uniform3fv(u.uBHPosition, self.blackHole.position)
        gl.uniform1f(u.uBHRadius, self.blackHole.schwarzschildRadius)
        gl.uniform1f(u.uBHLensStrength, self.blackHole.lensStrength)
        gl.uniform1f(u.uBHSpin, self.blackHole.spin)
        gl.uniform1i(u.uRaymarchSteps, self._raymarchSteps)
        gl.uniform1f(u.uSecondaryStepScale, self._secondaryStepScale)
        gl.uniform1f(u.uAspect, aspect)

        const su = self.stars.getUniforms()
        gl.uniform1f(u.uStarDensity, su.uStarDensity)
        gl.uniform1f(u.uStarSeed, su.uStarSeed)
        gl.uniform1f(u.uStarTime, renderer._time || 0)
        gl.uniform1f(u.uStarTwinkleSpeed, su.uStarTwinkleSpeed)

        const du = self.accretionDisk.getUniforms()
        gl.uniform1f(u.uDiskInnerRadius, du.uDiskInnerRadius)
        gl.uniform1f(u.uDiskOuterRadius, du.uDiskOuterRadius)
        gl.uniform1f(u.uDiskDensity, du.uDiskDensity)
        gl.uniform1f(u.uDiskTemperature, du.uDiskTemperature)
        gl.uniform1f(u.uDiskAccretionSpeed, du.uDiskAccretionSpeed)
        gl.uniform1f(u.uDiskSpiralTightness, du.uDiskSpiralTightness)
        gl.uniform1f(u.uDiskDopplerStrength, du.uDiskDopplerStrength)
        gl.uniform1f(u.uDiskBrightness, du.uDiskBrightness)
        gl.uniform1f(u.uDiskHue, du.uDiskHue)
        gl.uniform1f(u.uDiskThickness, du.uDiskThickness)
        gl.uniform1f(u.uRingStrength, self.blackHole.ringStrength)

        gl.disable(gl.DEPTH_TEST)
        gl.disable(gl.BLEND)
        renderer.quad.draw()
      },
    }
  }

  setCamera(camera) {
    this.renderer._activeCamera = camera
  }

  getSceneFbo() {
    return this.renderer._sceneFbo
  }

  getDirectRenderPass() {
    const self = this
    return {
      name: 'bh_direct',
      run(gl, renderer) {
        if (!self.ready) return

        const cam = renderer._activeCamera
        let camPos, camView, camProj, aspect

        if (cam) {
          const cu = cam.getUniforms()
          camPos = cu.uCameraPos
          camView = cu.uCameraView
          camProj = cu.uCameraProj
          aspect = INTERNAL_WIDTH / INTERNAL_HEIGHT
        } else {
          const dc = buildDefaultView()
          camPos = dc.position
          camView = dc.view
          camProj = buildDefaultProj()
          aspect = INTERNAL_WIDTH / INTERNAL_HEIGHT
        }

        const invView = mat4Invert(camView)
        const invProj = mat4Invert(camProj)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT)
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.useProgram(self.program)

        const u = self.uniforms
        gl.uniform1f(u.uTime, renderer._time || 0)
        gl.uniform2f(u.uResolution, INTERNAL_WIDTH, INTERNAL_HEIGHT)
        gl.uniform3fv(u.uCameraPos, camPos)
        gl.uniformMatrix4fv(u.uInvCameraView, false, invView)
        gl.uniformMatrix4fv(u.uInvCameraProj, false, invProj)
        gl.uniform3fv(u.uBHPosition, self.blackHole.position)
        gl.uniform1f(u.uBHRadius, self.blackHole.schwarzschildRadius)
        gl.uniform1f(u.uBHLensStrength, self.blackHole.lensStrength)
        gl.uniform1f(u.uBHSpin, self.blackHole.spin)
        gl.uniform1i(u.uRaymarchSteps, self._raymarchSteps)
        gl.uniform1f(u.uSecondaryStepScale, self._secondaryStepScale)
        gl.uniform1f(u.uAspect, aspect)

        const su = self.stars.getUniforms()
        gl.uniform1f(u.uStarDensity, su.uStarDensity)
        gl.uniform1f(u.uStarSeed, su.uStarSeed)
        gl.uniform1f(u.uStarTime, renderer._time || 0)
        gl.uniform1f(u.uStarTwinkleSpeed, su.uStarTwinkleSpeed)

        const du = self.accretionDisk.getUniforms()
        gl.uniform1f(u.uDiskInnerRadius, du.uDiskInnerRadius)
        gl.uniform1f(u.uDiskOuterRadius, du.uDiskOuterRadius)
        gl.uniform1f(u.uDiskDensity, du.uDiskDensity)
        gl.uniform1f(u.uDiskTemperature, du.uDiskTemperature)
        gl.uniform1f(u.uDiskAccretionSpeed, du.uDiskAccretionSpeed)
        gl.uniform1f(u.uDiskSpiralTightness, du.uDiskSpiralTightness)
        gl.uniform1f(u.uDiskDopplerStrength, du.uDiskDopplerStrength)
        gl.uniform1f(u.uDiskBrightness, du.uDiskBrightness)
        gl.uniform1f(u.uDiskHue, du.uDiskHue)
        gl.uniform1f(u.uDiskThickness, du.uDiskThickness)
        gl.uniform1f(u.uRingStrength, self.blackHole.ringStrength)

        gl.disable(gl.DEPTH_TEST)
        gl.disable(gl.BLEND)
        renderer.quad.draw()
      },
    }
  }
}
