in vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uCameraPos;
uniform mat4 uInvCameraView;
uniform mat4 uInvCameraProj;
uniform vec3 uBHPosition;
uniform float uBHRadius;
uniform float uBHLensStrength;
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

out vec4 fragColor;

const float ESCAPE_R = 70.0;

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

    // Schwarzschild null-geodesic bending: a = -1.5 * rs * h^2 * rp / r^5.
    // Gives the correct photon sphere at 1.5 rs and shadow at ~2.6 rs.
    vec3 hv = cross(rp, dir);
    float h2 = dot(hv, hv);
    vec3 force = -1.5 * rs * h2 * rp / (r2 * r2 * r);
    dir = normalize(dir + force * dt * uBHLensStrength);

    vec3 prevP = p;
    p += dir * dt;
    float relY = p.y - uBHPosition.y;
    float rc = length(p.xz - uBHPosition.xz);

    // Thin volumetric glow around the disk plane: gives the disk a
    // perceived physical thickness and wraps a bright rim right up to the
    // shadow edge instead of leaving a black gap.
    if (rc > rs * 1.02 && rc < uDiskOuterRadius * 1.1) {
      float edge = smoothstep(rs * 1.0, rs * 1.25, rc);
      float hn = rs * (0.05 + 0.22 * clamp((rc - uDiskInnerRadius) / diskSpan, 0.0, 1.0));
      float vert = exp(-relY * relY / max(hn * hn, 1e-6));
      float radial = pow(uDiskInnerRadius / max(rc, rs * 0.9), 2.4);
      float glow = vert * radial * edge * dt * 0.16 * uDiskDensity;
      vec3 glowCol = mix(vec3(0.30, 0.50, 1.05), vec3(0.90, 0.85, 1.05), clamp(radial * 0.55, 0.0, 1.0));
      col += trans * glowCol * glow;
    }

    // Disk plane crossing -> procedural thin-disk sample. Multiple crossings
    // are accumulated so the lensed far-side image arcs over/under the shadow.
    if (prevRelY * relY < 0.0) {
      float tC = prevRelY / (prevRelY - relY);
      vec3 crossP = mix(prevP, p, tC);
      float crossR = length(crossP - uBHPosition);
      if (crossR > rs * 1.02 && crossR < uDiskOuterRadius * 1.25) {
        vec3 dc = sampleAccretionDisk(crossP, dir, uBHPosition, rs,
          uDiskInnerRadius, uDiskOuterRadius, uDiskDensity, uDiskTemperature,
          uDiskAccretionSpeed, uTime, uDiskSpiralTightness, uDiskDopplerStrength);
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
  col += vec3(0.60, 0.70, 1.10) * ring * 0.60 * (0.4 + 0.6 * uDiskDensity);

  if (!absorbed) {
    col += trans * (sampleBackground(dir) + vec3(0.0, 0.0, 0.002));
  }

  fragColor = vec4(col, 1.0);
}
