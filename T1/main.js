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


//orbit = new OrbitControls(camera, renderer.domElement);


window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

let plane = createGroundPlaneXZ(60, 60);
plane.material = setDefaultMaterial("#555555");
plane.position.set(0, 0, 0);
scene.add(plane);


function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

render();