import { INTERNAL_WIDTH, INTERNAL_HEIGHT, log } from '../config.js'
import { createFullscreenQuad } from './FullscreenQuad.js'
import { createProgramFromFiles, buildUniformCache } from './ShaderProgram.js'
import { createFramebuffer } from './Framebuffer.js'

export class Renderer {
  constructor(gl) {
    this.gl = gl
    this.width = INTERNAL_WIDTH
    this.height = INTERNAL_HEIGHT
    this.startTime = performance.now()
    this.lastTime = this.startTime
    this.elapsed = 0

    this.passes = []
    this.defaultPass = null
    this._time = 0
    this._activeCamera = null

    this.quad = createFullscreenQuad(gl)
    this._sceneFbo = createFramebuffer(gl, INTERNAL_WIDTH, INTERNAL_HEIGHT, { format: 'RGBA16F', depth: true })

    this.programPromise = createProgramFromFiles(
      gl,
      'shaders/foundation.vert',
      'shaders/foundation.frag'
    ).then((program) => {
      this.defaultPass = {
        name: 'foundation',
        program,
        uniforms: buildUniformCache(gl, program, ['uTime', 'uResolution']),
        texture: null,
        fbo: null,
      }
      log('Foundation shader program compiled and linked', 'info')
      return program
    }).catch((err) => {
      log(`Failed to build foundation shader program: ${err.message}`, 'error')
      throw err
    })
  }

  async ready() {
    await this.programPromise
  }

  addPass(pass) {
    this.passes.push(pass)
    return pass
  }

  clearPasses() {
    this.passes.length = 0
  }

  render(dt, time) {
    const gl = this.gl
    const now = time !== undefined ? time : performance.now()
    this.lastTime = now
    this.elapsed = (now - this.startTime) / 1000
    this._time = this.elapsed

    for (const pass of this.passes) {
      if (typeof pass.run === 'function') {
        pass.run(gl, this)
      }
    }

    if (this.passes.length === 0 && this.defaultPass) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, this.width, this.height)
      gl.disable(gl.DEPTH_TEST)
      gl.disable(gl.BLEND)
      gl.clearColor(0.0, 0.0, 0.0, 1.0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.useProgram(this.defaultPass.program)
      if (this.defaultPass.uniforms.get('uTime')) {
        gl.uniform1f(this.defaultPass.uniforms.get('uTime'), this.elapsed)
      }
      if (this.defaultPass.uniforms.get('uResolution')) {
        gl.uniform2f(this.defaultPass.uniforms.get('uResolution'), this.width, this.height)
      }
      this.quad.draw()
    }
  }

  resize(width, height) {
    this.width = width
    this.height = height
  }
}