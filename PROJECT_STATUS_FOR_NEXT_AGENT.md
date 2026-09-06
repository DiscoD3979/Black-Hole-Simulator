# Black Hole Simulator: Project Status For Next Agent

> **ОБНОВЛЕНИЕ 2026-09-06 (сессия 2 — визуальный рерайтер):**
> - `bh_main.frag` переписан: честная геодезия Шварцшильда `a = -1.5*rs*h^2*rp/r^5`
>   (photon sphere 1.5rs, тень ~2.6rs), исправлен двойной aspect в ray gen,
>   мультипересечения плоскости диска с transmittance, тонкий объёмный glow,
>   photon ring, удалён фейковый ring/lensMask.
> - `disk.glsl`: сине-фиолетовая палитра (deep blue → blue → violet → white/pink),
>   T~r^-0.75, Kepler-диффротация, filaments в log-radius, Doppler beaming δ³,
>   gravitational redshift. Радиусы: inner = rs*2.3, outer = rs*11.
> - `stars.glsl`: falloff переведён на ang² (звёзды — точки 1–4px, а не мазки),
>   звёзды ярче (lum 0.5–1.8, prob ×1.35).
> - Пост-цепочка: soft-knee bright-pass, tent upsample, безопасная хроматика (d²,
>   без NaN в центре), grain 0.004, vignette 0.22, bloom intensity = v*0.12 (max 0.6).
> - `CameraFlight.js`: кинематографичный луп 55с — широкая орбита → сближение →
>   пересечение плоскости диска → проход СНИЗУ → выход. Камера всегда вне диска
>   (r 26–32), т.к. внутри диска glow заливает кадр.
> - `tests/camera-smoke.test.mjs` обновлён под новую архитектуру: 18/18 pass.
> - Камера по умолчанию: [0, 2.4, 30], pitch −0.075 (почти в плоскости диска).
> - НЕ запускать полёт с r < 24: камера внутри диска = сплошной туман.

Дата отчета: 2026-09-06

Этот файл предназначен для передачи проекта следующему AI-агенту. В нем собраны фактическая архитектура, уже сделанные изменения, проверенные результаты, ограничения и порядок дальнейшей работы.

## 1. Цель проекта

Проект должен быть интерактивной WebGL2-визуализацией черной дыры с приоритетом:

1. Максимальное визуальное качество.
2. Native rendering 1920x1080 без динамического снижения разрешения.
3. Плавная свободная камера.
4. Достоверное gravitational lensing, тень, photon ring и аккреционный диск.
5. Фактическое измерение производительности на RTX 3050 8 GB.

Целевой диапазон пользователя: желательно 100-120+ FPS, допустимо 80-100 FPS, минимум 60 FPS.

Главное правило: не заменять native 1920x1080 апскейлом из 720p/900p.

## 2. Запуск

Проект не использует npm и bundler. Это статический сайт.

```powershell
cd "D:\Project Code\Projects\black Hole"
python -m http.server 8000
```

Затем открыть `http://localhost:8000/`.

Vercel также подходит: все вычисления выполняются в браузере, backend не требуется.

## 3. Структура проекта

### Корень

- `index.html` — canvas, HUD, UI container и подключение `src/main.js`.
- `README.md` — краткая документация и controls.
- `Black Hole Simulator — Maximum Quality 1080p.md` — исходное требование пользователя.
- `PROJECT_STATUS_FOR_NEXT_AGENT.md` — этот подробный handoff-файл.
- `vercel.json` — минимальная конфигурация статического Vercel deployment.
- `tests/camera-smoke.test.mjs` — regression/smoke tests без браузерных зависимостей.

### JavaScript

- `src/main.js` — bootstrap, WebGL setup, render loop, benchmark, UI, quality manager.
- `src/config.js` — native resolution и базовые quality constants.
- `src/core/GLContext.js` — WebGL2 context creation и GPU capability logging.
- `src/core/Renderer.js` — последовательность render passes.
- `src/core/Framebuffer.js` — RGBA16F/RGBA8 framebuffer creation и fallback.
- `src/core/ShaderProgram.js` — загрузка, compile/link GLSL.
- `src/core/FullscreenQuad.js` — fullscreen triangle.
- `src/scene/Scene.js` — основной black hole raymarch pass.
- `src/scene/Camera.js` — свободная камера и projection/view matrices.
- `src/scene/BlackHole.js` — mass, spin, lens strength, Schwarzschild radius.
- `src/scene/AccretionDisk.js` — параметры диска и shader source loader.
- `src/scene/StarField.js` — procedural star shader setup.
- `src/input/InputManager.js` — keyboard, mouse, wheel и pointer lock.
- `src/quality/QualityManager.js` — MAXIMUM/HIGH/PERFORMANCE profiles.
- `src/quality/AutoOptimizer.js` — hysteresis auto quality logic.
- `src/post/PostFX.js` — bloom, tonemap, chromatic, final pass.
- `src/post/BloomPass.js` — downsample/upsample bloom chain.
- `src/benchmark/Benchmark.js` — 30 second automated benchmark and metrics.
- `src/benchmark/CameraFlight.js` — benchmark orbit.
- `src/perf/PerformanceMonitor.js` — FPS/frame time/quality HUD.
- `src/ui/UIManager.js`, `Panel.js`, `Slider.js` — control panels.

### GLSL

- `shaders/bh_main.vert` — fullscreen vertex shader.
- `shaders/bh_main.frag` — ray reconstruction, gravitational bending, horizon, ring, background and disk sampling.
- `shaders/common.glsl` — hash/noise/fbm helpers.
- `shaders/stars.glsl` — procedural spherical star layers.
- `shaders/disk.glsl` — procedural accretion disk, temperature and Doppler approximation.
- `shaders/post_bloom_downsample.frag` — downsample and bright threshold.
- `shaders/post_bloom_upsample.frag` — upsample blur.
- `shaders/post_tonemap.frag` — HDR-like tone mapping and controlled bloom composite.
- `shaders/post_chromatic.frag` — chromatic aberration.
- `shaders/post_final.frag` — final film grain/output.

## 4. Что уже исправлено

### 4.1 Изначальный пустой синий кадр

Исходный экран был синим foundation shader, потому что реальная scene path не давала заметного результата. Были исправлены:

- scene FBO wiring;
- shader concatenation `common -> stars -> disk -> bh_main`;
- disk uniforms;
- scene-to-PostFX texture path;
- raymarch visibility;
- default camera framing;
- disk density edge formula;
- star sphere latitude mapping.

### 4.2 Неверное направление gravity

В `bh_main.frag` было:

```glsl
vec3 force = -toBH / (r * r + FORCE_FALLOFF);
```

Это отталкивало луч от black hole. Сейчас сила направлена к black hole:

```glsl
vec3 force = toBH / (r * r + FORCE_FALLOFF);
```

`BEND_GAIN` был уменьшен до устойчивого значения `0.08`, чтобы все лучи не поглощались и не превращали сцену в полностью черный кадр.

### 4.3 Accretion disk

Диск находится в плоскости `Y=0`. Raymarch обнаруживает crossing плоскости и вызывает procedural sampler.

Исправлена ошибка, которая обнуляла плотность вне внутреннего радиуса:

```glsl
densityVar *= smoothstep(innerRadius * 0.85, innerRadius, dist);
```

Эмиссия снижена до умеренного значения, чтобы горячий газ не превращался в сплошной белый экран.

### 4.4 Procedural stars

Звезды генерируются в GLSL, а не десятками тысяч JavaScript объектов.

Исправлено spherical cell center mapping:

```glsl
vec2 cellUV = (cell + 0.5) / grid;
float v = (cell.y + 0.5) / grid.y * 3.1415927;
```

Sharpness star layers повышена, чтобы звезды не выглядели большими квадратными мазками.

### 4.5 Camera

Default camera сейчас:

- position `[0, 4.5, 12]`;
- yaw `-PI/2`;
- pitch `-0.36`.

Это дает слегка elevated angle и позволяет увидеть диск как трехмерную структуру.

Для fallback view в `Scene.js` сохранены такие же параметры.

### 4.6 Mouse inversion

Пользователь жаловался на инвертированную мышь. В `Camera.js` pitch теперь изменяется естественно:

```js
this.pitch += m.dy * this._sensitivity
```

Yaw остается `this.yaw -= m.dx * sensitivity`, что дает обычный поворот вправо при движении мыши вправо.

### 4.7 D key conflict

Ранее `D` одновременно:

- включала движение вправо;
- переключала direct render/debug mode.

Это вызывало конфликт. Сейчас `D` только движение вправо. Debug render mode перенесен на `F3`.

### 4.8 UI pointer lock

Inline CSS в `index.html` задавал `#ui { pointer-events: none; }`, поэтому canvas перехватывал клики по sliders.

Сейчас `#ui` имеет `pointer-events: auto`.

При pointerdown внутри UI вызывается `input.exitPointerLock()`, поэтому настройки можно менять даже после управления камерой.

### 4.9 Bloom smearing

Основная текущая жалоба: без debug/direct режима кадр размазывался.

Причина: bloom texture с низким разрешением композитилась слишком сильно поверх сцены. В `post_tonemap.frag` теперь есть отдельный uniform:

```glsl
uniform float uBloomIntensity;
vec3 color = scene + bloom * uBloomIntensity;
```

`PostFX.setBloomIntensity()` переводит UI quality value в умеренную физическую интенсивность, ограниченную `0.35`.

Scene остается основным sharp signal, bloom только добавляет мягкое свечение.

### 4.10 Quality

MAXIMUM сейчас:

- `raymarchSteps: 256`;
- `secondaryStepScale: 0.75`;
- star density `0.6`;
- bloom profile value `1.2`;
- chromatic aberration `0.002`.

Resolution всегда остается `1920x1080`.

### 4.11 Benchmark

Benchmark автоматически запускается после bootstrap.

Duration: 30 seconds.

Измеряются:

- average FPS;
- 1% low;
- minimum FPS;
- average frame time;
- maximum frame time.

Исправлена ошибка двойного обновления `CameraFlight`: раньше flight обновлялся два раза за кадр. Сейчас `Benchmark.update(dt)` вызывается один раз и возвращает camera pose.

После завершения benchmark итог добавляется в HUD.

Нажатие `B` позволяет запустить benchmark повторно, если он завершен.

## 5. Render pipeline

Текущий pipeline:

1. `Scene` raymarches every pixel into RGBA16F scene FBO.
2. Bloom creates downsample chain.
3. Tone map reads scene texture and bloom texture.
4. Bloom is multiplied by controlled `uBloomIntensity`.
5. Chromatic aberration pass applies small channel offset.
6. Final pass adds restrained grain and writes to screen.

Важно: `F3` toggles direct scene render for diagnostics. Это не основной режим.

## 6. Проверено тестами

Команда:

```powershell
cd "D:\Project Code\Projects\black Hole"
node --test tests/camera-smoke.test.mjs
```

Текущий regression suite включает 9 тестов:

1. Default camera aims at black hole origin.
2. Gravitational force points toward black hole.
3. Accretion disk keeps density outside inner radius.
4. Star layers reconstruct spherical cell centers.
5. UI container receives pointer input.
6. D key remains movement-only.
7. Mouse pitch uses natural direction.
8. MAXIMUM uses 256 raymarch steps.
9. PostFX scales bloom without replacing scene sharpness.

Также выполняется syntax check:

```powershell
Get-ChildItem src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Последняя проверка: 9 passed, 0 failed.

## 7. Полный аудит исходного prompt

### Уже выполнено или частично выполнено

- Native 1920x1080: выполнено.
- requestAnimationFrame: выполнено.
- VSync browser scheduling: используется RAF, отдельного 60 FPS cap нет.
- Event horizon/horizon absorption: есть `r < uBHRadius`.
- Black hole shadow: есть через horizon absorption.
- Photon ring approximation: есть Gaussian ring term, сейчас умеренный.
- Gravitational bending: есть GPU raymarch.
- Adaptive step: есть step clamp по radius.
- Early exit: есть horizon и escape distance exits.
- Procedural disk: есть noise, fbm, spiral, turbulence.
- Temperature gradient: есть radial temperature-to-RGB.
- Doppler approximation: есть velocity/view dot.
- Procedural star layers: есть GPU GLSL layers.
- Free camera WASD/QE/Shift/wheel/R: есть.
- Quality profiles: есть.
- Auto optimizer with hysteresis: есть rolling window/cooldown.
- Performance HUD: есть FPS, frame time, resolution, quality, steps, stars, bloom.
- Benchmark metrics: считаются.
- H UI hide: есть.
- Bloom downsample chain: есть, intensity now controlled.
- Tone mapping/vignette/chromatic/final: есть.

### Не выполнено полностью и требует следующего этапа

#### Physical spin

`BlackHole.spin` хранится и UI меняет значение, но Kerr-like frame dragging не реализован в ray equation. Следующий агент должен добавить azimuthal frame-dragging term around Y axis.

#### Gravitational redshift/blueshift

Сейчас temperature and Doppler coloring есть, но полноценный redshift factor из gravitational potential не реализован. Нужен factor based on radius, e.g. `sqrt(max(1 - rs/r, epsilon))`, с физически осторожным clamp.

#### True relativistic Doppler beaming

Сейчас используется упрощенный dot product. Для следующего этапа нужен beta/gamma model and beaming power, но с ограничением, чтобы RTX 3050 не получила бессмысленный overflow.

#### True 3D star volume

Текущие stars are procedural directions on spherical layers. Это не JavaScript 2D background и stars follow ray direction, но это не полноценные persistent 3D point positions. Для улучшения нужен GPU-generated star volume or analytic 3D cells.

#### Anti-aliasing

UI toggle существует, но полноценный FXAA/SMAA/temporal accumulation не доведен. Сейчас fullscreen triangle и texture filtering помогают, но jagged/pixel crawling remains possible.

#### Temporal accumulation

Quality profiles содержат `temporalAA: true`, но history framebuffer/jitter/reprojection пока не реализованы. Следующий агент должен не добавлять blur, а сделать history blend с motion-aware clamp.

#### Benchmark display

Итоги сейчас добавляются в HUD после завершения. Отдельная Performance panel currently displays only live stats. Можно добавить отдельный benchmark results panel or modal.

#### GPU load

WebGL exposes renderer/vendor information, но reliable GPU utilization is generally unavailable in browser. Нельзя обещать actual GPU percentage without browser-specific extension.

#### Resize behavior

Render resolution intentionally stays 1920x1080. CSS canvas scales to viewport. Это соответствует native target 1080p, но на другом мониторе image may be letterboxed/scaled by browser.

## 8. Что проверить вручную после следующего запуска

1. Open `http://localhost:8000/`.
2. Wait for auto benchmark to begin.
3. Ensure HUD says `1920x1080`, `MAXIMUM`, `Steps: 256`.
4. Verify central black hole is not washed out.
5. Verify disk edges stay sharp and bloom remains local.
6. Press `F3`; direct mode should remove PostFX only.
7. Press `F3` again; normal mode returns.
8. Click UI slider after camera pointer lock; slider must move.
9. Press `ESC`; pointer lock releases.
10. Move mouse vertically; camera pitch direction should feel natural.
11. Press `D`; camera moves right and no render mode changes.
12. Let 30 second benchmark finish and record HUD results.

## 9. Vercel deployment

This is a client-only static WebGL application. Vercel can host it.

Recommended Vercel settings:

- Framework preset: Other.
- Root directory: `black Hole` if deploying the parent workspace; or deploy the `black Hole` folder as project root.
- Build command: empty.
- Output directory: `.`.
- Install command: empty.
- Node.js is not required for runtime.

The browser must support WebGL2. Vercel only serves files; it does not improve GPU performance. FPS depends on the visitor's local browser/GPU.

## 10. Next implementation priorities

Priority 1: complete bloom chain with proper bright extraction and full-resolution final bloom target. The current fix controls bloom intensity, but the upsample chain can still be improved.

Priority 2: add physical spin/frame dragging.

Priority 3: add gravitational redshift and proper relativistic Doppler beaming.

Priority 4: implement FXAA or carefully clamped temporal accumulation. Avoid introducing blur.

Priority 5: improve disk silhouette and density profile so it looks like a hot thin disk, not a thick glowing ring.

Priority 6: expose benchmark results in the Performance panel.

Priority 7: run a real 30 second benchmark on the user's RTX 3050 and record actual results. Never claim 120 FPS without measured output.

## 11. Important constraints for the next agent

- Never reduce internal resolution below 1920x1080.
- Do not add a 60 FPS limiter.
- Do not replace the 3D/procedural scene with a static image.
- Do not hide a rendering bug by making the whole screen dark.
- Do not rebind `D`; it is movement right.
- Do not use pointer lock from UI clicks.
- Always run `node --test tests/camera-smoke.test.mjs` after shader/control changes.
- Always run `node --check` for changed JavaScript.
- Verify visual changes in a fresh browser origin or with cache-busting because ES modules can be cached.
- Measure benchmark output on actual hardware before making performance claims.

## 12. Current honest status

The project is a working interactive WebGL2 black hole prototype with native 1080p rendering, procedural disk/stars, raymarch lensing approximation, free camera, UI controls, quality profiles, auto optimizer and benchmark.

It is not yet a physically complete black hole renderer. The largest missing items are true spin/frame dragging, full redshift, real temporal anti-aliasing and a better bloom upsample chain.

The most recent fixes specifically addressed the user's complaints about input conflicts, inverted mouse, benchmark startup and smearing from excessive bloom.
