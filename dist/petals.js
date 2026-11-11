import { windGust, windVelocity } from './wind.js';

/** One breeze, from the attached blossom to its resting place. All coordinates
 * here are world coordinates; vegetation release points are transformed once. */
export function createPetalWeather(THREE, { vegetation, architecture, mobile = false }) {
  const group = new THREE.Group();
  group.name = 'The breeze — blossom fall and accumulated petals';
  let seed = 7319, time = 0, emission = 0, cursor = 0, settledCursor = 0, baseDeposits = 0;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const smooth = THREE.MathUtils.smoothstep;
  const clamp = THREE.MathUtils.clamp;
  const V = () => new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), dummy = new THREE.Object3D();
  const gustVector = V(), oldPosition = V(), releaseBefore = V(), releaseNow = V(), supportVertex = V();
  const qNormal = new THREE.Quaternion(), qTwist = new THREE.Quaternion();
  const cameraForward = V(), cameraRight = V(), cameraUp = V(), toCamera = V();
  const capacity = mobile ? 280 : 400, depositCapacity = 3600;
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .98,
    emissive: '#ae8dc8', emissiveIntensity: .08, side: THREE.DoubleSide });
  const settledMaterial = material.clone();
  settledMaterial.emissiveIntensity = .012;
  const colours = ['#ceb2e2', '#b69bd2', '#d4b9e5', '#bea0dc', '#dbc4e8'].map(c => new THREE.Color(c));

  // A small, curved trumpet mouth: its lower centre reads as a petal on contact.
  const positions = [0, -.22, 0], indices = [];
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2, r = .87 + .13 * Math.cos(a * 5);
    positions.push(Math.cos(a) * r, .035 + .035 * Math.cos(a * 5), Math.sin(a) * r);
    indices.push(0, 1 + (i + 1) % 20, 1 + i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const airborne = new THREE.InstancedMesh(geometry, material, capacity);
  airborne.name = 'Petals released from moving jacaranda twigs';
  airborne.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  airborne.frustumCulled = false; airborne.receiveShadow = true;
  const deposits = new THREE.InstancedMesh(geometry, settledMaterial, depositCapacity);
  deposits.name = 'Petals resting on the roof, awning, veranda and street';
  deposits.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  deposits.frustumCulled = false; deposits.receiveShadow = true;
  group.add(deposits, airborne);
  const particles = Array.from({ length: capacity }, (_, i) => ({
    index: i, state: 'waiting', position: V(), velocity: V(), normal: up.clone(),
    quaternion: new THREE.Quaternion(), landingQuaternion: new THREE.Quaternion(),
    scale: .065, stretch: 1, age: 0, phase: 0, spin: 0, settleAge: 0,
  }));
  const settled = [];
  const stats = { emitted: 0, landed: 0, escaped: 0, wallContacts: 0,
    initialDeposits: {}, landings: {}, sourceCount: 0, warmupSeconds: 16 };
  const ground = {
    id: 'pavement', kind: 'ground', bounds: { minX: -7.15, maxX: 6.32, minZ: -6.30, maxZ: 5.47 },
    sample(x, z) {
      if (x < -7.72 || x > 7.72 || z < -6.82 || z > 6.82) return null;
      const pavement = x >= -7.15 && x <= 6.32 && z >= -6.30 && z <= 5.47;
      return { height: pavement ? .474 : .047, normal: up, edgeDistance: 1 };
    },
  };
  const surfaces = [...architecture.catchSurfaces, ground];
  const sites = vegetation.releaseSites.filter(s => s.position.y > 3.05 &&
    Math.abs(s.position.x) < 7.5 && s.position.z > -6.3 && s.position.z < 5.1);
  stats.sourceCount = sites.length;
  const roofSites = sites.filter(s => s.position.y > 8.8 && Math.abs(s.position.x) < 3.35 && Math.abs(s.position.z) < 3.3);
  const frontSites = sites.filter(s => s.position.z > 1.7 || s.treeIndex === 0);
  let releaseCluster = null, clusterRemaining = 0;
  const originY = vegetation.group.position.y;

  function sampleSite(site, at, out) {
    vegetation.sampleWindPoint(site.position, site.treeIndex, at, out);
    out.y += originY;
    return out;
  }
  function surfaceRotation(normal, angle, out) {
    qNormal.setFromUnitVectors(up, normal);
    qTwist.setFromAxisAngle(up, angle);
    return out.copy(qNormal).multiply(qTwist);
  }
  function supportHeight(quaternion, normal, size, stretch, compression = 1) {
    let lowest = 0;
    for (let i = 0; i < positions.length; i += 3) {
      supportVertex.set(positions[i] * size * stretch, positions[i + 1] * size * compression, positions[i + 2] * size * .82).applyQuaternion(quaternion);
      lowest = Math.min(lowest, supportVertex.dot(normal));
    }
    return -lowest + .003;
  }
  function stamp(position, normal, size, stretch, angle, colour, surfaceId, initial = false) {
    const slot = initial ? settledCursor++ : baseDeposits + (settledCursor++ - baseDeposits) % (depositCapacity - baseDeposits);
    dummy.position.copy(position);
    surfaceRotation(normal, angle, dummy.quaternion);
    dummy.scale.set(size * stretch, size * .24, size * .82);
    dummy.updateMatrix(); deposits.setMatrixAt(slot, dummy.matrix);
    deposits.setColorAt(slot, colour);
    settled[slot] = { position: position.clone(), normal: normal.clone(), scale: size,
      stretch, angle, surfaceId, initial };
  }

  // A season's accumulation: canopy catchment and sheltered edges determine
  // density, with little bare intervals rather than a uniform purple carpet.
  function seedAccumulation() {
    const projected = sites.filter(s => s.position.y > 7).map(s => ({
      x: s.position.x + .25, z: s.position.z + .35,
    }));
    for (const surface of architecture.catchSurfaces) {
      const isRoof = surface.kind === 'roof';
      const target = isRoof ? (surface.id.includes('chimney') ? 12 : surface.id.includes('parapet') ? 100 : 1050)
        : surface.kind === 'awning' ? 260 : surface.kind === 'balcony' ? 105 : 28;
      const b = surface.bounds;
      let added = 0;
      for (let tries = 0; tries < target * 90 && added < target; tries++) {
        const x = b.minX + random() * (b.maxX - b.minX), z = b.minZ + random() * (b.maxZ - b.minZ);
        const hit = surface.sample(x, z);
        if (!hit || hit.normal.y < .75 || hit.edgeDistance < .043) continue;
        let nearest = 8;
        if (isRoof) for (const p of projected) {
          const d = (x - p.x) ** 2 + (z - p.z) ** 2;
          if (d < nearest) nearest = d;
        }
        const canopy = Math.exp(-nearest / 1.3), edge = Math.exp(-hit.edgeDistance / .27);
        const patch = .48 + .52 * (.5 + .5 * Math.sin(x * 4.2 + Math.sin(z * 2.1)) * Math.cos(z * 3.7));
        const pocket = (cx, cz, sx, sz) => Math.exp(-.5 * (((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2));
        // The rear-left overhang feeds two loose pockets. The prevailing breeze
        // collects flowers against the front/right parapet, leaving a calm centre.
        const roofPocket = Math.min(1, .95 * pocket(-2.15, -1.78, .67, .34)
          + .66 * pocket(-1.05, -1.82, .80, .30) + .95 * pocket(2.23, -.45, .30, 1.04)
          + .87 * pocket(.28, 1.91, 1.47, .24) + .54 * pocket(-2.11, .78, .25, .62));
        const awningPocket = Math.pow(.5 + .5 * Math.sin(x * 2.05 + z * .71 + Math.sin(z * 2.7)), 3);
        const density = surface.id === 'roof-flat' ? (.012 + canopy * .025 + edge * .10 + roofPocket * .92) * patch
          : isRoof ? (.04 + canopy * .19 + edge * .48) * patch
          : surface.kind === 'awning' ? (.035 + awningPocket * .78) * (.3 + edge * .7)
          : (.20 + edge * .56) * patch;
        if (random() > density) continue;
        const size = .035 + random() * .034;
        // Keep the sampled x/z on the same narrow corrugation or ledge facet.
        const shallowLayer = surface.id === 'roof-flat' ? roofPocket * random() * .009 : 0;
        const point = new THREE.Vector3(x, hit.height + .006 + random() * .009 + shallowLayer, z);
        stamp(point, hit.normal, size, .86 + random() * .3, random() * Math.PI * 2,
          colours[Math.floor(random() * colours.length)], surface.id, true);
        added++;
      }
      stats.initialDeposits[surface.id] = added;
    }
  }

  function pickSite() {
    const gust = windGust(time);
    if (clusterRemaining > 0 && releaseCluster) {
      clusterRemaining--;
      // A gust loosens neighbouring real blossom sprays, never empty air.
      const near = sites.filter(s => s.treeIndex === releaseCluster.treeIndex && s.position.distanceToSquared(releaseCluster.position) < 1.1);
      if (near.length) return near[Math.floor(random() * near.length)];
    }
    const selector = random(), pool = selector < .27 && roofSites.length ? roofSites
      : selector < .63 && frontSites.length ? frontSites : sites;
    releaseCluster = pool[Math.floor(random() * pool.length)];
    clusterRemaining = gust > .58 ? 2 + Math.floor(random() * 3) : 0;
    return releaseCluster;
  }
  function emit() {
    let p = null;
    for (let n = 0; n < capacity; n++) {
      const candidate = particles[cursor++ % capacity];
      if (candidate.state === 'waiting') { p = candidate; break; }
    }
    if (!p || !sites.length) return;
    const site = pickSite();
    sampleSite(site, time, releaseNow); sampleSite(site, time - 1 / 60, releaseBefore);
    p.position.copy(releaseNow);
    windVelocity(p.position.x, p.position.y, p.position.z, time, gustVector);
    p.velocity.copy(releaseNow).sub(releaseBefore).multiplyScalar(60 * .38).addScaledVector(gustVector, .52);
    p.velocity.y = -.10 - random() * .12;
    p.state = 'air'; p.age = 0; p.source = site; p.releasedAt = time;
    p.releasePosition = releaseNow.clone(); p.scale = .054 + random() * .042; p.renderScale = p.scale;
    p.stretch = .88 + random() * .23; p.terminal = .49 + random() * .30;
    p.phase = random() * Math.PI * 2; p.spin = (random() - .5) * 1.2;
    p.tumble = .8 + random() * .65; p.colour = colours[Math.floor(random() * colours.length)];
    p.quaternion.setFromEuler(new THREE.Euler(.35, p.phase, .25));
    airborne.setColorAt(p.index, p.colour); stats.emitted++;
  }

  function firstLanding(from, to, clearance = .012) {
    if (to.y > from.y) return null;
    let first = null;
    for (const surface of surfaces) {
      const hit = surface.sample(to.x, to.z);
      if (!hit || from.y < hit.height + clearance - .025 || to.y > hit.height + clearance) continue;
      const alpha = clamp((from.y - hit.height - clearance) / Math.max(.00001, from.y - to.y), 0, 1);
      const x = THREE.MathUtils.lerp(from.x, to.x, alpha), z = THREE.MathUtils.lerp(from.z, to.z, alpha);
      const exact = surface.sample(x, z);
      if (!exact || from.y < exact.height || (first && exact.height <= first.height)) continue;
      first = { ...exact, x, z, surfaceId: surface.id };
    }
    return first;
  }
  function land(p, hit) {
    p.state = 'settling'; p.settleAge = 0; p.surfaceId = hit.surfaceId;
    // Keep the final visible size across the live-to-resting mesh handoff.
    p.scale = p.renderScale > 0 ? p.renderScale : p.scale;
    p.normal.copy(hit.normal); p.contact = new THREE.Vector3(hit.x, hit.height, hit.z);
    p.position.copy(p.contact);
    p.position.y += supportHeight(p.quaternion, p.normal, p.scale, p.stretch) / Math.max(.75, p.normal.y);
    p.velocity.set(0, 0, 0);
    p.landingStart = p.quaternion.clone(); surfaceRotation(p.normal, p.phase, p.landingQuaternion);
    stats.landed++; stats.landings[hit.surfaceId] = (stats.landings[hit.surfaceId] || 0) + 1;
  }
  function integrate(dt) {
    time += dt;
    const gust = windGust(time);
    emission += dt * (mobile ? 13 + 16 * gust * gust : 18 + 23 * gust * gust);
    while (emission >= 1) { emit(); emission--; }
    for (const p of particles) {
      if (p.state === 'waiting') continue;
      p.age += dt;
      if (p.state === 'settling') {
        p.settleAge += dt;
        const t = smooth(p.settleAge, 0, .62);
        p.quaternion.slerpQuaternions(p.landingStart, p.landingQuaternion, t);
        p.position.copy(p.contact);
        p.position.y += supportHeight(p.quaternion, p.normal, p.renderScale, p.stretch, THREE.MathUtils.lerp(1, .24, t)) / Math.max(.75, p.normal.y);
        if (p.settleAge > .72) {
          stamp(p.position, p.normal, p.renderScale, p.stretch, p.phase, p.colour, p.surfaceId);
          p.state = 'waiting';
        }
        continue;
      }
      oldPosition.copy(p.position);
      windVelocity(p.position.x, p.position.y, p.position.z, time, gustVector);
      // Air drag approaches the shared wind. Individual flutter is smaller than
      // the transported motion, and never reflects a petal across an invisible wall.
      const flutter = Math.sin(p.age * 3.1 + p.phase), drag = 1 - Math.exp(-dt * 1.8);
      p.velocity.x += (gustVector.x + Math.sin(p.age * 2.1 + p.phase) * .055 - p.velocity.x) * drag;
      p.velocity.z += (gustVector.z + flutter * .065 - p.velocity.z) * drag;
      p.velocity.y += (-p.terminal + gustVector.y + flutter * .07 - p.velocity.y) * (1 - Math.exp(-dt * 2.7));
      p.position.addScaledVector(p.velocity, dt);
      const hit = firstLanding(oldPosition, p.position, supportHeight(p.quaternion, up, p.scale, p.stretch));
      if (hit) { land(p, hit); continue; }
      const contact = architecture.solidContact?.(p.position.x, p.position.y, p.position.z, .025);
      if (contact) {
        p.position.addScaledVector(contact.normal, contact.depth + .012);
        const inward = p.velocity.dot(contact.normal);
        if (inward < 0) p.velocity.addScaledVector(contact.normal, -inward);
        stats.wallContacts++;
      }
      p.quaternion.setFromEuler(new THREE.Euler(
        .45 + Math.sin(p.age * p.tumble + p.phase) * .80,
        p.phase + p.age * p.spin,
        Math.sin(p.age * 1.8 + p.phase) * .64 + Math.atan2(p.velocity.x, -p.velocity.y) * .30,
      ));
      if (Math.abs(p.position.x) > 9.2 || Math.abs(p.position.z) > 8.3 || p.position.y < -.7 || p.age > 38) {
        p.state = 'waiting'; stats.escaped++;
      }
    }
  }
  function draw(camera, width = 1440, height = 900) {
    if (camera) {
      camera.updateMatrixWorld(); camera.getWorldDirection(cameraForward);
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0); cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);
    }
    const focal = camera ? height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) : 0;
    for (const p of particles) {
      if (p.state === 'waiting') { dummy.position.set(0, -20, 0); dummy.quaternion.identity(); dummy.scale.setScalar(0); }
      else {
        let cap = 1;
        if (camera) {
          toCamera.copy(p.position).sub(camera.position);
          const depth = toCamera.dot(cameraForward), offAxis = depth > 0
            ? Math.max(Math.abs(toCamera.dot(cameraRight)), Math.abs(toCamera.dot(cameraUp))) / depth : 0;
          if (depth > 0) cap = Math.min(1, (width < 700 ? 10 : 16) * depth /
            (focal * 2 * p.scale * p.stretch * Math.sqrt(1 + offAxis * offAxis) * 1.10));
        }
        const edge = p.state === 'settling' ? 1 : smooth(9.2 - Math.abs(p.position.x), 0, .7) * smooth(8.3 - Math.abs(p.position.z), 0, .7);
        const size = p.scale * cap * edge;
        p.renderScale = size;
        dummy.position.copy(p.position); dummy.quaternion.copy(p.quaternion);
        // Compression at contact, then the same flower persists in the deposit mesh.
        const compression = p.state === 'settling' ? THREE.MathUtils.lerp(1, .24, smooth(p.settleAge, 0, .62)) : 1;
        dummy.scale.set(size * p.stretch, size * compression, size * .82);
      }
      dummy.updateMatrix(); airborne.setMatrixAt(p.index, dummy.matrix);
    }
    airborne.instanceMatrix.needsUpdate = true;
    if (airborne.instanceColor) airborne.instanceColor.needsUpdate = true;
    deposits.count = Math.min(settledCursor, depositCapacity);
    deposits.instanceMatrix.needsUpdate = true;
    if (deposits.instanceColor) deposits.instanceColor.needsUpdate = true;
  }
  function update(dt, camera, width, height, lamps = 1) {
    // Substeps preserve roof/awning contact even during a slow animation frame.
    let remaining = Math.min(.12, Math.max(0, dt));
    while (remaining > .000001) { const step = Math.min(1 / 60, remaining); integrate(step); remaining -= step; }
    vegetation.updateWind(time);
    material.emissiveIntensity = .025 + lamps * .075;
    settledMaterial.emissiveIntensity = .008 + lamps * .023;
    draw(camera, width, height);
  }
  seedAccumulation(); baseDeposits = settledCursor;
  for (let t = 0; t < stats.warmupSeconds; t += 1 / 30) integrate(1 / 30);
  update(0);
  return { group, airborne, deposits, material, geometry, particles, settled, stats, surfaces,
    update, firstLanding, sampleSite, get time() { return time; },
    get activeCount() { return particles.filter(p => p.state !== 'waiting').length; },
  };
}
