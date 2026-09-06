import { log } from '../config.js'

function prependHeader(isFragment, defines = []) {
  const lines = []
  lines.push('#version 300 es')
  lines.push('precision highp float;')
  for (const d of defines) {
    lines.push(d)
  }
  lines.push('precision highp int;')
  return lines.join('\n') + '\n'
}

function annotateSource(source) {
  const lines = source.split('\n')
  const width = String(lines.length).length
  const annotated = lines.map((line, i) => `${String(i + 1).padStart(width, ' ')}: ${line}`)
  return annotated.join('\n')
}

export function compileShader(gl, type, source, defines = []) {
  const isFragment = type === gl.FRAGMENT_SHADER
  const header = prependHeader(isFragment, defines)
  const fullSource = header + source

  const shader = gl.createShader(type)
  if (!shader) {
    throw new Error('[BH] gl.createShader returned null')
  }

  gl.shaderSource(shader, fullSource)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const infoLog = gl.getShaderInfoLog(shader) || '(no info log)'
    const typeName = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT'
    log(`Shader compile error (${typeName}):\n${infoLog}\n----- source -----\n${annotateSource(fullSource)}\n------------------`, 'error')
    gl.deleteShader(shader)
    throw new Error(`[BH] Shader compile failed (${typeName}): ${infoLog}`)
  }

  return shader
}

export function linkProgram(gl, vs, fs) {
  const program = gl.createProgram()
  if (!program) {
    throw new Error('[BH] gl.createProgram returned null')
  }

  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const infoLog = gl.getProgramInfoLog(program) || '(no info log)'
    log(`Program link error:\n${infoLog}`, 'error')
    gl.deleteProgram(program)
    throw new Error(`[BH] Program link failed: ${infoLog}`)
  }

  return program
}

function linkProgramWithSources(gl, vsSource, fsSource, defines = []) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource, defines)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource, defines)
  const program = linkProgram(gl, vs, fs)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  return program
}

async function loadText(url) {
  const response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(`[BH] Failed to load ${url}: HTTP ${response.status}`)
  }
  return response.text()
}

export async function createProgramFromFiles(gl, vsUrl, fsUrl, defines = []) {
  const [vsSource, fsSource] = await Promise.all([
    loadText(vsUrl),
    loadText(fsUrl),
  ])
  return linkProgramWithSources(gl, vsSource, fsSource, defines)
}

export function createProgram(gl, vsSource, fsSource, defines = []) {
  return linkProgramWithSources(gl, vsSource, fsSource, defines)
}

export function buildUniformCache(gl, program, names) {
  const cache = new Map()
  for (const name of names) {
    cache.set(name, gl.getUniformLocation(program, name))
  }
  return cache
}