in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 color = texture(uTexture, vUv).rgb;

  float grain = hash(vUv * uResolution) - 0.5;
  color += 0.004 * grain;

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
