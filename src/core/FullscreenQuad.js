export function createFullscreenQuad(gl) {
  const vao = gl.createVertexArray()
  if (!vao) {
    throw new Error('[BH] gl.createVertexArray returned null')
  }

  gl.bindVertexArray(vao)

  const vbo = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)

  // Fullscreen triangle: 3 vertices that cover the entire screen
  // This is the "big triangle" trick — one triangle with vertices
  // at (-1,-1), (3,-1), (-1,3) covers the entire [-1,1] viewport
  const vertices = new Float32Array([
    -1, -1,
     3, -1,
    -1,  3,
  ])
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

  // vertex attrib 0 = position (vec2)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  gl.bindVertexArray(null)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)

  const draw = () => {
    gl.bindVertexArray(vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
  }

  return { vao, vbo, draw }
}
