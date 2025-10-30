import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import { 
  initRenderer, initCamera, initDefaultBasicLight, 
  setDefaultMaterial, InfoBox, onWindowResize, createGroundPlaneXZ 
} from "../libs/util/util.js";

let scene, renderer, camera, light, orbit;
let track1, track2, currentTrack;
let car, speed = 0, maxSpeed = 2, acceleration = 0.02;
let keys = {};

// === INIT SCENE ===
scene = new THREE.Scene();
renderer = initRenderer();
renderer.setClearColor("#87ceeb"); // Céu
camera = initCamera(new THREE.Vector3(0, 20, 30));
light = initDefaultBasicLight(scene);
scene.add(camera);

// controles de órbita (apenas pra debug)
orbit = new OrbitControls(camera, renderer.domElement);

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// === CREATE TRACKS ===
function createTrack(colorPista, colorMuretaAlt) {
  let group = new THREE.Group();

  // === CONFIGURAÇÃO BÁSICA ===
  const pistaWidth = 60;   // largura (x)
  const pistaLength = 40;  // comprimento de cada seção (z)
  const numSections = 2;   // quantas seções de pista
  const totalLength = pistaLength * numSections;
  const muretaHeight = 3;
  const muretaSize = 2;
  const cores = ["white", colorMuretaAlt];

  // === CRIA AS SEÇÕES DE PISTA ===
  for (let i = 0; i < numSections; i++) {
    let plane = createGroundPlaneXZ(pistaWidth, pistaLength);
    plane.material = setDefaultMaterial(colorPista);
    plane.position.set(0, 0.01, -i * pistaLength); // desloca pra trás cada seção
    group.add(plane);
  }

  // === MURETAS LONGITUDINAIS (Z) ===
  const offsetZ = pistaLength / 2;
  const offsetX = pistaWidth / 2;

  for (let i = -offsetX; i <= offsetX; i += muretaSize) {
    const color = cores[((i / muretaSize) % 2 + 2) % 2];
    // frente
    let bloco1 = new THREE.Mesh(
      new THREE.BoxGeometry(muretaSize, muretaHeight, 1),
      setDefaultMaterial(color)
    );
    bloco1.position.set(i, muretaHeight / 2, offsetZ);
    // trás
    let bloco2 = bloco1.clone();
    bloco2.position.z = -offsetZ - (numSections - 1) * pistaLength;
    group.add(bloco1, bloco2);
  }

  // === MURETAS LATERAIS (X) ===
  for (let j = -offsetZ; j >= -totalLength; j -= muretaSize) {
    const color = cores[((j / muretaSize) % 2 + 2) % 2];
    let bloco1 = new THREE.Mesh(
      new THREE.BoxGeometry(1, muretaHeight, muretaSize),
      setDefaultMaterial(color)
    );
    bloco1.position.set(offsetX, muretaHeight / 2, j);
    let bloco2 = bloco1.clone();
    bloco2.position.x = -offsetX;
    group.add(bloco1, bloco2);
  }

  // marcador opcional (debug)
  let endMarker = new THREE.Mesh(
    new THREE.BoxGeometry(2, 4, 2),
    setDefaultMaterial("green")
  );
  endMarker.position.set(0, 2, -totalLength);
  group.add(endMarker);

  return group;
}

track1 = createTrack("#505050", "red");
track2 = createTrack("#404060", "yellow");
scene.add(track1);
currentTrack = track1;

// === CAR CREATION ===
function createCar() {
  let carGroup = new THREE.Group();

  // corpo principal
  let body = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1, 6),
    setDefaultMaterial("gray")
  );
  body.position.y = 1;
  carGroup.add(body);

  // cabine
  let cabine = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1, 3),
    setDefaultMaterial("#3333aa")
  );
  cabine.position.set(0, 1.5, -0.5);
  carGroup.add(cabine);

  // rodas
  const wheelGeom = new THREE.TorusGeometry(0.7, 0.3, 8, 20);
  const wheelMat = setDefaultMaterial("black");
  const wheelPositions = [
    [-1.5, 0.5, 2.2],
    [1.5, 0.5, 2.2],
    [-1.5, 0.5, -2.2],
    [1.5, 0.5, -2.2]
  ];
  wheelPositions.forEach(pos => {
    let wheel = new THREE.Mesh(wheelGeom, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(...pos);
    carGroup.add(wheel);
  });

  carGroup.position.set(0, 1, 0);
  return carGroup;
}

car = createCar();
scene.add(car);

// === INFO BOX ===
let infoBox = new InfoBox();
infoBox.add("Rock 'n Roll Racing 3D - Protótipo");
infoBox.addParagraph();
infoBox.add("Setas ← → : virar");
infoBox.add("Setas ↑ / X : acelerar");
infoBox.add("Seta ↓ : frear");
infoBox.add("1 e 2 : trocar de pista");
infoBox.show();

// === KEY LOGIC ===
function handleKeys() {
  // troca de pista
  if (keys['1']) switchTrack(1);
  if (keys['2']) switchTrack(2);

  // aceleração progressiva
  if (keys['arrowup'] || keys['x']) {
    speed += acceleration;
    if (speed > maxSpeed) speed = maxSpeed;
  } else if (keys['arrowdown']) {
    speed -= acceleration * 1.5;
    if (speed < -maxSpeed / 2) speed = -maxSpeed / 2;
  } else {
    // desaceleração natural
    speed *= 0.98;
  }

  // rotação
  if (keys['arrowleft']) car.rotation.y += 0.05;
  if (keys['arrowright']) car.rotation.y -= 0.05;

  // movimento
  car.position.x -= Math.sin(car.rotation.y) * speed;
  car.position.z -= Math.cos(car.rotation.y) * speed;
}

// === SWITCH TRACK ===
function switchTrack(num) {
  scene.remove(currentTrack);
  currentTrack = (num === 1) ? track1 : track2;
  scene.add(currentTrack);
  car.position.set(0, 1, 0);
  car.rotation.y = 0;
}

// === CAMERA FOLLOW ===
function updateCamera() {
  const relCameraOffset = new THREE.Vector3(0, 15, 25);
  const cameraOffset = relCameraOffset.applyMatrix4(car.matrixWorld);
  camera.position.lerp(cameraOffset, 0.1);
  camera.lookAt(car.position);
}

// === RENDER LOOP ===
function render() {
  requestAnimationFrame(render);
  handleKeys();
  updateCamera();
  renderer.render(scene, camera);
}

render();
