/**
 * Shared wind for attached jacaranda geometry and released petals.
 * Coordinates are metres, Y up; tree points are local to the vegetation group.
 * Keep the CPU deformation and JACARANDA_WIND_GLSL equations together.
 */
export const TREE_WIND_PROFILES = Object.freeze([
  { x: -4.5, z: 3.0, height: 6.2, lag: 0.00, flexibility: 1.08 },
  { x: -4.7, z: -2.7, height: 11.2, lag: .36, flexibility: .95 },
  { x: .4, z: -4.1, height: 12.3, lag: .67, flexibility: 1.00 },
  { x: 5.0, z: -1.1, height: 11.0, lag: .49, flexibility: .97 },
]);

const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const profile = index => TREE_WIND_PROFILES[Math.max(0, Math.min(3, Math.round(index)))];

/** Smooth 4.8–7.5 second gust components, bounded to [0, 1]. */
export function windGust(time) {
  const pulse = .5 + .5 * Math.sin(.84 * time - .7);
  return Math.pow(pulse, 1.25) * (.78 + .22 * Math.sin(1.32 * time + .6));
}

/** Air velocity in m/s, shared by falling-petal physics. No THREE dependency. */
export function windVelocity(x, y, z, time, out) {
  const t = time - .045 * x - .030 * z;
  const gust = windGust(t);
  const shelter = .58 + .42 * smooth(.5, 8.5, y);
  const speed = (.20 + .62 * gust) * shelter;
  const cross = .035 * Math.sin(.53 * t + .07 * x - .05 * z) * shelter;
  return out.set(
    .882 * speed - .471 * cross,
    .022 * gust * Math.sin(1.10 * t + .12 * x + .08 * z),
    .471 * speed + .882 * cross,
  );
}

/** Exact CPU counterpart of the attached-tree vertex deformation. */
export function sampleTreeWindPoint(rest, treeIndex, time, out) {
  const x = rest.x, y = rest.y, z = rest.z;
  const tree = profile(treeIndex);
  const qx = x - tree.x, qz = z - tree.z;
  const h = clamp01(Math.max(y, 0) / tree.height);
  const rooted = smooth(.18, .80, y);
  const mainWeight = Math.pow(h, 1.55);
  const outerWeight = Math.pow(h, 1.25) * smooth(.60, 3.0, Math.hypot(qx, qz));
  const t = time - tree.lag - .045 * tree.x - .030 * tree.z - .36 * h;
  const gust = windGust(t);
  const slow = Math.sin(.70 * t);
  const spatial = .18 * qx + .13 * qz;
  const branchWave = Math.sin(1.80 * t + spatial - .4);
  const main = mainWeight * (.06 + .06 * gust + (.09 + .055 * gust) * slow);
  const outer = outerWeight * (.05 * gust + (.13 + .085 * gust) * branchWave);
  const cross = mainWeight * .05 * Math.sin(.53 * t + 1.4)
    + outerWeight * (.055 + .025 * gust) * Math.sin(1.47 * t + spatial + 1.1);
  // A continuous clearance field keeps inner twigs clear of walls and the
  // veranda while allowing the free outer crown to move visibly.
  const horizontalClearance = Math.max(Math.abs(x) - 3.55, z > 0 ? z - 3.45 : -z - 3.05);
  const clearance = Math.max(horizontalClearance, y - 8.90);
  const protection = smooth(0, .90, clearance);
  const amplitude = rooted * protection * tree.flexibility;
  const along = main + outer;
  const vertical = outerWeight * .065 * Math.sin(1.80 * t + spatial - .8)
    - .025 * mainWeight * slow * slow;
  return out.set(
    x + amplitude * (.882 * along - .471 * cross),
    y + amplitude * vertical,
    z + amplitude * (.471 * along + .882 * cross),
  );
}

const point = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } });
const nBase = point(), nX = point(), nY = point(), nZ = point(), nInput = point();
export const WIND_NORMAL_EPSILON = .018;

/** Normal mapping using the same forward-difference Jacobian as the shader. */
export function sampleTreeWindNormal(rest, normal, treeIndex, time, out) {
  const x = rest.x, y = rest.y, z = rest.z, e = WIND_NORMAL_EPSILON;
  const nx = normal.x, ny = normal.y, nz = normal.z;
  sampleTreeWindPoint(nInput.set(x, y, z), treeIndex, time, nBase);
  sampleTreeWindPoint(nInput.set(x + e, y, z), treeIndex, time, nX);
  sampleTreeWindPoint(nInput.set(x, y + e, z), treeIndex, time, nY);
  sampleTreeWindPoint(nInput.set(x, y, z + e), treeIndex, time, nZ);
  const ax = (nX.x - nBase.x) / e, ay = (nX.y - nBase.y) / e, az = (nX.z - nBase.z) / e;
  const bx = (nY.x - nBase.x) / e, by = (nY.y - nBase.y) / e, bz = (nY.z - nBase.z) / e;
  const cx = (nZ.x - nBase.x) / e, cy = (nZ.y - nBase.y) / e, cz = (nZ.z - nBase.z) / e;
  // Cofactor(J) is inverse-transpose(J) times its positive determinant. The
  // final normalization removes that scalar without requiring a matrix inverse.
  const ox = nx * (by * cz - bz * cy) + ny * (cy * az - cz * ay) + nz * (ay * bz - az * by);
  const oy = nx * (bz * cx - bx * cz) + ny * (cz * ax - cx * az) + nz * (az * bx - ax * bz);
  const oz = nx * (bx * cy - by * cx) + ny * (cx * ay - cy * ax) + nz * (ax * by - ay * bx);
  const length = Math.hypot(ox, oy, oz) || 1;
  return out.set(ox / length, oy / length, oz / length);
}

/** THREE injects this into standard, depth, and distance vertex programs. */
export const JACARANDA_WIND_GLSL = /* glsl */ `
attribute float windTreeIndex;
uniform float uJacarandaWindTime;

float jacarandaWindGust(float time) {
  float pulse = 0.5 + 0.5 * sin(0.84 * time - 0.7);
  return pow(pulse, 1.25) * (0.78 + 0.22 * sin(1.32 * time + 0.6));
}

vec4 jacarandaWindTree(float index) {
  if (index < 0.5) return vec4(-4.5, 3.0, 6.2, 0.00);
  if (index < 1.5) return vec4(-4.7, -2.7, 11.2, 0.36);
  if (index < 2.5) return vec4(0.4, -4.1, 12.3, 0.67);
  return vec4(5.0, -1.1, 11.0, 0.49);
}

float jacarandaWindFlex(float index) {
  if (index < 0.5) return 1.08;
  if (index < 1.5) return 0.95;
  if (index < 2.5) return 1.00;
  return 0.97;
}

vec3 jacarandaWindPoint(vec3 rest, float treeIndex, float time) {
  vec4 tree = jacarandaWindTree(treeIndex);
  vec2 q = rest.xz - tree.xy;
  float h = clamp(max(rest.y, 0.0) / tree.z, 0.0, 1.0);
  float rooted = smoothstep(0.18, 0.80, rest.y);
  float mainWeight = pow(h, 1.55);
  float outerWeight = pow(h, 1.25) * smoothstep(0.60, 3.0, length(q));
  float t = time - tree.w - 0.045 * tree.x - 0.030 * tree.y - 0.36 * h;
  float gust = jacarandaWindGust(t);
  float slow = sin(0.70 * t);
  float spatial = 0.18 * q.x + 0.13 * q.y;
  float branchWave = sin(1.80 * t + spatial - 0.4);
  float mainBend = mainWeight * (0.06 + 0.06 * gust + (0.09 + 0.055 * gust) * slow);
  float outer = outerWeight * (0.05 * gust + (0.13 + 0.085 * gust) * branchWave);
  float crossBend = mainWeight * 0.05 * sin(0.53 * t + 1.4)
    + outerWeight * (0.055 + 0.025 * gust) * sin(1.47 * t + spatial + 1.1);
  float horizontalClearance = max(abs(rest.x) - 3.55, rest.z > 0.0 ? rest.z - 3.45 : -rest.z - 3.05);
  float clearance = max(horizontalClearance, rest.y - 8.90);
  float protection = smoothstep(0.0, 0.90, clearance);
  float amplitude = rooted * protection * jacarandaWindFlex(treeIndex);
  float along = mainBend + outer;
  float vertical = outerWeight * 0.065 * sin(1.80 * t + spatial - 0.8)
    - 0.025 * mainWeight * slow * slow;
  return rest + amplitude * vec3(0.882 * along - 0.471 * crossBend, vertical, 0.471 * along + 0.882 * crossBend);
}

vec3 jacarandaWindNormal(vec3 rest, vec3 bent, vec3 normal, float treeIndex, float time) {
  float e = 0.018;
  vec3 dx = (jacarandaWindPoint(rest + vec3(e, 0.0, 0.0), treeIndex, time) - bent) / e;
  vec3 dy = (jacarandaWindPoint(rest + vec3(0.0, e, 0.0), treeIndex, time) - bent) / e;
  vec3 dz = (jacarandaWindPoint(rest + vec3(0.0, 0.0, e), treeIndex, time) - bent) / e;
  return normalize(mat3(cross(dy, dz), cross(dz, dx), cross(dx, dy)) * normal);
}
`;
