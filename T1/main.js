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


orbit = new OrbitControls(camera, renderer.domElement);


window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

let plane = createGroundPlaneXZ(500, 500);
plane.material = setDefaultMaterial("#5b9452");
plane.position.set(0, 0, 0);
scene.add(plane);

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