# Black Hole Simulator

Interactive 3D WebGL2 simulation of a black hole with gravitational lensing, procedural accretion disk, and cinematic post-processing.

## Quick Start

```bash
cd "D:\Project Code\Projects\black Hole"
python -m http.server 8000
```

Open `http://localhost:8000` in a modern browser (Chrome, Firefox, Edge).

## Controls

| Key | Action |
|-----|--------|
| W/A/S/D | Move forward/left/back/right |
| Q/E | Move down/up |
| Mouse | Look around (click canvas to capture; click a UI control or press ESC to release) |
| Shift | Boost speed (4x) |
| Scroll wheel | Adjust movement speed |
| R | Reset camera position |
| H | Toggle UI panels |
| B | Toggle continuous MAX QUALITY benchmark (on/off) |
| F3 | Toggle direct render debug mode |
| ESC | Release pointer lock |

The bottom-left **Управление** panel shows clickable key chips — click-and-hold movement keys (W/A/S/D/Q/E/Shift), or tap action keys (R/B/F3/H).

## Architecture

```
src/
  main.js              — Entry point, wires all subsystems
  config.js            — Constants, quality presets, utilities
  core/
    GLContext.js        — WebGL2 context creation
    Renderer.js         — Render pass orchestrator
    ShaderProgram.js    — Shader compilation/linking
    Framebuffer.js      — FBO creation with RGBA16F/RGBA8
    FullscreenQuad.js   — Geometry for fullscreen passes
    Timer.js            — FPS counter and frame timing
    Random.js           — Seeded PRNG
  scene/
    Scene.js            — Main raymarch scene (HDR FBO)
    BlackHole.js        — BH parameters (mass, spin, lens)
    StarField.js        — Procedural star field (78k stars)
    AccretionDisk.js    — Disk parameters and shader loader
    Camera.js           — Free 3D camera controller
  input/
    InputManager.js     — Keyboard/mouse/pointer lock
  post/
    PostFX.js           — Post-processing orchestrator
    BloomPass.js        — 5-level bloom (downsample/upsample)
  ui/
    UIManager.js        — Control panels
    Panel.js            — Collapsible panel component
    Slider.js           — Range slider component
  quality/
    QualityManager.js   — MAXIMUM/HIGH/PERFORMANCE profiles
    AutoOptimizer.js    — Hysteresis-based auto quality
  benchmark/
    Benchmark.js        — 30s automated benchmark
    CameraFlight.js     — Circular orbit for benchmarking
  perf/
    PerformanceMonitor.js — HUD stats display

shaders/
  bh_main.vert/frag     — Primary raymarch (lensing + BH + disk)
  common.glsl           — Shared math, noise, FBM
  stars.glsl            — Procedural star field
  disk.glsl             — Accretion disk sampling
  post_*.frag           — Post-processing shaders
  post_passthrough.vert — Fullscreen vertex shader
```

## Render Pipeline

1. **Scene pass** (RGBA16F FBO): Per-pixel raymarch through curved spacetime
   - Adaptive step size with early exit
   - Horizon absorption (black)
   - Photon ring (Gaussian glow)
   - Procedural star field (~78k stars)
   - Accretion disk with Y=0 plane crossing detection
2. **Bloom**: 5-level downsample/upsample chain (RGBA8)
3. **Tone mapping**: ACES filmic + bloom composite + vignette (RGBA16F)
4. **Chromatic aberration**: Per-channel UV offset (RGBA8)
5. **FXAA**: Edge anti-aliasing to remove staircase on glow/disk edges (RGBA8)
6. **Final**: Film grain + passthrough to screen

## Quality Profiles

| Profile | Raymarch | Stars | Bloom | Chromatic |
|---------|----------|-------|-------|-----------|
| MAXIMUM | 196 | 0.6 | 1.2 | 0.002 |
| HIGH | 128 | 0.45 | 1.0 | 0.0015 |
| PERFORMANCE | 64 | 0.25 | 0.6 | 0.0 |

Auto-optimizer adjusts quality based on FPS (down <58, up >100) with 5s cooldown.

## Benchmark

Press **B** to start a 30-second automated camera orbit at MAXIMUM quality. Results:
- Average FPS
- 1% Low FPS
- Min FPS
- Average/Max frame time

## Hardware Target

- GPU: NVIDIA RTX 3050 8GB
- Display: 1920x1080
- Target: 60-120 FPS at MAXIMUM quality

## Tech Stack

- Vanilla JavaScript (ES modules, no bundler)
- WebGL 2.0 + GLSL 300 es
- No npm dependencies
