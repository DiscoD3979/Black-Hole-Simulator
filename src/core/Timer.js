export function createTimer(window = globalThis.window) {
  const samples = new Float32Array(60)
  let head = 0
  let filled = 0
  let last = 0
  let dt = 0
  let totalTime = 0
  let fps = 0
  let frameTimeMs = 0

  const tick = () => {
    const now = performance.now()
    if (last === 0) {
      last = now
      dt = 0
    } else {
      dt = (now - last) / 1000
      last = now
      totalTime += dt

      const frameMs = dt * 1000
      frameTimeMs = frameMs

      samples[head] = frameMs
      head = (head + 1) % samples.length
      if (filled < samples.length) filled++
    }

    if (filled > 0) {
      let sum = 0
      for (let i = 0; i < filled; i++) sum += samples[i]
      const avgMs = sum / filled
      fps = avgMs > 0 ? 1000 / avgMs : 0
    }

    return dt
  }

  const getFPS = () => fps
  const getFrameTimeMs = () => frameTimeMs
  const getDt = () => dt
  const getTime = () => totalTime
  const getSampleCount = () => filled

  return { tick, getFPS, getFrameTimeMs, getDt, getTime, getSampleCount }
}