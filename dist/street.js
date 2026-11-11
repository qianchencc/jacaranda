import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

export function createStreet(THREE) {
  const group = new THREE.Group();
  group.name = 'The little street';
  const buckets = new Map();
  const mat = (color, extra={}) => new THREE.MeshStandardMaterial({color,roughness:.92,...extra});
  const stone = mat('#b9aeb0'), edge=mat('#9c9390'), base=mat('#302e39'), asphalt=mat('#44414e'), iron=mat('#4f4b52',{metalness:.45,roughness:.65});
  const lavender=mat('#8c6aa0'), lavenderLight=mat('#a181b0'), roadInk=mat('#c4bcb7');
  const terracotta=mat('#aa8c78'), soil=mat('#75645d'), green=mat('#788374');
  const dummy = new THREE.Object3D();
  function queue(geo, material, x=0,y=0,z=0, rx=0,ry=0,rz=0) {
    const g=geo.clone(); const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.updateMatrix();g.applyMatrix4(o.matrix);
    if(!buckets.has(material)) buckets.set(material,[]);buckets.get(material).push(g);return g;
  }
  const box=(x,y,z,w,h,d,m)=>queue(new THREE.BoxGeometry(w,h,d),m,x,y,z);
  function rounded(w,d,h,r,m,x,y,z){
    const s=new THREE.Shape();let a=-w/2,b=-d/2;s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+d-r);s.quadraticCurveTo(a+w,b+d,a+w-r,b+d);s.lineTo(a+r,b+d);s.quadraticCurveTo(a,b+d,a,b+d-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
    const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:16});g.rotateX(-Math.PI/2);queue(g,m,x,y,z);
  }
  function rod(a,b,r,m){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),g=new THREE.CylinderGeometry(r,r,p.distanceTo(q),8);const o=new THREE.Object3D();o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.clone().sub(p).normalize());o.updateMatrix();g.applyMatrix4(o.matrix);if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(g);}
  function curve(points,r,m){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));queue(new THREE.TubeGeometry(c,24,r,7,false),m);}
  // The raised, cut-out city block, with two readable street edges.
  rounded(15.7,13.9,.34,.32,base,0,-.43,0);
  rounded(15.54,13.74,.13,.28,asphalt,0,-.09,0);
  rounded(13.55,11.83,.38,.30,edge,-.43,.04,-.43);
  rounded(13.5,11.78,.035,.28,stone,-.43,.42,-.43);
  // Fine, slightly irregular stone paving is generated locally, without external assets.
  const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');ctx.fillStyle='#c7bcb2';ctx.fillRect(0,0,1024,1024);
  let rand=7919;const rng=()=>{rand=(rand*1664525+1013904223)>>>0;return rand/4294967296};
  for(let j=0;j<16;j++)for(let i=0;i<16;i++){const v=Math.floor(rng()*10)-5;ctx.fillStyle=`rgb(${200+v},${190+v},${180+v})`;ctx.fillRect(i*64+(j%2?32:0),j*64,63,63);ctx.strokeStyle='rgba(105,91,88,.12)';ctx.lineWidth=1.3;ctx.strokeRect(i*64+(j%2?32:0),j*64,64,64);}
  for(let i=0;i<19000;i++){ctx.fillStyle=rng()>.5?'rgba(255,255,255,.14)':'rgba(72,54,62,.055)';ctx.fillRect(rng()*1024,rng()*1024,1+rng(),1+rng());}
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.55,1.35);texture.anisotropy=8;
  const pavement=new THREE.MeshStandardMaterial({map:texture,roughness:1});
  rounded(13.48,11.76,.006,.28,pavement,-.43,.456,-.43);
  for(let x=-7.0;x<7.0;x+=1.8)box(x,.051,6.35,.79,.007,.045,roadInk);
  for(let z=-5.5;z<5.8;z+=1.8)box(7.2,.051,z,.045,.007,.79,roadInk);
  // Soft curb divisions and a recessed line along the road.
  for(let x=-6.9;x<6.3;x+=.55)box(x,.43,5.475,.012,.025,.20,edge);
  for(let z=-5.9;z<5.5;z+=.55)box(6.33,.43,z,.20,.025,.012,edge);
  box(-.43,.061,5.68,13.3,.01,.055,edge);box(6.56,.061,-.4,.055,.01,11.8,edge);
  for(const [x,z] of [[5.95,4.8],[-6.4,4.8]]){
    box(x,.465,z,.34,.012,.55,iron);for(let k=-2;k<=2;k++)box(x+k*.056,.476,z,.018,.003,.45,asphalt);
  }
  // Purple slatted bench; its open back keeps the ground-floor doors visible.
  const bench = new THREE.Group();bench.name='Violet bench';
  function benchBox(x,y,z,w,h,d,m,rx=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.rotation.x=rx;bench.add(mesh);mesh.castShadow=mesh.receiveShadow=true;}
  for(let j=0;j<5;j++)benchBox(0,.63,-.30+j*.14,2.25,.075,.105,j%2?lavender:lavenderLight);
  for(let j=0;j<4;j++)benchBox(0,.86+j*.165,-.38-j*.018,2.25,.12,.065,j%2?lavenderLight:lavender,-.105);
  for(const x of [-.83,.83]){
    benchBox(x,.37,-.22,.065,.65,.07,iron);benchBox(x,.34,.25,.065,.59,.07,iron);benchBox(x,.70,-.37,.055,1.45,.06,iron,-.10);benchBox(x,.55,0,.065,.07,.7,iron);benchBox(x,.95,.04,.065,.055,.68,iron);benchBox(x,.78,.33,.045,.34,.05,iron);
  }
  bench.position.set(-.82,.47,3.67);bench.rotation.y=.03;group.add(bench);
  // Quiet details: a small planter, fern fronds and a bicycle at the side wall.
  for(const [x,z,r,h] of [[3.9,1.25,.23,.43]]){
    queue(new THREE.CylinderGeometry(r,r*.74,h,16),terracotta,x,.47+h/2,z);queue(new THREE.CylinderGeometry(r*.88,r*.88,.035,16),soil,x,.47+h,z);
    for(let i=0;i<11;i++){const a=i*2.4;const height=.4+rng()*.45;const start=[x,.47+h,z],tip=[x+Math.cos(a)*.34,.47+h+height,z+Math.sin(a)*.34];curve([start,[x+Math.cos(a)*.18,.47+h+height*.8,z+Math.sin(a)*.18],tip],.012,green);for(let k=1;k<=5;k++){const t=k/6,px=x+(tip[0]-x)*t,pz=z+(tip[2]-z)*t,py=.47+h+height*(t+.25*Math.sin(t*Math.PI));queue(new THREE.SphereGeometry(.055,4,3),green,px+.07,py,pz,0,0,.3);queue(new THREE.SphereGeometry(.055,4,3),green,px-.07,py,pz,0,0,-.3);}}
  }
  const bikeColor=mat('#859095',{metalness:.28});const tire=mat('#5d5759'), spoke=mat('#b8b2ab',{metalness:.7});
  const bx=3.48,bz=-.40;
  for(const z of [bz-.65,bz+.65]){
    queue(new THREE.TorusGeometry(.43,.027,6,32),tire,bx,.93,z,0,Math.PI/2,0);
    for(let i=0;i<10;i++){const a=i*Math.PI*2/10;rod([bx,.93,z],[bx,.93+Math.cos(a)*.4,z+Math.sin(a)*.4],.006,spoke);}
  }
  const ba=[bx,.93,bz-.65],bb=[bx,1.59,bz-.29],bc=[bx,1.02,bz],bd=[bx,1.63,bz+.45],be=[bx,.93,bz+.65];
  for(const [a,b] of [[ba,bb],[bb,bc],[bc,ba],[bb,bd],[bc,bd],[bd,be],[bc,be]])rod(a,b,.025,bikeColor);
  rod([bx,1.63,bz+.45],[bx,1.82,bz+.41],.022,iron);rod([bx-.18,1.82,bz+.41],[bx+.18,1.82,bz+.41],.02,iron);box(bx,1.63,bz-.3,.18,.055,.3,tire);
  // Tall, warm shaded street lamps. Cone shades physically cut light into local pools.
  const lampMaterials=[],lights=[],glowMeshes=[];
  const glowTexture=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const cx=cv.getContext('2d');const gr=cx.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,216,143,.35)');gr.addColorStop(.28,'rgba(255,205,121,.12)');gr.addColorStop(1,'rgba(255,205,121,0)');cx.fillStyle=gr;cx.fillRect(0,0,128,128);return new THREE.CanvasTexture(cv)})();
  const lampPositions=[[-3.55,4.48,3.80],[5.45,4.95,2.7],[-5.8,4.75,-2.35]];
  for(const [x,h,z] of lampPositions){
    queue(new THREE.CylinderGeometry(.065,.10,h,10),iron,x,.47+h/2,z);queue(new THREE.CylinderGeometry(.15,.21,.24,12),iron,x,.59,z);
    const endX=x+(x>0?-.53:.53);
    curve([[x,h+.4,z],[x,h+.7,z],[endX,h+.7,z],[endX,h+.46,z]],.048,iron);
    queue(new THREE.ConeGeometry(.27,.17,16,1,true),iron,endX,h+.39,z);
    const luminous=new THREE.MeshStandardMaterial({color:'#ffe5b8',emissive:'#ffc87a',emissiveIntensity:.15,roughness:.4});lampMaterials.push(luminous);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),luminous);bulb.position.set(endX,h+.30,z);group.add(bulb);
    const light=new THREE.SpotLight('#ffcc8c',0,9,Math.PI*.19,.65,1.8);light.position.copy(bulb.position);light.target.position.set(endX,.45,z);group.add(light,light.target);light.userData.maxPower=72;light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.bias=-.0004;light.shadow.normalBias=.03;lights.push(light);
    const fill=new THREE.PointLight('#ffcb8b',0,4.0,2);fill.position.set(endX,h+.15,z);fill.userData.maxPower=8;group.add(fill);lights.push(fill);
    const haloMat=new THREE.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false,opacity:0,color:'#ffe4b5',blending:THREE.AdditiveBlending});
    const halo=new THREE.Sprite(haloMat);halo.position.copy(bulb.position);halo.scale.set(1.1,1.1,1);group.add(halo);glowMeshes.push(halo);
  }
  // A gentle carpet of fallen petals collects under each tree and at the curb.
  const petalGeo=new THREE.SphereGeometry(1,5,3);petalGeo.scale(.060,.009,.038);
  const petalMat=new THREE.MeshStandardMaterial({color:'#d2bce2',roughness:1});
  const scatter=[];const centers=[[-4.5,3],[-4.7,-2.7],[.4,-4.1],[5,-1.1]];
  for(let i=0;i<3600;i++){const center=centers[i%4],a=rng()*Math.PI*2,r=Math.sqrt(rng())*2.5;const curb=i%6===0;const x=curb?-6.6+rng()*12.5:center[0]+Math.cos(a)*r,z=curb?4.65+rng()*.68:center[1]+Math.sin(a)*r;if(x < -7.0||x>6.27||z< -6.15||z>5.4)continue;if(Math.abs(x)<3.15&&Math.abs(z)<2.6)continue;scatter.push([x,z,rng()]);}
  const petalMesh=new THREE.InstancedMesh(petalGeo,petalMat,scatter.length);scatter.forEach(([x,z,r],i)=>{dummy.position.set(x,.474+r*.005,z);dummy.rotation.set(0,r*19,.02);dummy.scale.setScalar(.5+r*1.2);dummy.updateMatrix();petalMesh.setMatrixAt(i,dummy.matrix);petalMesh.setColorAt(i,new THREE.Color().setHSL(.72+r*.035,.25,.58+r*.19));});petalMesh.receiveShadow=true;group.add(petalMesh);
  // Baked, unobtrusive contact shading holds the objects to the paving.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d');const sg=sc.createRadialGradient(64,64,0,64,64,64);sg.addColorStop(0,'rgba(50,35,46,.32)');sg.addColorStop(.5,'rgba(50,35,46,.15)');sg.addColorStop(1,'rgba(50,35,46,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,128);const sm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
  for(const [x,z,sx,sz] of [[0,0,8.2,7.2],[-.82,3.65,3.7,1.7],...centers.map(p=>[...p,1.8,1.8])]){const m=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),sm);m.rotation.x=-Math.PI/2;m.position.set(x,.479,z);group.add(m);}
  for(const [material,geometries] of buckets){const mesh=new THREE.Mesh(mergeGeometries(geometries.map(g=>g.index?g.toNonIndexed():g),false),material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);geometries.forEach(g=>g.dispose());}
  return {group,bench,lights,lampMaterials,glowMeshes};
}
