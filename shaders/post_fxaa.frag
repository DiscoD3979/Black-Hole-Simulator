in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec2 uResolution;

// FXAA 3.11 (console variant) — removes staircase aliasing on glow/disk edges
// without a perceptible blur of the sharp disk filaments.

void main() {
  vec2 rcp = 1.0 / uResolution;

  vec3 rgbNW = texture(uTexture, vUv + vec2(-1.0, -1.0) * rcp).rgb;
  vec3 rgbNE = texture(uTexture, vUv + vec2( 1.0, -1.0) * rcp).rgb;
  vec3 rgbSW = texture(uTexture, vUv + vec2(-1.0,  1.0) * rcp).rgb;
  vec3 rgbSE = texture(uTexture, vUv + vec2( 1.0,  1.0) * rcp).rgb;
  vec3 rgbM  = texture(uTexture, vUv).rgb;

  vec3 lumaW = vec3(0.299, 0.587, 0.114);
  float lNW = dot(rgbNW, lumaW);
  float lNE = dot(rgbNE, lumaW);
  float lSW = dot(rgbSW, lumaW);
  float lSE = dot(rgbSE, lumaW);
  float lM  = dot(rgbM, lumaW);

  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));

  // Flat area: skip blending entirely.
  if (lMax - lMin < max(0.0432, lMax * 0.125)) {
    fragColor = vec4(rgbM, 1.0);
    return;
  }

  vec2 dir = vec2(
    -((lNW + lNE) - (lSW + lSE)),
     ((lNW + lSW) - (lNE + lSE))
  );

  float dirReduce = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);

  dir = clamp(dir * rcpDirMin, vec2(-8.0), vec2(8.0)) * rcp;

  vec3 rgbA = 0.5 * (
    texture(uTexture, vUv + dir * (1.0 / 3.0 - 0.5)).rgb +
    texture(uTexture, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 rgbB = rgbA * 0.5 + 0.25 * (
    texture(uTexture, vUv + dir * -0.5).rgb +
    texture(uTexture, vUv + dir *  0.5).rgb);

  float lB = dot(rgbB, lumaW);
  fragColor = vec4((lB < lMin || lB > lMax) ? rgbA : rgbB, 1.0);
}
