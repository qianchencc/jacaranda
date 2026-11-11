/**
 * Four individually composed jacarandas. Flower sprays grow from a continuous
 * branching skeleton; there are deliberately no enclosing canopy primitives.
 */
import {
  JACARANDA_WIND_GLSL, TREE_WIND_PROFILES,
  sampleTreeWindPoint, sampleTreeWindNormal,
} from './wind.js';

export function createVegetation(THREE) {
  const group = new THREE.Group();
  group.name = 'Jacarandas — four different silhouettes';
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const dummy = new THREE.Object3D();
  const flowers = [];
  const leaves = [];
  const petalSeeds = [];
  const releaseSites = [];
  const branchData = [];
  let branchCount = 0;
  const barkMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 1, metalness: 0,
  });
  const blossomMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: .96, metalness: 0,
    side: THREE.DoubleSide, emissive: 0x645179, emissiveIntensity: .09,
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 1, side: THREE.DoubleSide,
  });
  const palette = [0xb5a0d8, 0xa68acb, 0xc2a4dc, 0xd0b7e4, 0x9887c8, 0xb0a0d9, 0xbda0d4];
  const colours = palette.map(c => new THREE.Color(c));
  const barkColours = [0x78665e, 0x6d6058, 0x71645e, 0x695a54].map(c => new THREE.Color(c));

  // One uniform moves all attached geometry. Instance matrices remain static.
  const windTime = { value: 0 };
  const windStart = /* glsl */ `
    #include <batching_vertex>
    vec4 jacarandaRestVertex = vec4(position, 1.0);
    #ifdef USE_BATCHING
      jacarandaRestVertex = batchingMatrix * jacarandaRestVertex;
    #endif
    #ifdef USE_INSTANCING
      jacarandaRestVertex = instanceMatrix * jacarandaRestVertex;
    #endif
    vec3 jacarandaRestPosition = jacarandaRestVertex.xyz;
    vec3 jacarandaBentPosition = jacarandaWindPoint(jacarandaRestPosition, windTreeIndex, uJacarandaWindTime);
  `;
  const windProject = /* glsl */ `
    vec4 mvPosition = modelViewMatrix * vec4(jacarandaBentPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  `;
  const windWorld = /* glsl */ `
    #if defined(USE_ENVMAP) || defined(DISTANCE) || defined(USE_SHADOWMAP) || defined(USE_TRANSMISSION) || NUM_SPOT_LIGHT_COORDS > 0
      vec4 worldPosition = modelMatrix * vec4(jacarandaBentPosition, 1.0);
    #endif
  `;
  const windNormal = THREE.ShaderChunk.defaultnormal_vertex.replace(
    'transformedNormal = normalMatrix * transformedNormal;',
    'transformedNormal = jacarandaWindNormal(jacarandaRestPosition, jacarandaBentPosition, transformedNormal, windTreeIndex, uJacarandaWindTime);\ntransformedNormal = normalMatrix * transformedNormal;',
  );
  function installWind(material) {
    material.onBeforeCompile = shader => {
      shader.uniforms.uJacarandaWindTime = windTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + JACARANDA_WIND_GLSL)
        .replace('#include <batching_vertex>', windStart)
        .replace('#include <defaultnormal_vertex>', windNormal)
        .replace('#include <project_vertex>', windProject)
        .replace('#include <worldpos_vertex>', windWorld);
    };
    material.customProgramCacheKey = () => 'jacaranda-continuous-wind-v1';
    material.userData.jacarandaWind = true;
    material.needsUpdate = true;
    return material;
  }
  for (const material of [barkMaterial, blossomMaterial, leafMaterial]) installWind(material);
  function windShadows(mesh) {
    mesh.customDepthMaterial = installWind(new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking, side: mesh.material.side,
    }));
    mesh.customDistanceMaterial = installWind(new THREE.MeshDistanceMaterial({ side: mesh.material.side }));
    mesh.userData.windTreeIndexAttribute = 'windTreeIndex';
    mesh.userData.windCoordinates = 'After instance transform, before model/world transform';
    // Shader bending must not leave the undeformed CPU culling bounds.
    if (mesh.isInstancedMesh) {
      mesh.computeBoundingSphere(); mesh.boundingSphere.radius += .85;
      mesh.computeBoundingBox(); mesh.boundingBox.expandByScalar(.85);
    } else {
      mesh.geometry.computeBoundingSphere(); mesh.geometry.boundingSphere.radius += .85;
      mesh.geometry.computeBoundingBox(); mesh.geometry.boundingBox.expandByScalar(.85);
    }
  }

  function random(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const curve = pts => new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const mix = (a, b, t) => a + (b - a) * t;

  // A tapered, slightly ridged branch follows a curved centreline. All branches
  // of one tree are combined into one vertex-coloured, shadow-casting mesh.
  function limb(c, r0, r1, colour, rng, sides = 6) {
    branchCount++;
    const steps = Math.max(5, Math.min(20, Math.ceil(c.getLength() * 4)));
    const frames = c.computeFrenetFrames(steps, false);
    const rings = [];
    const positions = [], normals = [], colors = [];
    const twist = rng() * Math.PI * 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = c.getPointAt(t);
      const radius = r1 + (r0 - r1) * Math.pow(1 - t, .85);
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const theta = j / sides * Math.PI * 2 + twist;
        const normal = frames.normals[i].clone().multiplyScalar(Math.cos(theta))
          .addScaledVector(frames.binormals[i], Math.sin(theta));
        const ridge = 1 + .055 * Math.sin(theta * 3 + .7) + .025 * Math.sin(i * 1.6 + j * 2.1);
        const point = p.clone().addScaledVector(normal, radius * ridge);
        const tone = .91 + .15 * (Math.sin(theta * 3 + .5) * .5 + .5) + .03 * Math.sin(i * .9 + j);
        ring.push({ p: point, n: normal, c: colour.clone().multiplyScalar(tone) });
      }
      rings.push(ring);
    }
    function vertex(v) {
      positions.push(v.p.x, v.p.y, v.p.z);
      normals.push(v.n.x, v.n.y, v.n.z);
      colors.push(v.c.r, v.c.g, v.c.b);
    }
    function triangle(a, b, c) {
      const ux = b.p.x - a.p.x, uy = b.p.y - a.p.y, uz = b.p.z - a.p.z;
      const vx = c.p.x - a.p.x, vy = c.p.y - a.p.y, vz = c.p.z - a.p.z;
      const facing = (uy*vz - uz*vy)*(a.n.x+b.n.x+c.n.x)
        + (uz*vx - ux*vz)*(a.n.y+b.n.y+c.n.y)
        + (ux*vy - uy*vx)*(a.n.z+b.n.z+c.n.z);
      vertex(a);
      if (facing < 0) { vertex(c); vertex(b); }
      else { vertex(b); vertex(c); }
    }
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        triangle(rings[i][j], rings[i][k], rings[i+1][j]);
        triangle(rings[i][k], rings[i+1][k], rings[i+1][j]);
      }
    }
    branchData.push({ positions, normals, colors });
  }

  // A softly rounded five-lobed trumpet mouth. Twenty rim points retain a real
  // petal silhouette in the overview, instead of reading as tiny sharp stars.
  function blossomGeometry() {
    const positions = [0, -.27, 0];
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2;
      const scallop = Math.cos(a * 5);
      const r = .82 + scallop * .18;
      positions.push(Math.cos(a) * r, .045 + scallop * .045, Math.sin(a) * r);
    }
    const index = [];
    for (let i = 0; i < 20; i++) index.push(0, 1 + (i + 1) % 20, 1 + i);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(index); g.computeVertexNormals();
    return g;
  }

  function outsideFacade(p) {
    // A margin around the architecture prevents purple clusters piercing walls.
    // The foreground-left tree can still frame the left edge of the balcony.
    return p.y > 8.80 || Math.abs(p.x) > 3.64 || p.z < -3.10 || p.z > 3.28;
  }

  function keepClear(p, treeIndex) {
    const ceiling = treeIndex === 0 ? 5.75 : 11.75;
    if (p.y > ceiling) p.y = ceiling + .27 * Math.tanh((p.y - ceiling) / .27);
    if (p.y < 8.80 && Math.abs(p.x) < 3.66 && p.z > -3.12 && p.z < 3.30) {
      if (treeIndex === 2) p.z = -3.16;
      else p.x = treeIndex === 3 ? 3.70 : -3.70;
    }
    return p;
  }

  function bloomSpray(c, rng, treeIndex, density = 42, width = .18) {
    const count = Math.round(density * (.88 + rng() * .30));
    const localHue = Math.floor(rng() * colours.length);
    // Four overlapping, offset lobes follow the twig. They give each panicle
    // coherent depth and a scalloped edge without using a hidden canopy sphere.
    const lobes = [.22, .45, .69, .89].map((t, i) => ({
      t,
      side: (rng() - .5) * width * .85,
      lift: (rng() - .38) * width * .80,
      fullness: .78 + rng() * .38 - (i === 3 ? .10 : 0),
    }));
    for (let k = 0; k < count; k++) {
      const lobe = lobes[Math.floor(rng() * lobes.length)];
      const t = Math.max(.08, Math.min(.99, lobe.t + (rng() - .5) * .23));
      const point = c.getPointAt(t);
      const tangent = c.getTangentAt(t);
      const side = V(-tangent.z, 0, tangent.x).normalize();
      point.addScaledVector(side, lobe.side);
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng()) * width * lobe.fullness;
      point.x += Math.cos(angle) * radius;
      point.z += Math.sin(angle) * radius;
      point.y += (rng() - .44) * width * 1.90 + lobe.lift;
      if (!outsideFacade(point) || point.y > (treeIndex === 0 ? 6.03 : 12.09)) continue;
      const scale = .075 + rng() * .058;
      const ci = rng() < .84 ? localHue : Math.floor(rng() * colours.length);
      const colour = colours[ci].clone();
      // Upper-facing sprays catch a little more lilac; their undersides retain
      // blue-violet shading through actual normals and scene illumination.
      colour.multiplyScalar(.96 + rng() * .10);
      flowers.push({
        p: point,
        treeIndex,
        r: [rng() * 2.25 - 1.05, rng() * 6.283, rng() * 2.25 - 1.05],
        s: [scale * (.86 + rng() * .3), scale, scale * (.84 + rng() * .32)],
        c: colour,
      });
      if (k === Math.floor(count * .6)) {
        petalSeeds.push(point.clone());
        releaseSites.push({ position: point.clone(), treeIndex, flowerIndex: flowers.length - 1 });
      }
    }
    // Occasional small fernlets keep the crown botanical without making a green
    // summer canopy. Each fern is a paired row of slender, separate leaflets.
    if (rng() < .21) {
      const t = .2 + rng() * .5;
      const base = c.getPointAt(t);
      const az = rng() * 6.283;
      for (let n = 0; n < 6; n++) {
        for (const side of [-1, 1]) {
          const p = base.clone().add(V(Math.cos(az) * n * .045, n * .008, Math.sin(az) * n * .045));
          const a = az + side * .68;
          p.add(V(Math.cos(a) * .043, .015, Math.sin(a) * .043));
          if (outsideFacade(p)) leaves.push({p, a, treeIndex, size: .075 * (1 - n * .08), c: new THREE.Color(0x7c8c79).multiplyScalar(.8 + rng() * .3)});
        }
      }
    }
  }

  function terminalFan(parent, rng, treeIndex, scale, barkColour, fanCount = 6) {
    for (let j = 0; j < fanCount; j++) {
      const t = Math.min(.99, .24 + j / Math.max(1, fanCount - 1) * .70 + rng() * .05);
      const start = parent.getPointAt(t);
      const direction = parent.getTangentAt(Math.min(t, .98));
      const azimuth = Math.atan2(direction.z, direction.x) + (j % 2 ? 1 : -1) * (.43 + rng() * .82);
      const length = (.48 + rng() * .51) * scale * (j === fanCount - 1 ? .82 : 1);
      const lift = -.22 + rng() * .72 + Math.sin(j * 1.7) * .12;
      const end = keepClear(start.clone().add(V(Math.cos(azimuth) * length, lift, Math.sin(azimuth) * length)), treeIndex);
      const mid = keepClear(start.clone().lerp(end, .55).add(V(0, .10 + rng() * .16, 0)), treeIndex);
      const twig = curve([start, mid, end]);
      limb(twig, .013 * scale, .0035, barkColour, rng, 4);
      bloomSpray(twig, rng, treeIndex, 31 * scale, .265 * scale);
    }
    bloomSpray(parent, rng, treeIndex, 23 * scale, .20 * scale);
  }

  const trees = [
    {
      name:'Low, spreading foreground jacaranda', seed:294, origin:[-4.5,0,3.0], radius:.27,
      trunk:[[0,0,0],[-.07,.8,.06],[.13,1.7,-.08],[-.14,2.55,.03],[-.32,3.55,.08],[-.20,4.55,-.02]],
      branches:[
        [.37, 2.95, 1.82, 2.02, -.25], [.46, .70, 1.53, 1.82, .20],
        [.57, -1.85, 1.60, 1.88, -.30], [.64, 2.10, 1.85, 1.49, .12],
        [.73, -.35, 1.28, 1.32, -.20], [.82, 3.25, 1.60, 1.02, .10],
        [.92, 1.25, 1.40, .80, -.20], [.96, -1.50, 1.14, .88, .15],
      ], scale:1.0,
    },
    {
      name:'Leaning rear-left jacaranda', seed:611, origin:[-4.7,0,-2.7], radius:.39,
      trunk:[[0,0,0],[.16,1.2,.03],[.12,2.9,-.10],[-.33,4.8,-.08],[-.27,6.2,.17],[-.62,7.7,.12],[-.42,9.35,-.15]],
      branches:[
        [.25, 2.15, 2.10, 2.62, -.35], [.34, -2.45, 2.30, 2.85, .45],
        [.43, .52, 1.82, 2.18, -.35], [.51, 2.80, 2.12, 1.77, .25],
        [.60, -1.65, 1.92, 1.88, .30], [.68, 1.35, 2.00, 1.48, -.30],
        [.76, -2.80, 2.01, 1.30, -.25], [.83, -.20, 1.70, 1.40, .35],
        [.90, 2.20, 1.62, .98, .15], [.98, -.80, 1.16, .82, -.15],
        [.70, .22, 3.25, 2.35, .38],
      ], scale:1.12,
    },
    {
      name:'Tall, open rear canopy', seed:1038, origin:[.4,0,-4.1], radius:.36,
      trunk:[[0,0,0],[-.10,1.5,-.04],[.23,3.2,-.16],[.48,5,-.04],[.12,6.9,-.26],[.30,8.2,-.14],[-.12,9.3,-.03],[.05,10.65,.16]],
      branches:[
        [.39, -2.75, 2.08, 3.10, -.35], [.47, -.48, 2.16, 2.52, .35],
        [.54, -1.30, 2.02, 2.10, -.25], [.61, 2.15, 2.30, 1.98, .30],
        [.69, .22, 2.14, 1.73, -.35], [.77, -2.75, 2.10, 1.30, .40],
        [.83, -1.0, 1.80, 1.25, .20], [.89, 2.20, 1.65, .95, -.15],
        [.94, .30, 1.42, 1.02, .18], [.99, -1.75, 1.05, .75, -.15],
        [.62, 1.70, 2.34, 2.28, -.38],
      ], scale:1.08,
    },
    {
      name:'Sculptural right-hand jacaranda', seed:1992, origin:[5.0,0,-1.1], radius:.42,
      trunk:[[0,0,0],[-.10,1.2,.08],[.20,2.75,.02],[.13,4.0,-.20],[.48,5.45,-.18],[.29,6.75,.13],[.49,7.85,-.06],[.29,8.85,-.15]],
      branches:[
        [.28, 1.10, 1.80, 2.30, -.22], [.36, -.55, 2.12, 2.55, .35],
        [.46, 2.90, 1.22, 2.20, -.25], [.54, 1.65, 2.01, 1.87, .35],
        [.62, -1.25, 2.15, 1.73, -.30], [.69, .28, 2.10, 1.62, .32],
        [.76, 2.70, 1.72, 1.68, -.25], [.83, -2.00, 1.68, 1.40, .22],
        [.91, .85, 1.50, 1.13, -.15], [.98, -1.0, 1.14, .85, .15],
        [.48, 2.35, 1.65, 2.02, .30],
      ], scale:1.07,
    },
  ];

  const treeStats = [];
  for (let ti = 0; ti < trees.length; ti++) {
    const tree = trees[ti];
    const rng = random(tree.seed);
    const origin = V(...tree.origin);
    const barkColour = barkColours[ti];
    const trunk = curve(tree.trunk.map(p => V(...p).add(origin)));
    const beforeFlowers = flowers.length;
    const beforeBranches = branchCount;
    const dataStart = branchData.length;
    limb(trunk, tree.radius, .025, barkColour, rng, 9);

    // Visible buttress roots ground the tree without a perfectly circular base.
    for (let j = 0; j < 6; j++) {
      const a = j / 6 * 6.283 + rng() * .32;
      const reach = tree.radius * (1.7 + rng() * .8);
      const root = curve([
        origin.clone().add(V(0, .40 + rng() * .22, 0)),
        origin.clone().add(V(Math.cos(a) * reach * .50, .12, Math.sin(a) * reach * .50)),
        origin.clone().add(V(Math.cos(a) * reach, .015, Math.sin(a) * reach)),
      ]);
      limb(root, tree.radius * .42, .018, barkColour, rng, 6);
    }

    tree.branches.forEach(([attach, az, reach, rise, bend], bi) => {
      const start = trunk.getPointAt(attach);
      const radial = V(Math.cos(az), 0, Math.sin(az));
      const lateral = V(-Math.sin(az), 0, Math.cos(az));
      const p1 = keepClear(start.clone().addScaledVector(radial, reach * .19).add(V(0, rise * .36, 0)), ti);
      const p2 = keepClear(start.clone().addScaledVector(radial, reach * .62).addScaledVector(lateral, bend).add(V(0, rise * .78, 0)), ti);
      const end = keepClear(start.clone().addScaledVector(radial, reach).addScaledVector(lateral, bend * .45).add(V(0, rise, 0)), ti);
      const main = curve([start, p1, p2, end]);
      limb(main, tree.radius * (.56 - attach * .31), .014, barkColour, rng, 7);

      // Asymmetric, offset branchlets create sprays and windows of sky, rather
      // than a radial cloud around every endpoint.
      const secondaries = 5 + bi % 3;
      for (let si = 0; si < secondaries; si++) {
        const t = .30 + si / (secondaries - 1) * .70;
        const base = main.getPointAt(t);
        const side = si % 2 ? 1 : -1;
        const sideAz = az + side * (.46 + rng() * .59);
        const length = (.80 + rng() * .66) * tree.scale * (.85 + t * .15);
        const up = -.14 + rng() * .76 + Math.sin(si + bi * .8) * .16;
        const tip = keepClear(base.clone().add(V(Math.cos(sideAz) * length, up, Math.sin(sideAz) * length)), ti);
        const c1 = keepClear(base.clone().lerp(tip, .45).add(V(0, .14 + rng() * .16, 0)), ti);
        const secondary = curve([base, c1, tip]);
        limb(secondary, .026 * tree.scale * (1.1 - t * .3), .005, barkColour, rng, 5);
        terminalFan(secondary, rng, ti, tree.scale, barkColour, 5 + si % 4);
      }
      terminalFan(main, rng, ti, tree.scale * .85, barkColour, 3);
    });

    const data = branchData.slice(dataStart);
    let size = 0;
    for (const b of data) size += b.positions.length;
    const p = new Float32Array(size), n = new Float32Array(size), col = new Float32Array(size);
    let offset = 0;
    for (const b of data) {
      p.set(b.positions, offset); n.set(b.normals, offset); col.set(b.colors, offset);
      offset += b.positions.length;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geometry.setAttribute('windTreeIndex', new THREE.BufferAttribute(new Float32Array(size / 3).fill(ti), 1));
    geometry.computeBoundingSphere();
    const skeleton = new THREE.Mesh(geometry, barkMaterial);
    skeleton.name = tree.name; skeleton.castShadow = true; skeleton.receiveShadow = true;
    windShadows(skeleton);
    group.add(skeleton);
    treeStats.push({ name: tree.name, branches: branchCount - beforeBranches, blooms: flowers.length - beforeFlowers, branchTriangles: size / 9 });
  }

  const blossomMesh = new THREE.InstancedMesh(blossomGeometry(), blossomMaterial, flowers.length);
  blossomMesh.geometry.setAttribute('windTreeIndex', new THREE.InstancedBufferAttribute(new Float32Array(flowers.map(f => f.treeIndex)), 1));
  blossomMesh.name = 'Individual jacaranda blooms on layered twig sprays';
  flowers.forEach((f, i) => {
    dummy.position.copy(f.p);
    dummy.rotation.set(...f.r);
    dummy.scale.set(...f.s);
    dummy.updateMatrix();
    blossomMesh.setMatrixAt(i, dummy.matrix);
    blossomMesh.setColorAt(i, f.c);
  });
  blossomMesh.instanceMatrix.needsUpdate = true;
  blossomMesh.instanceColor.needsUpdate = true;
  blossomMesh.castShadow = true;
  blossomMesh.receiveShadow = true;
  blossomMesh.computeBoundingSphere();
  windShadows(blossomMesh);
  group.add(blossomMesh);

  const leafGeometry = new THREE.BufferGeometry();
  leafGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-.5,0,0, 0,.07,-.19, .5,0,0, 0,.07,.19], 3));
  leafGeometry.setIndex([0,2,1,0,3,2]); leafGeometry.computeVertexNormals();
  const leafMesh = new THREE.InstancedMesh(leafGeometry, leafMaterial, leaves.length);
  leafMesh.geometry.setAttribute('windTreeIndex', new THREE.InstancedBufferAttribute(new Float32Array(leaves.map(l => l.treeIndex)), 1));
  leafMesh.name = 'Occasional fine fern leaves';
  leaves.forEach((l,i) => {
    dummy.position.copy(l.p); dummy.rotation.set(0,-l.a,0); dummy.scale.setScalar(l.size);
    dummy.updateMatrix(); leafMesh.setMatrixAt(i,dummy.matrix); leafMesh.setColorAt(i,l.c);
  });
  leafMesh.instanceMatrix.needsUpdate = true;
  if(leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;
  leafMesh.castShadow = true; leafMesh.receiveShadow = true;
  windShadows(leafMesh);
  group.add(leafMesh);

  return {
    group,
    materials: [barkMaterial, blossomMaterial, leafMaterial],
    canopyMaterials: [blossomMaterial],
    petalSeeds,
    releaseSites,
    updateWind(time) { if (Number.isFinite(time)) windTime.value = time; },
    sampleWindPoint(restPoint, treeIndex, time, out = new THREE.Vector3()) {
      return sampleTreeWindPoint(restPoint, treeIndex, time, out);
    },
    sampleWindNormal(restPoint, normal, treeIndex, time, out = new THREE.Vector3()) {
      return sampleTreeWindNormal(restPoint, normal, treeIndex, time, out);
    },
    stats: {
      trees: trees.length, branches: branchCount, blooms: flowers.length,
      fernLeaflets: leaves.length, drawCalls: 6, treeDetails: treeStats,
      wind: {
        mode: 'GPU continuous tree deformation', timeUnit: 'seconds',
        coordinateSpace: 'vegetation local, after instance transform',
        releaseSites: releaseSites.length, treeProfiles: TREE_WIND_PROFILES,
        mainFrequency: .70, outerBranchFrequency: 1.80,
        normalJacobianStep: .018, cullingMargin: .85,
        depthAndDistanceMaterials: true,
      },
    },
  };
}
