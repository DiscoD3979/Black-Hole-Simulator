import { INTERNAL_WIDTH, INTERNAL_HEIGHT, log } from './config.js'
import { createGLContext } from './core/GLContext.js'
import { Renderer } from './core/Renderer.js'
import { createTimer } from './core/Timer.js'
import { Scene } from './scene/Scene.js'
import { bootstrapCamera } from './scene/Camera.js'
import { PostFX } from './post/PostFX.js'
import { UIManager } from './ui/UIManager.js'
import { QualityManager } from './quality/QualityManager.js'
import { AutoOptimizer } from './quality/AutoOptimizer.js'
import { Benchmark } from './benchmark/Benchmark.js'
import { PerformanceMonitor } from './perf/PerformanceMonitor.js'

function showHudError(msg) {
  const hud = document.getElementById('hud')
  if (hud) {
    hud.textContent += '\n' + msg
    hud.style.color = '#ff6060'
  }
  console.error('[BH]', msg)
}

function showHudInfo(msg) {
  const hud = document.getElementById('hud')
  if (hud) {
    hud.textContent += '\n' + msg
  }
  console.log('[BH]', msg)
}

async function bootstrap() {
  const canvas = document.getElementById('gl')
  if (!canvas) {
    showHudError('FATAL: canvas#gl not found in DOM')
    return
  }

  canvas.width = INTERNAL_WIDTH
  canvas.height = INTERNAL_HEIGHT
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.display = 'block'

  let gl
  try {
    gl = createGLContext(canvas)
  } catch (err) {
    showHudError(err.message || String(err))
    return
  }

  let renderer
  try {
    renderer = new Renderer(gl)
    await renderer.ready()
  } catch (err) {
    showHudError(`Renderer init failed: ${err.message || err}`)
    return
  }

  const scene = new Scene(gl, renderer)
  try {
    await scene.init()
    renderer.clearPasses()
    showHudInfo('Scene OK, program: ' + (scene.program ? 'YES' : 'NULL'))
    log('Scene initialized', 'info')
  } catch (err) {
    showHudError(`Scene init FAILED: ${err.message}`)
    log(`Scene init failed: ${err.message}`, 'error')
  }

  showHudInfo('SceneFBO: ' + (renderer._sceneFbo ? renderer._sceneFbo.format : 'NULL'))

  const postfx = new PostFX(gl, renderer)
  try {
    await postfx.init()
    showHudInfo('PostFX OK')
    log('PostFX initialized', 'info')
  } catch (err) {
    showHudError(`PostFX init FAILED: ${err.message}`)
    log(`PostFX init failed: ${err.message}`, 'error')
  }

  renderer.clearPasses()
  renderer.addPass(scene.getRenderPass())
  renderer.addPass(postfx.getRenderPass())

  const { camera, input } = bootstrapCamera(canvas)
  scene.setCamera(camera)

  const timer = createTimer()
  const hud = document.getElementById('hud')

  const qualityManager = new QualityManager()
  qualityManager.bind(scene, postfx, null)
  qualityManager.setProfile('MAXIMUM')

  const autoOptimizer = new AutoOptimizer(qualityManager)
  autoOptimizer.setEnabled(true)

  const perfMonitor = new PerformanceMonitor(timer)
  perfMonitor.getGpuInfo(gl)

  const benchmark = new Benchmark(timer, qualityManager)

  const ui = new UIManager()
  const uiContainer = document.getElementById('ui')
  if (uiContainer) {
    uiContainer.addEventListener('pointerdown', () => input.exitPointerLock(), { capture: true })
    ui.init(uiContainer)
    ui.bind(scene.blackHole, scene.accretionDisk, postfx, qualityManager, input)
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyH' && ui) ui.toggleVisibility()
    if (e.code === 'KeyB' && !benchmark.isActive()) benchmark.start()
    if (e.code === 'F3') {
      renderer.clearPasses()
      if (renderer._postfxDisabled) {
        renderer.addPass(scene.getRenderPass())
        renderer.addPass(postfx.getRenderPass())
        renderer._postfxDisabled = false
        showHudInfo('Mode: Scene + PostFX')
      } else {
        renderer.addPass(scene.getDirectRenderPass())
        renderer._postfxDisabled = true
        showHudInfo('Mode: DIRECT (no PostFX)')
      }
    }
    if (e.code === 'KeyT') {
      postfx._debugPassthrough = !postfx._debugPassthrough
      showHudInfo('Debug passthrough: ' + (postfx._debugPassthrough ? 'ON' : 'OFF'))
    }
  })

  let benchmarkSummary = ''
  benchmark.start()

  function frame(now) {
    const dt = timer.tick()
    const benchmarkResult = benchmark.update(dt)

    if (benchmarkResult && benchmarkResult.position) {
      camera.position[0] = benchmarkResult.position[0]
      camera.position[1] = benchmarkResult.position[1]
      camera.position[2] = benchmarkResult.position[2]
      camera._viewDirty = true
      const tx = benchmarkResult.target[0] - camera.position[0]
      const ty = benchmarkResult.target[1] - camera.position[1]
      const tz = benchmarkResult.target[2] - camera.position[2]
      camera.yaw = Math.atan2(tz, tx)
      camera.pitch = Math.atan2(ty, Math.hypot(tx, tz))
      camera._viewDirty = true
    }

    if (benchmark.isActive()) {
      camera._viewDirty = true
    }

    camera.update(dt, input)

    autoOptimizer.update(timer.getFPS())

    perfMonitor.setQuality(qualityManager.getProfile())
    perfMonitor.setRaymarchSteps(qualityManager.getParams().raymarchSteps)
    perfMonitor.setStarDensity(qualityManager.getParams().starDensity)
    perfMonitor.setBloom(qualityManager.getParams().bloom)
    perfMonitor.update()

    if (benchmark.isActive()) benchmarkSummary = benchmark.formatResults()

    renderer.render(dt, now)

    const glErr = gl.getError()
    if (glErr !== gl.NO_ERROR && !renderer._glErrorShown) {
      showHudError(`WebGL error: 0x${glErr.toString(16)}`)
      renderer._glErrorShown = true
    }

    if (hud) {
      hud.textContent = perfMonitor.getFormattedHudText() + (benchmarkSummary ? `\n${benchmarkSummary}` : '')
    }

    if (ui) {
      ui.updatePerfDisplay(timer.getFPS(), timer.getFrameTimeMs())
    }

    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  window.addEventListener('resize', () => {
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
  }, { passive: true })

  window.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    log('WebGL context lost', 'error')
    showHudError('WebGL context lost. Reload the page to recover.')
  }, false)

  log('Bootstrap complete — RAF loop running', 'info')
}

bootstrap().catch((err) => {
  showHudError(`Bootstrap failed: ${err.message || err}`)
})