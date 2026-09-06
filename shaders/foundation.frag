in vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;

out vec4 fragColor;

float h21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = vUv;
  vec2 res = uResolution;

  vec3 top = vec3(0.02, 0.05, 0.12);
  vec3 bot = vec3(0.0, 0.0, 0.0);
  vec3 col = mix(bot, top, smoothstep(0.0, 1.0, uv.y));

  float aspect = res.x / res.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float r = length(p);

  float ring = smoothstep(0.42, 0.40, r) - smoothstep(0.40, 0.38, r);
  vec3 ringCol = vec3(0.8, 0.55, 0.25) * ring * 1.5;
  col += ringCol;

  float glow = exp(-r * 4.5) * 0.6;
  col += vec3(0.45, 0.30, 0.18) * glow;

  vec2 grid = floor(uv * res / 4.0);
  vec3 starCol = vec3(0.0);
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec2 g = grid + vec2(float(i), float(j));
      float n = h21(g + 17.0);
      if (n > 0.985) {
        vec2 cellUV = fract(uv * res / 4.0) - 0.5;
        float d = length(cellUV - (vec2(h21(g + 31.0), h21(g + 53.0)) - 0.5) * 0.9);
        float intensity = smoothstep(0.05, 0.0, d) * (sin(uTime * 2.0 + n * 30.0) * 0.3 + 0.7);
        vec3 c = mix(vec3(0.9, 0.95, 1.0), vec3(1.0, 0.8, 0.6), h21(g + 71.0));
        starCol += c * intensity;
      }
    }
  }
  col += starCol;

  float pulse = 0.5 + 0.5 * sin(uTime * 0.7);
  col += vec3(0.05, 0.08, 0.15) * pulse * 0.15;

  col *= 1.0 - 0.3 * smoothstep(0.4, 0.95, r);

  fragColor = vec4(col, 1.0);
}