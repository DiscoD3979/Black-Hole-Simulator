in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;

void main() {
  vec2 ts = 1.0 / vec2(textureSize(uTexture, 0));
  vec3 s = vec3(0.0);

  s += texture(uTexture, vUv + ts * vec2(-1.0, -1.0)).rgb * 1.0;
  s += texture(uTexture, vUv + ts * vec2( 0.0, -1.0)).rgb * 2.0;
  s += texture(uTexture, vUv + ts * vec2( 1.0, -1.0)).rgb * 1.0;
  s += texture(uTexture, vUv + ts * vec2(-1.0,  0.0)).rgb * 2.0;
  s += texture(uTexture, vUv).rgb * 4.0;
  s += texture(uTexture, vUv + ts * vec2( 1.0,  0.0)).rgb * 2.0;
  s += texture(uTexture, vUv + ts * vec2(-1.0,  1.0)).rgb * 1.0;
  s += texture(uTexture, vUv + ts * vec2( 0.0,  1.0)).rgb * 2.0;
  s += texture(uTexture, vUv + ts * vec2( 1.0,  1.0)).rgb * 1.0;

  fragColor = vec4(s / 16.0, 1.0);
}
