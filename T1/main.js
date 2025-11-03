import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import {
  initRenderer, initCamera, initDefaultBasicLight,
  setDefaultMaterial, InfoBox, onWindowResize, createGroundPlaneXZ
} from "../libs/util/util.js";

let scene, renderer, camera, light, orbit;
let trackNumber, currentTrack;
const floorYAxis = 0.01;
const floorWidth = 60;
const floorHeight = 60;
let car, speed = 0, maxSpeed = 1.5, acceleration = 0.008;
let keys = {};
let clock = new THREE.Clock();
let laps = -1;
const totalLaps = 4;
let finished = false;
let wasInsideStart = false;
let prevPos = new THREE.Vector3(); // para medir direção real do movimento
const START_CENTER_TRACK = new THREE.Vector2(90, 270);

// --- Colisão simples (AABB por wall) ---
let wallAABBs = [];             
const SPEED_MIN_FACTOR = 0.0;  

// Cria Plano
let plane = createGroundPlaneXZ(720, 720);
plane.material = setDefaultMaterial("#5b9452");
plane.position.set(0, 0, 0);

// Inicia cena
scene = new THREE.Scene();
renderer = initRenderer();
renderer.setClearColor("#87ceeb"); // Céu
camera = initCamera(new THREE.Vector3(0, 400, 30));
light = initDefaultBasicLight(scene);
scene.add(camera);
orbit = new OrbitControls(camera, renderer.domElement);

function getStartCenter() {

  return START_CENTER_TRACK;
}

// Cria CARRO 
function createCar() {
  let carGroup = new THREE.Group();
  const matBody = setDefaultMaterial("rgba(29, 27, 27, 0.49)");
  const matDetail = setDefaultMaterial("rgba(212, 22, 22, 0.71)");
  const carLength = 8.0;
  const carWidth = 6.0;
  const carHeight = 0.8;
  const radius = carWidth / 2;
  const straightLength = carLength - (2 * radius);

  const shapeWidth = carLength;
  const shapeHeight = carWidth;
  const shapeRadius = shapeHeight / 2;
  const shapeStraight = shapeWidth - (2 * shapeRadius);

  const racetrackShape = new THREE.Shape();

  racetrackShape.moveTo(-shapeStraight / 2, shapeRadius);
  racetrackShape.lineTo(shapeStraight / 2, shapeRadius);
  racetrackShape.absarc(shapeStraight / 2, 0, shapeRadius, Math.PI * 0.5, Math.PI * 1.5, true);
  racetrackShape.lineTo(-shapeStraight / 2, -shapeRadius);
  racetrackShape.absarc(-shapeStraight / 2, 0, shapeRadius, Math.PI * 1.5, Math.PI * 0.5, true);

  const extrudeSettings = {
    depth: carHeight * 0.1,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: carHeight * 0.45,
    bevelThickness: carHeight * 0.45,
  };

  const baseGeom = new THREE.ExtrudeGeometry(racetrackShape, extrudeSettings);
  const baseRoxa = new THREE.Mesh(baseGeom, matBody);

  baseRoxa.rotation.x = Math.PI / 2;
  baseRoxa.rotation.z = Math.PI / 2;
  baseRoxa.position.y = carHeight / 2;
  carGroup.add(baseRoxa);

  const bumperHeight = 0.4;
  const ajusteY = 0.1;

  const bumperCenterGeom = new THREE.BoxGeometry(carWidth, bumperHeight, straightLength);
  const bumperCenter = new THREE.Mesh(bumperCenterGeom, matDetail);
  bumperCenter.position.y = carHeight + (bumperHeight / 2) - ajusteY;
  carGroup.add(bumperCenter);

  const bumperEndGeom = new THREE.CylinderGeometry(radius, radius, bumperHeight, 32);
  const bumperFront = new THREE.Mesh(bumperEndGeom, matDetail);

  bumperFront.position.y = carHeight + (bumperHeight / 2) - ajusteY;
  bumperFront.position.z = straightLength / 2;
  carGroup.add(bumperFront);
  const bumperBack = new THREE.Mesh(bumperEndGeom, matDetail);
  bumperBack.position.y = carHeight + (bumperHeight / 2) - ajusteY;
  bumperBack.position.z = -straightLength / 2;
  carGroup.add(bumperBack);

  const cabineGeom = new THREE.CylinderGeometry(1.0, 2.0, 1.5, 11);
  const cabine = new THREE.Mesh(cabineGeom, matBody);

  const cabineYOriginal = carHeight + bumperHeight + (1.5 / 2);
  const cabineYCorrigida = cabineYOriginal - ajusteY;

  cabine.scale.set(0.7, 1.0, 1.3);

  cabine.position.set(0, cabineYCorrigida, -1.0);
  carGroup.add(cabine);

  let antennaGroup = new THREE.Group();

  const stickHeight = 1.2;
  const stickThickness = 0.3;

  const turbineRadius = 0.6;
  const bladeLength = 2.2;
  const bladeWidth = 0.3;
  const bladeThickness = 0.15;

  const stickGeom = new THREE.BoxGeometry(stickThickness, stickHeight, stickThickness);
  const stick = new THREE.Mesh(stickGeom, matBody);
  stick.position.y = stickHeight / 2;
  antennaGroup.add(stick);
  let turbineGroup = new THREE.Group();

  const domeGeom = new THREE.SphereGeometry(turbineRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeom, matDetail);
  turbineGroup.add(dome);

  const bladeGeom = new THREE.BoxGeometry(bladeLength, bladeThickness, bladeWidth);
  const blade1 = new THREE.Mesh(bladeGeom, matDetail);
  turbineGroup.add(blade1);
  const blade2 = blade1.clone();
  blade2.rotation.y = Math.PI / 4;
  turbineGroup.add(blade2);

  const blade3 = blade1.clone();
  blade3.rotation.y = Math.PI / 2;
  turbineGroup.add(blade3);

  const blade4 = blade1.clone();
  blade4.rotation.y = (Math.PI / 4) * 3;
  turbineGroup.add(blade4);

  turbineGroup.rotation.x = Math.PI / 2;
  turbineGroup.position.y = stickHeight;
  antennaGroup.add(turbineGroup);

  const antennaY = carHeight + bumperHeight - ajusteY;
  antennaGroup.position.set(0, antennaY, 3.0);
  carGroup.add(antennaGroup);

  carGroup.position.y = 0.1;

  return carGroup;
}

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

scene.add(plane);

car = createCar();
car.position.set(110, 0, 270);
car.rotation.y = Math.PI / 2;
scene.add(car);
//  CARRO 
// camera.position.set(0, 10, 15);
// camera.lookAt(car.position);
// Cria Paredes
function createWall(x, y, z, orientation, colors = ["white", "red"]) {
  const wall = new THREE.Group();
  const halfGeom = new THREE.BoxGeometry(2, 5, 30);

  for (let i = 0; i < 2; i++) {
    const mat = setDefaultMaterial(colors[i % 2]);
    const half = new THREE.Mesh(halfGeom, mat);
    if (orientation === 'v') { // along Z, normal ±X
      half.position.set(x, 2.5, z + i * 30);
      half.userData.orient = 'v';
    } else { // along X, normal ±Z
      half.rotation.y = Math.PI / 2;
      half.position.set(x + i * 30, 2.5, z);
      half.userData.orient = 'h';
    }
    wall.add(half);
  }
  return wall;
}



function createTile(color) {
  const tileSize = 60;
  const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
  const tileMaterial1 = setDefaultMaterial(color || "#707070");
  const tile = new THREE.Mesh(tileGeometry, tileMaterial1);
  tile.rotation.x = -Math.PI / 2;
  tile.position.y = floorYAxis;
  return tile;
}

function createTrack2() {
  const group = new THREE.Group(); 
  
  
 for (let i = 0; i < 9; i++) {
    let tileLower;
    if (i == 5) {
      tileLower = createTile("orange");
      let startLineGeometry = new THREE.PlaneGeometry(10, 60);
      let startLineMaterial = setDefaultMaterial("white");
      let startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
      startLine.rotation.x = -Math.PI / 2;
      startLine.position.set(-210 + i * floorWidth, floorYAxis + 0.02, 270);
      group.add(startLine);
    } else {
      tileLower = createTile();
    }
    tileLower.position.set(-210 + i * floorWidth, floorYAxis, 270);
    group.add(tileLower);
  }

  for (let i = 0; i < 10; i++) {
    let tileLeft = createTile();
    tileLeft.position.set(-270, floorYAxis, 270 - (i * (floorHeight)));
    group.add(tileLeft);
  }

  for (let i = 0; i < 5; i++) {
    let tileUpperHalf = createTile();
    let tileHalfRight = createTile();
    tileHalfRight.position.set(270, floorYAxis, 210 - (i * (floorHeight)));
    tileUpperHalf.position.set(-210 + i * floorWidth, floorYAxis, -270);
    group.add(tileUpperHalf,tileHalfRight);
  }

  for (let i = 0; i < 4; i++) {
    let tileHalfLeft = createTile();
    tileHalfLeft.position.set(30, floorYAxis, -210 + (i * (floorHeight)));
    if(i < 3){
      let tileHalfLower = createTile();
      tileHalfLower.position.set(90 + i * floorWidth, floorYAxis, -30);
      group.add( tileHalfLower,tileHalfLeft); 
    }else{
      group.add(tileHalfLeft);
    }
  }
  

  //Paredes Externas
  for (let i = 0; i < 10; i++) {
    let wall1 = createWall(-285 + i * 60, 0, 299,'h', ['white', 'blue']);
    let wall2 = createWall(-299, 0, 255 - i * 60, 'v', ['white', 'blue']);
    group.add(wall1, wall2);
    addWallAABB(wall1);
    addWallAABB(wall2);
  }
  for(let i = 0; i < 6; i++){
    let wall1 = createWall(300, 0, 255 - i * 60, 'v', ['blue', 'white']);
    let wall2 = createWall(-285 + i * 60, 0, -300, 'h', ['blue', 'white']);
    group.add(wall1,wall2);
    addWallAABB(wall1);
    addWallAABB(wall2);
  }
  for(let i = 0; i < 4; i++){
    let wall1 = createWall(76 + i * 60, 0, -61,'h', ['blue', 'white']);
    let wall2 = createWall(60, 0, -285 + i * 60, 'v', ['blue', 'white']);
    group.add(wall1, wall2);
    addWallAABB(wall1);
    addWallAABB(wall2);
  }

  // //Paredes Internas
  for(let i = 0; i < 8; i++){
    let wall1 = createWall(-225 + i * 60, 0, 239,'h', ['white', 'blue']);
    let wall2 = createWall(-239, 0, 195 - i * 60, 'v', ['white', 'blue']);
    group.add(wall1, wall2);
    addWallAABB(wall1);
    addWallAABB(wall2);    
  }
  for(let i = 0; i < 4; i++){
    let wall1 = createWall(15 + i * 60, 0, 0,'h', ['blue', 'white']);
    let wall2 = createWall(239, 0, 15 + i * 60, 'v', ['blue', 'white']);
    let wall3 = createWall(-224 + i * 60, 0, -239,'h', ['blue', 'white']);
    let wall4 = createWall(0, 0, -224 + i * 60, 'v', ['blue', 'white']);
    group.add(wall1, wall2,wall3,wall4);
    addWallAABB(wall1);
    addWallAABB(wall2);
    addWallAABB(wall3);
    addWallAABB(wall4);

  }
  
  return group;
}

function createTrack1() {

  const group = new THREE.Group();

  for (let i = 0; i < 8; i++) {
    let tileLower;
    if (i == 5) {
      tileLower = createTile("orange");
      let startLineGeometry = new THREE.PlaneGeometry(10, 60);
      let startLineMaterial = setDefaultMaterial("white");
      let startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
      startLine.rotation.x = -Math.PI / 2;
      startLine.position.set(-210 + i * floorWidth, floorYAxis + 0.02, 270);
      group.add(startLine);
    } else {
      tileLower = createTile();
    }
    let tileUpper = createTile();
    tileUpper.position.set(-210 + i * floorWidth, floorYAxis, -270);
    tileLower.position.set(-210 + i * floorWidth, floorYAxis, 270);
    group.add(tileUpper, tileLower);
  }

  for (let i = 0; i < 10; i++) {
    let tileLeft = createTile();
    let tileRight = createTile();
    tileLeft.position.set(-270, floorYAxis, 270 - (i * (floorHeight)));
    tileRight.position.set(270, floorYAxis, 270 - (i * (floorHeight)));
    group.add(tileLeft, tileRight);
  }

  //Paredes Externas
  for (let i = 0; i < 10; i++) {
    let wall1 = createWall(-285 + i * 60, 0, -301);
    let wall2 = createWall(-285 + i * 60, 0, 301);
    let wall3 = createWall(-299, 0, 255 - i * 60, 'v');
    let wall4 = createWall(299, 0, 255 - i * 60, 'v');
    group.add(wall1, wall2, wall3, wall4);
    addWallAABB(wall1);
    addWallAABB(wall2);
    addWallAABB(wall3);
    addWallAABB(wall4);
  }

  //Paredes Internas
  for (let i = 0; i < 8; i++) {
    let wall1 = createWall(-225 + i * 60, 0, -241);
    let wall2 = createWall(-225 + i * 60, 0, 241);
    let wall3 = createWall(-239, 0, 195 - i * 60, 'v');
    let wall4 = createWall(239, 0, 195 - i * 60, 'v');
    group.add(wall1, wall2, wall3, wall4);
    addWallAABB(wall1);
    addWallAABB(wall2);
    addWallAABB(wall3);
    addWallAABB(wall4);
  }

  return group;
}

let grid = new THREE.GridHelper(720, 12);
grid.position.y = floorYAxis + 1;
scene.add(grid);
scene.add(currentTrack = createTrack1());

function resetCarPosition() {
  car.position.set(110, 0, 270);
  // camera.position.set(90, 15, 285);
  car.rotation.y = Math.PI / 2;
  speed = 0;
}

function switchTrack(track) {
  wallAABBs.length = 0;  // zera as caixas
  laps = -1;
  finished = false;
  wasInsideStart = false;
  if (currentTrack) scene.remove(currentTrack);

  if (track === 1) {
    currentTrack = createTrack1();
    trackNumber = 1;
    resetCarPosition()
  }
  if (track === 2) {
    currentTrack = createTrack2();
    trackNumber = 2;
    resetCarPosition()
  }

  scene.add(currentTrack);
}

function resolveCollisionsAABB() {
  if (finished || wallAABBs.length === 0) return;

  // AABB do carro no frame atual
  const carBB = new THREE.Box3().setFromObject(car);

  // Frente do carro no plano XZ (com base na rotação Y)
  const fwd = new THREE.Vector2(-Math.sin(car.rotation.y), -Math.cos(car.rotation.y)).normalize();

  // Vamos aplicar a MAIOR redução entre todos os contatos do frame
  let speedFactor = 1.0;

  for (const w of wallAABBs) {
    if (!carBB.intersectsBox(w)) continue;

    // Overlaps X/Z
    const overlapX = Math.min(carBB.max.x, w.max.x) - Math.max(carBB.min.x, w.min.x);
    const overlapZ = Math.min(carBB.max.z, w.max.z) - Math.max(carBB.min.z, w.min.z);
    if (overlapX <= 0 || overlapZ <= 0) continue;

    // Centros para decidir o sentido do empurrão
    const carCenterX = (carBB.min.x + carBB.max.x) * 0.5;
    const carCenterZ = (carBB.min.z + carBB.max.z) * 0.5;
    const wallCenterX = (w.min.x + w.max.x) * 0.5;
    const wallCenterZ = (w.min.z + w.max.z) * 0.5;

    if (overlapX < overlapZ) {
      // Empurra no X (desliza no Z)
      const nx = (carCenterX >= wallCenterX) ? 1 : -1;   // normal ±X
      car.position.x += nx * overlapX;
      // Mantém a AABB do carro coerente após o empurrão
      carBB.min.x += nx * overlapX;
      carBB.max.x += nx * overlapX;

      // Redução por ângulo (com a normal)
      const n = new THREE.Vector2(nx, 0);
      let dot = Math.max(-1, Math.min(1, fwd.dot(n)));
      const angleDeg = Math.acos(dot) * 180 / Math.PI;   // 0..180

      // Regra: <90° → 0%; 90° → 5%; 180° → 100%
      if (angleDeg >= 90) {
        const factor = Math.max(SPEED_MIN_FACTOR, 0.95 * (180 - angleDeg) / 90);
        speedFactor = Math.min(speedFactor, factor);
      }
    } else {
      // Empurra no Z (desliza no X)
      const nz = (carCenterZ >= wallCenterZ) ? 1 : -1;   // normal ±Z
      car.position.z += nz * overlapZ;
      carBB.min.z += nz * overlapZ;
      carBB.max.z += nz * overlapZ;

      const n = new THREE.Vector2(0, nz);
      let dot = Math.max(-1, Math.min(1, fwd.dot(n)));
      const angleDeg = Math.acos(dot) * 180 / Math.PI;

      if (angleDeg >= 90) {
        const factor = Math.max(SPEED_MIN_FACTOR, 0.95 * (180 - angleDeg) / 90);
        speedFactor = Math.min(speedFactor, factor);
      }
    }
  }

  // Aplica a maior redução encontrada
  speed *= speedFactor;
}


function handleKeys(dt) {
  const effectiveFrame = dt * 60;

  if (keys['1']) switchTrack(1);
  if (keys['2']) switchTrack(2);

  if (keys['arrowup'] || keys['x']) {
    speed += acceleration * effectiveFrame;
    if (speed > maxSpeed) speed = maxSpeed;
  } else if (keys['arrowdown']) {
    speed -= (acceleration * 1.2) * effectiveFrame;
    if (speed < -maxSpeed / 2) speed = -maxSpeed / 2;
  } else {
    // desaceleracao
    speed *= Math.pow(0.988, effectiveFrame);
  }
  const turnSpeed = 0.03 * effectiveFrame;

  if (keys['arrowleft']) {
    car.rotation.y += turnSpeed;
  } else if (keys['arrowright']) {
    car.rotation.y -= turnSpeed;
  }

  // movimento
  const moveSpeed = speed * effectiveFrame;
  car.position.x -= Math.sin(car.rotation.y) * moveSpeed;
  car.position.z -= Math.cos(car.rotation.y) * moveSpeed;
}

function updateCamera(dt) {
  const effectiveFrame = dt * 60;
  const relCameraOffset = new THREE.Vector3(0, 14, 30);
  const cameraOffset = relCameraOffset.applyMatrix4(car.matrixWorld);
  const cameraFollowSpeed = 0.08 * effectiveFrame;

  camera.position.lerp(cameraOffset, Math.min(cameraFollowSpeed, 1.0));
  camera.lookAt(car.position);
}

function updateLapCounter() {
  if (finished) return;
  const c = getStartCenter();
  const dx = car.position.x - c.x;
  const dz = car.position.z - c.y;
  const inside = (dx <= 5 && dz <= 30) && (dx >= -5 && dz >= -30);


  //A fim de tratar a renderização, a volta só é contada quando o carro sai da área de start e depois retorna
  if (inside && !wasInsideStart) {
    laps++;
    if (laps >= totalLaps) finished = true;
  }
  wasInsideStart = inside;
}

function addWallAABB(wallGroup) {
  const bb = new THREE.Box3().setFromObject(wallGroup);
  wallAABBs.push(bb);
}

// === INFO BOX ===
let infoBox = new InfoBox();
infoBox.add("Rock 'n Roll Racing 3D - Protótipo");
infoBox.addParagraph();
infoBox.add("Setas ← → : virar");
infoBox.add("Setas ↑ / X : acelerar");
infoBox.add("Seta ↓ : frear");
infoBox.add("1 e 2 : trocar de pista");
infoBox.show();

const hud = document.createElement('div');
hud.style.cssText = `
  position:fixed; top:12px; right:16px; padding:8px 10px;
  background:rgba(0,0,0,.45); color:#fff; font:14px monospace;
  border-radius:8px; z-index:999; pointer-events:none;
`;
document.body.appendChild(hud);

function updateHUD() {
  const kmh = Math.abs(speed) * 70; // fator só pra "parecer" km/h
  hud.textContent = `Velocidade: ${kmh.toFixed(1)} Km/h | Voltas: ${laps == -1 ? 0 : laps}/${totalLaps}` + (finished ? ' | FIM!' : '');
}


function render() {
  prevPos.copy(car.position);
  const deltaTime = clock.getDelta();
  handleKeys(deltaTime);
  resolveCollisionsAABB();
  // updateCamera(deltaTime);
  updateLapCounter();
  updateHUD();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();