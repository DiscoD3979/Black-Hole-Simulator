import { log } from '../config.js'

export function createGLContext(canvas) {
  if (!canvas) {
    throw new Error('[BH] createGLContext: canvas is null')
  }

  const attributes = {
    antialias: false,
    powerPreference: 'high-performance',
    alpha: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    premultipliedAlpha: true,
    desynchronized: true,
  }

  const gl = canvas.getContext('webgl2', attributes)

  if (!gl) {
    throw new Error(
      '[BH] WebGL 2.0 is not available in this browser. ' +
      'Please use a recent Chrome, Firefox, Edge or Safari.'
    )
  }

  if (!(gl instanceof WebGL2RenderingContext)) {
    throw new Error('[BH] Acquired context is not WebGL2RenderingContext')
  }

  log(`WebGL2 context created`, 'info')
  log(`  Vendor:   ${gl.getParameter(gl.VENDOR)}`, 'info')
  log(`  Renderer: ${gl.getParameter(gl.RENDERER)}`, 'info')
  log(`  Version:  ${gl.getParameter(gl.VERSION)}`, 'info')
  log(`  GLSL:     ${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)}`, 'info')

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  if (debugInfo) {
    try {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      log(`  GPU (unmasked): ${vendor} / ${renderer}`, 'info')
    } catch (e) {
      log(`  Failed to read unmasked renderer info: ${e}`, 'warn')
    }
  } else {
    log(`  WEBGL_debug_renderer_info extension not available`, 'debug')
  }

  const colorBufferFloat = gl.getExtension('EXT_color_buffer_float')
  const colorBufferHalfFloat = gl.getExtension('EXT_color_buffer_half_float')
  if (!colorBufferFloat && !colorBufferHalfFloat) {
    log(`  No float color buffer extension — RGBA16F FBOs will fall back to RGBA8`, 'warn')
  } else {
    log(`  Float color buffer extension: ${colorBufferHalfFloat ? 'EXT_color_buffer_half_float' : 'EXT_color_buffer_float'}`, 'debug')
  }

  const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
  log(`  MAX_TEXTURE_SIZE: ${maxTexSize}, MAX_RENDERBUFFER_SIZE: ${maxRenderbufferSize}`, 'debug')

  return gl
}