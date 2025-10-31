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

// === INICIAR SCENE ===
scene = new THREE.Scene();
renderer = initRenderer();
renderer.setClearColor("#87ceeb"); // Céu
camera = initCamera(new THREE.Vector3(0, 400, 30));
light = initDefaultBasicLight(scene);
scene.add(camera);

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
orbit = new OrbitControls(camera, renderer.domElement);

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

orbit = new OrbitControls(camera, renderer.domElement);

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

let plane = createGroundPlaneXZ(500, 500);
plane.material = setDefaultMaterial("#5b9452");
plane.position.set(0, 0, 0);

scene.add(plane);

car = createCar();
scene.add(car);

camera.position.set(0, 10, 15);
camera.lookAt(car.position); 
let startLineGeometry = new THREE.PlaneGeometry(40, 40);
let startLineMaterial = setDefaultMaterial("orange");
let startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);

function createWall(x, y, z){
  let halfWallsColors = ["red", "white"];

  let wall = new THREE.Group();
  let halfWallGeometry = new THREE.BoxGeometry(2, 20, 2);
  let wallMaterial = (color) => setDefaultMaterial(color);

  for(let i=0; i<2; i++){
    let halfWall = new THREE.Mesh(halfWallGeometry, wallMaterial(halfWallsColors[i]));
    halfWall.position.set((x-10)+ i*10, y, z);
    wall.add(halfWall);
  }

  return wall;
}

function createrTrack1(){
  let floorWidth = 40;
  let floorHeight = 40;

  const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorHeight);
  const floorMaterial = setDefaultMaterial("#555555");
  
  const divisorGeomtery = new THREE.PlaneGeometry(floorWidth, 1);
  const divisorMaterial = setDefaultMaterial("red");

  let group = new THREE.Group();  
  let floor = {'left': null, 'right': null, 'upper': null, 'lower': null};

  for (let i = 0; i < 10; i++) {
      floor['left'] = new THREE.Mesh(floorGeometry, floorMaterial);
      floor['right'] = new THREE.Mesh(floorGeometry, floorMaterial);
 
      let divisor = new THREE.Mesh(divisorGeomtery, divisorMaterial);
      floor['left'].add(divisor);
      divisor.position.set(0, 19.5, 0.1); // ligeiramente acima do chão

      divisor = new THREE.Mesh(divisorGeomtery, divisorMaterial);
      floor['right'].add(divisor);
      divisor.position.set(0, 19.5, 0.1); // ligeiramente acima do chão

      floor['left'].position.set(-180, 0.05, 180 - i * floorHeight);
      floor['right'].position.set(180, 0.05, 180 - i * floorHeight);


      if(i < 8){
        floor['upper'] = new THREE.Mesh(floorGeometry, floorMaterial);
        if(i == 5){
          floor['lower'] = startLine;
        }else{
          floor['lower'] = new THREE.Mesh(floorGeometry, floorMaterial);
        }
        divisor = new THREE.Mesh(divisorGeomtery, divisorMaterial);
        floor['upper'].add(divisor);
        divisor.rotation.z = Math.PI / 2;
        divisor.position.set(-19.5, 0, 0.1); // ligeiramente acima do chão

        divisor = new THREE.Mesh(divisorGeomtery, divisorMaterial);
        floor['lower'].add(divisor);
    
        divisor.rotation.z = Math.PI / 2;
        divisor.position.set(-19.5, 0, 0.1); // ligeiramente acima do chão

        floor['upper'].position.set(-140 + i *floorWidth, 0.05, -180 );
        floor['lower'].position.set(-140 + i *floorWidth, 0.05, 180);
      }
   

      [floor['left'], floor['right'], floor['upper'],floor['lower']].forEach(block => {
        block.rotation.x = -Math.PI / 2;
        group.add(block);
      })
  }
  
  return group;
}

let grid = new THREE.GridHelper(500, 40);
scene.add(grid);
scene.add(createrTrack1());

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
 
}

render();