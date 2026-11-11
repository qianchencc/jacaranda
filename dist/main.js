import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createArchitecture } from './architecture.js';
import { createVegetation } from './vegetation.js';
import { createStreet } from './street.js';
import { createAmbientSound } from './ambient.js';
import { createPetalWeather } from './petals.js';

const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const canvas=$('#scene'),stage=$('#stage'),status=$('#scene-status');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const announce=text=>status.textContent=text;
let renderer=null;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});}
catch{ $('#error-panel').hidden=false;$('#loader').hidden=true;stage.dataset.graphics='unavailable'; }
if(renderer){
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.35:1.6));renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
}
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#34384e',.009);
const camera=new THREE.PerspectiveCamera(34,1,.1,180);
const controls=new OrbitControls(camera,canvas);
Object.assign(controls,{enableDamping:true,dampingFactor:.065,minDistance:8.5,maxDistance:55,minPolarAngle:.32,maxPolarAngle:Math.PI*.485,enablePan:false,rotateSpeed:.48,zoomSpeed:.60,autoRotateSpeed:.44});
const sun=new THREE.DirectionalLight('#d9dcff',1.1);sun.position.set(-5,15,-9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:.1,far:60});Object.assign(sun.shadow,{normalBias:.036,bias:-.00011,radius:4});scene.add(sun,sun.target);
const ambient=new THREE.HemisphereLight('#bec1e5','#5e5a70',.78);scene.add(ambient);
const fill=new THREE.DirectionalLight('#a19dd7',.48);fill.position.set(9,10,-9);scene.add(fill);
const frontFill=new THREE.DirectionalLight('#e8c6a8',.38);frontFill.position.set(2,5,12);scene.add(frontFill);
const architecture=createArchitecture(THREE);architecture.group.position.y=.465;scene.add(architecture.group);
const vegetation=createVegetation(THREE);vegetation.group.position.y=.465;scene.add(vegetation.group);
const street=createStreet(THREE);scene.add(street.group);street.bench.userData.action='bench';
const entry=architecture.focus.entry.clone().add(new THREE.Vector3(0,.465,0));
const doorSpill=new THREE.SpotLight('#ffca86',0,5.5,.65,.8,2);doorSpill.position.copy(entry).add(new THREE.Vector3(.18,.6,.18));doorSpill.target.position.copy(entry).add(new THREE.Vector3(1.7,-entry.y+.52,1.7));scene.add(doorSpill,doorSpill.target);
// A diffused ground shadow anchors the miniature without a visible backdrop plane.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=256;
const shadowCtx=shadowCanvas.getContext('2d'),shadowGradient=shadowCtx.createRadialGradient(128,128,15,128,128,128);
shadowGradient.addColorStop(0,'rgba(25,20,40,.24)');shadowGradient.addColorStop(.55,'rgba(25,20,40,.13)');shadowGradient.addColorStop(1,'rgba(25,20,40,0)');shadowCtx.fillStyle=shadowGradient;shadowCtx.fillRect(0,0,256,256);
const contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(25,23),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));contactShadow.rotation.x=-Math.PI/2;contactShadow.position.y=-.45;scene.add(contactShadow);

const lightStates={
 day:{sun:'#fff0de',sky:'#e8ddf5',ground:'#a89a9d',fill:'#d7ccf1',front:'#fff0df',bg:'#e5dee8',fog:'#ddd8e6',sunPower:2.75,ambientPower:2.1,fillPower:.58,frontPower:.3,exposure:1.04,sunPos:[-9,17,9],lamps:.03,windows:.12,bloom:.025,density:.0055},
 dusk:{sun:'#f7c5a0',sky:'#c9bbdc',ground:'#8c798b',fill:'#c1b3df',front:'#f4c7a5',bg:'#a499ae',fog:'#aaa0bb',sunPower:1.85,ambientPower:1.38,fillPower:.58,frontPower:.36,exposure:1.12,sunPos:[-13,9,7],lamps:.65,windows:.70,bloom:.045,density:.007},
 night:{sun:'#d9dcff',sky:'#bec1e5',ground:'#5e5a70',fill:'#a19dd7',front:'#e8c6a8',bg:'#282b41',fog:'#34384e',sunPower:1.1,ambientPower:.78,fillPower:.48,frontPower:.38,exposure:1.16,sunPos:[-5,15,-9],lamps:1,windows:1.7,bloom:.075,density:.009}
};
const colorKeys=['sun','sky','ground','fill','front','bg','fog'];
function makeLightState(mode){const s={...lightStates[mode],sunPos:new THREE.Vector3(...lightStates[mode].sunPos)};for(const k of colorKeys)s[k]=new THREE.Color(s[k]);return s;}
const keyLights={day:makeLightState('day'),dusk:makeLightState('dusk'),night:makeLightState('night')};
function cloneLight(s){return Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v?.clone?v.clone():v]));}
function blendLights(a,b,t){const result={};for(const k in a){result[k]=a[k]?.isColor?a[k].clone().lerp(b[k],t):a[k]?.isVector3?a[k].clone().lerp(b[k],t):THREE.MathUtils.lerp(a[k],b[k],t);}return result;}
function lightAt(t){return t<=.5?blendLights(keyLights.day,keyLights.dusk,t*2):blendLights(keyLights.dusk,keyLights.night,(t-.5)*2);}
let current=cloneLight(keyLights.night),lightValue=1,lightTween=null,doorAmount=0,doorTarget=0;
const audio=createAmbientSound();
function updateInterior(){
 for(const l of architecture.interiorLights??[])l.intensity=THREE.MathUtils.lerp(l.userData.dayIntensity??.45,l.userData.nightIntensity??3.8,current.lamps)*(.34+doorAmount*.95);
 for(const m of architecture.interiorMaterials??[])if(m.emissive)m.emissiveIntensity=(.18+current.windows*.25)*(.65+doorAmount*.35);
 doorSpill.intensity=doorAmount*(4+current.lamps*18);
}
function applyLight(){
 sun.color.copy(current.sun);sun.intensity=current.sunPower;sun.position.copy(current.sunPos);
 ambient.color.copy(current.sky);ambient.groundColor.copy(current.ground);ambient.intensity=current.ambientPower;
 fill.color.copy(current.fill);fill.intensity=current.fillPower;frontFill.color.copy(current.front);frontFill.intensity=current.frontPower;
 scene.fog.color.copy(current.fog);scene.fog.density=current.density;
 if(renderer)renderer.toneMappingExposure=current.exposure;
 for(const m of architecture.windowMaterials)m.emissiveIntensity=current.windows*(m.userData.glowScale??1);
 for(const m of [...architecture.lampMaterials,...street.lampMaterials])m.emissiveIntensity=.22+current.lamps*3.2;
 for(const l of architecture.lights)l.intensity=(l.userData.nightIntensity??4)*current.lamps;
 for(const l of street.lights)l.intensity=(l.userData.maxPower??8)*current.lamps;
 for(const h of street.glowMeshes)h.material.opacity=current.lamps*.44;
 for(const m of vegetation.canopyMaterials)if(m.emissive)m.emissiveIntensity=current.bloom;
 document.body.style.setProperty('--paper',current.bg.getStyle());updateInterior();
}
function lightLabels(value){
 const mode=value<.28?'day':value<.76?'dusk':'night';document.body.dataset.mode=mode;document.documentElement.dataset.light=mode;
 const hour=value<=.5?10.5+value*14.5:17.75+(value-.5)*5;const totalMinutes=Math.round(hour*60),hours=Math.floor(totalMinutes/60),minutes=totalMinutes%60;
 $('#light-time').textContent=`${String(hours%12||12).padStart(2,'0')}:${String(minutes).padStart(2,'0')} ${hours>=12?'PM':'AM'}`;
 $('#light-range').value=Math.round(value*100);
 all('.light-button').forEach(b=>{const on=b.dataset.mode===mode;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);});
 $('meta[name=theme-color]').content='#'+current.bg.getHexString();audio.setLight(value);
}
function setTime(value,duration=2.3){value=THREE.MathUtils.clamp(value,0,1);lightTween={start:cloneLight(current),end:lightAt(value),fromValue:lightValue,toValue:value,t:0,duration:reducedMotion?.01:duration};lightLabels(value);}
function setMode(mode){stopEvening();setTime({day:0,dusk:.5,night:1}[mode]);announce({day:'Daylight filters through the flowers.',dusk:'The windows begin to glow. Golden hour.',night:'After dark. Warm light beneath the jacarandas.'}[mode]);}
all('.light-button').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));$('#light-range').addEventListener('input',e=>{const value=Number(e.target.value)/100;stopEvening();setTime(value,.12);});applyLight();

// Attached branches, released petals and contact share one continuous breeze.
const weather=createPetalWeather(THREE,{vegetation,architecture,mobile:innerWidth<700});scene.add(weather.group);
const falling=weather.airborne;
function updatePetals(dt){weather.update(dt,camera,viewportWidth,viewportHeight,current.lamps);}
let petalsOn=!reducedMotion,autoOrbit=false,cameraMove=null,eveningOn=false,eveningTime=0,view='overview',pendingPanel=0,interactionMode='street';falling.visible=petalsOn;
let overviewDistance=34,viewportWidth=innerWidth,viewportHeight=innerHeight,viewOffsetX=0,viewOffsetY=0;
const overviewDirection=new THREE.Vector3(1,.38,1.35).normalize();
// Fit the measured tree-and-street silhouette into the space between the phone's title and controls.
function mobileOverviewFit(width,height){
 const top=height>740?235:200,bottom=height-(height>740?295:276),availableHeight=Math.max(100,bottom-top);
 const focal=height/(2*Math.tan(17*Math.PI/180));
 const widthDistance=10.34*focal/Math.max(80,width/2-18);
 const projectedHeight=distance=>focal*(9.02/(distance+3.583)+7.145/(distance-8.788));
 let low=Math.max(12,widthDistance),high=Math.max(110,low+1);
 while(projectedHeight(high)>availableHeight)high*=1.15;
 for(let i=0;i<24;i++){const middle=(low+high)/2;if(projectedHeight(middle)>availableHeight)low=middle;else high=middle;}
 const distance=Math.ceil(high),midpoint=(top+Math.max(bottom,top+100))/2;
 const offsetY=height/2-midpoint-focal*(9.02/(distance+3.583)-7.145/(distance-8.788))/2;
 return {distance,offsetY,maxDistance:distance+20};
}
const views={
 overview:{target:[0,4.6,0],chapter:'01 — THE WHOLE CORNER',line:'Somewhere to stay a little longer.'},
 bench:{position:[7.3,5.9,15.8],target:[-.55,2.7,2.1],chapter:'02 — UNDER THE JACARANDA',line:'A quiet seat. A harbour memory.'},
 journal:{position:[5.4,5.3,13.5],target:[-.35,2.7,2.25],chapter:'03 — STORIES FROM THE STREET',line:'A small journal, waiting in the window.'},
 door:{position:[10.0,5.5,12.2],target:[2.1,2.1,1.95],chapter:'04 — A LIGHT LEFT ON',line:'There is always room for one more story.'},
 balcony:{position:[10.8,7.6,12.4],target:[1.7,4.2,1.65],chapter:'05 — ON THE VERANDA',line:'Iron lace, violet shadows, the last of the light.'}
};
function clearPending(){if(pendingPanel){clearTimeout(pendingPanel);pendingPanel=0;}}
function syncOrbit(){const b=$('#orbit');b.classList.toggle('active',autoOrbit);b.setAttribute('aria-pressed',autoOrbit);b.setAttribute('aria-label',autoOrbit?'Pause slow orbit':'Start slow orbit');}
function stopEvening(){if(eveningOn){lightTween=null;lightLabels(lightValue);}eveningOn=false;$('#evening').setAttribute('aria-pressed','false');$('#evening').innerHTML='Let the evening unfold <span>↗</span>';}
function stopOrbit(){autoOrbit=false;controls.autoRotate=false;syncOrbit();}
function selectView(name,instant=false){
 clearPending();stopEvening();stopOrbit();view=name;const v=views[name]??views.overview;
 const target=new THREE.Vector3(...v.target),position=name==='overview'?target.clone().addScaledVector(overviewDirection,overviewDistance):new THREE.Vector3(...v.position);
 if(viewportWidth<700&&name!=='overview')position.sub(target).multiplyScalar(1.22).add(target);
 if(instant){camera.position.copy(position);controls.target.copy(target);controls.update();cameraMove=null;}
 else cameraMove={from:camera.position.clone(),to:position,targetFrom:controls.target.clone(),targetTo:target,t:0,duration:reducedMotion?.01:1.65};
 all('.view-button').forEach(b=>{const on=b.id==='view-'+name;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});
 $('#scene-chapter').textContent=v.chapter;$('#scene-line').textContent=v.line;$('#back-street').hidden=name==='overview';document.body.dataset.view=name;announce(v.line);
}
function backToStreet(){closePostcard(false);closeJournal(false);selectView('overview');}
$('#view-overview').onclick=backToStreet;$('#view-bench').onclick=()=>{closeJournal(false);selectView('bench');};$('#view-balcony').onclick=()=>{closeJournal(false);selectView('balcony');};$('#reset').onclick=backToStreet;$('#back-street').onclick=backToStreet;
$('#orbit').onclick=()=>{clearPending();stopEvening();cameraMove=null;autoOrbit=!autoOrbit;controls.autoRotate=autoOrbit;syncOrbit();};
function syncPetals(){const b=$('#petals');b.classList.toggle('active',petalsOn);b.setAttribute('aria-pressed',petalsOn);b.setAttribute('aria-label',petalsOn?'Pause breeze and petals':'Resume breeze and petals');}
$('#petals').onclick=()=>{petalsOn=!petalsOn;falling.visible=true;syncPetals();};syncPetals();
function zoom(factor){clearPending();stopEvening();cameraMove=null;const d=camera.position.clone().sub(controls.target);d.setLength(THREE.MathUtils.clamp(d.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(d);controls.update();}
$('#zoom-in').onclick=()=>zoom(.86);$('#zoom-out').onclick=()=>zoom(1.16);
$('#evening').onclick=()=>{if(eveningOn){stopEvening();stopOrbit();return;}clearPending();closeJournal(false);eveningOn=true;eveningTime=-1.5;setTime(0,1.5);autoOrbit=!reducedMotion;controls.autoRotate=autoOrbit;syncOrbit();$('#evening').setAttribute('aria-pressed','true');$('#evening').innerHTML='Pause the evening <span>Ⅱ</span>';announce('Watch daylight settle into night. You can pause at any moment.');};
$('#sound').onclick=async()=>{try{const on=await audio.toggle();$('#sound').setAttribute('aria-pressed',on);$('#sound span').textContent=on?'Sound on':'Sound off';$('#sound').setAttribute('aria-label',on?'Turn off gentle ambient sound':'Turn on gentle ambient sound');}catch{announce('Sound is unavailable in this browser.');}};

const postcard=$('#postcard-dialog'),journal=$('#journal-dialog');let postcardTrigger=null,journalTrigger=null,journalPage=0;
const stories=[
 {title:'The violet hour.',category:'A SEASON IN COLOUR',deck:'For a little while, the street belongs to the flowers.',copy:'A few petals settle on the empty seat. The shop window warms, one pane at a time. Nothing here is in a hurry—not the afternoon, not the light, not you.',quote:'“There is a particular kind of luxury in having nowhere else to be.”',view:'bench'},
 {title:'A house between trees.',category:'NOTES ON A SMALL PLACE',deck:'A curved corner makes room for the street.',copy:'Follow the ironwork around the veranda. Look for the narrow roof, the small hanging gardens, the open door. The building has its own quiet rhythm: solid wall, delicate lace, a light at the threshold.',quote:'“A good corner is a place the city pauses to notice.”',view:'balcony'}
];
function openPostcard(trigger){
 clearPending();closeJournal(false);postcardTrigger=trigger??document.activeElement;interactionMode='postcard';stopOrbit();stopEvening();controls.enabled=false;
 $('#postcard-object').classList.remove('flipped');$('#postcard-flip').textContent='Turn the card ↻';document.body.dataset.content='postcard';if(!postcard.open)postcard.showModal();$('#postcard-close').focus();announce('A harbour memory. Turn the postcard or keep a copy.');
}
function closePostcard(restoreFocus=true){if(!postcard.open)return;postcard.close();interactionMode='street';document.body.dataset.content='';controls.enabled=!!renderer;if(restoreFocus&&postcardTrigger?.isConnected)postcardTrigger.focus();}
$('#postcard-close').onclick=()=>closePostcard();postcard.addEventListener('cancel',e=>{e.preventDefault();closePostcard();});postcard.addEventListener('click',e=>{if(e.target===postcard)closePostcard();});
$('#postcard-flip').onclick=()=>{const flipped=$('#postcard-object').classList.toggle('flipped');$('#postcard-flip').textContent=flipped?'Back to the harbour ↻':'Turn the card ↻';if(flipped)$('#postcard-message').focus();};
const postcardStage=$('.postcard-stage');postcardStage.addEventListener('pointermove',e=>{if(reducedMotion)return;const r=postcardStage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;postcardStage.style.setProperty('--rx',(-y*4).toFixed(2)+'deg');postcardStage.style.setProperty('--ry',(x*5).toFixed(2)+'deg');});postcardStage.addEventListener('pointerleave',()=>{postcardStage.style.setProperty('--rx','0deg');postcardStage.style.setProperty('--ry','0deg');});
$('#postcard-save').onclick=async()=>{
 const button=$('#postcard-save');button.disabled=true;
 try{
  const art=$('#harbour-art');await art.decode();await document.fonts.ready;
  const c=document.createElement('canvas'),ctx=c.getContext('2d');c.width=1800;
  ctx.font='27px Editorial, Georgia, serif';
  const note=$('#postcard-message').value.trim()||'Some places ask for nothing but a little of your time.';
  // Preserve line breaks and wrap both words and scripts without word spaces.
  const lines=[];let line='';
  for(const token of note.match(/\n|[^\S\n]+|[\u2e80-\u9fff\uf900-\ufaff]|[^\s\u2e80-\u9fff\uf900-\ufaff]+/gu)??[]){
   if(token==='\n'){lines.push(line.trimEnd());line='';continue;}
   if(line&&ctx.measureText(line+token).width>1640){lines.push(line.trimEnd());line='';}
   if(ctx.measureText(token).width>1640){for(const character of token){if(line&&ctx.measureText(line+character).width>1640){lines.push(line);line='';}line+=character;}}
   else line+=line?token:token.trimStart();
  }
  if(line||!lines.length)lines.push(line.trimEnd());
  c.height=Math.max(1460,1310+lines.length*36+82);
  ctx.fillStyle='#f3eee5';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(art,60,60,1680,1120);
  ctx.fillStyle='#6e527d';ctx.font='italic 46px Editorial, Georgia, serif';ctx.fillText('A moment by the water.',65,1252);
  ctx.fillStyle='#746b71';ctx.font='27px Editorial, Georgia, serif';lines.forEach((text,i)=>ctx.fillText(text,65,1310+i*36));
  ctx.font='16px Grotesk, Arial, sans-serif';ctx.fillText('JACARANDA DAYS  /  AN ORIGINAL SIDESTREET MEMORY',65,c.height-45);
  c.toBlob(blob=>{if(!blob){button.disabled=false;announce('The postcard could not be saved. Please try again.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='jacaranda-days-postcard.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);button.disabled=false;announce('Your postcard is ready.');},'image/png');
 }catch{button.disabled=false;announce('The postcard image is still loading. Please try again.');}
};
function updateJournal(page){journalPage=(page+stories.length)%stories.length;const s=stories[journalPage];$('#journal-title').textContent=s.title;$('#journal-category').textContent=s.category;$('#journal-deck').textContent=s.deck;$('#journal-copy').textContent=s.copy;$('#journal-quote').textContent=s.quote;$('#journal-pagination').textContent=`0${journalPage+1} / 0${stories.length}`;const cover=architecture.journalCovers?.[journalPage];if(cover)$('#journal-cover').src=cover.toDataURL('image/png');for(const [i,m]of(architecture.journalMaterials??[]).entries())if(m.emissive){m.emissive.set('#bda6cf');m.emissiveIntensity=journal.open&&i===journalPage?.18:0;}if(!reducedMotion&&$('#journal-content').animate)$('#journal-content').animate([{opacity:.3,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,easing:'ease-out'});}
function openJournal(page=0,trigger){clearPending();closePostcard(false);journalTrigger=trigger??document.activeElement;interactionMode='journal';stopOrbit();stopEvening();document.body.dataset.content='journal';if(!journal.open)journal.show();updateJournal(page);$('#journal-close').focus();announce(stories[journalPage].title);}
function closeJournal(restoreFocus=true){if(!journal.open)return;journal.close();interactionMode='street';document.body.dataset.content='';for(const m of architecture.journalMaterials??[])if(m.emissive)m.emissiveIntensity=0;if(restoreFocus&&journalTrigger?.isConnected)journalTrigger.focus();}
$('#journal-close').onclick=()=>closeJournal();$('#journal-prev').onclick=()=>updateJournal(journalPage-1);$('#journal-next').onclick=()=>updateJournal(journalPage+1);$('#journal-look').onclick=()=>{const dest=stories[journalPage].view;closeJournal(false);selectView(dest);};
journal.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();updateJournal(journalPage+1);}if(e.key==='ArrowLeft'){e.preventDefault();updateJournal(journalPage-1);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){clearPending();if(postcard.open)closePostcard();else if(journal.open)closeJournal();else{stopEvening();stopOrbit();}}});
function toggleDoor(force){doorTarget=force===undefined?1-doorTarget:Number(force);$('#door-label').textContent=doorTarget?'Come back soon':'A light left on';const node=$('[data-place=door]');node.setAttribute('aria-label',doorTarget?'Close the bookshop door':'Open the bookshop door');announce(doorTarget?'The bookshop door opens. A warm light spills into the street.':'The bookshop door closes.');}
function navigate(place,trigger,page=0){
 closePostcard(false);closeJournal(false);selectView(place==='bench'?'bench':place==='journal'?'journal':place==='door'?'door':'balcony');
 if(place==='door'){toggleDoor();return;}if(place==='balcony')return;
 pendingPanel=setTimeout(()=>{pendingPanel=0;if(place==='bench')openPostcard(trigger);else openJournal(page,trigger);},!renderer||reducedMotion?0:1050);
}
all('[data-action]').forEach(b=>b.onclick=()=>navigate(b.dataset.action,b));all('.hotspot').forEach(b=>b.onclick=()=>navigate(b.dataset.place,b));
updateJournal(0);

// Actual model targets, with pointer-drag rejection so orbiting never opens a story.
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),targets=[street.bench,...(architecture.interactiveMeshes??[])],architecturalOccluders=[];scene.updateMatrixWorld(true);
architecture.group.traverse(o=>{if(o.isMesh&&o.visible){const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.some(m=>m.visible&&m.opacity>.05))architecturalOccluders.push(o);}});
function hitAt(event){
 const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
 const hits=raycaster.intersectObjects(targets,true);if(!hits.length)return null;
 const occluder=raycaster.intersectObjects(architecturalOccluders,false)[0];
 for(const hit of hits){
  if(occluder&&occluder.distance<hit.distance-.06)continue;
  let o=hit.object;while(o&&!o.userData.action)o=o.parent;
  if(o)return {action:o.userData.action,page:o.userData.page??0};
 }
 return null;
}
let press=null,lastHover=0;const activePointers=new Set();
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;activePointers.add(e.pointerId);if(activePointers.size===1)press={x:e.clientX,y:e.clientY,id:e.pointerId,drag:false};else if(press)press.drag=true;});
canvas.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>7)press.drag=true;if(!press&&performance.now()-lastHover>110&&renderer){lastHover=performance.now();canvas.style.cursor=hitAt(e)?'pointer':'grab';}});
canvas.addEventListener('pointerup',e=>{if(e.button!==0)return;const p=press;activePointers.delete(e.pointerId);press=null;if(renderer&&p&&!p.drag&&p.id===e.pointerId&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<7){const hit=hitAt(e);if(hit)navigate(hit.action,canvas,hit.page);}});
canvas.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);press=null;});
controls.addEventListener('start',()=>{clearPending();cameraMove=null;stopEvening();stopOrbit();});
canvas.addEventListener('keydown',e=>{
 if(!renderer)return;const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));let moved=true;
 if(e.key==='ArrowLeft')s.theta-=.1;else if(e.key==='ArrowRight')s.theta+=.1;else if(e.key==='ArrowUp')s.phi=Math.max(controls.minPolarAngle,s.phi-.07);else if(e.key==='ArrowDown')s.phi=Math.min(controls.maxPolarAngle,s.phi+.07);else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.9);return;}else if(e.key==='-'){e.preventDefault();zoom(1.1);return;}else if(e.key==='Home'){e.preventDefault();backToStreet();return;}else moved=false;
 if(moved){e.preventDefault();clearPending();stopEvening();stopOrbit();cameraMove=null;camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();}
});
const hotspotData=[
 {id:'bench',p:new THREE.Vector3(-.82,1.7,3.7),n:new THREE.Vector3(0,0,1)},
 {id:'journal',p:(architecture.focus.journal??new THREE.Vector3(.3,1.5,2.9)).clone().add(new THREE.Vector3(0,.465,0)),n:new THREE.Vector3(0,0,1)},
 {id:'door',p:entry.clone().add(new THREE.Vector3(.2,.2,.2)),n:new THREE.Vector3(1,0,1).normalize()},
 {id:'balcony',p:architecture.focus.balcony.clone().add(new THREE.Vector3(0,.465,0)),n:new THREE.Vector3(1,0,1).normalize()}
].map(h=>({...h,button:$(`[data-place=${h.id}]`)}));
const projected=new THREE.Vector3(),direction=new THREE.Vector3();
function updateHotspots(){for(const h of hotspotData){projected.copy(h.p).project(camera);const x=(projected.x*.5+.5)*viewportWidth,y=(-projected.y*.5+.5)*viewportHeight;direction.copy(camera.position).sub(h.p).normalize();const mobile=viewportWidth<700;const hidden=!renderer||postcard.open||projected.z>1||projected.z< -1||direction.dot(h.n)<.08||x<(mobile?18:300)||x>viewportWidth-30||y<(mobile?(viewportHeight>740?235:200):25)||y>viewportHeight-(mobile?(viewportHeight>740?295:276):75)||(journal.open&&(mobile||x>viewportWidth-420));h.button.classList.toggle('is-hidden',hidden);h.button.style.left=x+'px';h.button.style.top=y+'px';h.button.tabIndex=hidden?-1:0;}}
const desiredOffsetX=()=>viewportWidth<700?0:journal.open?56:-Math.min(138,viewportWidth*.105);
function applyViewOffset(){camera.setViewOffset(viewportWidth,viewportHeight,viewOffsetX,viewOffsetY,viewportWidth,viewportHeight);camera.updateProjectionMatrix();}
let lastWidth=0,lastHeight=0;
function resize(){const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;viewportWidth=r.width;viewportHeight=r.height;camera.aspect=r.width/r.height;
 const mobile=r.width<700,fit=mobile?mobileOverviewFit(r.width,r.height):null;
 overviewDistance=mobile?fit.distance:r.width/r.height<1.35?37:34;controls.maxDistance=mobile?fit.maxDistance:55;camera.far=Math.max(180,controls.maxDistance+30);
 viewOffsetX=desiredOffsetX();viewOffsetY=mobile?fit.offsetY:0;applyViewOffset();renderer?.setSize(r.width,r.height,false);
 if(!lastWidth)selectView('overview',true);
 else if(view==='overview'&&(Math.abs(r.width-lastWidth)>2||Math.abs(r.height-lastHeight)>2)){const direction=camera.position.clone().sub(controls.target).normalize();camera.position.copy(controls.target).addScaledVector(direction,overviewDistance);cameraMove=null;controls.update();}
 lastWidth=r.width;lastHeight=r.height;updateHotspots();
}
new ResizeObserver(resize).observe(stage);resize();updatePetals(0);
$('#fullscreen').hidden=!document.fullscreenEnabled;$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#experience').requestFullscreen();}catch{announce('Full screen is not available in this browser.');}};
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit full screen':'Enter full screen');resize();});
$('#retry').onclick=()=>location.reload();
if(!renderer){controls.enabled=false;all('.icon-button,.view-button,[data-action=door],#evening').forEach(b=>b.disabled=true);$('#hotspots').hidden=true;announce('WebGL is unavailable in this browser. The harbour postcard and corner journal are available from the left-hand links.');}

const clock=new THREE.Clock();let elapsed=0,lastShadow=0,lastHotspots=0,firstFrame=true;
function shadowUpdate(){if(renderer)renderer.shadowMap.needsUpdate=true;}
function animate(){
 requestAnimationFrame(animate);if(document.hidden){clock.getDelta();return;}const raw=clock.getDelta(),dt=Math.min(raw,.07);elapsed+=raw;
 if(cameraMove){const m=cameraMove;m.t+=raw;const t=Math.min(m.t/m.duration,1),e=t*t*(3-2*t);camera.position.lerpVectors(m.from,m.to,e);controls.target.lerpVectors(m.targetFrom,m.targetTo,e);if(t===1)cameraMove=null;}
 if(lightTween){const t=lightTween;t.t+=raw;const p=Math.min(t.t/t.duration,1),e=p*p*(3-2*p);current=blendLights(t.start,t.end,e);lightValue=THREE.MathUtils.lerp(t.fromValue,t.toValue,e);applyLight();if(elapsed-lastShadow>.16||p===1){shadowUpdate();lastShadow=elapsed;}if(p===1)lightTween=null;}
 if(eveningOn){eveningTime+=raw;if(eveningTime>=0){lightValue=Math.min(eveningTime/28,1);lightTween=null;current=lightAt(lightValue);lightLabels(lightValue);applyLight();if(elapsed-lastShadow>.18){shadowUpdate();lastShadow=elapsed;}if(lightValue===1){stopEvening();stopOrbit();announce('The evening has settled. Stay as long as you like.');}}}
 if(Math.abs(doorAmount-doorTarget)>.001){doorAmount=THREE.MathUtils.damp(doorAmount,doorTarget,reducedMotion?1000:4.8,dt);if(Math.abs(doorAmount-doorTarget)<.001)doorAmount=doorTarget;for(const d of architecture.doors??[])d.pivot.rotation.y=THREE.MathUtils.lerp(d.closedAngle,d.openAngle,doorAmount);updateInterior();if(elapsed-lastShadow>.08){shadowUpdate();lastShadow=elapsed;}}
 updatePetals(petalsOn?dt:0);
 // Moving foliage must also move its dappled shadows. The heavy shadow maps are
 // refreshed at a bounded cadence while branch deformation stays smooth.
 if(petalsOn&&elapsed-lastShadow>(viewportWidth<700?.34:.20)){shadowUpdate();lastShadow=elapsed;}
 const offsetTarget=desiredOffsetX();if(Math.abs(viewOffsetX-offsetTarget)>.02){viewOffsetX=THREE.MathUtils.damp(viewOffsetX,offsetTarget,reducedMotion?1000:5,dt);applyViewOffset();}
 controls.update(raw);if(elapsed-lastHotspots>.04){camera.updateMatrixWorld();updateHotspots();lastHotspots=elapsed;}renderer?.render(scene,camera);
 if(firstFrame){firstFrame=false;$('#loader').classList.add('hidden');stage.dataset.ready='true';if(renderer)announce('The street is ready. Explore the bench, the posters, the door and the veranda.');}
}
shadowUpdate();
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error-panel').hidden=false;announce('The graphics connection was interrupted. The journal and postcard remain available.');});
canvas.addEventListener('webglcontextrestored',()=>{$('#error-panel').hidden=true;shadowUpdate();announce('The street is ready again.');});
document.addEventListener('visibilitychange',()=>{document.hidden?audio.pause():audio.resume();});
window.addEventListener('pagehide',event=>{audio.pause();if(!event.persisted)controls.dispose();});window.addEventListener('pageshow',()=>audio.resume());
animate();
