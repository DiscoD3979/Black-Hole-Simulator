// === TASK-002 / TASK-005 INTEGRATION POINT ===
// call sampleStars(rayDir, density, time, seed) at the end of the raymarch
// (post-lensing background) or behind the disk for the disk shader.
// rayDir must be a unit vector in world space; density is 0..1+ (drive from
// quality preset, e.g. 1.0 / 0.75 / 0.5); time = uTime; seed = per-pass scalar.
// This file is an INCLUDE; caller must also include common.glsl so hash21/hash22
// are visible. No #version, no precision, no main.

vec3 starColorByHash(float h) {
  float t = clamp(h, 0.0, 1.0);
  vec3 cBlue   = vec3(0.72, 0.82, 1.00);
  vec3 cWhite  = vec3(0.98, 0.97, 0.95);
  vec3 cYellow = vec3(1.00, 0.92, 0.72);
  vec3 cOrange = vec3(1.00, 0.74, 0.45);
  vec3 cRed    = vec3(1.00, 0.55, 0.35);
  if (t < 0.45) return mix(cBlue, cWhite, t / 0.45);
  if (t < 0.80) return mix(cWhite, cYellow, (t - 0.45) / 0.35);
  if (t < 0.95) return mix(cYellow, cOrange, (t - 0.80) / 0.15);
  return mix(cOrange, cRed, (t - 0.95) / 0.05);
}

float starBrightness(vec3 starDir, vec3 rayDir, float sharpness) {
  float d = clamp(dot(starDir, rayDir), -1.0, 1.0);
  float ang2 = 2.0 * (1.0 - d); // small-angle: angular distance squared
  return exp(-ang2 * sharpness);
}

vec2 dirToUV(vec3 d) {
  float u = atan(d.z, d.x) * (1.0 / 6.2831853) + 0.5;
  float v = acos(clamp(-d.y, -1.0, 1.0)) * (1.0 / 3.1415927);
  return vec2(u, v);
}

vec3 sampleStarLayer(vec3 rayDir, float density, float time, float seed,
                     vec2 grid, float prob, float sharpness, float twinkleHz) {
  vec3 acc = vec3(0.0);
  vec2 uv = dirToUV(rayDir);
  vec2 cellRaw = floor(uv * grid + vec2(seed * 0.137, seed * 0.211));
  vec2 cell = vec2(mod(cellRaw.x, grid.x), cellRaw.y);
  vec2 cellUV = (cell + 0.5) / grid;
  float u = cellUV.x * 6.2831853 - 3.1415927;
  float v = (cell.y + 0.5) / grid.y * 3.1415927;
  float cu = cos(u), su = sin(u);
  float sv = sin(v), cv = cos(v);
  vec3 cellCenter = vec3(cu * sv, -cv, su * sv);
  vec2 h = hash22(cell + vec2(seed * 17.0, seed * 31.0));
  float p = prob * clamp(density * 1.35, 0.0, 1.0);
  if (h.x > p) return acc;
  vec2 jitter = vec2(hash21(cell + vec2(seed * 11.0)),
                     hash21(cell + vec2(seed * 23.0))) - 0.5;
  vec3 starDir = normalize(cellCenter + vec3(jitter.x, jitter.y * 0.6, 0.0) * 0.35);
  float bright = hash21(cell + vec2(seed * 41.0, seed * 7.0));
  float lum = mix(0.50, 1.80, bright * bright);
  float twPhase = hash21(cell + vec2(seed * 53.0, seed * 19.0)) * 6.2831853;
  float tw = 0.78 + 0.22 * sin(time * twinkleHz + twPhase);
  float resp = starBrightness(starDir, rayDir, sharpness);
  vec3 col = starColorByHash(hash21(cell + vec2(seed * 67.0, seed * 29.0)));
  acc += col * resp * lum * tw;
  return acc;
}

vec3 sampleStars(vec3 dir, float density, float time, float seed) {
  vec3 nd = normalize(dir);
  vec3 col = vec3(0.0);
  // sharpness values assume ang2 = theta^2 falloff, so blobs stay 1-4 px dots
  col += sampleStarLayer(nd, density, time, seed + 0.0,  vec2(1920.0, 960.0), 0.34, 6500000.0, 2.0);
  col += sampleStarLayer(nd, density, time, seed + 5.3,  vec2(960.0, 480.0), 0.42, 2200000.0, 1.6);
  col += sampleStarLayer(nd, density, time, seed + 11.1, vec2(480.0, 240.0), 0.50, 1100000.0, 1.2);
  col += sampleStarLayer(nd, density, time, seed + 19.7, vec2(220.0, 110.0), 0.55,  500000.0, 0.9);
  col += sampleStarLayer(nd, density, time, seed + 27.3, vec2( 72.0,  36.0), 0.70,  220000.0, 0.5);
  return col;
}
