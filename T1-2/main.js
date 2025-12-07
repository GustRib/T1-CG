import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import {
  initRenderer, initCamera, initDefaultBasicLight,
  setDefaultMaterial, InfoBox, onWindowResize, createGroundPlaneXZ
} from "../libs/util/util.js";

//Tracks and Tiles
import { Track, buildTunnel } from './tracks.js';

//Car
import { createCar } from './car.js';

let tunnel = buildTunnel();
let scene, renderer, camera, light, orbit;
let trackNumber, currentTrack = new Track(1, tunnel);
let car, speed = 0, maxSpeed = 3, acceleration = 0.008;
let keys = {};
let clock = new THREE.Clock();
let laps = 0;
const totalLaps = 4;
let finished = false;
let wasInsideStart = false;
let prevPos = new THREE.Vector3();

// --- Colisão simples (AABB por wall) ---
let wallAABBs = [];             

// Cria plano
let plane = createGroundPlaneXZ(720, 720);
plane.material = setDefaultMaterial("#5b9452");
plane.position.set(0, 0, 0);

// Inicia cena
scene = new THREE.Scene();
renderer = initRenderer();
renderer.setClearColor("#87ceeb"); // Céu
camera = initCamera(new THREE.Vector3(0, 800, 0));
light = initDefaultBasicLight(scene);
scene.add(camera);
orbit = new OrbitControls(camera, renderer.domElement);

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

scene.add(plane);

car = createCar();
car.position.set(110, 0, 270);
car.rotation.y = Math.PI / 2;
scene.add(car);

// Inicializa câmera do carro
// camera.position.set(0, 10, 15);
// camera.lookAt(car.position);

//Inicializa a cena com a pista 1
trackNumber = 1;
scene.add(currentTrack.getTrackGroup());

function resetCarPosition(track=1) {
  let xPos = 110;
  if (track === 3) xPos = 230;
  car.position.set(xPos, 0, 270);
  camera.position.set(90, 15, 285);
  car.rotation.y = Math.PI / 2;
  speed = 0;
}

function switchTrack(track) {
  wallAABBs.length = 0;
  laps = 0;
  finished = false;
  wasInsideStart = false;
  if (currentTrack) scene.remove(currentTrack.getTrackGroup());

  if (track === 1) {
    currentTrack = new Track(1, tunnel);
    trackNumber = 1;
    resetCarPosition()
  }
  if (track === 2) {
    currentTrack = new Track(2,tunnel);
    trackNumber = 2;
    resetCarPosition()
  }
  if (track === 3) {
    currentTrack = new Track(3,tunnel);
    trackNumber = 3;
    resetCarPosition(3)
  }
  scene.add(currentTrack.getTrackGroup());
}

function resolveCollisionsAABB() {

  const carRadius = 3.7;
  const carSphere = new THREE.Sphere(car.position.clone(), carRadius);

  for (const wall of currentTrack.getWallAABBs()) {
    if (wall.intersectsSphere(carSphere)) {
      const closestPoint = wall.clampPoint(car.position.clone(), new THREE.Vector3());
      const direction = car.position.clone().sub(closestPoint).normalize();

      // Empurra pra fora
      car.position.copy(
          closestPoint.addScaledVector(direction, carRadius)
      );

      // Ângulo entre frente do carro e normal da parede
      const carDir = new THREE.Vector3(
          -Math.sin(car.rotation.y),
          0,
          -Math.cos(car.rotation.y)
      ).normalize();

      const angleRad = carDir.angleTo(direction);
      const angleDeg = THREE.MathUtils.radToDeg(angleRad);

      let reductionFactor = 0;
      if (angleDeg > 90) {
          reductionFactor = (angleDeg - 90) / 1080; // linear 0..1
      }

      // Reduz velocidade conforme ângulo
      speed *= (1 - reductionFactor);

      // Reflete vetor de velocidade de acordo com o ângulo de colisão
      // if (car.userData.velocity) {
      //     const v = car.userData.velocity.clone();
      //     const reflected = v.sub(direction.multiplyScalar(2 * v.dot(direction)));
      //     car.userData.velocity.copy(reflected.multiplyScalar(0.5 * (1 - reductionFactor)));
      // }
    }
  }
}

function handleKeys(dt) {
    const effectiveFrame = dt * 60;

    // Troca de pista
    if (keys['1']) switchTrack(1);
    if (keys['2']) switchTrack(2);
    if (keys['3']) switchTrack(3);


    // Controle de direção
    const turnSpeed = 0.03 * effectiveFrame;
    if (keys['arrowleft']) car.rotation.y += turnSpeed;
    if (keys['arrowright']) car.rotation.y -= turnSpeed;

    // Controle de aceleração/freio
    const accelerating = keys['arrowup'] || keys['x'];
    const braking = keys['arrowdown'];
    const maxReverseSpeed = -maxSpeed / 2;

    if (accelerating && !braking) {
        // Acelerando normalmente
        speed += acceleration * effectiveFrame;
        if (speed > maxSpeed) speed = maxSpeed;

    } else if (braking && !accelerating) {
        // Freando sem acelerar → desaceleração forte
        if (speed > 0) {
            speed -= acceleration * 5 * effectiveFrame; // freio mais forte
            if (speed < 0) speed = 0;
        } else if (speed > maxReverseSpeed) {
            // acelera ré se já parou
            speed -= acceleration * effectiveFrame;
            if (speed < maxReverseSpeed) speed = maxReverseSpeed;
        }

    } else if (accelerating && braking) {
        // Freando enquanto acelera → desaceleração moderada
        if (speed > 0) {
            speed -= acceleration * 3 * effectiveFrame;
            if (speed < 0) speed = 0;
        } else if (speed > maxReverseSpeed) {
            speed -= acceleration * 0.5 * effectiveFrame;
            if (speed < maxReverseSpeed) speed = maxReverseSpeed;
        }

    } else {
        // Desaceleração natural
        speed *= Math.pow(0.988, effectiveFrame);
    }

    // Movimento lateral
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

function updateCheckpointCounter() {
  const carRadius = 3.7;
  const carSphere = new THREE.Sphere(car.position.clone(), carRadius);
  let checkPoints = currentTrack.getCheckpoints();
  for (let checkPoint in checkPoints) {
    let bb = new THREE.Box3().setFromObject(checkPoints[checkPoint].object);
    if (bb.intersectsSphere(carSphere)) {
      if (checkPoints[checkPoint].arrived === false) {
        checkPoints[checkPoint].arrived = true;
        console.log(`Checkpoint ${checkPoint} alcançado!`);
      }
    }
  }
}

function updateLapCounter() {
  if (finished) return;
  const c = currentTrack.getStartCenter();
  const dx = car.position.x - c.x;
  const dz = car.position.z - c.y;
  const inside = (dx <= 5 && dz <= 30) && (dx >= -5 && dz >= -30);
  let checkPointsArrived = true;
  for (let checkPoint in currentTrack.getCheckpoints()) {
    if(currentTrack.getCheckpoints()[checkPoint].arrived === false) {
      console.log(currentTrack.getCheckpoints()[checkPoint]);
      checkPointsArrived = false;
      break;
    }
  }  
  if (inside && !wasInsideStart && checkPointsArrived) {
    laps++;

    for (let checkPoint in currentTrack.getCheckpoints()) {
      currentTrack.getCheckpoints()[checkPoint].arrived = false;
    }

    if (laps >= totalLaps) finished = true;
  }
  wasInsideStart = inside;
}


// === INFO BOX ===
let infoBox = new InfoBox();
infoBox.add("Rock 'n Roll Racing 3D - Protótipo");
infoBox.addParagraph();
infoBox.add("Setas ← → : virar");
infoBox.add("Setas ↑ / X : acelerar");
infoBox.add("Seta ↓ : frear");
infoBox.add("1, 2 e 3 : trocar de pista");
infoBox.show();

// === HUD de velocidade e voltas ===
const hud = document.createElement('div');
hud.style.cssText = `
  position:fixed; top:12px; right:16px; padding:8px 10px;
  background:rgba(0,0,0,.45); color:#fff; font:14px monospace;
  border-radius:8px; z-index:999; pointer-events:none;
`;
document.body.appendChild(hud);

function updateHUD() {
  const kmh = Math.abs(speed) * 70; // Fator só pra "parecer" km/h

  // Conta checkpoints do track atual
  const checkpoints = currentTrack.getCheckpoints();
  const totalCheckpoints = Object.keys(checkpoints).length;
  let arrivedCheckpoints = 0;
  for (let k in checkpoints) {
    if (checkpoints[k].arrived) arrivedCheckpoints++;
  }

  const lapDisplay = (laps == -1 ? 0 : laps) + '/' + totalLaps;
  hud.textContent = `Velocidade: ${kmh.toFixed(1)} Km/h | Voltas: ${lapDisplay} | Checkpoints: ${arrivedCheckpoints}/${totalCheckpoints}` + (finished ? ' | FIM!' : '');
}

const gridHelper = new THREE.GridHelper(720, 12);

scene.add(gridHelper);

function render() {
  prevPos.copy(car.position);
  const deltaTime = clock.getDelta();
  handleKeys(deltaTime);
  resolveCollisionsAABB();
  // updateCamera(deltaTime);
  updateLapCounter();
  updateCheckpointCounter()
  updateHUD();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();