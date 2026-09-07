import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createCamera } from '../src/scene/Camera.js'

test('default camera aims at the black hole origin', () => {
  const camera = createCamera()
  const { uCameraPos } = camera.getUniforms()
  const direction = camera.forward
  const toOrigin = [-uCameraPos[0], -uCameraPos[1], -uCameraPos[2]]
  const toOriginLength = Math.hypot(...toOrigin)
  const alignment = (direction[0] * toOrigin[0] + direction[1] * toOrigin[1] + direction[2] * toOrigin[2]) / toOriginLength

  assert.ok(alignment > 0.995, `camera alignment was ${alignment.toFixed(3)}`)
})

test('raymarch uses Schwarzschild null-geodesic bending toward the hole', async () => {
  const shader = await readFile(new URL('../shaders/bh_main.frag', import.meta.url), 'utf8')

  assert.match(shader, /vec3 force = -1\.5 \* rs \* h2 \* rp \/ \(r2 \* r2 \* r\)/)
  assert.match(shader, /normalize\(dir \+ force \* dt/)
})

test('accretion disk density starts at the inner edge and fades softly outside', async () => {
  const shader = await readFile(new URL('../shaders/disk.glsl', import.meta.url), 'utf8')

  assert.match(shader, /float innerEdge = smoothstep\(innerRadius \* 0\.9, innerRadius \* 1\.06, r\)/)
  assert.match(shader, /float outerFade = exp\(-rn \* rn \* rn/)
})

test('star layers reconstruct spherical cell centers from latitude', async () => {
  const shader = await readFile(new URL('../shaders/stars.glsl', import.meta.url), 'utf8')

  assert.match(shader, /float v\s*=\s*\(cell\.y \+ 0\.5\)\s*\/\s*grid\.y/)
})

test('star falloff uses angular-distance-squared so stars stay point-like', async () => {
  const shader = await readFile(new URL('../shaders/stars.glsl', import.meta.url), 'utf8')

  assert.match(shader, /float ang2 = 2\.0 \* \(1\.0 - d\)/)
  assert.match(shader, /exp\(-ang2 \* sharpness\)/)
})

test('UI container remains above the canvas for pointer input', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

  assert.match(html, /#ui\s*\{[^}]*pointer-events:\s*auto/s)
})

test('D remains movement-only and does not toggle a render debug mode', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')

  assert.doesNotMatch(source, /e\.code === 'KeyD'[\s\S]*renderer\.clearPasses\(\)/)
  assert.match(source, /e\.code === 'F3'/)
})

test('mouse pitch uses the natural vertical direction', async () => {
  const source = await readFile(new URL('../src/scene/Camera.js', import.meta.url), 'utf8')

  assert.match(source, /this\.pitch \+= m\.dy \* this\._sensitivity/)
})

test('MAXIMUM quality uses the full raymarch budget', async () => {
  const source = await readFile(new URL('../src/quality/QualityManager.js', import.meta.url), 'utf8')

  assert.match(source, /MAXIMUM:[\s\S]*raymarchSteps:\s*256/)
})

test('post processing scales bloom instead of replacing scene sharpness', async () => {
  const source = await readFile(new URL('../shaders/post_tonemap.frag', import.meta.url), 'utf8')

  assert.match(source, /uniform float uBloomIntensity/)
  assert.match(source, /scene \+ bloom \* uBloomIntensity/)
})

test('benchmark results persist in the live HUD', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')

  assert.match(source, /benchmarkSummary = benchmark\.formatResults\(\)/)
  assert.match(source, /perfMonitor\.getFormattedHudText\(\) \+ \(benchmarkSummary/)
})

test('benchmark computes 1% low from the slowest one percent of frames', async () => {
  const source = await readFile(new URL('../src/benchmark/Benchmark.js', import.meta.url), 'utf8')

  assert.match(source, /Math\.floor\(sorted\.length \* 0\.99\)/)
  assert.match(source, /filter\(\(fps\) => fps > 0\)/)
})

test('ray bending uses bounded adaptive integration steps', async () => {
  const shader = await readFile(new URL('../shaders/bh_main.frag', import.meta.url), 'utf8')

  assert.match(shader, /clamp\(r \* 0\.12, 0\.02, 2\.5\)/)
})

test('event horizon absorbs rays and no fake lens mask exists', async () => {
  const shader = await readFile(new URL('../shaders/bh_main.frag', import.meta.url), 'utf8')

  assert.match(shader, /if \(r < rs\) \{/)
  assert.match(shader, /absorbed = true/)
  assert.doesNotMatch(shader, /lensMask/)
})

test('accretion disk has relativistic beaming and a blue-violet color ramp', async () => {
  const shader = await readFile(new URL('../shaders/disk.glsl', import.meta.url), 'utf8')

  assert.match(shader, /doppler \* doppler \* doppler/)
  assert.match(shader, /vec3 deepViolet = vec3\(0\.20, 0\.05, 0\.52\)/)
  assert.match(shader, /float emission = 2\.1 \* brightness/)
})

test('accretion disk uses a compact outer radius with soft fade', async () => {
  const source = await readFile(new URL('../src/scene/AccretionDisk.js', import.meta.url), 'utf8')
  const shader = await readFile(new URL('../shaders/disk.glsl', import.meta.url), 'utf8')

  assert.match(source, /blackHoleRadius \* 11\.0/)
  assert.match(shader, /float outerFade = exp\(-rn \* rn \* rn/)
})

test('default quality keeps chromatic aberration disabled', async () => {
  const source = await readFile(new URL('../src/quality/QualityManager.js', import.meta.url), 'utf8')

  assert.match(source, /MAXIMUM:[\s\S]*chromaticAberration:\s*0\.0/)
})

test('benchmark is continuous and keeps a bounded rolling history', async () => {
  const source = await readFile(new URL('../src/benchmark/Benchmark.js', import.meta.url), 'utf8')

  assert.match(source, /duration: Infinity/)
  assert.match(source, /MAX_BENCHMARK_SAMPLES/)
  assert.doesNotMatch(source, /this\._finish\(\)/)
})
