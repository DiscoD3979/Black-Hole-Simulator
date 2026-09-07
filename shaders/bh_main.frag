in vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uCameraPos;
uniform mat4 uInvCameraView;
uniform mat4 uInvCameraProj;
uniform vec3 uBHPosition;
uniform float uBHRadius;
uniform float uBHLensStrength;
uniform float uBHSpin;
uniform int uRaymarchSteps;
uniform float uSecondaryStepScale;
uniform float uAspect;
uniform float uStarDensity;
uniform float uStarSeed;
uniform float uStarTime;
uniform float uStarTwinkleSpeed;
uniform float uDiskInnerRadius;
uniform float uDiskOuterRadius;
uniform float uDiskDensity;
uniform float uDiskTemperature;
uniform float uDiskAccretionSpeed;
uniform float uDiskSpiralTightness;
uniform float uDiskDopplerStrength;
uniform float uDiskBrightness;
uniform float uDiskHue;
uniform float uDiskThickness;
uniform float uRingStrength;

out vec4 fragColor;

const float ESCAPE_R = 70.0;

// Abramowitz-Stegun erf approximation (max error ~1.5e-7). Used for the
// analytic vertical integral of the thin disk glow, which removes the
// step-count banding that a naive per-step exp() accumulation produces.
float erfApprox(float x) {
  float s = x < 0.0 ? -1.0 : 1.0;
  float a = abs(x);
  float t = 1.0 / (1.0 + 0.3275911 * a);
  float y = 1.0 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-a * a);
  return s * y;
}

vec3 sampleBackground(vec3 dir) {
  return sampleStars(dir, uStarDensity, uStarTime, uStarSeed);
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 clip = vec4(ndc, -1.0, 1.0);
  vec4 worldH = uInvCameraProj * clip;
  worldH /= worldH.w;
  vec3 rayDir = normalize((uInvCameraView * vec4(worldH.xyz, 0.0)).xyz);
  vec3 rayOrigin = uCameraPos;

  vec3 rel0 = rayOrigin - uBHPosition;
  float proj0 = dot(rel0, rayDir);
  float perp2 = dot(rel0, rel0) - proj0 * proj0;

  // Fast path: ray moves away from the hole and never comes near it.
  if (proj0 > 0.0 || perp2 > ESCAPE_R * ESCAPE_R) {
    vec3 bg = sampleBackground(rayDir);
    fragColor = vec4(bg + vec3(0.0, 0.0, 0.002), 1.0);
    return;
  }

  float rs = uBHRadius;
  vec3 p = rayOrigin;
  vec3 dir = rayDir;

  vec3 col = vec3(0.0);
  float trans = 1.0;
  bool absorbed = false;
  float minR = length(rel0);
  float prevRelY = p.y - uBHPosition.y;
  float diskSpan = max(uDiskOuterRadius - uDiskInnerRadius, 1e-4);
  int nCross = 0;

  for (int i = 0; i < 256; i++) {
    if (i >= uRaymarchSteps) break;

    vec3 rp = p - uBHPosition;
    float r2 = dot(rp, rp);
    float r = sqrt(r2);

    if (r < rs) {
      absorbed = true;
      break;
    }
    if (r > ESCAPE_R && dot(rp, dir) > 0.0) break;

    minR = min(minR, r);

    float dt = clamp(r * 0.12, 0.02, 2.5) * uSecondaryStepScale;

    // ---- Physical bending (post-Newtonian expansion of the photon geodesic) ----
    // Schwarzschild: |r̂ × v̂| = b/r_eff is conserved; the transverse force
    // -1.5*rs*h²·r̂/r⁵ reproduces the photon sphere (1.5 rs) and shadow (~2.6 rs).
    vec3 hv = cross(rp, dir);
    float h2 = dot(hv, hv);
    vec3 force = -1.5 * rs * h2 * rp / (r2 * r2 * r);

    // Kerr frame dragging (Lense-Thirring): spacetime swirls around the spin
    // axis (+Y). A photon near the hole is twisted azimuthally, which makes
    // the shadow asymmetric and wraps the disk image — zero at spin = 0.
    if (uBHSpin > 0.0001) {
      vec3 omega = vec3(0.0, uBHSpin * 1.6 * rs * rs / max(r2 * r, 1e-5), 0.0); // Ω ~ a·rs²/r³
      force += 2.0 * cross(omega, dir); // a_LT ≈ 2·(v × Ω)
    }

    dir = normalize(dir + force * dt * uBHLensStrength);

    vec3 prevP = p;
    p += dir * dt;
    float relY = p.y - uBHPosition.y;
    float rc = length(p.xz - uBHPosition.xz);

    // Thin volumetric glow around the disk plane — THREE saturated layers:
    //   near:   hot white-violet ring at the disk inner edge
    //   middle: saturated violet glow
    //   far:    wide faint deep-blue/indigo aura
    // The vertical gaussian is integrated ANALYTICALLY with erf (no step
    // banding), and the outer fade prevents any hard square cutoff.
    if (rc > rs * 1.02 && rc < uDiskOuterRadius * 1.15) {
      float edge = smoothstep(rs * 1.0, rs * 1.25, rc);
      float outerFade = 1.0 - smoothstep(uDiskOuterRadius * 0.75, uDiskOuterRadius * 1.1, rc);
      float hn = rs * (0.05 + 0.22 * clamp((rc - uDiskInnerRadius) / diskSpan, 0.0, 1.0)) * uDiskThickness;

      // Exact integral of exp(-(y/hn)^2) over the segment's y-range [prevRelY, relY].
      float yi0 = prevRelY / max(hn, 1e-5);
      float yi1 = relY / max(hn, 1e-5);
      float vertIntegral = 0.5 * 1.7724539 * hn * (erfApprox(yi1) - erfApprox(yi0));
      // Grazing rays pass through more gas; clamp so they cannot blow up.
      float pathScale = clamp(1.0 / max(abs(dir.y), 0.25), 1.0, 4.0);

      // Layered brightness profile — a wide vivid-violet aura with a
      // brighter inner rim (no power-law boost near the horizon).
      float narrow = exp(-pow((rc - uDiskInnerRadius) / (rs * 0.6), 2.0)) * 1.2;
      float medium = exp(-pow((rc - uDiskInnerRadius) / (uDiskOuterRadius * 0.32), 2.0)) * 0.80;
      float wide   = exp(-((rc - uDiskInnerRadius) / (uDiskOuterRadius * 0.85)) * ((rc - uDiskInnerRadius) / (uDiskOuterRadius * 0.85)) * 2.0) * 0.34;
      float auraB = (narrow + medium + wide) * uDiskBrightness;

      // PURPLE-first gradient. R stays close to B across the whole aura so it
      // reads unambiguously as violet/magenta — never cyan or baby-blue.
      float tA = clamp((rc - rs) / max(uDiskOuterRadius - rs, 1e-4), 0.0, 1.0);
      vec3 auraCol;
      if (tA < 0.15)      auraCol = mix(vec3(1.00, 0.90, 1.06), vec3(0.90, 0.44, 1.05), tA / 0.15);
      else if (tA < 0.55) auraCol = mix(vec3(0.90, 0.44, 1.05), vec3(0.66, 0.34, 0.98), (tA - 0.15) / 0.40);
      else                auraCol = mix(vec3(0.66, 0.34, 0.98), vec3(0.50, 0.28, 0.92), (tA - 0.55) / 0.45);
      // Warm variant when the color slider is pushed toward 1.
      auraCol = mix(auraCol, vec3(1.00, 0.55, 0.22) + auraCol * 0.35, smoothstep(0.5, 0.85, uDiskHue));

      float glow = vertIntegral * edge * outerFade * auraB * 1.1 * uDiskDensity * pathScale;
      col += trans * max(auraCol, vec3(0.0)) * max(glow, 0.0);
    }

    // Disk plane crossing -> procedural thin-disk sample. Multiple crossings
    // are accumulated so the lensed far-side image arcs over/under the shadow.
    if (prevRelY * relY < 0.0) {
      float tC = prevRelY / (prevRelY - relY);
      vec3 crossP = mix(prevP, p, tC);
      float crossR = length(crossP - uBHPosition);
      if (crossR > rs * 1.02 && crossR < uDiskOuterRadius * 1.25) {
        nCross++;
        // Higher-order lensed images (3rd crossing and beyond) are heavily
        // under-sampled at this step budget: they alias into thin chaotic
        // rings near the shadow edge that reshuffle every time the camera
        // moves. Damp them progressively — primary + secondary image stay.
        float orderDamp = 1.0 / (1.0 + 0.9 * float(nCross - 1));
        vec3 dc = sampleAccretionDisk(crossP, dir, uBHPosition, rs,
          uDiskInnerRadius, uDiskOuterRadius, uDiskDensity, uDiskTemperature,
          uDiskAccretionSpeed, uTime, uDiskSpiralTightness, uDiskDopplerStrength,
          uDiskHue, uDiskBrightness) * orderDamp;
        float a = clamp(max(dc.r, max(dc.g, dc.b)) * 2.0, 0.0, 1.0);
        col += trans * dc;
        trans *= 1.0 - a * 0.85;
        if (trans < 0.02) break;
      }
    }

    prevRelY = relY;
  }

  // Rays trapped near the photon sphere without escaping read as part of the shadow.
  if (!absorbed && minR < rs * 1.45) absorbed = true;

  // Photon ring: bright blue-white rim hugging the shadow edge, formed by
  // light that orbited close to 1.5 rs before escaping or falling in.
  float ringT = (minR - 1.5 * rs) / (0.30 * rs);
  float ring = exp(-ringT * ringT);
  vec3 ringCol = mix(vec3(0.60, 0.70, 1.10), vec3(1.00, 0.55, 0.25), smoothstep(0.3, 0.75, uDiskHue));
  col += ringCol * ring * 0.60 * (0.4 + 0.6 * uDiskDensity) * uRingStrength;

  if (!absorbed) {
    col += trans * (sampleBackground(dir) + vec3(0.0, 0.0, 0.002));
  }

  fragColor = vec4(col, 1.0);
}
