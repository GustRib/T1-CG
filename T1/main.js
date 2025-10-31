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
camera = initCamera(new THREE.Vector3(0, 20, 30));
light = initDefaultBasicLight(scene);
scene.add(camera);


orbit = new OrbitControls(camera, renderer.domElement);


window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

let plane = createGroundPlaneXZ(200, 200);
plane.material = setDefaultMaterial("#5b9452");
plane.position.set(0, 0, 0);
scene.add(plane);

let startLineGeometry = new THREE.PlaneGeometry(10, 10);
let startLineMaterial = setDefaultMaterial("orange");
let startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);

function createrTrack1(){
  let floorWidth = 10;
  let floorHeight = 10;

  let group = new THREE.Group();  
  for (let i = 0; i < 10; i++) {
      let floor = {};
      const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorHeight);
      const floorMaterial = setDefaultMaterial("#555555");
      
      
      
      if(i == 3){
        floor['left'] = startLine;
      }

      const divisor = new THREE.PlaneGeometry(floorWidth, 0.1);
      const matDivisor = setDefaultMaterial("red");
      const divisorMesh = new THREE.Mesh(divisor, matDivisor);
      divisorMesh.position.set(0, 4.95, 0.1); // ligeiramente acima do chão
      floor.add(divisorMesh);

      floor.rotation.x = -Math.PI / 2; // de pé pra deitado
      floor.position.set(-40, 0, 50 - (i*floorWidth)); // ✅ agora funciona
      group.add(floor);
  }
  
  return group;
}
let grid = new THREE.GridHelper(200, 20);
scene.add(grid);
scene.add(createrTrack1());

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
 
}

render();