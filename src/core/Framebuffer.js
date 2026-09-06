import { log } from '../config.js'

function pickInternalFormat(gl, requested) {
  if (requested === 'RGBA16F') {
    const hasHalfFloat = !!gl.getExtension('EXT_color_buffer_half_float')
    const hasFloat = !!gl.getExtension('EXT_color_buffer_float')
    if (hasHalfFloat || hasFloat) {
      return {
        internalFormat: gl.RGBA16F,
        format: gl.RGBA,
        type: gl.HALF_FLOAT,
        actual: 'RGBA16F',
      }
    }
    log('Framebuffer: EXT_color_buffer_(half_)float unavailable, falling back to RGBA8', 'warn')
    return {
      internalFormat: gl.RGBA8,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      actual: 'RGBA8',
    }
  }
  return {
    internalFormat: gl.RGBA8,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
    actual: 'RGBA8',
  }
}

function createTextureAttachment(gl, internalFormat, format, type, width, height) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.bindTexture(gl.TEXTURE_2D, null)
  return texture
}

function createDepthAttachment(gl, width, height, stencil) {
  const rb = gl.createRenderbuffer()
  gl.bindRenderbuffer(gl.RENDERBUFFER, rb)
  if (stencil) {
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, width, height)
  } else {
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height)
  }
  gl.bindRenderbuffer(gl.RENDERBUFFER, null)
  return rb
}

function attach(gl, framebuffer, texture, depthRb, stencil) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  if (depthRb) {
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      stencil ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      depthRb
    )
  }

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    log(`Framebuffer incomplete: 0x${status.toString(16)}`, 'error')
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    throw new Error(`[BH] Framebuffer incomplete: 0x${status.toString(16)}`)
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

export function createFramebuffer(gl, width, height, options = {}) {
  const {
    format = 'RGBA8',
    depth = false,
    stencil = false,
    wrap = gl.CLAMP_TO_EDGE,
  } = options

  const fmt = pickInternalFormat(gl, format)

  const framebuffer = gl.createFramebuffer()
  if (!framebuffer) {
    throw new Error('[BH] gl.createFramebuffer returned null')
  }

  const texture = createTextureAttachment(gl, fmt.internalFormat, fmt.format, fmt.type, width, height)
  if (wrap !== gl.CLAMP_TO_EDGE) {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  let depthRb = null
  if (depth || stencil) {
    depthRb = createDepthAttachment(gl, width, height, stencil)
  }

  attach(gl, framebuffer, texture, depthRb, stencil)

  const fb = {
    framebuffer,
    texture,
    depthRb,
    width,
    height,
    format: fmt.actual,
    internalFormat: fmt.internalFormat,
    pixelFormat: fmt.format,
    pixelType: fmt.type,
    hasDepth: depth,
    hasStencil: stencil,
  }

  fb.bind = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb.framebuffer)
    gl.viewport(0, 0, fb.width, fb.height)
  }

  fb.unbind = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  fb.resize = (w, h) => {
    if (w === fb.width && h === fb.height) return
    fb.width = w
    fb.height = h

    gl.bindTexture(gl.TEXTURE_2D, fb.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, fb.internalFormat, w, h, 0, fb.pixelFormat, fb.pixelType, null)
    gl.bindTexture(gl.TEXTURE_2D, null)

    if (fb.depthRb) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, fb.depthRb)
      if (fb.hasStencil) {
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, w, h)
      } else {
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h)
      }
      gl.bindRenderbuffer(gl.RENDERBUFFER, null)
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb.framebuffer)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      log(`Framebuffer incomplete after resize: 0x${status.toString(16)}`, 'error')
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  fb.dispose = () => {
    gl.deleteFramebuffer(fb.framebuffer)
    gl.deleteTexture(fb.texture)
    if (fb.depthRb) gl.deleteRenderbuffer(fb.depthRb)
    fb.framebuffer = null
    fb.texture = null
    fb.depthRb = null
  }

  return fb
}

export function bindFramebuffer(gl, fb) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb.framebuffer)
  gl.viewport(0, 0, fb.width, fb.height)
}

export function unbindFramebuffer(gl) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}