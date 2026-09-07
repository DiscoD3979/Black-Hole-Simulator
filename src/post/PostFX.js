import { INTERNAL_WIDTH, INTERNAL_HEIGHT } from '../config.js'
import { createProgramFromFiles, buildUniformCache } from '../core/ShaderProgram.js'
import { createFramebuffer } from '../core/Framebuffer.js'
import { BloomPass } from './BloomPass.js'

export class PostFX {
  constructor(gl, renderer) {
    this.gl = gl
    this.renderer = renderer
    this.width = INTERNAL_WIDTH
    this.height = INTERNAL_HEIGHT

    this.programs = {}
    this.uniforms = {}
    this.fbo = null
    this.chromaticFbo = null
    this.fxaaFbo = null
    this.bloom = new BloomPass(gl)
    this.exposure = 1.0
    this.bloomIntensity = 0.08
    this.chromaticAberration = 0.004
    this.antiAliasingEnabled = true
  }

  async init() {
    const gl = this.gl

    this._createFbos(this.width, this.height)

    const [tonemapProgram, chromaticProgram, finalProgram, fxaaProgram, debugProgram] = await Promise.all([
      createProgramFromFiles(gl, 'shaders/post_passthrough.vert', 'shaders/post_tonemap.frag'),
      createProgramFromFiles(gl, 'shaders/post_passthrough.vert', 'shaders/post_chromatic.frag'),
      createProgramFromFiles(gl, 'shaders/post_passthrough.vert', 'shaders/post_final.frag'),
      createProgramFromFiles(gl, 'shaders/post_passthrough.vert', 'shaders/post_fxaa.frag'),
      createProgramFromFiles(gl, 'shaders/post_passthrough.vert', 'shaders/post_debug.frag'),
    ])

    this.programs.tonemap = tonemapProgram
    this.programs.chromatic = chromaticProgram
    this.programs.final = finalProgram
    this.programs.fxaa = fxaaProgram
    this.programs.debug = debugProgram

    this.uniforms.debug = buildUniformCache(gl, debugProgram, ['uTexture'])

    this.uniforms.tonemap = buildUniformCache(gl, tonemapProgram, [
      'uTexture', 'uBloomTexture', 'uExposure', 'uBloomIntensity', 'uResolution',
    ])
    this.uniforms.chromatic = buildUniformCache(gl, chromaticProgram, [
      'uTexture', 'uResolution', 'uChromaticAberration',
    ])
    this.uniforms.final = buildUniformCache(gl, finalProgram, [
      'uTexture', 'uTime', 'uResolution',
    ])
    this.uniforms.fxaa = buildUniformCache(gl, fxaaProgram, [
      'uTexture', 'uResolution',
    ])

    await this.bloom.init()
  }

  _createFbos(w, h) {
    this._destroyFbos()
    this.fbo = createFramebuffer(this.gl, w, h, { format: 'RGBA16F' })
    this.chromaticFbo = createFramebuffer(this.gl, w, h, { format: 'RGBA8' })
    this.fxaaFbo = createFramebuffer(this.gl, w, h, { format: 'RGBA8' })
  }

  _destroyFbos() {
    if (this.fbo) this.fbo.dispose()
    if (this.chromaticFbo) this.chromaticFbo.dispose()
    if (this.fxaaFbo) this.fxaaFbo.dispose()
  }

  resize(w, h) {
    this.width = w
    this.height = h
    this._createFbos(w, h)
    this.bloom.resize(w, h)
  }

  setExposure(v) {
    this.exposure = v
  }

  setBloomIntensity(v) {
    this.bloomIntensity = Math.max(0.0, Math.min(1.0, v * 0.2))
    if (this.bloom && this.bloom.setIntensity) {
      this.bloom.setIntensity(v)
    }
  }

  setChromaticAberration(v) {
    this.chromaticAberration = v
  }

  setAntiAliasing(v) {
    this.antiAliasingEnabled = !!v
  }

  // Debug view: draw a single intermediate render target straight to screen.
  // Names: 'off' | 'scene' | 'bloom0'..'bloom4' | 'bloomUp' | 'tonemap' | 'chromatic' | 'fxaa'
  setDebugView(name) {
    this._debugView = name || 'off'
  }

  _resolveDebugTexture(sceneTexture) {
    switch (this._debugView) {
      case 'scene': return sceneTexture
      case 'bloom0': return this.bloom.downFbos[0].texture
      case 'bloom1': return this.bloom.downFbos[1].texture
      case 'bloom2': return this.bloom.downFbos[2].texture
      case 'bloom3': return this.bloom.downFbos[3].texture
      case 'bloom4': return this.bloom.downFbos[4].texture
      case 'bloomUp': return this.bloom.getOutputTexture()
      case 'tonemap': return this.fbo.texture
      case 'chromatic': return this.chromaticFbo.texture
      case 'fxaa': return this.fxaaFbo.texture
      default: return null
    }
  }

  _debugPass(texture) {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.width, this.height)
    gl.useProgram(this.programs.debug)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    const loc = this.uniforms.debug.get('uTexture')
    if (loc) gl.uniform1i(loc, 0)

    this._drawQuad()
  }

  render(sceneTexture, time) {
    const gl = this.gl
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)

    if (this._debugView && this._debugView !== 'off') {
      const tex = this._resolveDebugTexture(sceneTexture)
      if (tex) {
        // Bloom targets are produced inside bloom.render(); run it so debug
        // views of bloom levels show the CURRENT frame, not a stale one.
        this.bloom.render(sceneTexture, this.renderer.quad)
        this._debugPass(tex)
      }
      return
    }

    if (this._debugPassthrough) {
      this._passthroughPass(sceneTexture)
      return
    }

    this.bloom.render(sceneTexture, this.renderer.quad)

    this._tonemapPass(sceneTexture)
    this._chromaticPass()
    if (this.antiAliasingEnabled) {
      this._fxaaPass()
      this._finalPass(time, this.fxaaFbo.texture)
    } else {
      this._finalPass(time, this.chromaticFbo.texture)
    }
  }

  _passthroughPass(sceneTexture) {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.width, this.height)
    gl.useProgram(this.programs.tonemap)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture)
    const loc0 = this.uniforms.tonemap.get('uTexture')
    if (loc0) gl.uniform1i(loc0, 0)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture)
    const loc1 = this.uniforms.tonemap.get('uBloomTexture')
    if (loc1) gl.uniform1i(loc1, 1)

    const locExp = this.uniforms.tonemap.get('uExposure')
    if (locExp) gl.uniform1f(locExp, 1.0)

    const locRes = this.uniforms.tonemap.get('uResolution')
    if (locRes) gl.uniform2f(locRes, this.width, this.height)

    this._drawQuad()
  }

  _drawQuad() {
    const gl = this.gl
    const quad = this.renderer.quad
    gl.bindVertexArray(quad.vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
  }

  _tonemapPass(sceneTexture) {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo.framebuffer)
    gl.viewport(0, 0, this.width, this.height)
    gl.useProgram(this.programs.tonemap)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture)
    const loc0 = this.uniforms.tonemap.get('uTexture')
    if (loc0) gl.uniform1i(loc0, 0)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.bloom.getOutputTexture())
    const loc1 = this.uniforms.tonemap.get('uBloomTexture')
    if (loc1) gl.uniform1i(loc1, 1)

    const locExp = this.uniforms.tonemap.get('uExposure')
    if (locExp) gl.uniform1f(locExp, this.exposure)

    const locBloom = this.uniforms.tonemap.get('uBloomIntensity')
    if (locBloom) gl.uniform1f(locBloom, this.bloomIntensity)

    const locRes = this.uniforms.tonemap.get('uResolution')
    if (locRes) gl.uniform2f(locRes, this.width, this.height)

    this._drawQuad()
  }

  _chromaticPass() {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.chromaticFbo.framebuffer)
    gl.viewport(0, 0, this.width, this.height)
    gl.useProgram(this.programs.chromatic)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.fbo.texture)
    const loc0 = this.uniforms.chromatic.get('uTexture')
    if (loc0) gl.uniform1i(loc0, 0)

    const locRes = this.uniforms.chromatic.get('uResolution')
    if (locRes) gl.uniform2f(locRes, this.width, this.height)

    const locAb = this.uniforms.chromatic.get('uChromaticAberration')
    if (locAb) gl.uniform1f(locAb, this.chromaticAberration)

    this._drawQuad()
  }

  _fxaaPass() {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fxaaFbo.framebuffer)
    gl.viewport(0, 0, this.width, this.height)
    gl.useProgram(this.programs.fxaa)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.chromaticFbo.texture)
    const loc0 = this.uniforms.fxaa.get('uTexture')
    if (loc0) gl.uniform1i(loc0, 0)

    const locRes = this.uniforms.fxaa.get('uResolution')
    if (locRes) gl.uniform2f(locRes, this.width, this.height)

    this._drawQuad()
  }

  _finalPass(time, sourceTexture) {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.width, this.height)
    gl.useProgram(this.programs.final)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture)
    const loc0 = this.uniforms.final.get('uTexture')
    if (loc0) gl.uniform1i(loc0, 0)

    const locTime = this.uniforms.final.get('uTime')
    if (locTime) gl.uniform1f(locTime, time)

    const locRes = this.uniforms.final.get('uResolution')
    if (locRes) gl.uniform2f(locRes, this.width, this.height)

    this._drawQuad()
  }

  getRenderPass() {
    const self = this
    return {
      name: 'postfx',
      run(gl, renderer) {
        renderer._sceneFbo = renderer._sceneFbo || null
        const sceneTexture = renderer._sceneFbo
          ? renderer._sceneFbo.texture
          : null
        if (!sceneTexture) return
        self.render(sceneTexture, renderer._time)
      },
    }
  }

  dispose() {
    this._destroyFbos()
    this.bloom.dispose()
    for (const key of Object.keys(this.programs)) {
      if (this.programs[key]) this.gl.deleteProgram(this.programs[key])
    }
  }
}
