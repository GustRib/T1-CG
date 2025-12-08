import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import Stats from '../build/jsm/libs/stats.module.js';
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
let trackNumber=1, currentTrack = new Track(1, tunnel);

const container = document.getElementById( 'container' );
const stats = new Stats();
container.appendChild( stats.dom );
// --- Duas entidades de carro ---
let car, car2;                       // car = player (car1), car2 = opponent (estático por enquanto)
let speed = 0, speed2 = 0;           // speed -> player, speed2 -> opponent (não se move agora)
let maxSpeed = 3, acceleration = 0.008;

let keys = {};
let clock = new THREE.Clock();
let laps1 = 0, laps2 = 0;
const totalLaps = 4;
let raceFinished = false;
let winner = null;

let wasInsideStart1 = false;
let wasInsideStart2 = false;

// --- Colisão simples (AABB por wall) ---
let wallAABBs = []; 

// --- Shooting system state ---
const shotsMax = 4;
let shots1 = shotsMax, shots2 = shotsMax;
let projectiles = [];
let penaltyEndTime1 = 0, penaltyEndTime2 = 0;

//Waypoints para IA do carro adversário
const checkpointsList = {
  1: [
    new THREE.Vector3(-270, 0, 270),
    new THREE.Vector3(-270, 0, -270),
    new THREE.Vector3(270, 0, -270),
    new THREE.Vector3(270, 0, 270),
  
  ],
  2: [
    new THREE.Vector3(-270, 0, 270),
    new THREE.Vector3(-270, 0, -270),
    new THREE.Vector3(30, 0, -270),
    new THREE.Vector3(30, 0, -20),
    new THREE.Vector3(270, 0, -18),
    new THREE.Vector3(270, 0, 270),



  ],
  3: [
    new THREE.Vector3(30, 0, 250),
    new THREE.Vector3(30, 0, -270),
    new THREE.Vector3(-270, 0, -270),
    new THREE.Vector3(-270, 0, -30),
    new THREE.Vector3(270, 0, -30),
    new THREE.Vector3(270, 0, 250),

  ],
};

// Cria plano
let plane = createGroundPlaneXZ(720, 720);
plane.material = setDefaultMaterial("#5b9452");
plane.position.set(0, 0, 0);

// Inicia cena
scene = new THREE.Scene();
renderer = initRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // sombra suave
renderer.setClearColor("#87ceeb"); // Céu
camera = initCamera(new THREE.Vector3(0, 800, 0));
// === LUZ PRINCIPAL (Segue o carro) ===
const mainLight = new THREE.SpotLight("#ffffff", 1.2);
mainLight.castShadow = true;

// qualidade da sombra
mainLight.shadow.mapSize.width = 1024;
mainLight.shadow.mapSize.height = 1024;
mainLight.shadow.camera.near = 5;
mainLight.shadow.camera.far = 500;
mainLight.shadow.camera.fov = 35;

scene.add(mainLight);
scene.add(mainLight.target); // Spotlight usa target separado

// === LUZ SECUNDÁRIA (ambiente) ===
const fillLight = new THREE.HemisphereLight("#ffffff", "#464646", 0.55);
fillLight.castShadow = false;
scene.add(fillLight);

scene.add(camera);
orbit = new OrbitControls(camera, renderer.domElement);

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

scene.add(plane, currentTrack.getTrackGroup());

// Cria dois carros
let cpuCheckpoints = getCheckpointList() ; 
car = createCar();
car.position.set(110, 0, 275);
car.rotation.y = Math.PI / 2;
scene.add(car);

car2 = createCar(2);
car2.position.set(110, 0, 265); // posicione ligeiramente diferente
car2.rotation.y = Math.PI / 2;
scene.add(car2);

// checkpoint state por carro (clonagem leve)
function cloneCheckpoints(srcCheckpoints) {
  const out = {};
  for (let k in srcCheckpoints) {
    out[k] = {
      object: srcCheckpoints[k].object,
      position: srcCheckpoints[k].position,
      orientation: srcCheckpoints[k].orientation,
      arrived: false
    };
  }
  return out;
}

// após criar a pista inicial, prepare mapas de checkpoints por carro
let car1Checkpoints = cloneCheckpoints(currentTrack.getCheckpoints());
let car2Checkpoints = cloneCheckpoints(currentTrack.getCheckpoints());

// salva posição de câmera "alto" para exibir vencedor
const raceCamPos = new THREE.Vector3(0, 400, 0);

// Ajusta reset de posição para ambos os carros
function resetCarPosition(track=1) {
  let xPos = 110;
  if (track === 3) xPos = 230;
  car.position.set(xPos, 0, 270);
  car.rotation.y = Math.PI / 2;
  speed = 0;

  car2.position.set(xPos, 0, 260);
  car2.rotation.y = Math.PI / 2;
  speed2 = 0;
}

// ao trocar pista, recria checkpoints por carro e reset de variáveis
function switchTrack(track) {
  wallAABBs.length = 0;
  laps1 = 0; laps2 = 0;
  raceFinished = false; winner = null;
  wasInsideStart1 = false; wasInsideStart2 = false;
  winnerBanner.style.display = 'none';
  cpuCheckpoints = getCheckpointList();
  if (currentTrack) scene.remove(currentTrack.getTrackGroup());

  // limpar projéteis e resetar tiros/penalizações
  for (const p of projectiles) scene.remove(p.mesh);
  projectiles.length = 0;
  shots1 = shotsMax; shots2 = shotsMax;
  penaltyEndTime1 = 0; penaltyEndTime2 = 0;

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

  // cria cópias de checkpoints para cada carro (estado independente)
  car1Checkpoints = cloneCheckpoints(currentTrack.getCheckpoints());
  car2Checkpoints = cloneCheckpoints(currentTrack.getCheckpoints());

  scene.add(currentTrack.getTrackGroup());

  // Atualiza checkpoints da IA com base na pista atual
  trackNumber = trackNumber; // já ajustado acima ao criar Track
  cpuTargetIndex = 0;
  cpuCheckpoints = getCheckpointList();
}

function resolveCollisionsAABB() {

  const carRadius = 3.7;
  const carSphere = new THREE.Sphere(car.position.clone(), carRadius);
  const car2Sphere = new THREE.Sphere(car2.position.clone(), carRadius);

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
    }
  }

  for (const wall of currentTrack.getWallAABBs()) {
    if (wall.intersectsSphere(car2Sphere)) {
      const closestPoint = wall.clampPoint(car2.position.clone(), new THREE.Vector3());
      const direction = car2.position.clone().sub(closestPoint).normalize();

      // Empurra pra fora
      car2.position.copy(
          closestPoint.addScaledVector(direction, carRadius)
      );

      // Ângulo entre frente do carro e normal da parede
      const carDir = new THREE.Vector3(
          -Math.sin(car2.rotation.y),
          0,
          -Math.cos(car2.rotation.y)
      ).normalize();

      const angleRad = carDir.angleTo(direction);
      const angleDeg = THREE.MathUtils.radToDeg(angleRad);

      let reductionFactor = 0;
      if (angleDeg > 90) {
          reductionFactor = (angleDeg - 90) / 1080; // linear 0..1
      }

      // Reduz velocidade conforme ângulo
      speed2 *= (1 - reductionFactor);
    }
  }

 if (carSphere.intersectsSphere(car2Sphere)) {
    // normal de car2 -> car1
    const delta = car.position.clone().sub(car2.position);
    const dist = Math.max(delta.length(), 1e-4);
    const n = delta.clone().divideScalar(dist);

    // correção de penetração
    const penetration = carRadius * 2 - dist;
    if (penetration > 0) {
      car.position.addScaledVector(n, penetration * 0.5);
      car2.position.addScaledVector(n, -penetration * 0.5);
    }

    // velocidades vetoriais atuais (baseadas na orientação + speed scalar)
    const v1 = new THREE.Vector3(-Math.sin(car.rotation.y), 0, -Math.cos(car.rotation.y)).multiplyScalar(speed);
    const v2 = new THREE.Vector3(-Math.sin(car2.rotation.y), 0, -Math.cos(car2.rotation.y)).multiplyScalar(speed2);

    // decompor em componentes normal/tangencial
    const v1nVal = v1.dot(n);
    const v2nVal = v2.dot(n);
    const v1n = n.clone().multiplyScalar(v1nVal);
    const v2n = n.clone().multiplyScalar(v2nVal);
    const v1t = v1.clone().sub(v1n);
    const v2t = v2.clone().sub(v2n);

    // restituição (0..1) — controla "elasticidade" da colisão
    const restitution = 0.65;

    // troca dos componentes normais (massa igual) com restituição
    const newV1 = v1t.clone().add(v2n.clone().multiplyScalar(restitution));
    const newV2 = v2t.clone().add(v1n.clone().multiplyScalar(restitution));

    // projetar de volta para as direções locais dos carros e extrair scalars de velocidade
    const forward1 = new THREE.Vector3(-Math.sin(car.rotation.y), 0, -Math.cos(car.rotation.y)).normalize();
    const forward2 = new THREE.Vector3(-Math.sin(car2.rotation.y), 0, -Math.cos(car2.rotation.y)).normalize();

    speed = forward1.dot(newV1);
    speed2 = forward2.dot(newV2);

    // amortecimento adicional para evitar "ricochete" exagerado
    const damping = 0.82;
    speed *= damping;
    speed2 *= damping;
  }

  for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      const sphere = new THREE.Sphere(p.mesh.position.clone(), p.radius);
  
      // paredes
      let hitWall = false;
      for (const wall of currentTrack.getWallAABBs()) {
        if (wall.intersectsSphere(sphere)) { hitWall = true; break; }
      }
      if (hitWall) {
        destroyProjectile(i);
        continue;
      }
  
      // carros
      const sCar1 = new THREE.Sphere(car.position.clone(), carRadius);
      const sCar2 = new THREE.Sphere(car2.position.clone(), carRadius);
  
      if (p.owner === 'player') {
        if (sphere.intersectsSphere(sCar2)) {
          applyPenaltyTo(car2);
          destroyProjectile(i);
          continue;
        }
      } else {
        if (sphere.intersectsSphere(sCar1)) {
          applyPenaltyTo(car);
          destroyProjectile(i);
          continue;
        }
      }
    }
}


// Helpers de projéteis
function tryShootPlayer() {
  if (raceFinished) return;
  if (shots1 <= 0) return;
  shots1--;
  createProjectile(car, 'player');
}

function createProjectile(owner, ownerTag) {
  const radius = 1.2;
  const geom = new THREE.SphereGeometry(radius, 16, 12);
  const mat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x550000, shininess: 120 });
  const mesh = new THREE.Mesh(geom, mat);

  const forward = new THREE.Vector3(-Math.sin(owner.rotation.y), 0, -Math.cos(owner.rotation.y)).normalize();
  mesh.position.copy(owner.position).addScaledVector(forward, 8);
  mesh.position.y += 1.5;
  scene.add(mesh);

  projectiles.push({
    mesh,
    vel: forward.clone(),
    radius,
    owner: ownerTag
  });
}

function destroyProjectile(index) {
  const p = projectiles[index];
  if (!p) return;
  scene.remove(p.mesh);
  projectiles.splice(index, 1);
}

function applyPenaltyTo(targetCar) {
  const now = clock.getElapsedTime();
  if (targetCar === car) {
    speed *= 0.3;
    penaltyEndTime1 = now + 3;
  } else {
    speed2 *= 0.3;
    penaltyEndTime2 = now + 3;
  }
}

function updateProjectiles(dt) {
  const projectileSpeed = 260; // units/sec
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    // movimento apenas; colisões tratadas em resolveCollisionsAABB
    p.mesh.position.addScaledVector(p.vel, projectileSpeed * dt);
  }
}
let prevShootPressed = false;
function handleKeys(dt) {
    const effectiveFrame = dt * 60;

    // Troca de pista
    if (keys['1']) switchTrack(1);
    if (keys['2']) switchTrack(2);
    if (keys['3']) switchTrack(3);

    if(raceFinished) return;

    // Controle de direção
    const turnSpeed = 0.03 * effectiveFrame;
    if (keys['arrowleft']) car.rotation.y += turnSpeed;
    if (keys['arrowright']) car.rotation.y -= turnSpeed;

    const shootPressed = !!keys['z'];
    if (shootPressed && !prevShootPressed) {
      tryShootPlayer();
    }
    prevShootPressed = shootPressed;

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

// atualização de checkpoints por carro
function updateCheckpointCounterFor(targetCar, carCheckpoints) {
  const carRadius = 3.7;
  const carSphere = new THREE.Sphere(targetCar.position.clone(), carRadius);
  for (let k in carCheckpoints) {
    const bb = new THREE.Box3().setFromObject(carCheckpoints[k].object);
    if (bb.intersectsSphere(carSphere)) {
      if (carCheckpoints[k].arrived === false) {
        carCheckpoints[k].arrived = true;
        // console.log(`Car ${targetCar === car ? '1' : '2'} checkpoint ${k} reached`);
      }
    }
  }
}

// atualização de voltas por carro; retorna true se esse carro acabou a corrida agora
function updateLapCounterFor(targetCar, carCheckpoints) {
  if (raceFinished) return false;

  const c = currentTrack.getStartCenter();
  const dx = targetCar.position.x - c.x;
  const dz = targetCar.position.z - c.y;
  const inside = (dx <= 5 && dz <= 30) && (dx >= -5 && dz >= -30);

  // verifica se todos checkpoints foram atingidos por este carro
  let checkPointsArrived = true;
  for (let k in carCheckpoints) {
    if (carCheckpoints[k].arrived === false) {
      checkPointsArrived = false;
      break;
    }
  }

  if (targetCar === car) {
    if (inside && !wasInsideStart1 && checkPointsArrived) {
      laps1++;
      shots1 = shotsMax; // recarrega tiros a cada volta
      for (let k in carCheckpoints) carCheckpoints[k].arrived = false;
      if (laps1 >= totalLaps) { 
        raceFinished = true; 
        winner = 'Player 1'; 
        return true; 
      }
    }
    wasInsideStart1 = inside;
  } else {
    if (inside && !wasInsideStart2 && checkPointsArrived) {
      laps2++;
      shots2 = shotsMax; // recarrega tiros a cada volta
      for (let k in carCheckpoints) carCheckpoints[k].arrived = false;
      if (laps2 >= totalLaps) { 
        raceFinished = true; 
        winner = 'Player 2'; 
        return true; 
      }
    }
    wasInsideStart2 = inside;
  }
  return false;
}

/// === INFO BOX ===
let infoBox = new InfoBox();
infoBox.add("Rock 'n Roll Racing 3D - Protótipo");
infoBox.addParagraph();
infoBox.add("Setas ← → : virar");
infoBox.add("Setas ↑ / X : acelerar");
infoBox.add("Seta ↓ : frear");
infoBox.add("1, 2 e 3 : trocar de pista");
infoBox.add("Z : atirar");
infoBox.show();

// === HUD de velocidade e voltas ===
const hud1 = document.createElement('div');
hud1.style.cssText = `
  position:fixed; top:12px; right:16px; padding:8px 10px;
  background:rgba(0,0,0,.6); color:#fff; font:14px monospace;
  border-radius:8px; z-index:999; pointer-events:none;
`;
document.body.appendChild(hud1);

const hud2 = document.createElement('div');
hud2.style.cssText = `
  position:fixed; top:56px; right:16px; padding:8px 10px;
  background:rgba(0,0,0,.45); color:#fff; font:14px monospace;
  border-radius:8px; z-index:999; pointer-events:none;
`;
document.body.appendChild(hud2);

// banner de vencedor (escondido até término)
const winnerBanner = document.createElement('div');
winnerBanner.style.cssText = `
  position:fixed; left:50%; top:40%; transform:translate(-50%,-50%);
  background:rgba(0,0,0,0.75); color:#ff0; font-size:48px; padding:20px 40px;
  border-radius:12px; z-index:1000; display:none;
`;
document.body.appendChild(winnerBanner);

function updateHUDs() {
  const kmh1 = Math.abs(speed) * 70;
  const kmh2 = Math.abs(speed2) * 70;

  const totalCheckpoints = Object.keys(currentTrack.getCheckpoints()).length;
  let arrived1 = 0, arrived2 = 0;
  for (let k in car1Checkpoints) if (car1Checkpoints[k].arrived) arrived1++;
  for (let k in car2Checkpoints) if (car2Checkpoints[k].arrived) arrived2++;

  hud1.textContent = `Jogador: Velocidade: ${kmh1.toFixed(1)} Km/h | Voltas: ${laps1}/${totalLaps} | CP: ${arrived1}/${totalCheckpoints} | Tiros: ${shots1}/${shotsMax}`;
  hud2.textContent = `CPU : Velocidade: ${kmh2.toFixed(1)} Km/h | Voltas: ${laps2}/${totalLaps} | CP: ${arrived2}/${totalCheckpoints} | Tiros: ${shots2}/${shotsMax}`;
}

const gridHelper = new THREE.GridHelper(720, 12);

scene.add(gridHelper);

function updateCamera(dt) {
  const effectiveFrame = dt * 60;
  const relCameraOffset = new THREE.Vector3(0, 14, 30);
  const cameraOffset = relCameraOffset.applyMatrix4(car.matrixWorld);
  const cameraFollowSpeed = 0.08 * effectiveFrame;

  camera.position.lerp(cameraOffset, Math.min(cameraFollowSpeed, 1.0));
  camera.lookAt(car.position);
}

function render() {
  stats.update();
  const deltaTime = clock.getDelta();
  // aplicar física / colisões para ambos
  handleKeys(deltaTime); // controla apenas `car` (player)
  resolveCollisionsAABB();
  updateCPU(deltaTime);   // IA do adversarío


  // atualizar checkpoints / voltas para cada carro
  updateCheckpointCounterFor(car, car1Checkpoints);
  updateCheckpointCounterFor(car2, car2Checkpoints);

  // atualizar projéteis
  updateProjectiles(deltaTime);

  // verifica fim de corrida (primeiro a completar)
  const finishedNow1 = updateLapCounterFor(car, car1Checkpoints);
  const finishedNow2 = updateLapCounterFor(car2, car2Checkpoints);
  if ((finishedNow1 || finishedNow2) && raceFinished) {
    // mostra banner com vencedor, posiciona câmera alto (uma vez)
    winnerBanner.textContent = `Vencedor: ${winner}`;
    winnerBanner.style.display = 'block';
    camera.position.copy(raceCamPos);
    camera.lookAt(0,0,0);
  }
  console.log(car2.position.x);
  
  updateHUDs();

    mainLight.position.set(
    car.position.x + 20,
    car.position.y + 40,
    car.position.z + 20
  );

  mainLight.target.position.copy(car.position);
  
  renderer.render(scene, camera);
  if (raceFinished){
    resetCarPosition()
  }else{
    updateCamera(deltaTime);
  }
  requestAnimationFrame(render);
}

//  IA do Carro Adversário ---------

let cpuTargetIndex = 0;
let cpuMaxSpeed = 2.4;
let cpuAcceleration = 0.009;

// Checkpoints estáticos por pista para a IA (ajuste as coordenadas conforme necessário)

function getCheckpointList() {
  return (checkpointsList[trackNumber] || []).map(v => v.clone());
}


function updateCPU(dt) {
    if (raceFinished) return;

    const effectiveFrame = dt * 60;

    let target = cpuCheckpoints[cpuTargetIndex];
    if (!target) return;

    const dir = target.clone().sub(car2.position);
    const distance = dir.length();
    dir.normalize();

    // virar em direção ao checkpoint
    const desiredAngle = Math.atan2(-dir.x, -dir.z);
    let angleDiff = desiredAngle - car2.rotation.y;

    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

    car2.rotation.y += angleDiff * 0.06 * effectiveFrame;

    // velocidade do adversário
    speed2 += cpuAcceleration * effectiveFrame;
    if (speed2 > cpuMaxSpeed) speed2 = cpuMaxSpeed;

    const moveSpeed = speed2 * effectiveFrame;

    // movimento
    car2.position.x -= Math.sin(car2.rotation.y) * moveSpeed;
    car2.position.z -= Math.cos(car2.rotation.y) * moveSpeed;

    // chegou no checkpoint?
    if (distance < 12) {
        cpuTargetIndex++;
        if (cpuTargetIndex >= cpuCheckpoints.length) cpuTargetIndex = 0;
    }
}


render();