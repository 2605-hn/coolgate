import * as THREE from 'three';
import { buildRoom, SPAWN, BOUNDS } from './room.js';
import { FirstPersonControls } from './controls.js';
import { moveWithCollision } from './collision.js';

const $ = id => document.getElementById(id);
const canvas = $('scene'), overlay = $('overlay'), startBtn = $('startBtn');
const chapter = new URLSearchParams(location.search).get('chapter') === '2' ? 2 : 1;
const overlayText = $('overlayText'), overlayMsg = $('overlayMsg');
const hud = $('hud'), prompt = $('prompt'), message = $('message');
const puzzle = $('puzzle'), puzzleCode = $('puzzleCode'), puzzleFeedback = $('puzzleFeedback');
const cluesLabel = $('clues'), objective = $('objective'), ending = $('ending');
let renderer, scene, camera, controls, room, flashlight, ghost, ghostLight, smoke;
let started = false, ended = false, flashlightOn = true, audio = null, puzzleSolved = false, puzzleOpen = false;
let messageUntil = 0, lastTime = performance.now(), elapsed = 0, collected = new Set();
let storyBeat = 0, storyBeatUntil = 0;
let crouching = false, lowStaminaWarned = false;
let ghostState = 'dormant', stateTime = 0, chaseTime = 0, noise = 0, noiseCooldown = 0;
let lastNoise = new THREE.Vector3(SPAWN.x, 0, SPAWN.z), nextKnock = 11, footstepClock = 0;
const ghostPos = { x: 7.7, z: -3.1 };
let storyStalkSpots = []; 
let EXIT = new THREE.Vector3(-2, 0, 4.2);
let clueData = [
  { id:'letter', name:'Lá thư nhàu', detail:'Nét chữ của mẹ: “Nếu con quay về, đừng tin lời kể về đêm cha mất tích. Ba tiếng mõ là dấu hiệu chuyến đò đã cập bến.” Bức thư bị xé mất đoạn cuối.', pos:new THREE.Vector3(-4.5,.10,-1.7), color:0xd7b56b },
  { id:'incense', name:'Chân nhang lạ', detail:'Trên bát nhang có bốn chân nhang mới, nhưng bài vị chỉ có ba cái tên. Mặt gỗ phía sau bị cào: “ĐỪNG ĐỂ HỌ QUÊN NGƯỜI THỨ TƯ”.', pos:new THREE.Vector3(-2,1.18,-3.75), color:0xff8a42 },
  { id:'key', name:'Chìa khóa rỉ', detail:'Mặt chìa khắc “BẾN ĐÒ — 03:17”. Khi cầm lên, mày nhận ra vết khắc nhỏ ở cán: tên mình, dù không nhớ từng đến nơi này.', pos:new THREE.Vector3(5.8,.20,3.0), color:0xe5c15e }
];
const clueMeshes = [];
const stalkSpots = [
  new THREE.Vector3(6.9,0,-2.9), new THREE.Vector3(7.8,0,2.6),
  new THREE.Vector3(2.8,0,-2.7), new THREE.Vector3(-4.8,0,2.3),
  new THREE.Vector3(1.0,0,3.2), new THREE.Vector3(-5.0,0,-3.1)
];

function say(text, ms=3000) { message.textContent=text; message.style.display='block'; messageUntil=performance.now()+ms; }
function setObjective(text) { objective.textContent=text; }
function buildDock(anisotropy=4) {
  const group = new THREE.Group(), colliders = [];
  const wood = new THREE.MeshStandardMaterial({color:0x30251d, roughness:.96});
  const wetWood = new THREE.MeshStandardMaterial({color:0x49372a, roughness:.68});
  const oldWood = new THREE.MeshStandardMaterial({color:0x211d19, roughness:1});
  const water = new THREE.MeshStandardMaterial({color:0x07151b, roughness:.24, metalness:.18});
  const mud = new THREE.MeshStandardMaterial({color:0x20231e, roughness:1});
  let ferryHull, lantern, farLantern;
  function box(w,h,d,mat,x,y,z,collide=false){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;group.add(m);
    if(collide)colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});return m;
  }
  function tree(x,z,scale=1){
    const trunk= new THREE.Mesh(new THREE.CylinderGeometry(.18*scale,.32*scale,2.5*scale,7),oldWood);trunk.position.set(x,1.25*scale,z);trunk.castShadow=true;group.add(trunk);
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25*scale,1),new THREE.MeshStandardMaterial({color:0x101b16,roughness:1}));crown.position.set(x,2.65*scale,z);crown.scale.set(1.2, .8, 1);crown.castShadow=true;group.add(crown);
    colliders.push({minX:x-.38*scale,maxX:x+.38*scale,minZ:z-.38*scale,maxZ:z+.38*scale});
  }
  // Expanded riverside play space: muddy village edge, several landmarks and a long pier.
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,56),mud);ground.rotation.x=-Math.PI/2;ground.position.set(0,-.08,-1);ground.receiveShadow=true;group.add(ground);
  const river=new THREE.Mesh(new THREE.PlaneGeometry(60,30),water);river.rotation.x=-Math.PI/2;river.position.set(0,-.045,-20);group.add(river);
  // Shoreline stones and reeds give the river a readable edge.
  for(let i=0;i<42;i++){
    const x=-28+Math.random()*56, z=-5.8+Math.random()*1.5;
    const reed=new THREE.Mesh(new THREE.CylinderGeometry(.018,.035,.45+Math.random()*.55,4),new THREE.MeshStandardMaterial({color:0x38402a,roughness:1}));
    reed.position.set(x,.28,z);reed.rotation.z=(Math.random()-.5)*.18;group.add(reed);
  }
  for(let i=0;i<24;i++){
    const x=-27+Math.random()*54,z=-6+Math.random()*2;
    const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.18+Math.random()*.22,0),oldWood);stone.position.set(x,.02,z);stone.scale.y=.45;group.add(stone);
  }
  // Main pier: long enough to feel exposed, with a small cross-platform.
  for(let i=0;i<11;i++)box(.42,.18,20,wetWood,-2.5+i*.5,.02,-14,false);
  for(const z of [-7,-12,-17,-22])for(const x of [-3,3])box(.34,1.35,.34,wood,x,-.1,z,true);
  for(const x of [-3.1,3.1])box(.16,1.05,20,oldWood,x,.1,-14,true);
  // Pier cross-platform and side mooring branch.
  for(let i=0;i<9;i++)box(7,.16,.42,wetWood,0,.02,-20+i*.48,false);
  for(const x of [-3.2,3.2])for(const z of [-20,-17.8])box(.3,1.1,.3,wood,x,0,z,true);
  for(let i=0;i<5;i++)box(.38,.16,7,wetWood,7+i*.42,.02,-13,false);
  for(const z of [-10,-16])box(.3,1.1,.3,wood,8,0,z,true);
  // Ferry tied beside the far end of the pier.
  const hull=new THREE.Mesh(new THREE.CapsuleGeometry(.72,2.8,5,10),wood);hull.scale.set(1,.34,1.15);hull.rotation.y=Math.PI/2;hull.position.set(11,.12,-19);group.add(hull);ferryHull=hull;
  box(3.8,.12,.22,wetWood,11,.3,-19);box(.12,1.0,.12,wood,11,.35,-19);
  for(const x of [9.4,12.6])box(.16,.65,.16,wood,x,.12,-19,true);
  // Ticket hut on the left bank, with a roof, counter and warm lantern.
  box(5,.2,.25,wood,-15,2.7,0);box(.25,2.7,.25,wood,-17.4,0,0,true);box(.25,2.7,.25,wood,-12.6,0,0,true);
  box(4.8,.16,.2,wood,-15,2.45,2.2);box(4.8,.16,.2,wood,-15,2.45,-2.2);
  box(2.5,.85,.5,oldWood,-15,.15,-.8,true);
  lantern=new THREE.PointLight(0xff9c49,1.1,10,2);lantern.position.set(-15,2.1,0);group.add(lantern);
  // Small ancestral shrine and a second, distant light landmark.
  box(2.8,.18,2.2,oldWood,14,.1,3,true);box(2.2,1.7,.18,wood,14,1,2,true);box(2.2,.18,.18,wood,14,1.9,2);
  const altarLight=new THREE.PointLight(0xb65a32,.55,6,2);altarLight.position.set(14,1.5,3);group.add(altarLight);
  farLantern=new THREE.PointLight(0xffb45d,.7,8,2);farLantern.position.set(21,2,-3);group.add(farLantern);
  // Abandoned houses and tree line frame the larger area without sealing exploration routes.
  box(4,.2,.22,oldWood,20,2.4,7);box(.22,2.4,.22,oldWood,18,0,7,true);box(.22,2.4,.22,oldWood,22,0,7,true);
  box(3.8,.14,.18,oldWood,20,2.1,9);box(3.8,.14,.18,oldWood,20,2.1,5);
  for(const [x,z,k] of [[-24,8,1.3],[-21,-2,1.1],[-23,-13,1.2],[25,13,1.35],[24,-9,1.1],[17,17,1.25],[-8,17,1.1],[5,15,1.2]])tree(x,z,k);
  // Scattered fence fragments and mooring posts create navigational silhouettes.
  for(const [x,z] of [[-21,4],[-19,4],[-17,4],[23,4],[25,4],[19,12],[-24,-5]])box(.16,.85,.16,wood,x,0,z,true);
  for(const x of [-1.8,1.8]){box(.16,2.2,.16,wood,x,0,-6);}
  const rope=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,3.8,6),new THREE.MeshStandardMaterial({color:0x4a4134}));rope.rotation.z=Math.PI/2;rope.position.set(0,1.55,-6);group.add(rope);
  // Perimeter collision keeps the player on the expanded map.
  colliders.push(
    {minX:-30,maxX:30,minZ:26,maxZ:26.5},{minX:-30,maxX:-29.6,minZ:-28,maxZ:26},
    {minX:29.6,maxX:30,minZ:-28,maxZ:26},{minX:-30,maxX:30,minZ:-28,maxZ:-27.6}
  );
  const mistGeo=new THREE.BufferGeometry(), count=420, arr=new Float32Array(count*3);
  for(let i=0;i<count;i++){arr[i*3]=-29+Math.random()*58;arr[i*3+1]=.25+Math.random()*2.2;arr[i*3+2]=-27+Math.random()*48;}
  mistGeo.setAttribute('position',new THREE.BufferAttribute(arr,3));const mist=new THREE.Points(mistGeo,new THREE.PointsMaterial({color:0x9da8a5,size:.18,transparent:true,opacity:.13,depthWrite:false}));group.add(mist);
  return {group,colliders,triggerEvent(stage){if(stage>=2&&ferryHull)ferryHull.userData.unsettled=true;if(stage>=3&&lantern)lantern.userData.haunted=true;},update(t){
    if(lantern)lantern.intensity=lantern.userData.haunted?(.25+Math.abs(Math.sin(t*13))*.95):(.85+Math.sin(t*2.1)*.16);
    if(farLantern)farLantern.intensity=.55+Math.sin(t*1.4)*.12;
    if(ferryHull?.userData.unsettled){ferryHull.rotation.z=Math.sin(t*2.6)*.045;ferryHull.position.y=.12+Math.sin(t*3.2)*.045;}
    const a=mist.geometry.attributes.position.array;for(let i=0;i<count;i++){a[i*3]+=(Math.sin(t*.25+i)*.0008);if(a[i*3]>30)a[i*3]=-30;}mist.geometry.attributes.position.needsUpdate=true;
  },bounds:{minX:-30,maxX:30,minZ:-28,maxZ:26}};
}
function configureChapter() {
  if(chapter===1){
    document.title='Đêm Ở Vạn Đò — Chương 1: Nhà Từ Đường';
    $('overlayText').textContent='CHƯƠNG 1 · NHÀ TỪ ĐƯỜNG\nMười tám năm sau đêm cha biến mất ở bến Vạn Đò, mẹ để lại một bức thư rồi cũng bặt tin. Đêm nay, mày nhận được tin nhắn từ số điện thoại đã ngừng hoạt động: “Về nhà. Đừng để chuyến đò thứ tư rời bến.”\n\nTìm manh mối. Đừng tin mọi thứ mày nhìn thấy.';
    $('objective').textContent='Chương 1: Tìm 3 manh mối trong nhà.';
    clueData=[
      {id:'letter',name:'Lá thư nhàu',detail:'Nét chữ của mẹ: “Nếu con quay về, đừng tin lời kể về đêm cha mất tích. Ba tiếng mõ là dấu hiệu chuyến đò đã cập bến.” Bức thư bị xé mất đoạn cuối.',pos:new THREE.Vector3(-4.5,.10,-1.7),color:0xd7b56b},
      {id:'incense',name:'Chân nhang lạ',detail:'Trên bát nhang có bốn chân nhang mới, nhưng bài vị chỉ có ba cái tên. Mặt gỗ phía sau bị cào: “ĐỪNG ĐỂ HỌ QUÊN NGƯỜI THỨ TƯ”.',pos:new THREE.Vector3(-2,1.18,-3.75),color:0xff8a42},
      {id:'key',name:'Chìa khóa rỉ',detail:'Mặt chìa khắc “BẾN ĐÒ — 03:17”. Cán chìa có khắc tên mày, dù mày không nhớ từng đến nơi này.',pos:new THREE.Vector3(5.8,.20,3.0),color:0xe5c15e}
    ]; EXIT=new THREE.Vector3(-2,0,4.2); ghostPos.x=7.7;ghostPos.z=-3.1;
    storyStalkSpots=[new THREE.Vector3(6.9,0,-2.9),new THREE.Vector3(7.8,0,2.6),new THREE.Vector3(2.8,0,-2.7),new THREE.Vector3(-4.8,0,2.3),new THREE.Vector3(1,0,3.2),new THREE.Vector3(-5,0,-3.1)];
  } else {
    document.title='Đêm Ở Vạn Đò — Chương 2: Bến Đò';
    $('overlayText').textContent='CHƯƠNG 2 · BẾN ĐÒ VẠN ĐÒ\n03:17. Đúng giờ khắc trên chìa khóa, tiếng chuông vang lên từ chiếc đò không người. Cuốn sổ ghi chuyến đò đêm cha mất tích vẫn còn đây — và có vẻ ai đó đã ghi tên mày từ trước.\n\nTìm đủ ba dấu vết rồi rời khỏi bến. Nếu nghe ai gọi tên, đừng trả lời.';
    $('objective').textContent='Chương 2: Tìm 3 dấu vết quanh bến đò.';
    clueData=[
      {id:'ledger',name:'Sổ đò ướt',detail:'Trang ngày cha mất tích ghi bốn hành khách, nhưng chỉ có ba tên. Dòng thứ tư bị cạo đi; dưới ánh đèn pin, mày thấy nét mực hằn lại đúng tên mình. Chuyến đò rời bến lúc 03:17.',pos:new THREE.Vector3(-15,.95,-.8),color:0xd7b56b},
      {id:'oar',name:'Mái chèo gãy',detail:'Những vết cào nằm ở mặt trong, như có người bị nhốt dưới sàn đò. Ở đầu mái chèo còn buộc một dải vải trẻ con — giống hệt mảnh vải trong tấm ảnh cũ của mày.',pos:new THREE.Vector3(11,.55,-19),color:0xff8a42},
      {id:'bell',name:'Chuông đồng',detail:'Mặt trong chuông có dòng chữ gần như bị mài mất: “Người thứ tư không chết đuối. Họ đã giao nó cho dòng sông để đổi lấy bình yên.” Khi chạm vào chuông, mày nghe giọng cha thì thầm: “Cha đã quay lại tìm con.”',pos:new THREE.Vector3(0,.28,-10.8),color:0xe5c15e}
    ]; EXIT=new THREE.Vector3(0,0,-23.2); ghostPos.x=19;ghostPos.z=-8;
    storyStalkSpots=[new THREE.Vector3(19,0,-8),new THREE.Vector3(-22,0,-8),new THREE.Vector3(7,0,-17),new THREE.Vector3(-17,0,8),new THREE.Vector3(22,0,13),new THREE.Vector3(0,0,-24)];
  }
}

function buildClues() {
  const paper=new THREE.MeshStandardMaterial({color:0xbba77c,roughness:1});
  const red=new THREE.MeshStandardMaterial({color:0x6c211b,roughness:.95});
  const brass=new THREE.MeshStandardMaterial({color:0xb69a56,metalness:.55,roughness:.4});
  for(const c of clueData) {
    let mesh;
    if(c.id==='letter') { mesh=new THREE.Mesh(new THREE.BoxGeometry(.42,.035,.30),paper); mesh.rotation.y=.3; }
    else if(c.id==='incense') { mesh=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.2,10),red); }
    else { mesh=new THREE.Mesh(new THREE.TorusGeometry(.13,.035,8,16),brass); mesh.rotation.x=Math.PI/2; }
    mesh.position.copy(c.pos); mesh.castShadow=true; scene.add(mesh);
    const glow=new THREE.PointLight(c.color,.45,1.8,2); glow.position.copy(c.pos).add(new THREE.Vector3(0,.35,0)); scene.add(glow);
    c.mesh=mesh; c.glow=glow; clueMeshes.push(c);
  }
}
function buildGhost() {
  ghost = new THREE.Group();
  ghost.userData.parts = [];
  const dark = new THREE.MeshStandardMaterial({ color:0x080807, roughness:1, metalness:0, transparent:true, opacity:.96 });
  const skin = new THREE.MeshStandardMaterial({ color:0x181514, roughness:1, transparent:true, opacity:.92 });
  const robeGeo = new THREE.ConeGeometry(.48, 2.05, 12, 5);
  // Uneven hem and bent silhouette make the apparition feel less like a primitive cone.
  const pos = robeGeo.attributes.position;
  for (let i=0;i<pos.count;i++) {
    const y=pos.getY(i), x=pos.getX(i), z=pos.getZ(i);
    const wobble=Math.sin(x*17+z*11)*.045 + Math.cos(z*19)*.025;
    pos.setX(i,x+wobble*(1-y/2.05));
    if(y < -0.65) pos.setY(i,y+Math.sin(i*2.3)*.045);
  }
  robeGeo.computeVertexNormals();
  const robe = new THREE.Mesh(robeGeo,dark); robe.position.y=1.03; robe.castShadow=true; ghost.add(robe);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.23,.68,5,8),skin);
  torso.position.set(0,1.65,0); torso.rotation.z=-.13; ghost.add(torso); ghost.userData.parts.push(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.31,16,12),skin);
  head.position.set(.04,2.16,-.015); head.scale.set(.72,1.22,.78); head.rotation.z=-.18; ghost.add(head); ghost.userData.parts.push(head);
  const hair = new THREE.Mesh(new THREE.ConeGeometry(.38,.8,12,3),new THREE.MeshStandardMaterial({color:0x020202,roughness:1}));
  hair.position.set(.03,2.34,.04); hair.rotation.x=Math.PI; hair.rotation.z=-.12; ghost.add(hair); ghost.userData.parts.push(hair);
  // Long uneven arms, deliberately asymmetrical.
  for (const side of [-1,1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.075,.78,4,6),dark);
    arm.position.set(side*.43,1.43,0); arm.rotation.z=side===-1?-.62:.88; ghost.add(arm); ghost.userData.parts.push(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),skin);
    hand.position.set(side*.78,.94,.02); hand.scale.set(.6,1.6,.65); ghost.add(hand); ghost.userData.parts.push(hand);
  }
  // Thin hanging strands from the robe, swaying as the ghost moves.
  for(let i=0;i<5;i++) {
    const x=(i-2)*.16, curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(x,.7,0),new THREE.Vector3(x+(i%2?-.08:.08),.42,.04),new THREE.Vector3(x+(i%2?.12:-.1),.12,.08)
    ]);
    const strand=new THREE.Mesh(new THREE.TubeGeometry(curve,8,.025,5,false),dark);
    ghost.add(strand); ghost.userData.parts.push(strand);
  }
  for(const x of [-.105,.105]) {
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.027,10,8),new THREE.MeshBasicMaterial({color:0x8d1710}));
    eye.position.set(x,2.17,-.235); ghost.add(eye);
  }
  ghostLight=new THREE.PointLight(0x4c0807,.3,2.2,2); ghostLight.position.set(0,1.5,0); ghost.add(ghostLight);
  ghost.userData.parts.forEach(part=>{ part.userData.baseRotZ=part.rotation.z; });
  ghost.position.set(ghostPos.x,0,ghostPos.z); ghost.visible=false; scene.add(ghost);
}
function buildSmoke() {
  const count=85, positions=new Float32Array(count*3), phases=new Float32Array(count), speeds=new Float32Array(count);
  for(let i=0;i<count;i++) { phases[i]=Math.random()*Math.PI*2; speeds[i]=.25+Math.random()*.55; positions[i*3]=(chapter===1?-2:-7)+(Math.random()-.5)*.5; positions[i*3+1]=.6+Math.random()*1.5; positions[i*3+2]=(chapter===1?-3.8:1)+(Math.random()-.5)*.5; }
  const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  smoke=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xb7b3a8,size:.085,transparent:true,opacity:.18,depthWrite:false,blending:THREE.AdditiveBlending}));
  smoke.userData={phases,speeds,base:positions.slice()}; scene.add(smoke);
}
function updateSmoke(t) {
  if(!smoke)return; const p=smoke.geometry.attributes.position.array, {phases,speeds,base}=smoke.userData;
  for(let i=0;i<phases.length;i++) { const age=(t*speeds[i]+phases[i])%2.2; p[i*3]=base[i*3]+Math.sin(t*.7+phases[i])*age*.07; p[i*3+1]=.5+age*.62; p[i*3+2]=base[i*3+2]+Math.cos(t*.6+phases[i])*age*.04; }
  smoke.geometry.attributes.position.needsUpdate=true;
}
function nearClue() {
  let best=null,dist=Infinity;
  for(const c of clueMeshes) { if(collected.has(c.id))continue; const d=Math.hypot(camera.position.x-c.pos.x,camera.position.z-c.pos.z); if(d<dist){dist=d;best=c;} }
  return dist<1.65?best:null;
}
function nearExit() { return Math.hypot(controls.position.x-EXIT.x,controls.position.z-EXIT.z)<1.1; }
function facingGhost() {
  if(!ghost.visible)return false;
  const to=new THREE.Vector3(ghostPos.x-camera.position.x,0,ghostPos.z-camera.position.z).normalize();
  const forward=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(0,controls.yaw,0));
  return forward.dot(to)>.45;
}
function initAudio() {
  try {
    const AudioCtx=window.AudioContext||window.webkitAudioContext; if(!AudioCtx)return;
    const ctx=new AudioCtx();
    // Compressor and conservative master gain prevent the synthesized cues from clipping.
    const master=ctx.createGain(); master.gain.value=.34;
    const limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-20; limiter.knee.value=18; limiter.ratio.value=5;
    limiter.attack.value=.012; limiter.release.value=.22;
    master.connect(limiter); limiter.connect(ctx.destination);
    // Soft filtered noise instead of loud sawtooth drones (the previous sound was harsh on some devices).
    const length=ctx.sampleRate*2, buffer=ctx.createBuffer(1,length,ctx.sampleRate), data=buffer.getChannelData(0);
    let brown=0;
    for(let i=0;i<length;i++){ const white=Math.random()*2-1; brown=(brown+.025*white)/1.025; data[i]=brown*3.5; }
    const source=ctx.createBufferSource(); source.buffer=buffer; source.loop=true;
    const low=ctx.createBiquadFilter(); low.type='lowpass'; low.frequency.value=155; low.Q.value=.55;
    const ambience=ctx.createGain(); ambience.gain.value=.075;
    source.connect(low); low.connect(ambience); ambience.connect(master); source.start();
    const osc=ctx.createOscillator(), lowTone=ctx.createBiquadFilter(), toneGain=ctx.createGain();
    osc.type='sine'; osc.frequency.value=48; lowTone.type='lowpass'; lowTone.frequency.value=90; toneGain.gain.value=.012;
    osc.connect(lowTone); lowTone.connect(toneGain); toneGain.connect(master); osc.start();
    // A short, reusable noise buffer for soft wooden-floor footsteps and creaks.
    const stepLength=Math.floor(ctx.sampleRate*.22), stepBuffer=ctx.createBuffer(1,stepLength,ctx.sampleRate), stepData=stepBuffer.getChannelData(0);
    let stepBrown=0;
    for(let i=0;i<stepLength;i++){ const white=Math.random()*2-1; stepBrown=(stepBrown+.12*white)/1.12; stepData[i]=stepBrown*2.4; }
    audio={ctx,master,limiter,source,ambience,osc,toneGain,stepBuffer};
    ctx.resume().catch(()=>{});
  } catch(e) { audio=null; }
}
function tone(freq=90,duration=.18,type='sine',gain=.12,when=0) {
  if(!audio)return;
  const ctx=audio.ctx, now=ctx.currentTime+when, osc=ctx.createOscillator(), g=ctx.createGain(), filter=ctx.createBiquadFilter();
  const safeGain=Math.max(.002,Math.min(.055,gain*.28));
  osc.type=(type==='sawtooth'||type==='square')?'triangle':type;
  osc.frequency.setValueAtTime(Math.max(35,Math.min(900,freq)),now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30,Math.min(900,freq*.72)),now+Math.max(.06,duration));
  filter.type='lowpass'; filter.frequency.value=type==='square'?650:420; filter.Q.value=.45;
  g.gain.setValueAtTime(.0001,now); g.gain.linearRampToValueAtTime(safeGain,now+.025); g.gain.exponentialRampToValueAtTime(.0001,now+Math.max(.08,duration));
  osc.connect(filter); filter.connect(g); g.connect(audio.master); osc.start(now); osc.stop(now+Math.max(.08,duration)+.04);
}
function stepSound(running=false) {
  if(!audio || audio.ctx.state!=='running')return;
  const ctx=audio.ctx, now=ctx.currentTime;
  // Low, soft thud plus a filtered wood-contact transient; no harsh high-frequency click.
  const src=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), env=ctx.createGain();
  src.buffer=audio.stepBuffer; filter.type='bandpass'; filter.frequency.value=running?430:310; filter.Q.value=.72;
  env.gain.setValueAtTime(.0001,now); env.gain.linearRampToValueAtTime(running?.075:.048,now+.012);
  env.gain.exponentialRampToValueAtTime(.0001,now+(running?.15:.19));
  src.connect(filter); filter.connect(env); env.connect(audio.master); src.start(now); src.stop(now+.22);
  const osc=ctx.createOscillator(), low=ctx.createBiquadFilter(), g=ctx.createGain();
  osc.type='sine'; osc.frequency.setValueAtTime(running?82:68,now); osc.frequency.exponentialRampToValueAtTime(43,now+.085);
  low.type='lowpass'; low.frequency.value=135; g.gain.setValueAtTime(.0001,now); g.gain.linearRampToValueAtTime(running?.045:.032,now+.008); g.gain.exponentialRampToValueAtTime(.0001,now+.11);
  osc.connect(low); low.connect(g); g.connect(audio.master); osc.start(now); osc.stop(now+.12);
}
function woodCreak() {
  if(!audio || audio.ctx.state!=='running')return;
  const ctx=audio.ctx, now=ctx.currentTime, osc=ctx.createOscillator(), filter=ctx.createBiquadFilter(), g=ctx.createGain();
  osc.type='triangle'; osc.frequency.setValueAtTime(145+Math.random()*35,now); osc.frequency.linearRampToValueAtTime(92+Math.random()*20,now+.42);
  filter.type='lowpass'; filter.frequency.value=330; g.gain.setValueAtTime(.0001,now); g.gain.linearRampToValueAtTime(.018,now+.08); g.gain.exponentialRampToValueAtTime(.0001,now+.48);
  osc.connect(filter); filter.connect(g); g.connect(audio.master); osc.start(now); osc.stop(now+.5);
}
function soundKnock() { tone(78,.32,'triangle',.18); tone(54,.42,'sine',.12,.08); }
function startStalking() {
  if(ghostState!=='dormant')return;
  ghostState='stalk';stateTime=0;ghost.visible=true;
  say('Một tiếng động vọng ra từ gian bên cạnh. Có thứ gì đó đang quan sát mày.',4800);
  setObjective(chapter===1?'Chương 1 · Tìm 3 manh mối. Đừng để thứ trong nhà phát hiện mày.':'Chương 2 · Tìm 3 dấu vết ở bến đò. Đừng để thứ dưới sương phát hiện mày.');
  tone(46,.8,'sawtooth',.1);
}
function makeNoise(amount,position) { noise=Math.max(noise,amount); lastNoise.copy(position); }
function playStoryBeat(stage) {
  storyBeat=stage; storyBeatUntil=performance.now()+2400;
  if(chapter===1) {
    if(stage===1) { soundKnock(); tone(51,.9,'sine',.15,.45); say('Ba tiếng mõ vọng từ gian thờ. Một bóng nhỏ lướt qua khe cửa — rồi biến mất.',4200); }
    if(stage===2) { soundKnock(); tone(165,.65,'triangle',.1,.25); woodCreak(); const fx=-Math.sin(controls.yaw), fz=-Math.cos(controls.yaw); ghostPos.x=controls.position.x+fx*5.4; ghostPos.z=controls.position.z+fz*5.4; ghost.position.set(ghostPos.x,0,ghostPos.z); ghost.visible=true; say('Đèn phụt tối trong chớp mắt. Cuối hành lang, một người đàn bà đứng quay lưng. Khi mày chớp mắt, nơi đó trống không.',4800); }
    if(stage===3) { tone(38,1.15,'sine',.2); soundKnock(); say('Cánh cửa tự đóng sầm. Giọng cha vang sát tai: “Đừng để họ đưa con xuống nước!”',4600); }
  } else {
    room?.triggerEvent?.(stage);
    if(stage===1) { tone(92,.45,'triangle',.12);tone(92,.45,'triangle',.12,.62);tone(92,.65,'triangle',.14,1.25); const fx=-Math.sin(controls.yaw), fz=-Math.cos(controls.yaw); ghostPos.x=controls.position.x+fx*6; ghostPos.z=controls.position.z+fz*6; ghost.position.set(ghostPos.x,0,ghostPos.z); ghost.visible=true; say('Tiếng chuông ngân lên dù không ai chạm vào. Mặt sông gợn sóng ngược chiều gió.',4400); }
    if(stage===2) { room?.triggerEvent?.(2); woodCreak();tone(42,.8,'sine',.16,.2);say('Chiếc đò tự va vào cầu gỗ. Có thứ gì đó đang cào từ bên dưới sàn thuyền.',4500); }
    if(stage===3) { room?.triggerEvent?.(3); soundKnock();tone(36,1.1,'sine',.2,.4);say('Đèn lồng chớp tắt. Một giọng đàn ông nổi lên từ dòng nước: “Cha ở đây. Đừng bước lên chuyến đò.”',4800); }
  }
}

function investigate() {
  if(!controls?.locked||ended)return;
  if(nearExit()) {
    if(collected.size===3) { if(puzzleSolved){tone(125,.38,'triangle',.14);woodCreak();finish(true);} else openPuzzle(); }
    else { tone(92,.16,'triangle',.06); say(`Cửa vẫn cài then. Còn thiếu ${3-collected.size} manh mối.`,2600); }
    return;
  }
  const c=nearClue();
  if(!c) { say('Không thấy gì ở gần đây. Hãy soi kỹ xung quanh.',1800); return; }
  collected.add(c.id); c.mesh.visible=false;c.glow.visible=false;
  tone(185,.12,'triangle',.055); tone(112,.2,'sine',.045,.07);
  cluesLabel.textContent=`Manh mối: ${collected.size} / 3`;
  say(`${c.name}: ${c.detail}`,5200); tone(220,.14,'triangle',.08);
  makeNoise(.55,controls.position);
  startStalking();
  if(collected.size===1) { playStoryBeat(1); if(chapter===1) say('Một ký ức vụn lóe lên: bàn tay người lớn đẩy mày xuống dưới sàn gỗ. Mày không nhớ đó là ai.',5000); }
  if(collected.size===2) { playStoryBeat(2); }
  if(collected.size===3) {
    playStoryBeat(3);
    ghostState='chase';stateTime=0;chaseTime=0;
    setObjective(chapter===1?'Đủ manh mối! Quay lại cửa chính và nhấn E để thoát.':'Đủ dấu vết! Quay lại đầu cầu và nhấn E để rời bến.');
    say(chapter===1?'CỬA CHÍNH! Chạy đi — nó đang tới! Đừng để người thứ tư bị đưa xuống sông!':'ĐẦU CẦU! Rời khỏi bến trước khi nó tới! Giọng cha vẫn gọi mày từ dưới nước!',4200); soundKnock(); tone(38,.9,'sawtooth',.2);
  }
}

function openPuzzle() {
  if(puzzleSolved || puzzleOpen || ended)return;
  puzzleOpen=true;
  puzzleCode.value=''; puzzleFeedback.textContent='';
  $('puzzleClue').textContent=chapter===1
    ? 'Mẹ để lại dấu hiệu: bốn chân nhang, ba bài vị, và đúng một người bị xóa khỏi ký ức. Hãy nhập theo thứ tự: số chân nhang, số bài vị, số người bị thiếu.'
    : 'Sổ đò ghi bốn hành khách nhưng chỉ còn ba cái tên. Chìa khóa khắc giờ khởi hành 03:17. Mã khóa là giờ khắc ấy; đừng quên số 0 ở đầu.';
  puzzle.hidden=false;
  controls.unlock();
  setTimeout(()=>puzzleCode.focus(),0);
}
function submitPuzzle() {
  if(!puzzleOpen || ended)return;
  const expected=chapter===1?'431':'0317';
  if(puzzleCode.value.trim()!==expected) {
    puzzleFeedback.textContent=chapter===1?'Không khớp. Hãy ghép số chân nhang, số bài vị và người bị thiếu.':'Sai mã. Giờ khởi hành phải có đủ bốn chữ số.';
    tone(75,.2,'triangle',.07); puzzleCode.select(); return;
  }
  puzzleSolved=true; puzzleOpen=false; puzzle.hidden=true;
  puzzleFeedback.textContent='';
  if(chapter===1) say('Ổ khóa bật mở. Bốn chân nhang không phải để tưởng niệm người chết — chúng đánh dấu một người đã bị xóa khỏi ký ức.',5000);
  else say('Mã 03:17 mở được then sắt. Cuốn sổ tự lật sang trang hôm nay: tên mày đã được viết sẵn.',5000);
  tone(210,.24,'triangle',.1); tone(330,.35,'sine',.08,.18);
  finish(true);
}

function finish(won) {
  if(ended)return; ended=true; controls.unlock();
  ending.style.display='flex'; $('endingTitle').textContent=won?(chapter===1?'CHƯƠNG 1 HOÀN THÀNH':'CHƯƠNG 2 HOÀN THÀNH'):'NÓ ĐÃ BẮT ĐƯỢC MÀY';
  $('endingText').textContent=won?(chapter===1?'Mày thoát khỏi nhà từ đường, nhưng bức thư và chiếc chìa khóa không giải thích được vì sao tên mày nằm trên cán chìa. Khi cửa bật mở, điện thoại rung lên: một tin nhắn mới từ mẹ — “Đừng để họ đưa con lên chuyến đò thứ tư.” Chương 2 đã mở khóa.':'Mày tìm được sự thật: đêm ấy có bốn người lên đò, nhưng dân làng chỉ được phép nhớ ba. Cha đã quay lại tìm mày và bị giữ lại dưới dòng sông. Khi mày rời bến, cuốn sổ tự mở sang trang mới — chuyến kế tiếp ghi ngày hôm nay, tên hành khách thứ tư vẫn là mày. Ngoài màn sương, tiếng mái chèo lại vang lên.'):'Tiếng chân dừng ngay sau lưng. Đèn pin tắt phụt. Trong bóng tối, một giọng quen thuộc thì thầm: “Lần này, đừng bỏ cha lại.”';
  const again=$('againBtn'); if(won&&chapter===1){localStorage.setItem('vandoChapter2Unlocked','yes');again.textContent='Tiếp tục: Chương 2';again.onclick=()=>location.href='/3d/?chapter=2';}else{again.textContent='Chơi lại chương này';again.onclick=reset;}
  again.focus(); if(!won)tone(32,1.2,'sawtooth',.24);
}
function reset() { location.reload(); }
function updateGhost(dt,now) {
  if(ghostState==='dormant')return;
  stateTime+=dt; noiseCooldown=Math.max(0,noiseCooldown-dt);
  const px=controls.position.x,pz=controls.position.z;
  const dx=px-ghostPos.x,dz=pz-ghostPos.z,d=Math.hypot(dx,dz)||1;
  const moving=Math.hypot(controls.velocity.x,controls.velocity.z);
  const running=controls.keys.has('ShiftLeft')||controls.keys.has('ShiftRight');
  noise=Math.max(0,noise-dt*.27);
  if(ghostState==='stalk') {
    // It creeps closer while unseen, but holds still when the player looks directly at it.
    if(!facingGhost() && d>3.2) {
      const speed=.48+Math.min(.35,collected.size*.12);
      moveWithCollision(ghostPos,dx/d*speed*dt,dz/d*speed*dt,.25,room.colliders);
    }
    if(noise>(controls.isCrouching?.92:.65) && noiseCooldown<=0) {
      ghostState='investigate';stateTime=0;noiseCooldown=4;
      say('Tiếng động đã khiến nó chú ý đến mày…',2300); tone(50,.5,'sawtooth',.12);
    }
    if(d<(controls.isCrouching?4.2:5.5) && collected.size>=2) { ghostState='chase';stateTime=0;chaseTime=0;say('NÓ ĐÃ THẤY MÀY! CHẠY!',2200); }
    // A brief apparition in a different part of the house, only while off-screen.
    if(stateTime>8 && d>6 && !facingGhost()) {
      const spots=storyStalkSpots.length?storyStalkSpots:stalkSpots; const spot=spots[Math.floor(Math.random()*spots.length)];
      if(Math.hypot(spot.x-px,spot.z-pz)>4.5) { ghostPos.x=spot.x;ghostPos.z=spot.z;ghost.position.set(ghostPos.x,0,ghostPos.z);stateTime=0; }
    }
  } else if(ghostState==='investigate') {
    const tx=lastNoise.x-ghostPos.x,tz=lastNoise.z-ghostPos.z,td=Math.hypot(tx,tz)||1;
    moveWithCollision(ghostPos,tx/td*1.35*dt,tz/td*1.35*dt,.25,room.colliders);
    if(d<4.7 || (stateTime>5 && td<1.2)) { ghostState='chase';stateTime=0;chaseTime=0;say('Tiếng rít xé toạc căn nhà!',1800); }
    else if(stateTime>7 && noise<.2) { ghostState='stalk';stateTime=0; }
  } else if(ghostState==='chase') {
    chaseTime+=dt;
    const speed=2.0+Math.min(.6,collected.size*.15)+(running?.05:0);
    moveWithCollision(ghostPos,dx/d*speed*dt,dz/d*speed*dt,.24,room.colliders);
    if(d<1.18)finish(false);
    // If the player escapes long enough before collecting everything, it fades back to stalking.
    if(collected.size<3 && chaseTime>8 && d>7) { ghostState='stalk';stateTime=0;ghost.visible=true;say('Tiếng chân xa dần… nhưng nó vẫn ở trong nhà.',2600); }
  }
  ghost.position.set(ghostPos.x,Math.sin(now*.0021)*.045,ghostPos.z);
  if(ghost.userData.parts) ghost.userData.parts.forEach((part,i)=>{ part.rotation.z=(part.userData.baseRotZ||0)+Math.sin(now*.0017+i*1.7)*.025; part.scale.x=1+Math.sin(now*.002+i)*.018; });
  ghost.scale.set(1+Math.sin(now*.0027)*.035,1+Math.sin(now*.0018+1)*.025,1+Math.cos(now*.0022)*.03);
  ghost.lookAt(camera.position.x,ghost.position.y+1,camera.position.z);
  ghostLight.intensity=(ghostState==='chase'?.9:.28)+Math.sin(now*.009)*.09;
  if(flashlightOn && d<7 && facingGhost()) {
    // The beam catches the silhouette: it briefly freezes, but does not make it harmless.
    ghostLight.intensity+=.5;
  }
}
function init() {
  try { renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'}); }
  catch(e) { startBtn.disabled=true;overlayMsg.textContent='Máy/trình duyệt không hỗ trợ WebGL. Hãy thử Chrome hoặc Edge mới.';return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6)); renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  scene=new THREE.Scene();scene.background=new THREE.Color(chapter===1?0x030404:0x03090c);scene.fog=new THREE.FogExp2(chapter===1?0x030404:0x071014,chapter===1?.043:.055);
  camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,70);scene.add(camera);
  scene.add(new THREE.HemisphereLight(0x66707a,0x100b08,.22));
  const moon=new THREE.DirectionalLight(0x8293a1,.14);moon.position.set(-4,8,-3);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);scene.add(moon);
  configureChapter();
  room=chapter===1?buildRoom(Math.min(8,renderer.capabilities.getMaxAnisotropy())):buildDock(Math.min(8,renderer.capabilities.getMaxAnisotropy()));scene.add(room.group);
  if(chapter===2){scene.add(new THREE.HemisphereLight(0x8ba6b3,0x071014,.28));const moon2=new THREE.DirectionalLight(0x91b4cc,.32);moon2.position.set(-5,8,-4);moon2.castShadow=true;scene.add(moon2);}
  flashlight=new THREE.SpotLight(0xffe8ca,32,16,Math.PI/7,.58,1.55);flashlight.position.set(0,0,0);flashlight.target.position.set(0,0,-1);camera.add(flashlight);camera.add(flashlight.target);
  const spawn=chapter===1?SPAWN:{x:0,z:2.2,yaw:0};
  controls=new FirstPersonControls(camera,canvas,room.colliders,spawn,{walkSpeed:2.45,runSpeed:4.25,sensitivity:.0022});
  buildClues();buildGhost();buildSmoke();
  controls.onLockChange=locked=>{
    if(puzzleOpen){overlay.classList.add('hidden');hud.hidden=false;return;}
    overlay.classList.toggle('hidden',locked);hud.hidden=!locked;
    if(!locked&&!ended){overlayText.textContent='Đã tạm dừng. Bấm tiếp tục để quay lại.';startBtn.textContent='Tiếp tục';startBtn.disabled=false;}
  };
  controls.onLockError=msg=>{overlayMsg.textContent=msg;startBtn.disabled=false;};
  if(chapter===2 && localStorage.getItem('vandoChapter2Unlocked')!=='yes'){startBtn.disabled=true;overlayMsg.textContent='Chương 2 chưa mở khóa. Hãy hoàn thành Chương 1 trước.';}else{startBtn.disabled=false;startBtn.textContent=chapter===1?'Bắt đầu Chương 1':'Bắt đầu Chương 2';}
  startBtn.addEventListener('click',()=>{overlayMsg.textContent='';if(!started){started=true;initAudio();say(chapter===1?'Mùi nhang ẩm. Một tiếng mõ vọng lên từ căn nhà khóa kín. Trong điện thoại, tin nhắn lạ vẫn chỉ có một dòng: “Đừng để chuyến đò thứ tư rời bến.”':'Mặt sông phẳng lặng đến bất thường. Có tiếng ai đó ngồi trong đò gọi đúng tên mày — nhưng bến này không có ai.',6000);nextKnock=12+Math.random()*6;}controls.lock();});
  $('againBtn').addEventListener('click',reset);
  $('puzzleSubmit').addEventListener('click',submitPuzzle);
  $('puzzleCancel').addEventListener('click',()=>{puzzleOpen=false;puzzle.hidden=true;overlay.classList.remove('hidden');overlayText.textContent='Đã tạm dừng. Bấm tiếp tục để quay lại.';startBtn.textContent='Tiếp tục';startBtn.disabled=false;});
  puzzleCode.addEventListener('keydown',e=>{if(e.key==='Enter')submitPuzzle();if(e.key==='Escape')$('puzzleCancel').click();});
  document.addEventListener('keydown',e=>{
    if(e.repeat||!controls.locked||ended)return;
    if(e.code==='KeyF'){flashlightOn=!flashlightOn;flashlight.visible=flashlightOn;say(flashlightOn?'Đèn pin bật.':'Đèn pin tắt.',900);tone(flashlightOn?300:160,.07,'square',.04);}
    if(e.code==='KeyE')investigate();
    if(e.code==='KeyC'){crouching=!crouching;controls.isCrouching=crouching;say(crouching?'Mày cúi thấp người, cố nín thở.':'Mày đứng thẳng dậy.',1100);tone(crouching?105:145,.06,'triangle',.035);}
  });
  window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.setAnimationLoop(now=>{
    const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;elapsed+=dt;
    if(controls.locked&&!ended) {
      controls.update(dt);
      // Footsteps must be audible from the very beginning, even before the ghost wakes up.
      const moveSpeed=Math.hypot(controls.velocity.x,controls.velocity.z);
      const running=controls.isRunning;
      const staminaFill=$('staminaFill'), stance=$('stance');
      if(staminaFill)staminaFill.style.width=controls.stamina.toFixed(1)+'%';
      if(stance)stance.textContent=crouching?'ĐANG CÚI · ÍT GÂY TIẾNG ỒN':(controls.stamina<1?'HẾT THỂ LỰC':(running?'ĐANG CHẠY':'ĐỨNG'));
      if(staminaFill)staminaFill.style.background=controls.stamina<25?'#a85c4d':'#b69a62';
      if(controls.stamina<1&&!lowStaminaWarned){lowStaminaWarned=true;say('Mày đã kiệt sức. Đi bộ một lúc để hồi thể lực.',2200);}
      if(controls.stamina>35)lowStaminaWarned=false;
      if(moveSpeed>.48) {
        footstepClock+=dt;
        const interval=crouching?.82:(running?.34:.52);
        if(footstepClock>=interval) {
          footstepClock=0; stepSound(running);
          if(ghostState!=='dormant')makeNoise(crouching?.08:(running?.95:.28),controls.position);
          // Occasional quiet board creak sells the old wooden house without constant noise.
          if(Math.random()<(crouching?.015:(running?.08:.12)))woodCreak();
        }
      } else footstepClock=0;
      if(message.style.display!=='none'&&now>messageUntil)message.style.display='none';
      const c=nearClue();
      prompt.textContent=c?`[E] Điều tra: ${c.name}`:(nearExit()?(collected.size===3?(puzzleSolved?'[E] Rời khỏi đây':'[E] Kiểm tra ổ khóa'):'[E] Thử mở cửa'):'');
      if(nearExit()&&collected.size===3)setObjective(puzzleSolved?'Ổ khóa đã mở. Nhấn E để rời khỏi đây.':'Đủ manh mối! Đến cửa và nhấn E để giải ổ khóa.');
      if(ghostState!=='dormant')updateGhost(dt,now);
      if(elapsed>nextKnock){soundKnock();nextKnock=elapsed+18+Math.random()*15;if(ghostState==='stalk')say(chapter===1?'Cộc… cộc… cộc… Có tiếng gõ từ phía bàn thờ.':'Cộc… cộc… cộc… Tiếng gõ vọng từ mặt sông.',2600);}
    }
    room.update(now/1000);updateSmoke(now/1000);
    // Slow, subtle exposure breathing rather than rapid strobing.
    if(flashlight) flashlight.intensity=flashlightOn ? 31.5+Math.sin(now*.0031)*.7+Math.sin(now*.017)*.22 : 0;
    scene.fog.density=(chapter===1?.043:.055)+Math.sin(now*.0007)*.002;
    renderer.render(scene,camera);
  });
}
init();
