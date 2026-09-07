import { createFramebuffer } from '../core/Framebuffer.js'
import { createProgramFromFiles, buildUniformCache } from '../core/ShaderProgram.js'
import { INTERNAL_WIDTH, INTERNAL_HEIGHT } from '../config.js'

const BLOOM_LEVELS = 5

export class BloomPass {
  constructor(gl) {
    this.gl = gl
    this.programs = { downsample: null, upsample: null }
    this.uniforms = { downsample: null, upsample: null }
    this.downFbos = []
    this.upFbos = []
    this.downLevels = []
    this.upLevels = []
  }

  async init() {
    const gl = this.gl

    const [downProgram, upProgram] = await Promise.all([
      createProgramFromFiles(gl, 'shaders/post_passthrough.vert', 'shaders/post_bloom_downsample.frag'),
      createProgramFromFiles(gl, 'shaders/post_passthrough.vert', 'shaders/post_bloom_upsample.frag'),
    ])

    this.programs.downsample = downProgram
    this.programs.upsample = upProgram
    this.uniforms.downsample = buildUniformCache(gl, downProgram, ['uTexture'])
    this.uniforms.upsample = buildUniformCache(gl, upProgram, ['uTexture'])

    this._createFbos(INTERNAL_WIDTH, INTERNAL_HEIGHT)
  }

  _createFbos(w, h) {
    this._destroyFbos()

    let dw = w, dh = h
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      dw = Math.max(1, Math.floor(dw / 2))
      dh = Math.max(1, Math.floor(dh / 2))
      this.downFbos.push(createFramebuffer(this.gl, dw, dh, { format: 'RGBA8' }))
      this.downLevels.push({ w: dw, h: dh })
    }

    for (let i = 0; i < BLOOM_LEVELS; i++) {
      const lvl = this.downLevels[BLOOM_LEVELS - 1 - i]
      this.upFbos.push(createFramebuffer(this.gl, lvl.w, lvl.h, { format: 'RGBA8' }))
      this.upLevels.push({ w: lvl.w, h: lvl.h })
    }
  }

  _destroyFbos() {
    for (const fb of this.downFbos) fb.dispose()
    for (const fb of this.upFbos) fb.dispose()
    this.downFbos = []
    this.upFbos = []
    this.downLevels = []
    this.upLevels = []
  }

  resize(w, h) {
    this._createFbos(w, h)
  }

  render(inputTexture, quad) {
    const gl = this.gl

    gl.disable(gl.DEPTH_TEST)

    for (let i = 0; i < BLOOM_LEVELS; i++) {
      const fb = this.downFbos[i]
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb.framebuffer)
      gl.viewport(0, 0, fb.width, fb.height)
      gl.useProgram(this.programs.downsample)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, i === 0 ? inputTexture : this.downFbos[i - 1].texture)
      const loc = this.uniforms.downsample.get('uTexture')
      if (loc) gl.uniform1i(loc, 0)
      gl.bindVertexArray(quad.vao)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.bindVertexArray(null)
    }

    // Upsample: a normal (non-additive) box blur per level. BLEND must stay
    // DISABLED so each upFbo is fully REPLACED every frame — an additive
    // ONE,ONE blend here accumulates stale bright pixels across frames and
    // produces persistent smear/motion trails when the camera moves.
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      const fb = this.upFbos[i]
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb.framebuffer)
      gl.viewport(0, 0, fb.width, fb.height)
      gl.useProgram(this.programs.upsample)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.downFbos[BLOOM_LEVELS - 1 - i].texture)
      const loc = this.uniforms.upsample.get('uTexture')
      if (loc) gl.uniform1i(loc, 0)
      gl.bindVertexArray(quad.vao)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.bindVertexArray(null)
    }
  }

  setIntensity(v) {
    this.intensity = v
  }

  getOutputTexture() {
    return this.upFbos[this.upFbos.length - 1].texture
  }

  dispose() {
    this._destroyFbos()
    if (this.programs.downsample) this.gl.deleteProgram(this.programs.downsample)
    if (this.programs.upsample) this.gl.deleteProgram(this.programs.upsample)
  }
}
