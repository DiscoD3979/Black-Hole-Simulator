in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform sampler2D uBloomTexture;
uniform float uExposure;
uniform float uBloomIntensity;

vec3 ACESFilmic(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 scene = texture(uTexture, vUv).rgb;
  vec3 bloom = texture(uBloomTexture, vUv).rgb;

  vec3 color = scene + bloom * uBloomIntensity;
  color *= uExposure;
  color = ACESFilmic(color);
  color = pow(color, vec3(1.0 / 2.2));

  vec2 d = vUv - 0.5;
  float vignette = 1.0 - 0.22 * dot(d, d);
  color *= vignette;

  fragColor = vec4(color, 1.0);
}
