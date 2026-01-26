import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import Stats from '../build/jsm/libs/stats.module.js';
import {
  initRenderer, initCamera, initDefaultBasicLight,
  setDefaultMaterial, onWindowResize, createGroundPlaneXZ
} from "../libs/util/util.js";

// Track and Car imports
import { Track } from './tracks.js';
import { createCar } from './car.js';

// Module imports
import { resolveCollisionsAABB } from './physics.js';
import { createProjectile, destroyProjectile, updateProjectiles } from './projectiles.js';
import { createWaterParticles, updateParticles } from './particles.js';
import { setupKeyListeners, handleKeys } from './controls.js';
import { updateCheckpointCounterFor, updateLapCounterFor } from './checkpoints.js';
import { updateCPU } from './ai.js';
import { createHUDs, updateHUDs, setupInfoBox } from './hud.js';
import { updateCamera } from './camera.js';
import { applyPenaltyTo, tryShootPlayer, cloneCheckpoints } from './utils.js';

// ========== Scene Setup ==========
let scene, renderer, camera, orbit;
let trackNumber = 1, currentTrack = new Track(1, null);

const container = document.getElementById('container');
const stats = new Stats();
container.appendChild(stats.dom);

// Game state
let raceFinished = false;
let winner = null;
let clock = new THREE.Clock();

// Car arrays
let cars = [];
let carSpeeds = [];
let carVelocityY = [];
let carPenaltyEndTime = [];
let carCheckpoints = [];
let carLaps = [];
let wasInsideStart = [];
let carShots = [];

// Game constants
const shotsMax = 4;
const totalLaps = 4;
const maxSpeed = 3;
const acceleration = 0.008;
const gravity = -0.10;

// Projectiles and particles
let projectiles = [];
let particles = [];

// Setup lights
const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 1;
mainLight.shadow.camera.far = 800;
const shadowExtent = 220;
mainLight.shadow.camera.left = -shadowExtent;
mainLight.shadow.camera.right = shadowExtent;
mainLight.shadow.camera.top = shadowExtent;
mainLight.shadow.camera.bottom = -shadowExtent;
mainLight.shadow.bias = -0.0006;

const lightDirection = new THREE.Vector3(-0.7, -1.0, -0.3).normalize();
const mainLightTarget = new THREE.Object3D();

// Renderer and camera setup
scene = new THREE.Scene();
renderer = initRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor("#87ceeb");
camera = initCamera(new THREE.Vector3(0, 800, 0));

mainLightTarget.position.copy(camera.position).add(lightDirection);
mainLight.target = mainLightTarget;
scene.add(mainLightTarget);
scene.add(mainLight);

const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
scene.add(hemi);
const fillDir = new THREE.DirectionalLight(0xffffff, 0.25);
fillDir.position.set(-50, 30, -50);
fillDir.castShadow = false;
scene.add(fillDir);

scene.add(camera);
orbit = new OrbitControls(camera, renderer.domElement);

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

// Create ground
let plane = createGroundPlaneXZ(960, 960);
plane.material = setDefaultMaterial("#5b9452");
plane.position.set(0, 0, 0);
scene.add(plane);

// Create track
scene.add(currentTrack.getTrackGroup());

// Checkpoint list for AI
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
    new THREE.Vector3(53, 0, 384),
    new THREE.Vector3(30, 0, -370),
    new THREE.Vector3(-360, 0, -370),
    new THREE.Vector3(-365, 0, 5),
    new THREE.Vector3(365, 0, 10),
    new THREE.Vector3(370, 0, 370),
  ],
};

function getCheckpointList() {
  return (checkpointsList[trackNumber] || []).map(v => v.clone());
}

// ========== Initialize Cars ==========
function initializeCars() {
  cars = [];
  carSpeeds = [];
  carVelocityY = [];
  carPenaltyEndTime = [];
  carCheckpoints = [];
  carLaps = [];
  wasInsideStart = [];
  carShots = [];

  // Create player
  let car = createCar(1);
  car.position.set(110, 5, 275);
  car.rotation.y = Math.PI / 2;
  scene.add(car);
  cars.push(car);
  carSpeeds.push(0);
  carVelocityY.push(0);
  carPenaltyEndTime.push(0);
  carLaps.push(0);
  wasInsideStart.push(false);
  carShots.push(shotsMax);

  // Create 3 adversaries
  const adversaryPositions = [
    { x: 110, z: 265 },  // adversary 1: ahead
    { x: 130, z: 255 },  // adversary 2: ahead
    { x: 95, z: 275 }    // adversary 3: left side
  ];

  for (let i = 0; i < 3; i++) {
    let carAdv = createCar(i + 2);
    carAdv.position.set(adversaryPositions[i].x, 5, adversaryPositions[i].z);
    carAdv.rotation.y = Math.PI / 2;
    scene.add(carAdv);
    cars.push(carAdv);
    carSpeeds.push(0);
    carVelocityY.push(0);
    carPenaltyEndTime.push(0);
    carLaps.push(0);
    wasInsideStart.push(false);
    carShots.push(shotsMax);
  }

  // Initialize checkpoints for all cars
  carCheckpoints[0] = cloneCheckpoints(currentTrack.getCheckpoints());
  carCheckpoints[1] = cloneCheckpoints(currentTrack.getCheckpoints());
  carCheckpoints[2] = cloneCheckpoints(currentTrack.getCheckpoints());
  carCheckpoints[3] = cloneCheckpoints(currentTrack.getCheckpoints());
}

initializeCars();

// ========== HUD Setup ==========
const { hud1, hud2, winnerBanner } = createHUDs();
setupInfoBox();

// ========== Camera Setup ==========
const raceCamPos = new THREE.Vector3(0, 400, 0);

// ========== Grid ==========
const gridHelper = new THREE.GridHelper(960, 16);
scene.add(gridHelper);

// ========== Input Setup ==========
const keys = setupKeyListeners();

// ========== Game Functions ==========
function resetCarPosition(track = 1) {
  let xPos = 110;
  let zPos = 250;
  if (track === 3) {
    xPos = 290;
    zPos = 370;
  }

  for (let i = 0; i < cars.length; i++) {
    if (i === 0) {
      cars[i].position.set(xPos, 5, zPos + 25);
    } else if (i === 1) {
      cars[i].position.set(xPos, 5, zPos + 10);
    } else if (i === 2) {
      cars[i].position.set(xPos + 20, 5, zPos);
    } else if (i === 3) {
      cars[i].position.set(xPos - 15, 5, zPos + 25);
    }
    cars[i].rotation.y = Math.PI / 2;
    carSpeeds[i] = 0;
  }
}

function switchTrack(track) {
  raceFinished = false;
  winner = null;
  winnerBanner.style.display = 'none';
  if (currentTrack) scene.remove(currentTrack.getTrackGroup());

  for (const p of projectiles) scene.remove(p.mesh);
  projectiles.length = 0;

  for (let i = 0; i < carShots.length; i++) {
    carShots[i] = shotsMax;
    carPenaltyEndTime[i] = 0;
    carLaps[i] = 0;
    wasInsideStart[i] = false;
  }

  if (track === 1) {
    currentTrack = new Track(1, null);
    trackNumber = 1;
  } else if (track === 2) {
    currentTrack = new Track(2, null);
    trackNumber = 2;
  } else if (track === 3) {
    currentTrack = new Track(3, null);
    trackNumber = 3;
  }

  // Clone checkpoints for all cars
  carCheckpoints[0] = cloneCheckpoints(currentTrack.getCheckpoints());
  carCheckpoints[1] = cloneCheckpoints(currentTrack.getCheckpoints());
  carCheckpoints[2] = cloneCheckpoints(currentTrack.getCheckpoints());
  carCheckpoints[3] = cloneCheckpoints(currentTrack.getCheckpoints());

  scene.add(currentTrack.getTrackGroup());
  resetCarPosition(track);
}

// ========== AI State ==========
let cpuTargetIndex = [0, 0, 0];
let cpuMaxSpeed = 2.4;
let cpuAcceleration = 0.009;
let cpuLastShotTime = [0, 0, 0];
let prevCpuAhead = [false, false, false];
const cpuShootInterval = 5.0;

let cpuCheckpoints = getCheckpointList();

// ========== Main Render Loop ==========
function render() {
  stats.update();
  const deltaTime = clock.getDelta();

  // Input handling
  handleKeys(deltaTime, {
    keys, cars, carSpeeds, carVelocityY, maxSpeed, acceleration,
    carPenaltyEndTime, clock, raceFinished, switchTrack,
    tryShootPlayer: () => tryShootPlayer({ carShots, cars, projectiles, scene, shotsMax, raceFinished, createProjectile })
  });

  // Physics and collisions
  resolveCollisionsAABB(deltaTime, {
    cars, carSpeeds, carVelocityY, currentTrack, maxSpeed, cpuMaxSpeed,
    gravity, projectiles, carPenaltyEndTime, scene, createWaterParticles,
    applyPenaltyTo: (idx) => applyPenaltyTo(idx, { carSpeeds, carPenaltyEndTime, clock }),
    destroyProjectile: (idx) => destroyProjectile(idx, { scene, projectiles }), particles
  });

  // Update AI
  updateCPU(deltaTime, {
    cars, carSpeeds, carVelocityY, carPenaltyEndTime, carLaps, carShots,
    cpuTargetIndex, cpuMaxSpeed, cpuAcceleration, cpuLastShotTime, prevCpuAhead,
    cpuCheckpoints, carCheckpoints, clock, raceFinished,
    createProjectile: (owner, tag) => createProjectile(owner, tag, { scene, projectiles }),
    shotsMax, cpuShootInterval
  });

  // Update checkpoints
  for (let i = 0; i < cars.length; i++) {
    updateCheckpointCounterFor(cars[i], carCheckpoints[i]);
  }

  // Update projectiles
  updateProjectiles(deltaTime, { projectiles, currentTrack, scene });

  // Update particles
  updateParticles(deltaTime, { particles, scene });

  // Update lap counter
  let raceFinishedNow = false;
  for (let i = 0; i < cars.length; i++) {
    if (updateLapCounterFor(i, {
      cars, carCheckpoints, carLaps, carShots, wasInsideStart,
      currentTrack, totalLaps, shotsMax, raceFinished, winner, clock
    })) {
      raceFinishedNow = true;
      raceFinished = true;
      winner = i === 0 ? 'Jogador' : `Adversário ${i}`;
      break;
    }
  }

  if (raceFinishedNow && raceFinished) {
    winnerBanner.textContent = `Vencedor: ${winner}`;
    winnerBanner.style.display = 'block';
    camera.position.copy(raceCamPos);
    camera.lookAt(0, 0, 0);
  }

  // Update HUD
  updateHUDs(hud1, hud2, {
    cars, carSpeeds, carLaps, carShots, carCheckpoints,
    currentTrack, totalLaps, shotsMax
  });

  // Update lighting
  const lightPos = new THREE.Vector3(
    cars[0].position.x + 20,
    cars[0].position.y + 40,
    cars[0].position.z + 20
  );
  mainLight.position.copy(lightPos);
  mainLight.target.position.copy(lightPos).add(lightDirection);
  mainLight.target.updateMatrixWorld();

  renderer.render(scene, camera);

  if (raceFinished) {
    resetCarPosition();
  } else {
    updateCamera(deltaTime, { camera, cars });
  }

  requestAnimationFrame(render);
}

render();
