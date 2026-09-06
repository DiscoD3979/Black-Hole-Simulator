export function mat4Identity(out) {
  const m = out || new Float32Array(16)
  m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 0
  m[4] = 0; m[5] = 1; m[6] = 0; m[7] = 0
  m[8] = 0; m[9] = 0; m[10] = 1; m[11] = 0
  m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1
  return m
}

export function mat4Perspective(fovYRadians, aspect, near, far) {
  const f = 1.0 / Math.tan(fovYRadians * 0.5)
  const nf = 1.0 / (near - far)
  const m = new Float32Array(16)
  m[0] = f / aspect
  m[5] = f
  m[10] = (far + near) * nf
  m[11] = -1
  m[14] = 2 * far * near * nf
  return m
}

export function mat4LookAt(eye, target, up) {
  const ex = eye[0], ey = eye[1], ez = eye[2]
  const tx = target[0], ty = target[1], tz = target[2]
  const ux = up[0], uy = up[1], uz = up[2]

  let zx = ex - tx, zy = ey - ty, zz = ez - tz
  let zl = Math.hypot(zx, zy, zz)
  if (zl < 1e-8) { zx = 0; zy = 0; zz = 1; zl = 1 }
  zx /= zl; zy /= zl; zz /= zl

  let xx = uy * zz - uz * zy
  let xy = uz * zx - ux * zz
  let xz = ux * zy - uy * zx
  let xl = Math.hypot(xx, xy, xz)
  if (xl < 1e-8) { xx = 1; xy = 0; xz = 0; xl = 1 }
  xx /= xl; xy /= xl; xz /= xl

  const yx = zy * xz - zz * xy
  const yy = zz * xx - zx * xz
  const yz = zx * xy - zy * xx

  const m = new Float32Array(16)
  m[0] = xx; m[1] = yx; m[2] = zx; m[3] = 0
  m[4] = xy; m[5] = yy; m[6] = zy; m[7] = 0
  m[8] = xz; m[9] = yz; m[10] = zz; m[11] = 0
  m[12] = -(xx * ex + xy * ey + xz * ez)
  m[13] = -(yx * ex + yy * ey + yz * ez)
  m[14] = -(zx * ex + zy * ey + zz * ez)
  m[15] = 1
  return m
}

export function mat4Invert(m) {
  const out = new Float32Array(16)
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3]
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7]
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11]
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15]

  const b00 = a00 * a11 - a01 * a10
  const b01 = a00 * a12 - a02 * a10
  const b02 = a00 * a13 - a03 * a10
  const b03 = a01 * a12 - a02 * a11
  const b04 = a01 * a13 - a03 * a11
  const b05 = a02 * a13 - a03 * a12
  const b06 = a20 * a31 - a21 * a30
  const b07 = a20 * a32 - a22 * a30
  const b08 = a20 * a33 - a23 * a30
  const b09 = a21 * a32 - a22 * a31
  const b10 = a21 * a33 - a23 * a31
  const b11 = a22 * a33 - a23 * a32

  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
  if (Math.abs(det) < 1e-12) return null
  det = 1.0 / det

  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det
  return out
}

export function vec3Length(v) {
  return Math.hypot(v[0], v[1], v[2])
}

export function vec3Normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2])
  if (l < 1e-8) return [0, 0, 0]
  return [v[0] / l, v[1] / l, v[2] / l]
}