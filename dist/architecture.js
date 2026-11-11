/** A fictional Sydney bookshop. Metres, Y up, front +Z; all architectural depth is geometry. */
export function createArchitecture(THREE) {
  const group = new THREE.Group(); group.name = 'Jacaranda House — the corner bookshop';
  const windowMaterials=[], lampMaterials=[], lights=[], doors=[], interiorLights=[], interiorMaterials=[];
  const interactiveMeshes=[], journalMaterials=[], journalCovers=[];
  const buckets=new Map(); const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const standard=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.86,...extra});
  const stone=standard(0xe5d9c1),plaster=standard(0xf2e6ce),trim=standard(0xf8efdc);
  const recess=standard(0x827d70),iron=standard(0x55534f,{metalness:.30,roughness:.65});
  const verandaIron=standard(0xd5d0ba,{metalness:.17,roughness:.65});
  const roof=standard(0x6f6b65),canopy=standard(0x5d5b56,{metalness:.25,roughness:.73,side:THREE.DoubleSide});
  const roofRibs=standard(0x77726a,{metalness:.20,roughness:.72});
  const doorPaint=standard(0xe8ddc5),brass=standard(0xa88c60,{metalness:.55,roughness:.45});
  const leaf=standard(0x758169),leafLight=standard(0x9caa87),pot=standard(0x9f856c);
  const paper=standard(0xeadbc0),wood=standard(0x998069),bookMauve=standard(0x998293),bookSage=standard(0x879384);
  const glassColors=[0x99a297,0x8f9b94,0xa1a695,0x7f8c86],glowScales=[1.05,.85,.55,.36];
  const glazing=glassColors.map((color,i)=>{const m=standard(color,{emissive:0xffd69a,emissiveIntensity:.04*glowScales[i],roughness:.42,metalness:.04});m.userData.glowScale=glowScales[i];windowMaterials.push(m);return m;});
  const bulb=standard(0xffebc0,{emissive:0xffce86,emissiveIntensity:.12,roughness:.45});lampMaterials.push(bulb);
  const interiorWall=standard(0xcdb799,{emissive:0x9e7143,emissiveIntensity:.045});interiorWall.userData.glowScale=.10;interiorMaterials.push(interiorWall);
  const interiorBulb=standard(0xffe7b8,{emissive:0xffc77a,emissiveIntensity:.35});interiorBulb.userData.glowScale=1;interiorMaterials.push(interiorBulb);
  const matrix=new THREE.Matrix4(),quat=new THREE.Quaternion(),unit=V(1,1,1);
  function add(g,m,p=V(0,0,0),rotation=null,scale=unit,target=buckets){
    quat.identity();if(rotation)quat.setFromEuler(new THREE.Euler(...rotation));matrix.compose(p,quat,scale);g.applyMatrix4(matrix);
    if(!target.has(m))target.set(m,[]);target.get(m).push(g);
  }
  function box(w,h,d,m,x,y,z,ry=0,target=buckets){add(new THREE.BoxGeometry(w,h,d),m,V(x,y,z),[0,ry,0],unit,target);}
  function rod(a,b,r,m,rTop=r,segments=7){
    const g=new THREE.CylinderGeometry(rTop,r,a.distanceTo(b),segments,1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize()));
    g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);add(g,m);
  }
  function tube(points,r,m,steps=30){add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),steps,r,6,false),m);}
  const corners=[[1.5,.95,1.55,0],[-2.65,2.10,.4,Math.PI/2],[-2.65,-2.10,.4,Math.PI],[2.65,-2.10,.4,Math.PI*1.5]];
  function arc(cx,cz,r,start,end,n){const p=[];for(let i=0;i<=n;i++){const a=start+(end-start)*i/n;p.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]);}return p;}
  function perimeter(expand=0){return corners.flatMap(([x,z,r,a])=>arc(x,z,r+expand,a,a+Math.PI/2,r>1?32:8));}
  const gapHalfAngle=Math.asin(.74/1.55),gapLow=Math.PI/4-gapHalfAngle,gapHigh=Math.PI/4+gapHalfAngle;
  function openPerimeter(expand=0){
    return [...arc(1.5,.95,1.55+expand,gapHigh,Math.PI/2,10),
      ...corners.slice(1).flatMap(([x,z,r,a])=>arc(x,z,r+expand,a,a+Math.PI/2,8)),
      ...arc(1.5,.95,1.55+expand,0,gapLow,10)];
  }
  function shape(points,holes=[]){
    const s=new THREE.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();
    for(const h of holes){const p=new THREE.Path();h.forEach(([x,z],i)=>i?p.lineTo(x,-z):p.moveTo(x,-z));p.closePath();s.holes.push(p);}return s;
  }
  function slab(points,y,height,m,bevel=0,holes=[]){const g=new THREE.ExtrudeGeometry(shape(points,holes),{depth:height,bevelEnabled:bevel>0,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel});g.rotateX(-Math.PI/2);g.translate(0,y,0);add(g,m);return g;}
  function groundWall(expand,y,h,m,bevel=0){slab([...openPerimeter(expand),...openPerimeter(-.23).reverse()],y,h,m,bevel);}
  slab(perimeter(.10),0,.18,stone,.025);
  // A real aperture: the ground-floor wall is an open, thick perimeter ribbon.
  // Its missing corner interval is occupied by the hinged entrance, not a solid block.
  groundWall(0,.18,2.25,plaster,.009);
  slab(perimeter(),2.43,5.21,plaster,.018);
  groundWall(.045,.41,.055,stone,.008);
  const awningLedgeGeos=[];
  for(const y of [2.48,5.08,7.60]){
    const lower=slab(perimeter(.055),y,.055,stone,.012);
    const upper=slab(perimeter(.105),y+.07,.08,trim,.015);
    if(y===5.08)awningLedgeGeos.push(lower,upper);
  }
  slab(perimeter(.15),7.76,.13,trim,.02);
  const flatRoofGeo=slab(perimeter(-.12),7.89,.055,roof,.005);

  // The front parapet gently rises over the rounded corner. A dark recessed roof
  // remains below the cap, allowing a calmer, less box-like skyline.
  function parapetHeight(x,z){const d=Math.hypot(x-2.27,z-2.20);return 8.16+.255*Math.exp(-d*d/1.75);}
  function ringBand(outer,inner,bottom,topFn,m){
    const pos=[];
    const tri=(a,b,c)=>pos.push(...a,...b,...c);
    for(let i=0;i<outer.length;i++){
      const j=(i+1)%outer.length,[x,z]=outer[i],[X,Z]=outer[j],[u,v]=inner[i],[U,W]=inner[j];
      const h=topFn(x,z),H=topFn(X,Z),ih=topFn(u,v),iH=topFn(U,W);
      const a=[x,bottom,z],b=[X,bottom,Z],c=[x,h,z],d=[X,H,Z],e=[u,bottom,v],f=[U,bottom,W],g=[u,ih,v],k=[U,iH,W];
      tri(a,c,b);tri(b,c,d);tri(e,f,g);tri(f,k,g);tri(c,g,d);tri(d,g,k);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(pos.length/3*2),2));add(g,m);return g;
  }
  const parapetWallGeo=ringBand(perimeter(.06),perimeter(-.19),7.89,parapetHeight,plaster);
  // The cap is a shaped, shallow strip rather than a rounded pipe.
  const capOuter=perimeter(.12),capInner=perimeter(-.24),capPositions=[];
  for(let i=0;i<capOuter.length;i++){
    const j=(i+1)%capOuter.length;
    const top=p=>[p[0],parapetHeight(p[0],p[1])+.075,p[1]],low=p=>[p[0],parapetHeight(p[0],p[1])-.005,p[1]];
    const a=top(capOuter[i]),b=top(capOuter[j]),c=top(capInner[i]),d=top(capInner[j]);
    const e=low(capOuter[i]),f=low(capOuter[j]);capPositions.push(...a,...c,...b,...b,...c,...d,...e,...a,...f,...f,...a,...b);
  }
  const capGeo=new THREE.BufferGeometry();capGeo.setAttribute('position',new THREE.Float32BufferAttribute(capPositions,3));capGeo.computeVertexNormals();capGeo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(capPositions.length/3*2),2));add(capGeo,trim);
  box(.60,.62,.58,stone,-1.75,8.20,-1.45);box(.73,.085,.70,trim,-1.75,8.55,-1.45);box(.45,.018,.44,recess,-1.75,8.60,-1.45);
  for(const y of [8.03,8.18,8.33,8.47])box(.61,.012,.59,stone,-1.75,y,-1.45);

  function localBox(w,h,d,m,x,y,z,a,u,v,out){const co=Math.cos(a),si=Math.sin(a);box(w,h,d,m,x+u*co+out*si,y+v,z-u*si+out*co,a);}
  let windowCount=0;
  function windowAt(x,z,a,bottom,height=1.65,width=.8,variant=0,calm=false){
    windowCount++;const y=bottom+height/2,pane=glazing[variant%glazing.length];
    localBox(width+.16,height+.14,.07,recess,x,y,z,a,0,0,.04);
    localBox(width,height,.045,pane,x,y,z,a,0,0,.092);
    const fw=calm?.052:.065;
    for(const u of [-width/2,width/2])localBox(fw,height+.08,.075,trim,x,y,z,a,u,0,.13);
    for(const v of [-height/2,height/2])localBox(width+.09,fw,.075,trim,x,y,z,a,0,v,.13);
    localBox(.032,height,.046,trim,x,y,z,a,0,0,.15);localBox(width,.040,.05,trim,x,y,z,a,0,.02,.15);
    localBox(width,.023,.03,trim,x,y,z,a,0,height*.28,.15);
    localBox(width+.22,.065,.20,trim,x,y,z,a,0,-height/2-.06,.13);
    localBox(width+.14,.08,.10,trim,x,y,z,a,0,height/2+.075,.09);
    if(!calm)localBox(width+.20,.025,.14,stone,x,y,z,a,0,height/2+.13,.09);
  }
  for(let floor=0;floor<3;floor++){
    const bottom=floor===0?.50:floor===1?3.05:5.62,h=floor===0?1.48:floor===1?1.78:1.68;
    if(floor>0)[-2.08,-.62,.82].forEach((x,i)=>windowAt(x,2.5,0,bottom,h,.77,floor===2?(i%2?3:2):i+1,floor===2));
    else windowAt(.82,2.5,0,bottom,h,.77,0);
    [-1.65,-.23].forEach((z,i)=>windowAt(3.05,z,Math.PI/2,bottom,h,.79,floor===2?i+2:i+1,floor===2));
    [-1.55,.05,1.55].forEach((z,i)=>windowAt(-3.05,z,-Math.PI/2,bottom,h,.78,i+floor,floor===2));
    [-2.03,-.04,1.95].forEach((x,i)=>windowAt(x,-2.5,Math.PI,bottom,h,.79,i+floor+1,floor===2));
    if(floor>0)windowAt(2.596,2.046,Math.PI/4,bottom,h,.87,floor===2?2:0,floor===2);
  }
  // A little ground-floor articulation; the two upper floors remain unstriped.
  for(const [x,z,a] of [[-2.72,2.5,0],[3.05,-2.05,Math.PI/2]]){
    localBox(.13,2.1,.08,trim,x,1.35,z,a,0,0,.055);localBox(.22,.09,.13,stone,x,2.37,z,a,0,0,.08);
  }

  // Door plane is the true chord of the curved opening. The interior is a small
  // constructed alcove with floor, ceiling, side walls, shelves and an end wall.
  const chord=Math.sqrt(1.55*1.55-.74*.74),entryX=1.5+chord/Math.SQRT2,entryZ=.95+chord/Math.SQRT2,ea=Math.PI/4;
  const entryRoot=new THREE.Group();entryRoot.name='Entrance and hinged door leaves';entryRoot.position.set(entryX,0,entryZ);entryRoot.rotation.y=ea;group.add(entryRoot);
  const entryPoint=(x,y,z)=>V(entryX+x*Math.cos(ea)+z*Math.sin(ea),y,entryZ-x*Math.sin(ea)+z*Math.cos(ea));
  const entryBox=(w,h,d,m,x,y,z)=>localBox(w,h,d,m,entryX,y,entryZ,ea,x,0,z);
  for(const x of [-.68,.68])entryBox(.13,2.19,.24,trim,x,1.275,.015);
  entryBox(1.49,.15,.27,trim,0,2.355,.015);entryBox(1.57,.055,.31,stone,0,2.45,.015);
  entryBox(1.65,.11,.65,stone,0,.085,.25);entryBox(1.45,.065,.43,trim,0,.185,.17);
  entryBox(1.45,.055,1.90,wood,0,.185,-.91);
  entryBox(.10,2.12,1.86,interiorWall,-.765,1.28,-.92);entryBox(.10,2.12,1.86,interiorWall,.765,1.28,-.92);
  entryBox(1.62,2.12,.12,interiorWall,0,1.28,-1.82);entryBox(1.62,.08,1.90,interiorWall,0,2.38,-.91);
  for(let i=0;i<9;i++)entryBox(.012,.004,1.82,stone,-.66+i*.165,.216,-.91);
  for(const y of [.55,1.10,1.66]){
    entryBox(1.27,.055,.24,wood,0,y,-1.61);
    for(let i=0;i<9;i++){
      const bookH=.22+(i%4)*.045,x=-.54+i*.13;
      entryBox(.085,bookH,.15,[paper,bookMauve,bookSage,stone][i%4],x,y+.035+bookH/2,-1.59);
      entryBox(.061,.010,.006,trim,x,y+bookH*.7,-1.508);
    }
  }
  entryBox(.36,.045,.25,interiorBulb,0,2.31,-.74);
  const inside=new THREE.PointLight(0xffd398,.45,3.0,2);inside.position.copy(entryPoint(0,1.92,-.62));inside.userData.dayIntensity=.45;inside.userData.nightIntensity=3.8;interiorLights.push(inside);group.add(inside);
  let dynamicDrawCalls=0,dynamicTriangles=0;
  function bake(map,parent,name='Architectural details'){
    let triangles=0,calls=0;
    for(const [material,geometries] of map){
      let count=0;const flat=geometries.map(g=>{const n=g.index?g.toNonIndexed():g;count+=n.attributes.position.count;return n;});
      const p=new Float32Array(count*3),n=new Float32Array(count*3),uv=new Float32Array(count*2);let po=0,uo=0;
      for(const g of flat){const len=g.attributes.position.count;p.set(g.attributes.position.array,po);n.set(g.attributes.normal.array,po);if(g.attributes.uv)uv.set(g.attributes.uv.array,uo);po+=len*3;uo+=len*2;}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('normal',new THREE.BufferAttribute(n,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.computeBoundingSphere();
      const mesh=new THREE.Mesh(g,material);mesh.name=name;mesh.castShadow=material!==bulb&&material!==interiorBulb;mesh.receiveShadow=true;parent.add(mesh);calls++;triangles+=count/3;
      for(const g of new Set([...flat,...geometries]))g.dispose();
    }
    return {calls,triangles};
  }
  for(const side of [-1,1]){
    const pivot=new THREE.Group();pivot.name=side<0?'Left entrance leaf':'Right entrance leaf';pivot.position.set(side*.605,.22,.035);entryRoot.add(pivot);
    const toward=-side,leafW=.597,leafH=2.06,cx=toward*leafW/2,parts=new Map();
    const b=(w,h,d,m,x,y,z)=>box(w,h,d,m,x,y,z,0,parts);
    for(const x of [toward*.032,toward*(leafW-.032)])b(.064,leafH,.078,doorPaint,x,leafH/2,0);
    b(leafW,.075,.082,trim,cx,.038,.005);b(leafW,.075,.082,trim,cx,leafH-.038,.005);b(leafW,.105,.082,trim,cx,.79,.005);
    b(leafW-.10,.61,.045,stone,cx,.39,0);b(leafW-.17,.51,.035,doorPaint,cx,.39,.032);
    b(leafW-.115,1.10,.026,glazing[0],cx,1.41,0);
    for(const x of [toward*.066,toward*(leafW-.066)])b(.027,1.15,.05,trim,x,1.41,.025);
    for(const y of [.845,1.975])b(leafW-.10,.028,.05,trim,cx,y,.025);
    b(.023,.18,.065,brass,toward*(leafW-.083),.98,.075);
    for(const y of [.29,1.72])b(.029,.11,.042,brass,0,y,.025);
    const baked=bake(parts,pivot,pivot.name);dynamicDrawCalls+=baked.calls;dynamicTriangles+=baked.triangles;
    doors.push({pivot,closedAngle:0,openAngle:side<0?1.25:-1.25});
  }

  function balconyLine(expand){
    const p=[V(-2.67,0,2.5+expand),V(1.5,0,2.5+expand)];
    for(let i=1;i<=32;i++){const a=Math.PI/2-i/32*Math.PI/2;p.push(V(1.5+Math.cos(a)*(1.55+expand),0,.95+Math.sin(a)*(1.55+expand)));}
    p.push(V(3.05+expand,0,-1.97));return p;
  }
  function pathLength(points){let d=0;for(let i=1;i<points.length;i++)d+=points[i].distanceTo(points[i-1]);return d;}
  function along(points,d){for(let i=1;i<points.length;i++){const delta=points[i].clone().sub(points[i-1]),len=delta.length();if(d<=len)return {point:points[i-1].clone().addScaledVector(delta,d/len),tangent:delta.normalize()};d-=len;}return {point:points.at(-1).clone(),tangent:points.at(-1).clone().sub(points.at(-2)).normalize()};}
  function scrollAt(p,tangent,y,size=.10,flip=1){const points=[];for(let j=0;j<=18;j++){const a=j/18*Math.PI*2.9,r=size*(1-j/22);points.push(p.clone().addScaledVector(tangent,Math.cos(a)*r*flip).add(V(0,y+Math.sin(a)*r*1.40,0)));}tube(points,.010,verandaIron,20);}
  const floorY=2.65,rail=balconyLine(.60),railLength=pathLength(rail);
  const verandaDeckPoints=[...balconyLine(.69),...balconyLine(.015).reverse()].map(p=>[p.x,p.z]);
  const verandaDeckGeo=slab(verandaDeckPoints,floorY-.095,.14,trim,.018);
  tube(balconyLine(.70).map(p=>p.add(V(0,floorY-.065,0))),.027,canopy,112);
  for(const h of [.09,.80,.98])tube(rail.map(p=>p.clone().add(V(0,floorY+h,0))),h===.98?.027:.017,verandaIron,110);
  const railCount=Math.ceil(railLength/.245);
  for(let i=0;i<=railCount;i++){
    const {point,tangent}=along(rail,railLength*i/railCount);
    rod(point.clone().add(V(0,floorY+.07,0)),point.clone().add(V(0,floorY+.99,0)),i%5===0?.023:.012,verandaIron);
    if(i%5!==0){scrollAt(point,tangent,floorY+.34,.088,1);scrollAt(point,tangent,floorY+.62,.088,-1);}
  }
  for(const p of [rail[0],rail.at(-1)]){const inward=p===rail[0]?V(0,0,-.60):V(-.60,0,0);for(const h of [.09,.98])rod(p.clone().add(V(0,floorY+h,0)),p.clone().add(inward).add(V(0,floorY+h,0)),.020,verandaIron);}
  for(const d of [0,2.32,4.62,6.77,8.67,railLength]){
    const {point,tangent}=along(rail,d);rod(point.clone().add(V(0,floorY+.04,0)),point.clone().add(V(0,4.99,0)),.027,verandaIron);
    for(const direction of [-1,1]){
      tube([point.clone().add(V(0,4.54,0)),point.clone().addScaledVector(tangent,.12*direction).add(V(0,4.72,0)),point.clone().addScaledVector(tangent,.38*direction).add(V(0,4.91,0))],.017,verandaIron,17);
      scrollAt(point.clone().addScaledVector(tangent,.18*direction),tangent,4.80,.14,direction);
    }
  }
  for(let d=.6;d<railLength;d+=1.55){const {point,tangent}=along(rail,d),inward=V(tangent.z,0,-tangent.x).multiplyScalar(.46);tube([point.clone().add(V(0,floorY-.10,0)),point.clone().addScaledVector(inward,.4).add(V(0,floorY-.25,0)),point.clone().add(inward).add(V(0,floorY-.42,0))],.023,verandaIron,12);}

  // One shallow corrugated veranda roof. Ribs run down the slope, then fan around
  // the corner; they are narrow physical strips, not an oversized striped texture.
  const outerRoof=balconyLine(.79),innerRoof=balconyLine(.005),roofPositions=[];
  for(let i=1;i<outerRoof.length;i++){
    const p=outerRoof[i-1],q=outerRoof[i],r=innerRoof[i-1],s=innerRoof[i];
    roofPositions.push(p.x,4.96,p.z,q.x,4.96,q.z,r.x,5.17,r.z,q.x,4.96,q.z,s.x,5.17,s.z,r.x,5.17,r.z);
  }
  const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(roofPositions,3));roofGeo.computeVertexNormals();roofGeo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(roofPositions.length/3*2),2));add(roofGeo,canopy);
  tube(outerRoof.map(p=>p.clone().add(V(0,4.96,0))),.030,canopy,115);
  tube(innerRoof.map(p=>p.clone().add(V(0,5.17,0))),.018,roofRibs,110);
  for(let x=-2.67;x<1.5;x+=.075)rod(V(x,5.175,2.505),V(x,4.971,3.29),.0085,roofRibs,.0085,5);
  for(let z=-1.97;z<.95;z+=.075)rod(V(3.055,5.175,z),V(3.84,4.971,z),.0085,roofRibs,.0085,5);
  for(let a=0;a<=Math.PI/2;a+=.033){const co=Math.cos(a),si=Math.sin(a);rod(V(1.5+co*1.555,5.175,.95+si*1.555),V(1.5+co*2.34,4.971,.95+si*2.34),.0085,roofRibs,.0085,5);}

  // Small black wall lanterns and three pendant lights warm the sheltered veranda.
  function lantern(x,y,z,a){
    const n=V(Math.sin(a),0,Math.cos(a)),t=V(Math.cos(a),0,-Math.sin(a)),anchor=V(x,y,z),c=anchor.clone().addScaledVector(n,.29);
    localBox(.10,.27,.065,iron,x,y,z,a,0,0,.065);rod(anchor.clone().add(V(0,.10,0)),c.clone().add(V(0,.20,0)),.021,iron);
    add(new THREE.ConeGeometry(.14,.105,10),iron,c.clone().add(V(0,.17,0)));add(new THREE.CylinderGeometry(.10,.10,.035,10),iron,c.clone().add(V(0,-.12,0)));
    for(const aa of [-1,1])for(const bb of [-1,1]){const p=c.clone().addScaledVector(t,aa*.063).addScaledVector(n,bb*.063);rod(p.clone().add(V(0,-.11,0)),p.clone().add(V(0,.13,0)),.008,iron);}
    add(new THREE.SphereGeometry(.060,9,7),bulb,c,null,V(.8,1.5,.8));
    const light=new THREE.PointLight(0xffd5a1,0,3.7,2);light.position.copy(c.clone().addScaledVector(n,.12));light.userData.nightIntensity=4.0;lights.push(light);group.add(light);
  }
  lantern(1.38,2.04,2.5,0);lantern(3.05,2.04,.66,Math.PI/2);lantern(-1.34,2.05,2.5,0);
  for(const d of [2.15,5.7,8.7]){
    const {point,tangent}=along(rail,d),inward=V(tangent.z,0,-tangent.x).multiplyScalar(.18),p=point.clone().add(inward);
    rod(p.clone().add(V(0,4.97,0)),p.clone().add(V(0,4.64,0)),.013,iron);
    add(new THREE.ConeGeometry(.105,.065,10),iron,p.clone().add(V(0,4.65,0)));
    add(new THREE.SphereGeometry(.068,10,8),bulb,p.clone().add(V(0,4.54,0)),null,V(.85,1.30,.85));
    const light=new THREE.PointLight(0xffd5a2,0,3.4,2);light.position.copy(p).add(V(0,4.46,0));light.userData.nightIntensity=2.8;lights.push(light);group.add(light);
  }

  function plant(x,z,scale=1){
    add(new THREE.CylinderGeometry(.20,.14,.36,14),pot,V(x,.22*scale,z),null,V(scale,scale,scale));add(new THREE.CylinderGeometry(.215,.215,.045,14),stone,V(x,.40*scale,z),null,V(scale,scale,scale));
    for(let j=0;j<13;j++){const a=j*2.399,h=.35+(j%4)*.12,tip=V(x+Math.cos(a)*.22*scale,(.4+h)*scale,z+Math.sin(a)*.22*scale);rod(V(x,.41*scale,z),tip,.008*scale,leaf);add(new THREE.SphereGeometry(1,7,5),j%3?leaf:leafLight,tip,[Math.cos(a)*.6,a,Math.sin(a)*.5],V(.055,.17,.025).multiplyScalar(scale));}
  }
  plant(-2.68,2.99,.92);plant(3.49,-1.73,.86);
  function hangingFern(x,z){
    const y=2.17;add(new THREE.CylinderGeometry(.155,.11,.18,12),pot,V(x,y,z));
    for(let j=0;j<3;j++){const a=j*Math.PI*2/3;rod(V(x+Math.cos(a)*.13,y+.09,z+Math.sin(a)*.13),V(x,2.58,z),.006,iron);}
    for(let j=0;j<10;j++){
      const a=j*2.399,reach=.21+(j%3)*.055,drop=.23+(j%4)*.055;
      const c=new THREE.CatmullRomCurve3([V(x,y+.08,z),V(x+Math.cos(a)*reach,y+.04,z+Math.sin(a)*reach),V(x+Math.cos(a)*reach*1.1,y-drop,z+Math.sin(a)*reach*1.1)]);
      add(new THREE.TubeGeometry(c,12,.006,4,false),leaf);
      for(let k=1;k<7;k++){const p=c.getPoint(k/7),s=.06*(1-k*.08);for(const side of [-1,1])add(new THREE.SphereGeometry(1,5,4),j%3?leaf:leafLight,p.clone().add(V(Math.cos(a+.7*side)*s,.01,Math.sin(a+.7*side)*s)),[.4,a+.7*side,.25],V(s,.024,.025));}
    }
  }
  hangingFern(.05,3.00);hangingFern(3.55,.90);hangingFern(-2.48,2.98);

  // Original covers are reused both in-world and in the reader's journal drawer.
  function coverCanvas(page){
    const c=document.createElement('canvas');c.width=640;c.height=880;const cx=c.getContext('2d');
    const ink=page?'#493e37':'#4f465c',bg=page?'#d9c9ad':'#ebe4d5';cx.fillStyle=bg;cx.fillRect(0,0,640,880);
    cx.fillStyle=ink;cx.textAlign='center';cx.font='20px Georgia, serif';cx.fillText('SIDESTREET / FIELD NOTES',320,64);
    cx.strokeStyle=ink;cx.globalAlpha=.4;cx.lineWidth=1;cx.beginPath();cx.moveTo(45,87);cx.lineTo(595,87);cx.stroke();cx.globalAlpha=1;
    cx.font='43px Georgia, serif';cx.fillText(page?'A HOUSE BETWEEN':'THE VIOLET HOUR',320,143);
    if(page){cx.font='43px Georgia, serif';cx.fillText('TREES',320,194);}
    cx.font='italic 21px Georgia, serif';cx.fillText(page?'Rooms for a slower season.':'A moment beneath the jacaranda.',320,page?239:190);
    if(page){
      cx.fillStyle='#a47765';cx.fillRect(98,310,444,420);cx.fillStyle='#e5d6b9';cx.beginPath();cx.moveTo(184,710);cx.lineTo(184,471);cx.bezierCurveTo(184,345,456,345,456,471);cx.lineTo(456,710);cx.closePath();cx.fill();
      cx.fillStyle='#87947e';cx.fillRect(212,483,217,226);cx.strokeStyle='#ece0c5';cx.lineWidth=13;cx.beginPath();cx.moveTo(320,416);cx.lineTo(320,710);cx.moveTo(214,590);cx.lineTo(426,590);cx.stroke();
      cx.strokeStyle='#4d5549';cx.lineWidth=5;cx.beginPath();cx.moveTo(122,742);cx.bezierCurveTo(178,603,109,490,148,356);cx.stroke();
      for(let i=0;i<9;i++){const y=380+i*36;cx.fillStyle=i%2?'#72816a':'#929c80';cx.beginPath();cx.ellipse(137+(i%2?20:-17),y,26,10,i%2?-.8:.8,0,Math.PI*2);cx.fill();}
    }else{
      cx.fillStyle='#b5a2c1';cx.beginPath();cx.arc(320,489,208,0,Math.PI*2);cx.fill();
      cx.fillStyle='#e2d7bf';cx.beginPath();cx.moveTo(264,597);cx.lineTo(376,597);cx.bezierCurveTo(363,651,369,728,321,736);cx.bezierCurveTo(274,724,280,650,264,597);cx.fill();
      cx.strokeStyle='#626450';cx.lineWidth=5;cx.beginPath();cx.moveTo(321,619);cx.bezierCurveTo(291,493,343,417,297,301);cx.moveTo(315,545);cx.bezierCurveTo(229,494,207,414,184,380);cx.moveTo(320,487);cx.bezierCurveTo(371,456,400,380,450,353);cx.stroke();
      for(let i=0;i<39;i++){const a=i*2.399,r=24+(i%8)*15,x=320+Math.cos(a)*r,y=394+Math.sin(a)*r*.72;cx.fillStyle=['#78618d','#9074a3','#c3aed0','#ae92bd'][i%4];cx.beginPath();cx.ellipse(x,y,14+(i%3)*3,8,a,0,Math.PI*2);cx.fill();}
    }
    cx.fillStyle=ink;cx.font='18px Georgia, serif';cx.fillText(page?'ARCHITECTURE  /  EVERYDAY RITUALS':'BOTANICAL NOTES  /  A LITTLE SYDNEY',320,814);
    cx.font='italic 16px Georgia, serif';cx.fillText('An illustrated field note.',320,846);return c;
  }
  function actionMesh(mesh,action,page){mesh.userData.action=action;if(page!==undefined)mesh.userData.page=page;interactiveMeshes.push(mesh);return mesh;}
  if(typeof document!=='undefined'){
    for(let page=0;page<2;page++){
      const c=coverCanvas(page);journalCovers.push(c);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
      const m=standard(0xffffff,{map:texture,roughness:.85,emissive:0xffffff,emissiveIntensity:.01});m.userData.baseEmissive=.01;journalMaterials.push(m);
      const x=page===0?-2.08:-.62,y=1.43,w=.73,h=1.005;
      box(w+.095,h+.095,.055,wood,x,y,2.60);box(w+.035,h+.035,.032,trim,x,y,2.638);
      const poster=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);poster.position.set(x,y,2.66);poster.name=page?'A House Between Trees — framed cover':'The Violet Hour — framed cover';group.add(poster);actionMesh(poster,'journal',page);
      localBox(.76,.25,.055,glazing[page],x,2.115,2.5,0,0,0,.07);for(const yy of [1.965,2.265])box(.87,.052,.09,trim,x,yy,2.60);for(const xx of [x-.41,x+.41])box(.052,.35,.09,trim,xx,2.115,2.60);
    }
    // A slender sidewalk rack to the right of the bench, clear of the entrance.
    const rackX=.77,rackZ=3.20;
    for(const x of [rackX-.35,rackX+.35]){
      rod(V(x,.05,rackZ-.22),V(x,1.14,rackZ+.01),.016,verandaIron);rod(V(x,.05,rackZ+.32),V(x,1.14,rackZ+.01),.016,verandaIron);
    }
    for(let row=0;row<3;row++){
      const y=.37+row*.27,z=rackZ+.17-row*.055;box(.73,.026,.17,verandaIron,rackX,y-.095,z);
      rod(V(rackX-.37,y-.025,z+.085),V(rackX+.37,y-.025,z+.085),.012,verandaIron);
      for(let col=0;col<2;col++){
        const page=(row+col)%2,book=new THREE.Mesh(new THREE.BoxGeometry(.285,.37,.024),paper);book.position.set(rackX+(col-.5)*.32,y+.08,z-.012);book.rotation.x=-.17;book.castShadow=true;group.add(book);
        const face=new THREE.Mesh(new THREE.PlaneGeometry(.282,.365),journalMaterials[page]);face.position.set(book.position.x,book.position.y,z+.006);face.rotation.x=-.17;group.add(face);actionMesh(face,'journal',page);
      }
    }
    const c=document.createElement('canvas');c.width=1024;c.height=136;const cx=c.getContext('2d');cx.fillStyle='#e6dac3';cx.fillRect(0,0,1024,136);cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle='#696458';cx.font='44px Georgia, serif';cx.fillText('S I D E S T R E E T   ·   B O O K S',512,75);
    const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.93,.24),standard(0xffffff,{map:tx}));sign.position.set(-.63,2.365,2.63);group.add(sign);
    box(2.99,.28,.055,stone,-.63,2.365,2.59);
  }
  const proxyMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  const doorProxy=new THREE.Mesh(new THREE.PlaneGeometry(1.40,2.24),proxyMaterial);doorProxy.position.set(0,1.32,.13);entryRoot.add(doorProxy);actionMesh(doorProxy,'door');doorProxy.name='Entrance interaction surface';
  const balconyProxy=new THREE.Mesh(new THREE.PlaneGeometry(2.9,1.82),proxyMaterial);balconyProxy.position.set(.1,3.72,3.19);group.add(balconyProxy);actionMesh(balconyProxy,'balcony');balconyProxy.name='Veranda interaction surface';

  // Petal physics uses the same geometry as the visible building. These APIs are
  // in world metres, including main.js's fixed building lift; no mesh raycasts are
  // performed during animation. Returned normals are cached and should be copied.
  const surfaceOffsetY=.465,upNormal=V(0,1,0),shapeScratch={},shapeScratch2={};
  function polygon(points){
    const bounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity},edges=[];
    for(let i=0;i<points.length;i++){
      const [x,z]=points[i],[X,Z]=points[(i+1)%points.length],dx=X-x,dz=Z-z,l2=dx*dx+dz*dz;
      bounds.minX=Math.min(bounds.minX,x);bounds.maxX=Math.max(bounds.maxX,x);bounds.minZ=Math.min(bounds.minZ,z);bounds.maxZ=Math.max(bounds.maxZ,z);
      if(l2>1e-14)edges.push({x,z,X,Z,dx,dz,l2,invLength:1/Math.sqrt(l2)});
    }
    return {bounds,edges};
  }
  function probe(p,x,z,out=shapeScratch){
    let inside=false,d2=Infinity,qx=0,qz=0,enx=0,enz=0;
    for(const e of p.edges){
      if((e.z>z)!==(e.Z>z)&&x<(e.X-e.x)*(z-e.z)/(e.Z-e.z)+e.x)inside=!inside;
      const t=Math.max(0,Math.min(1,((x-e.x)*e.dx+(z-e.z)*e.dz)/e.l2)),px=e.x+t*e.dx,pz=e.z+t*e.dz;
      const dd=(x-px)*(x-px)+(z-pz)*(z-pz);if(dd<d2){d2=dd;qx=px;qz=pz;enx=e.dz*e.invLength;enz=-e.dx*e.invLength;}
    }
    const d=Math.sqrt(d2),sign=inside?-1:1;out.distance=sign*d;
    out.nx=d>1e-10?sign*(x-qx)/d:enx;out.nz=d>1e-10?sign*(z-qz)/d:enz;return out;
  }
  const rectPoints=(a,b,c,d)=>[[a,c],[b,c],[b,d],[a,d]];
  const rectDistance=(x,z,a,b,c,d)=>{const dx=Math.max(a-x,0,x-b),dz=Math.max(c-z,0,z-d);return dx||dz?Math.hypot(dx,dz):-Math.min(x-a,b-x,z-c,d-z);};
  const roofClear=polygon(perimeter(-.24)),parapetOuter=polygon(capOuter),parapetInner=polygon(capInner);
  const deckBoundary=polygon(verandaDeckPoints),awningBoundary=polygon([...outerRoof,...innerRoof.slice().reverse()].map(p=>[p.x,p.z]));
  function triangleSurface(id,kind,geometries,edgeAt,minLocalY=-Infinity,clip=false){
    const triangles=[],bounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};let low=Infinity,high=-Infinity;
    for(const geometry of geometries){
      const p=geometry.attributes.position,index=geometry.index,count=index?index.count:p.count;
      for(let i=0;i<count;i+=3){
        const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2;
        const x=p.getX(ia),y=p.getY(ia),z=p.getZ(ia),dx=p.getX(ib)-x,dy=p.getY(ib)-y,dz=p.getZ(ib)-z,ex=p.getX(ic)-x,ey=p.getY(ic)-y,ez=p.getZ(ic)-z;
        const nx=dy*ez-dz*ey,ny=dz*ex-dx*ez,nz=dx*ey-dy*ex,length=Math.hypot(nx,ny,nz),det=dx*ez-dz*ex;
        if(length<1e-12||ny/length<.025||Math.min(y,y+dy,y+ey)<minLocalY||Math.abs(det)<1e-12)continue;
        const t={x,y,z,dx,dy,dz,ex,ey,ez,inv:1/det,normal:Math.abs(ny/length-1)<1e-10?upNormal:V(nx/length,ny/length,nz/length),
          minX:Math.min(x,x+dx,x+ex),maxX:Math.max(x,x+dx,x+ex),minZ:Math.min(z,z+dz,z+ez),maxZ:Math.max(z,z+dz,z+ez)};
        triangles.push(t);bounds.minX=Math.min(bounds.minX,t.minX);bounds.maxX=Math.max(bounds.maxX,t.maxX);bounds.minZ=Math.min(bounds.minZ,t.minZ);bounds.maxZ=Math.max(bounds.maxZ,t.maxZ);
        low=Math.min(low,y,y+dy,y+ey);high=Math.max(high,y,y+dy,y+ey);
      }
    }
    const cell=.28,nx=Math.ceil((bounds.maxX-bounds.minX)/cell)+1,nz=Math.ceil((bounds.maxZ-bounds.minZ)/cell)+1,grid=Array.from({length:nx*nz},()=>[]);
    for(const t of triangles)for(let z=Math.floor((t.minZ-bounds.minZ)/cell);z<=Math.floor((t.maxZ-bounds.minZ)/cell);z++)for(let x=Math.floor((t.minX-bounds.minX)/cell);x<=Math.floor((t.maxX-bounds.minX)/cell);x++)grid[z*nx+x].push(t);
    return {id,kind,bounds,heightRange:{min:low+surfaceOffsetY,max:high+surfaceOffsetY},sample(x,z){
      if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return null;
      const edge=edgeAt(x,z);if(clip!==false&&edge<(typeof clip==='number'?clip:0))return null;
      const list=grid[Math.floor((z-bounds.minZ)/cell)*nx+Math.floor((x-bounds.minX)/cell)];let height=-Infinity,normal=upNormal;
      for(const t of list){
        if(x<t.minX-1e-7||x>t.maxX+1e-7||z<t.minZ-1e-7||z>t.maxZ+1e-7)continue;
        const xx=x-t.x,zz=z-t.z,u=(xx*t.ez-zz*t.ex)*t.inv,v=(t.dx*zz-t.dz*xx)*t.inv;
        if(u< -1e-6||v< -1e-6||u+v>1.000001)continue;
        const h=t.y+u*t.dy+v*t.ey;if(h>height){height=h;normal=t.normal;}
      }
      return height===-Infinity?null:{height:height+surfaceOffsetY,normal,edgeDistance:Math.max(0,edge)};
    }};
  }
  const catchSurfaces=[
    triangleSurface('roof-flat','roof',[flatRoofGeo],(x,z)=>Math.min(-probe(roofClear,x,z).distance,rectDistance(x,z,-2.115,-1.385,-1.8,-1.1)),-Infinity,true),
    triangleSurface('roof-parapet','roof',[capGeo],(x,z)=>Math.min(-probe(parapetOuter,x,z).distance,probe(parapetInner,x,z).distance)),
    {id:'chimney-top',kind:'roof',bounds:{minX:-2.115,maxX:-1.385,minZ:-1.8,maxZ:-1.1},heightRange:{min:9.0575,max:9.074},sample(x,z){
      const outer=rectDistance(x,z,-2.115,-1.385,-1.8,-1.1);if(outer>0)return null;
      const inner=rectDistance(x,z,-1.975,-1.525,-1.67,-1.23),onInner=inner<=0;
      return {height:(onInner?8.609:8.5925)+surfaceOffsetY,normal:upNormal,edgeDistance:onInner?-inner:Math.min(-outer,inner)};
    }},
    triangleSurface('veranda-awning','awning',[...(buckets.get(canopy)||[]),...(buckets.get(roofRibs)||[]),...awningLedgeGeos],(x,z)=>-probe(awningBoundary,x,z).distance,4.8,-.031),
    triangleSurface('veranda-deck','balcony',[verandaDeckGeo],(x,z)=>{
      let railDistance=Infinity;
      for(let i=1;i<rail.length;i++){const a=rail[i-1],b=rail[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));railDistance=Math.min(railDistance,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}
      return Math.min(-probe(deckBoundary,x,z).distance,railDistance-.033);
    },-Infinity,true)
  ];
  // A petal spans the narrow corrugations. Its support height follows the actual
  // rib, while its resting orientation follows the broad sheet beneath the rib.
  const awningSurface=catchSurfaces.find(s=>s.id==='veranda-awning'),sampleAwning=awningSurface.sample;
  const slope=.21/.785,frontSlope=V(0,1,slope).normalize(),rightSlope=V(slope,1,0).normalize();
  const cornerSlopes=Array.from({length:32},(_,i)=>{const a=(i+.5)/32*Math.PI/2,k=slope/Math.cos(Math.PI/64);return V(Math.cos(a)*k,1,Math.sin(a)*k).normalize();});
  awningSurface.sample=(x,z)=>{const hit=sampleAwning(x,z);if(hit)hit.normal=hit.height>5.20+surfaceOffsetY?upNormal:x<=1.5?frontSlope:z<=.95?rightSlope:cornerSlopes[Math.max(0,Math.min(31,Math.floor(Math.atan2(z-.95,x-1.5)*64/Math.PI)))];return hit;};
  const entryCo=Math.cos(ea),entrySi=Math.sin(ea),foundationBoundary=polygon(perimeter(.125));
  function entryPolygon(w,d,x,z){return polygon(rectPoints(x-w/2,x+w/2,z-d/2,z+d/2).map(([u,v])=>{const p=entryPoint(u,0,v);return [p.x,p.z];}));}
  const upperStepBoundary=entryPolygon(1.45,.43,0,.17);
  function entryStep(id,w,d,z,height,lower=false){
    const footprint=entryPolygon(w,d,0,z);
    return {id,kind:'step',bounds:footprint.bounds,heightRange:{min:height+surfaceOffsetY,max:height+surfaceOffsetY},sample(x,Z){
      const b=footprint.bounds;if(x<b.minX||x>b.maxX||Z<b.minZ||Z>b.maxZ)return null;
      let edge=-probe(footprint,x,Z).distance;
      if(lower)edge=Math.min(edge,probe(foundationBoundary,x,Z).distance,probe(upperStepBoundary,x,Z).distance);
      else {const dx=x-entryX,dz=Z-entryZ,u=dx*entryCo-dz*entrySi,v=dx*entrySi+dz*entryCo;edge=Math.min(edge,v-.09,rectDistance(u,v,.615,.745,-.105,.135),rectDistance(u,v,-.745,-.615,-.105,.135));}
      if(edge<0)return null;
      return {height:height+surfaceOffsetY,normal:upNormal,edgeDistance:edge};
    }};
  }
  catchSurfaces.push(entryStep('entry-upper-step',1.45,.43,.17,.2175),entryStep('entry-lower-step',1.65,.65,.25,.14,true));

  // Analytic contact volumes retain the real corner and open ground-floor wall.
  // The thin bevels are conservatively included in their own small envelopes.
  const solids=[];
  function solid(id,footprint,bottom,top,query=null){solids.push({id,footprint,bottom:typeof bottom==='number'?bottom+surfaceOffsetY:bottom,top:typeof top==='number'?top+surfaceOffsetY:top,query});}
  solid('foundation',foundationBoundary,-.025,.205);
  solid('ground-wall',polygon([...openPerimeter(0),...openPerimeter(-.23).reverse()]),.171,2.439);
  solid('ground-string',polygon([...openPerimeter(.045),...openPerimeter(-.23).reverse()]),.402,.473);
  solid('upper-walls',polygon(perimeter()),2.412,7.658);
  for(const y of [2.48,5.08,7.60]){
    solid('stone-cornice',polygon(perimeter(.067)),y-.012,y+.067);
    solid('cream-cornice',polygon(perimeter(.12)),y+.055,y+.165);
  }
  solid('roof-cornice',polygon(perimeter(.17)),7.74,7.91);
  solid('roof-deck',polygon(perimeter(-.12)),7.885,7.95);
  function ringQuery(outer,inner,x,z,out){
    probe(outer,x,z,out);probe(inner,x,z,shapeScratch2);
    if(-shapeScratch2.distance>out.distance){out.distance=-shapeScratch2.distance;out.nx=-shapeScratch2.nx;out.nz=-shapeScratch2.nz;}return out;
  }
  const wallOuter=polygon(perimeter(.06)),wallInner=polygon(perimeter(-.19));
  const wallTopSurface=triangleSurface('parapet-wall-top','roof',[parapetWallGeo],()=>0),capTopSurface=catchSurfaces.find(s=>s.id==='roof-parapet');
  function ringTop(surface,outer,inner,x,z){
    let hit=surface.sample(x,z);
    if(!hit){const q=ringQuery(outer,inner,x,z,shapeScratch),d=q.distance+1e-6;hit=surface.sample(x-q.nx*d,z-q.nz*d);}
    return hit?hit.height:surface.heightRange.min;
  }
  const wallTop=(x,z)=>ringTop(wallTopSurface,wallOuter,wallInner,x,z),capTop=(x,z)=>ringTop(capTopSurface,parapetOuter,parapetInner,x,z);
  solid('parapet-wall',wallOuter,7.89,wallTop,(x,z,o)=>ringQuery(wallOuter,wallInner,x,z,o));
  solid('parapet-cap',parapetOuter,(x,z)=>capTop(x,z)-.08,capTop,(x,z,o)=>ringQuery(parapetOuter,parapetInner,x,z,o));
  solid('chimney',polygon(rectPoints(-2.055,-1.445,-1.745,-1.155)),7.89,8.51);
  solid('chimney-cap',polygon(rectPoints(-2.115,-1.385,-1.8,-1.1)),8.5075,8.5925);
  solid('chimney-top',polygon(rectPoints(-1.975,-1.525,-1.67,-1.23)),8.591,8.609);
  for(const x of [-.68,.68])solid('entry-jamb',entryPolygon(.13,.24,x,.015),.18,2.37);
  solid('entry-lintel',entryPolygon(1.49,.27,0,.015),2.28,2.43);
  for(const x of [-.765,.765])solid('alcove-side',entryPolygon(.10,1.86,x,-.92),.22,2.34);
  solid('alcove-back',entryPolygon(1.62,.12,0,-1.82),.22,2.34);
  solid('alcove-ceiling',entryPolygon(1.62,1.90,0,-.91),2.34,2.42);
  const doorContacts=doors.map((door,i)=>({door,side:i?1:-1,angle:NaN,footprint:null}));
  function solidContact(x,y,z,radius=.025){
    let bestDepth=-Infinity,bestX=0,bestY=0,bestZ=0,bestId='';
    function check(id,footprint,bottom,top,query){
      const b=footprint.bounds;if(x<b.minX-radius||x>b.maxX+radius||z<b.minZ-radius||z>b.maxZ+radius)return;
      if(typeof bottom==='function')bottom=bottom(x,z);if(typeof top==='function')top=top(x,z);if(y<bottom-radius||y>top+radius)return;
      const q=query?query(x,z,shapeScratch):probe(footprint,x,z,shapeScratch),d=q.distance;
      if(d>=radius)return;const below=bottom-y,above=y-top,vertical=Math.max(below,above),vy=below>above?-1:1;
      let nx=q.nx,ny=0,nz=q.nz,depth;
      if(d>0&&vertical>0){const distance=Math.hypot(d,vertical);if(distance>=radius)return;depth=radius-distance;nx*=d/distance;nz*=d/distance;ny=vy*vertical/distance;}
      else if(vertical>0){depth=radius-vertical;nx=0;ny=vy;nz=0;}
      else if(d>0)depth=radius-d;
      else if(-vertical< -d){depth=radius-vertical;nx=0;ny=vy;nz=0;}
      else depth=radius-d;
      if(depth>bestDepth){bestDepth=depth;bestX=nx;bestY=ny;bestZ=nz;bestId=id;}
    }
    for(const s of solids)check(s.id,s.footprint,s.bottom,s.top,s.query);
    if(y>=.22+surfaceOffsetY-radius&&y<=2.28+surfaceOffsetY+radius&&x>1&&x<4.2&&z>.6&&z<3.8)for(const c of doorContacts){
      const a=c.door.pivot.rotation.y;
      if(a!==c.angle){
        const p=c.door.pivot,co=Math.cos(a),si=Math.sin(a),toward=-c.side;
        c.footprint=polygon(rectPoints(Math.min(0,toward*.597),Math.max(0,toward*.597),-.041,.046).map(([u,v])=>{const w=entryPoint(p.position.x+u*co+v*si,0,p.position.z-u*si+v*co);return [w.x,w.z];}));c.angle=a;
      }
      check('entry-door',c.footprint,.22+surfaceOffsetY,2.28+surfaceOffsetY);
    }
    return bestDepth>0?{normal:V(bestX,bestY,bestZ),depth:bestDepth,id:bestId}:null;
  }
  const containsSolid=(x,y,z)=>solidContact(x,y,z,0)!==null;
  const baked=bake(buckets,group);let actualDrawCalls=0,actualTriangles=0;
  group.traverse(o=>{if(o.isMesh){actualDrawCalls++;actualTriangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
  return {group,windowMaterials,lampMaterials,lights,doors,interiorLights,interiorMaterials,interactiveMeshes,journalMaterials,journalCovers,catchSurfaces,solidContact,containsSolid,surfaceOffsetY,
    focus:{entry:entryPoint(0,1.28,.05),balcony:V(1.1,3.9,2.8),journal:V(.40,1.35,3.12),roof:V(0,8.2,0)},
    stats:{windows:windowCount,triangles:actualTriangles,drawCalls:actualDrawCalls,balconies:1,doors:doors.length,entryOpeningWidth:1.48,entryDepth:1.9}};
}
