import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import {
  initRenderer, initCamera, initDefaultBasicLight,
  setDefaultMaterial, InfoBox, onWindowResize, createGroundPlaneXZ
} from "../libs/util/util.js";

let scene, renderer, camera, light, orbit;
let track1, track2, currentTrack;
const floorYAxis = 0.05;
const floorWidth = 60;
const floorHeight = 60;
let car, speed = 0, maxSpeed = 1.5, acceleration = 0.008;
let keys = {};
let clock = new THREE.Clock();

// Cria Plano
let plane = createGroundPlaneXZ(700, 700);
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
scene.add(car);
//  CARRO 
camera.position.set(0, 10, 15);
camera.lookAt(car.position);

let startLineGeometry = new THREE.PlaneGeometry(floorWidth, floorHeight);
let startLineMaterial = setDefaultMaterial("orange");
let startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);

function createWall(x, y, z) {
  let halfWallsColors = ["red", "white"];

  let wall = new THREE.Group();
  let halfWallGeometry = new THREE.BoxGeometry(2, 20, 2);
  let wallMaterial = (color) => setDefaultMaterial(color);

  for (let i = 0; i < 2; i++) {
    let halfWall = new THREE.Mesh(halfWallGeometry, wallMaterial(halfWallsColors[i]));
    halfWall.position.set((x - 10) + i * 10, y, z);
    wall.add(halfWall);
  }
  return wall;
}

function createrTrack1() {
  const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorHeight);
  const floorMaterial = setDefaultMaterial("#555555");

  const divisorGeomtery = new THREE.PlaneGeometry(floorWidth, 1);
  const divisorMaterial = setDefaultMaterial("red");

  let group = new THREE.Group();
  let floor = { 'left': null, 'right': null, 'upper': null, 'lower': null };

  for (let i = 0; i < 10; i++) {
    floor['left'] = new THREE.Mesh(floorGeometry, floorMaterial);
    floor['right'] = new THREE.Mesh(floorGeometry, floorMaterial);

    floor['left'].position.set(-270, floorYAxis, 270 - (i * (floorHeight)));
    floor['right'].position.set(270, floorYAxis, 270 - (i * (floorHeight)));

    if (i < 8) {
      floor['upper'] = new THREE.Mesh(floorGeometry, floorMaterial);
      if (i == 5) {
        floor['lower'] = startLine;
      } else {
        floor['lower'] = new THREE.Mesh(floorGeometry, floorMaterial);
      }

      floor['upper'].position.set(-210 + i * floorWidth, floorYAxis, -270);
      floor['lower'].position.set(-210 + i * floorWidth, floorYAxis, 270);
    }

    [floor['left'], floor['right'], floor['upper'], floor['lower']].forEach(block => {
      block.rotation.x = -Math.PI / 2;
      group.add(block);
    })
  }

  return group;
}

let grid = new THREE.GridHelper(700, 40);
scene.add(grid);
scene.add(createrTrack1());

    //  velocidades progressivas 
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

function render() {
  requestAnimationFrame(render);

  const deltaTime = clock.getDelta();

  handleKeys(deltaTime);
  updateCamera(deltaTime);

  renderer.render(scene, camera);
}

render();