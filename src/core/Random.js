export function createRandom(seed = 0x9e3779b9) {
  let state = (seed >>> 0) || 1

  const next = () => {
    state = (state + 0x6D2B79F5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const range = (a, b) => a + (b - a) * next()

  const int = (a, b) => Math.floor(a + (b - a + 1) * next())

  const reseed = (s) => {
    state = (s >>> 0) || 1
  }

  return { next, range, int, reseed }
}