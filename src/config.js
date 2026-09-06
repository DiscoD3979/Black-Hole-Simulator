export const INTERNAL_WIDTH = 1920
export const INTERNAL_HEIGHT = 1080
export const INTERNAL_ASPECT = INTERNAL_WIDTH / INTERNAL_HEIGHT

export const QUALITY_PRESETS = {
  MAXIMUM: {
    raymarchSteps: 256,
    secondarySteps: 96,
    starDensity: 1.0,
    bloom: true,
    chromaticAberration: true,
    temporalAA: true,
    exposure: 1.0,
  },
  HIGH: {
    raymarchSteps: 160,
    secondarySteps: 64,
    starDensity: 0.75,
    bloom: true,
    chromaticAberration: true,
    temporalAA: true,
    exposure: 1.0,
  },
  PERFORMANCE: {
    raymarchSteps: 96,
    secondarySteps: 32,
    starDensity: 0.5,
    bloom: true,
    chromaticAberration: false,
    temporalAA: false,
    exposure: 1.0,
  },
}

export const QUALITY_PRESET_NAMES = Object.keys(QUALITY_PRESETS)

const LEVELS = { info: 'INFO', warn: 'WARN', error: 'ERROR', debug: 'DEBUG' }

export function log(msg, level = 'info') {
  const tag = LEVELS[level] || 'INFO'
  const line = `[BH] ${tag} ${msg}`
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}