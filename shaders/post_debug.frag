in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;

void main() {
  // Plain passthrough copy — used ONLY by the debug view system to inspect
  // intermediate render targets (scene FBO, bloom levels, post chain).
  fragColor = vec4(texture(uTexture, vUv).rgb, 1.0);
}
