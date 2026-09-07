vec3 temperature_to_rgb_cold(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 deepBlue = vec3(0.04, 0.09, 0.35);
  vec3 blue     = vec3(0.22, 0.46, 1.00);
  vec3 violet   = vec3(0.68, 0.62, 1.00);
  vec3 whiteHot = vec3(1.00, 0.98, 1.00);
  vec3 pinkHot  = vec3(1.00, 0.78, 0.88);
  if (t < 0.30) return mix(deepBlue, blue, t / 0.30);
  if (t < 0.62) return mix(blue, violet, (t - 0.30) / 0.32);
  if (t < 0.90) return mix(violet, whiteHot, (t - 0.62) / 0.28);
  return mix(whiteHot, pinkHot, (t - 0.90) / 0.10);
}

vec3 temperature_to_rgb_warm(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 deepRed = vec3(0.45, 0.02, 0.01);
  vec3 orange  = vec3(1.00, 0.30, 0.05);
  vec3 yellow  = vec3(1.00, 0.72, 0.30);
  vec3 whiteHot = vec3(1.00, 0.98, 0.95);
  if (t < 0.35) return mix(deepRed, orange, t / 0.35);
  if (t < 0.70) return mix(orange, yellow, (t - 0.35) / 0.35);
  return mix(yellow, whiteHot, (t - 0.70) / 0.30);
}

vec3 temperature_to_rgb(float t, float hue) {
  return mix(temperature_to_rgb_cold(t), temperature_to_rgb_warm(t), clamp(hue, 0.0, 1.0));
}

vec3 sampleAccretionDisk(vec3 hitPoint, vec3 rayDir, vec3 bhPos, float bhRadius, float innerRadius, float outerRadius, float density, float temperature, float accretionSpeed, float time, float spiralTightness, float dopplerStrength, float hue, float brightness) {
  vec2 d = hitPoint.xz - bhPos.xz;
  float r = length(d);
  if (r < innerRadius * 0.9 || r > outerRadius * 1.3) {
    return vec3(0.0);
  }

  float rn = clamp((r - innerRadius) / max(outerRadius - innerRadius, 1e-4), 0.0, 1.4);
  float angle = atan(d.y, d.x);
  float lr = log(max(r / innerRadius, 0.02));

  // Keplerian differential rotation: inner material orbits much faster.
  float omega = accretionSpeed * 1.4 / pow(max(r / innerRadius, 0.05), 1.5);
  float swirl = angle + spiralTightness * lr - time * omega;

  // Long azimuthal streaks sheared by differential rotation + fine detail,
  // evaluated in log-radius. Low lr frequencies keep the ring bands wide and
  // smooth instead of tight vinyl-groove stripes.
  float n1 = fbm(vec3(swirl * 2.2, lr * 2.6, time * 0.10));
  float n2 = fbm(vec3(swirl * 6.5 + 11.3, lr * 5.5 + 4.0, 7.7));
  float filaments = (0.52 + 0.48 * n1) * (0.68 + 0.42 * n2);

  // Radial structure: hot thin inner region, soft outer fade (no hard cut).
  float radialFalloff = pow(innerRadius / max(r, innerRadius), 2.4);
  float innerEdge = smoothstep(innerRadius * 0.9, innerRadius * 1.06, r);
  float outerFade = exp(-rn * rn * rn * 2.2);

  float dens = density * radialFalloff * innerEdge * outerFade * filaments;

  // Local temperature: T ~ r^{-3/4} (Shakura-Sunyaev thin disk).
  float tempLocal = pow(innerRadius / max(r, innerRadius), 0.75);

  // Relativistic Doppler beaming: approaching side of the disk is much brighter.
  float beta = clamp(sqrt(0.5 * bhRadius / max(r, bhRadius * 1.02)), 0.0, 0.72);
  vec2 tangent = normalize(vec2(d.y, -d.x));
  vec3 vel = vec3(tangent.x, 0.0, tangent.y) * beta;
  vec3 photonDir = normalize(-rayDir);
  float cosA = dot(vel, photonDir) / max(beta, 1e-4);
  float gamma = inversesqrt(max(1.0 - beta * beta, 1e-3));
  float doppler = 1.0 / (gamma * (1.0 - beta * cosA));
  float beam = clamp(doppler * doppler * doppler, 0.12, 4.5) * dopplerStrength;

  // Gravitational redshift dims and cools the innermost gas.
  float gred = sqrt(max(1.0 - bhRadius / max(r, bhRadius * 1.001), 0.04));

  float shift = doppler * gred;
  float tempObs = clamp(tempLocal * temperature * mix(1.0, shift, 0.6), 0.0, 1.0);
  vec3 baseCol = temperature_to_rgb(tempObs, hue);

  float emission = 2.1 * brightness;
  float lum = dens * (0.55 + 0.45 * temperature) * beam * mix(1.0, gred * gred, 0.35);
  vec3 color = baseCol * lum * emission;
  color += baseCol * dens * 0.02 * brightness;
  return max(color, vec3(0.0));
}