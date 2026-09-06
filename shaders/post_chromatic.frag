in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uChromaticAberration;

void main() {
  vec2 dir = vUv - 0.5;
  float d2 = dot(dir, dir);

  // Radial falloff (zero at center, subtle at corners) and a safe
  // d^2 scaling so the center pixel can never produce NaN offsets.
  vec2 off = dir * d2 * uChromaticAberration * 4.0;
  float r = texture(uTexture, vUv + off).r;
  float g = texture(uTexture, vUv).g;
  float b = texture(uTexture, vUv - off).b;

  fragColor = vec4(r, g, b, 1.0);
}
