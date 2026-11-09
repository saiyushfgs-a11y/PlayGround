import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.querySelector('#game-canvas');
const mapCanvas = document.querySelector('#map-canvas');
const mapCtx = mapCanvas.getContext('2d');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9bc6d1');
scene.fog = new THREE.FogExp2('#9bc6d1', 0.0031);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1200);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
scene.add(new THREE.HemisphereLight(0xdaf1ff, 0x42633f, 2.15));
const sun = new THREE.DirectionalLight(0xfff1d2, 3.2);
sun.position.set(-80, 120, 55); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -100; sun.shadow.camera.right = 100; sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
scene.add(sun);

const trackPoints = [
  [-8, 0, 100], [-50, 0, 88], [-87, 0, 49], [-91, 0, 5], [-73, 1, -37], [-37, 1, -60],
  [0, 0, -50], [29, 0, -70], [66, 0, -65], [94, 1, -35], [91, 0, 8], [65, 0, 37],
  [70, 0, 72], [43, 0, 101], [12, 0, 111]
].map(p => new THREE.Vector3(...p));
const curve = new THREE.CatmullRomCurve3(trackPoints, true, 'catmullrom', 0.35);
const samples = 720;
const centers = curve.getPoints(samples);
const trackWidth = 15;
const length = curve.getLength();
function frameAt(t) {
  const u = ((t % 1) + 1) % 1;
  const center = curve.getPointAt(u);
  const tangent = curve.getTangentAt(u).normalize();
  const right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
  return { center, tangent, right };
}
function stripGeometry(inner, outer, y = 0) {
  const verts = [], uvs = [], indices = [];
  for (let i=0; i<=samples; i++) {
    const t=i/samples, f=frameAt(t);
    for (const w of [inner, outer]) { const p=f.center.clone().addScaledVector(f.right,w); p.y += y; verts.push(p.x,p.y,p.z); uvs.push(t*80,w/10); }
    if (i<samples) { const a=i*2,b=a+1,c=a+2,d=a+3; indices.push(a,c,b,b,c,d); }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function mat(color, roughness=1, extra={}) { return new THREE.MeshStandardMaterial({ color, roughness, ...extra }); }
const asphalt = mat('#444b4c',0.93), shoulder=mat('#d7d0bc'), white=mat('#f3eee1'), yellow=mat('#e6c95d');
const road=new THREE.Mesh(stripGeometry(-trackWidth/2,trackWidth/2,0.07),asphalt);road.receiveShadow=true;scene.add(road);
const leftShoulder=new THREE.Mesh(stripGeometry(-trackWidth/2-2,-trackWidth/2,0.055),shoulder);leftShoulder.receiveShadow=true;scene.add(leftShoulder);
const rightShoulder=new THREE.Mesh(stripGeometry(trackWidth/2,trackWidth/2+2,0.055),shoulder);rightShoulder.receiveShadow=true;scene.add(rightShoulder);
const edgeL=new THREE.Mesh(stripGeometry(-trackWidth/2+.1,-trackWidth/2+.42,.09),white);const edgeR=new THREE.Mesh(stripGeometry(trackWidth/2-.42,trackWidth/2-.1,.09),white);scene.add(edgeL,edgeR);
const grass = new THREE.Mesh(new THREE.PlaneGeometry(1500,1500),mat('#668d56'));grass.rotation.x=-Math.PI/2;grass.position.y=-.12;grass.receiveShadow=true;scene.add(grass);
// soft rolling hills and distant pine silhouettes
for(let i=0;i<34;i++){
  const a=i/34*Math.PI*2, r=155+(i%4)*15, h=16+(i%5)*7;
  const hill=new THREE.Mesh(new THREE.IcosahedronGeometry(h,2),mat(i%2?'#789b6b':'#6f9164'));
  hill.position.set(Math.cos(a)*r,-h*.42,Math.sin(a)*r);hill.scale.set(1.7,.58,1.2);hill.receiveShadow=true;scene.add(hill);
}
const treeMat1=mat('#24503b'),treeMat2=mat('#316447'),trunkMat=mat('#6a4930');
const trunkGeo=new THREE.CylinderGeometry(.25,.42,2.4,6), foliageGeo=new THREE.ConeGeometry(2.4,6,7), foliageGeo2=new THREE.ConeGeometry(1.8,4.2,7);
let seed=3021;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<240;i++){
 const t=rand(),f=frameAt(t),side=rand()<.5?-1:1,dist=13+rand()*35;
 const p=f.center.clone().addScaledVector(f.right,side*dist);const s=.7+rand()*.95;
 const trunk=new THREE.Mesh(trunkGeo,trunkMat);trunk.position.set(p.x,1.1,p.z);trunk.scale.setScalar(s);trunk.castShadow=true;scene.add(trunk);
 const top=new THREE.Mesh(foliageGeo,rand()<.5?treeMat1:treeMat2);top.position.set(p.x,4.2*s,p.z);top.scale.setScalar(s);top.castShadow=true;scene.add(top);
 const top2=new THREE.Mesh(foliageGeo2,rand()<.5?treeMat1:treeMat2);top2.position.set(p.x,6.1*s,p.z);top2.scale.setScalar(s);top2.castShadow=true;scene.add(top2);
}
// roadside alternating race curbs
const curbMatA=mat('#efeee5'),curbMatB=mat('#e95643');
for(const side of [-1,1]) for(let i=0;i<samples;i+=3){
 const f=frameAt(i/samples),p=f.center.clone().addScaledVector(f.right,side*(trackWidth/2+1.05));
 const box=new THREE.Mesh(new THREE.BoxGeometry(1.25,.25,1.15),Math.floor(i/3)%2?curbMatA:curbMatB);box.position.set(p.x,.17,p.z);box.rotation.y=Math.atan2(f.tangent.x,f.tangent.z);box.receiveShadow=true;scene.add(box);
}
// start / finish stripe
const start=frameAt(0);const line=new THREE.Mesh(new THREE.PlaneGeometry(trackWidth,1.05),white);line.rotation.x=-Math.PI/2;line.rotation.z=-Math.atan2(start.tangent.x,start.tangent.z);line.position.copy(start.center);line.position.y=.12;scene.add(line);
for(let i=0;i<10;i++){
 const tile=new THREE.Mesh(new THREE.PlaneGeometry(trackWidth/10,1.05),i%2?mat('#18242a'):white);tile.rotation.x=-Math.PI/2;tile.rotation.z=line.rotation.z;tile.position.copy(start.center);tile.position.y=.125;tile.position.addScaledVector(start.right,(i-4.5)*(trackWidth/10));scene.add(tile);
}
// trackside boards on scenic turns
for(const t of [.13,.29,.45,.62,.78,.9]){
 const f=frameAt(t);for(const side of [-1,1]){const p=f.center.clone().addScaledVector(f.right,side*11);const board=new THREE.Mesh(new THREE.BoxGeometry(4,.8,.2),mat('#f2e9d8'));board.position.set(p.x,.9,p.z);board.rotation.y=Math.atan2(f.tangent.x,f.tangent.z);scene.add(board);}
}
// kart with vivid red bodywork, number panel and four visible wheels
const kart=new THREE.Group();scene.add(kart);
const red=mat('#ed3d2c',.48), dark=mat('#20252a',.67), tire=mat('#151719',.95), gold=mat('#f5cd5a',.4), visor=mat('#152a31',.2,{metalness:.2});
function box(parent,geo,material,pos,scale){const m=new THREE.Mesh(geo,material);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
box(kart,new THREE.BoxGeometry(1.7,.55,2.15),red,[0,.78,0]);
box(kart,new THREE.BoxGeometry(1.15,.42,.8),red,[0,1.18,.12]);
box(kart,new THREE.SphereGeometry(.48,16,12),mat('#ffcf9f'),[0,1.6,.15],[.9,1,.85]);
box(kart,new THREE.BoxGeometry(1.2,.22,.52),visor,[0,1.68,-.08]);
box(kart,new THREE.BoxGeometry(.8,.19,.78),dark,[0,1.08,-.88]);
box(kart,new THREE.BoxGeometry(.52,.14,.12),gold,[0,.78,1.11]);
box(kart,new THREE.BoxGeometry(1.95,.16,.28),dark,[0,.54,-.84]);
for(const x of [-.98,.98])for(const z of [-.67,.68]){
 const w=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.22,16),tire);w.rotation.z=Math.PI/2;w.position.set(x,.43,z);w.castShadow=true;kart.add(w);
 const hub=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.24,12),gold);hub.rotation.z=Math.PI/2;hub.position.set(x,.43,z);kart.add(hub);
}
const flameMat=new THREE.MeshBasicMaterial({color:'#ff9c36'});const flames=[];
for(const x of [-.48,.48]){const fl=new THREE.Mesh(new THREE.ConeGeometry(.15,.55,8),flameMat);fl.rotation.x=-Math.PI/2;fl.position.set(x,.52,-1.23);kart.add(fl);flames.push(fl);}
// ambient details
const cloudMat=new THREE.MeshStandardMaterial({color:'#e4f0e9',roughness:1});
for(let i=0;i<24;i++){const c=new THREE.Mesh(new THREE.SphereGeometry(3+rand()*4,8,7),cloudMat);c.scale.set(1.9,.45,1);c.position.set((rand()-.5)*430,45+rand()*45,(rand()-.5)*430);scene.add(c);}

const state={mode:'menu',time:60,progress:0,lateral:0,speed:0,lap:0,best:Infinity,lapElapsed:0,maxSpeed:0,driftCharge:0,boost:0,steer:0,shake:0,last:performance.now(),countToken:0};
try{state.best=Number(localStorage.getItem('turboCircuitBest'))||Infinity}catch{}
const $=s=>document.querySelector(s);
function formatTime(seconds){if(!Number.isFinite(seconds))return '--:--.--';const m=Math.floor(seconds/60),s=seconds%60;return `${String(m).padStart(2,'0')}:${s.toFixed(2).padStart(5,'0')}`;}
function syncBest(){const text=formatTime(state.best);$('#best-lap').textContent=text;$('#menu-best').textContent=text;}
syncBest();
const keys=new Set(), touch={left:false,right:false,accelerate:false,brake:false,drift:false};
function down(e){const k=e.key.toLowerCase();keys.add(k);if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(k==='p')togglePause();if(k==='r'&&state.mode!=='menu')resetGame();}
function up(e){keys.delete(e.key.toLowerCase());}
window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',()=>keys.clear());
document.querySelectorAll('.mobile-controls button').forEach(b=>{const c=b.dataset.control;const set=v=>{touch[c]=v;b.classList.toggle('pressed',v);};b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);set(true)});b.addEventListener('pointerup',()=>set(false));b.addEventListener('pointercancel',()=>set(false));b.addEventListener('lostpointercapture',()=>set(false));});
let audio=null,soundOn=true;
function beep(freq=520,duration=.08,volume=.04){if(!soundOn)return;try{audio ||= new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.value=volume;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.stop(audio.currentTime+duration)}catch{}}
$('#sound-toggle').addEventListener('click',()=>{soundOn=!soundOn;$('#sound-toggle span').textContent=soundOn?'SOUND ON':'SOUND OFF';if(soundOn)beep();});
function startGame(){if(state.mode==='racing'||state.mode==='countdown')return;$('#start-screen').classList.remove('visible');$('#finish-screen').classList.remove('visible');$('#controls-hint').style.opacity='1';state.mode='countdown';state.time=60;state.progress=0;state.lateral=0;state.speed=0;state.lap=0;state.lapElapsed=0;state.maxSpeed=0;state.driftCharge=0;state.boost=0;state.countToken++;runCountdown(state.countToken);}
async function runCountdown(token){for(const n of ['3','2','1','GO!']){if(token!==state.countToken)return;const el=$('#countdown');el.textContent=n;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');beep(n==='GO!'?880:440,.13,.06);await new Promise(r=>setTimeout(r,760));}if(state.mode==='countdown')state.mode='racing';}
function resetGame(){state.countToken++;state.mode='menu';state.speed=0;state.progress=0;state.lateral=0;state.time=60;$('#countdown').classList.remove('show');$('#finish-screen').classList.remove('visible');$('#start-screen').classList.add('visible');$('#pause-badge').classList.remove('visible');$('#controls-hint').style.opacity='1';}
function togglePause(){if(state.mode==='racing'){state.mode='paused';$('#pause-badge').classList.add('visible')}else if(state.mode==='paused'){state.mode='racing';$('#pause-badge').classList.remove('visible');state.last=performance.now()}}
$('#start-button').addEventListener('click',startGame);$('#retry-button').addEventListener('click',startGame);
function finish(){state.mode='finished';$('#pause-badge').classList.remove('visible');$('#controls-hint').style.opacity='0';$('#result-laps').textContent=`${Math.min(state.lap,3)} / 3`;$('#result-best').textContent=formatTime(state.best);$('#result-speed').textContent=`${Math.round(state.maxSpeed*3.6).toString().padStart(3,'0')} KM/H`;if(state.lap>=3){$('#finish-title').textContent='CIRCUIT CLEARED';$('#finish-copy').textContent='Three laps. One clean run. That track has a new name.'}else{$('#finish-title').textContent="TIME'S UP";$('#finish-copy').textContent='The circuit is yours. Find a faster line next time.'}$('#finish-screen').classList.add('visible');beep(state.lap>=3?880:220,.4,.06);}
$('#track-toast').textContent='';

const clock=new THREE.Clock();
function drawMap(){const w=mapCanvas.width,h=mapCanvas.height;mapCtx.clearRect(0,0,w,h);mapCtx.fillStyle='rgba(8,24,34,.5)';mapCtx.fillRect(0,0,w,h);const pts=centers;let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(const p of pts){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z)}const scale=Math.min((w-30)/(maxX-minX),(h-22)/(maxZ-minZ));const ox=(w-(maxX-minX)*scale)/2-minX*scale,oy=(h-(maxZ-minZ)*scale)/2+maxZ*scale;mapCtx.lineCap='round';mapCtx.lineJoin='round';mapCtx.beginPath();pts.forEach((p,i)=>{const x=ox+p.x*scale,y=oy-p.z*scale;i?mapCtx.lineTo(x,y):mapCtx.moveTo(x,y)});mapCtx.closePath();mapCtx.strokeStyle='rgba(241,235,213,.62)';mapCtx.lineWidth=trackWidth*scale+3;mapCtx.stroke();mapCtx.strokeStyle='#525d5b';mapCtx.lineWidth=trackWidth*scale;mapCtx.stroke();const f=frameAt(state.progress),x=ox+f.center.x*scale,y=oy-f.center.z*scale;mapCtx.beginPath();mapCtx.arc(x,y,4,0,Math.PI*2);mapCtx.fillStyle='#c2f267';mapCtx.shadowColor='#c2f267';mapCtx.shadowBlur=8;mapCtx.fill();mapCtx.shadowBlur=0;}
function update(dt){
 const driving=state.mode==='racing';
 if(driving){
  state.time=Math.max(0,state.time-dt);state.lapElapsed+=dt;
  const accel=keys.has('w')||keys.has('arrowup')||touch.accelerate;
  const brake=keys.has('s')||keys.has('arrowdown')||touch.brake;
  const left=keys.has('a')||keys.has('arrowleft')||touch.left;
  const right=keys.has('d')||keys.has('arrowright')||touch.right;
  const drifting=keys.has(' ')||touch.drift;
  const target=accel?68:0;state.speed+=((target-state.speed)*(accel?.83:.44))*dt;
  if(brake)state.speed=Math.max(0,state.speed-48*dt);
  const speedRatio=Math.min(1,state.speed/34);
  state.steer=(right?1:0)-(left?1:0);
  const steerFactor=(drifting?1.38:1)*(.35+speedRatio*.65);
  state.lateral+=state.steer*steerFactor*dt*14;
  state.lateral*=Math.pow(.985,dt*60);
  if(Math.abs(state.lateral)>trackWidth*.43){state.speed=Math.max(10,state.speed-25*dt);state.shake=.12;}
  if(drifting&&Math.abs(state.steer)>.2&&state.speed>14){state.driftCharge=Math.min(1,state.driftCharge+dt*.42);}
  else if(state.driftCharge>.36){state.boost=Math.max(state.boost,1.25);state.driftCharge=0;beep(680,.13,.025)}else state.driftCharge=Math.max(0,state.driftCharge-dt*.42);
  if(state.boost>0){state.boost-=dt;state.speed=Math.min(76,state.speed+25*dt)}
  const prev=state.progress;state.progress+=state.speed*dt/length;
  if(state.progress>=1){state.progress-=1;state.lap++;state.lapElapsed=0;beep(720,.23,.05);$('#lap-number').textContent=String(Math.min(state.lap+1,3));if(state.lap>=3){finish();}}
  state.maxSpeed=Math.max(state.maxSpeed,state.speed);
  if(state.time<=0&&state.mode==='racing')finish();
  $('#timer').innerHTML=`${Math.floor(state.time).toString().padStart(2,'0')}<span>.${Math.floor((state.time%1)*100).toString().padStart(2,'0')}</span>`;
  $('#timer-fill').style.width=`${state.time/60*100}%`;
  $('#timer-fill').style.background=state.time<10?'#ff5743':'#c2f267';
  $('#speed-value').textContent=String(Math.round(state.speed*3.6)).padStart(3,'0');
  const boost=$('#boost-meter');boost.classList.toggle('active',state.driftCharge>.04||state.boost>0);boost.querySelector('i').style.width=`${state.boost>0?Math.min(100,state.boost/1.25*100):state.driftCharge*100}%`;
 }
 const f=frameAt(state.progress);const pos=f.center.clone().addScaledVector(f.right,state.lateral);pos.y=.04;
 kart.position.copy(pos);const heading=Math.atan2(f.tangent.x,f.tangent.z);kart.rotation.y=heading-state.steer*.12*Math.min(1,state.speed/25);kart.visible=state.mode!=='menu';
 flames.forEach(fl=>{fl.visible=driving&&(keys.has('w')||keys.has('arrowup')||touch.accelerate||state.boost>0);fl.scale.y=.7+Math.random()*.9;});
 const chase=pos.clone().addScaledVector(f.tangent,-9.6).add(new THREE.Vector3(0,5.2,0));
 const look=pos.clone().addScaledVector(f.tangent,8).add(new THREE.Vector3(0,1,0));
 const smoothing=1-Math.exp(-dt*4.4);camera.position.lerp(chase,smoothing);camera.lookAt(look);camera.fov=THREE.MathUtils.lerp(camera.fov,60+state.speed*.075,1-Math.exp(-dt*2));camera.updateProjectionMatrix();
 drawMap();
}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.05,(now-state.last)/1000||0);state.last=now;if(state.mode!=='paused')update(dt);renderer.render(scene,camera);}
requestAnimationFrame(animate);
