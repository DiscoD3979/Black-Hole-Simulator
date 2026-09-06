in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;

void main() {
  vec2 texelSize = 1.0 / vec2(textureSize(uTexture, 0));
  vec4 result = vec4(0.0);

  result += texture(uTexture, vUv + texelSize * vec2(-1.0, -1.0) * 0.5);
  result += texture(uTexture, vUv + texelSize * vec2( 1.0, -1.0) * 0.5);
  result += texture(uTexture, vUv + texelSize * vec2(-1.0,  1.0) * 0.5);
  result += texture(uTexture, vUv + texelSize * vec2( 1.0,  1.0) * 0.5);

  // Soft-knee bright pass: only HDR content above 1.0 feeds the bloom chain.
  vec3 c = result.rgb * 0.25;
  float lum = max(c.r, max(c.g, c.b));
  float w = max(lum - 1.0, 0.0) / max(lum, 1e-4);
  fragColor = vec4(c * w, 1.0);
}
