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
camera = initCamera(new THREE.Vector3(0,700, 0));
light = initDefaultBasicLight(scene);
scene.add(camera);


orbit = new OrbitControls(camera, renderer.domElement);


window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

let plane = createGroundPlaneXZ(800, 800);
plane.material = setDefaultMaterial("#5b9452");
plane.position.set(0, 0, 0);
scene.add(plane);

function createTrack2() {
  const floorSize = 60;
  const group = new THREE.Group();  

  const colorNormal = "#555555"; // cor da pista
  const colorStart = "#ff9900";  // bloco de largada

  // Função auxiliar para criar um bloco com faixa branca
  function createTile(x, z, isStart = false) {
    const geometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const material = setDefaultMaterial(isStart ? colorStart : colorNormal);
    const tile = new THREE.Mesh(geometry, material);
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(x, 0.05, z);

    return tile;
  }

  // === Linha inferior (horizontal, 10 blocos) ===
  for (let i = 0; i < 10; i++) {
    const tile = createTile(i * floorSize, 0, i === 6);
    group.add(tile);
  }

  // === Subindo (vertical, 8 blocos) ===
  for (let i = 0; i < 9; i++) {
    const tile = createTile(0, -i * floorSize);
    group.add(tile);
  }

  // === Linha superior (horizontal, 6 blocos) ===
  for (let i = 0; i < 6; i++) {
    const tile = createTile(i * floorSize, -9 * floorSize);
    group.add(tile);
  }

  // === Descendo à direita 1 (vertical, 4 blocos) ===
  for (let i = 0; i < 5; i++) {
    const tile = createTile(5 * floorSize, -9 * floorSize + i * floorSize);
    group.add(tile);
  }

  // === Linha superior 2 (vertical, 4 blocos) ===
  for (let i = 0; i < 5; i++) {
    const tile = createTile( i * floorSize + 5 * floorSize, -5 * floorSize);
    group.add(tile);
  }

  // === Descendo à direita 2 (vertical, 4 blocos) ===
  for (let i = 0; i < 4; i++) {
    const tile = createTile(9 * floorSize, -4 * floorSize + i * floorSize);
    group.add(tile);
  }

  // Centraliza a pista no grid
  const totalSize = floorSize * 9; // 9 blocos de deslocamento em cada eixo
  group.position.set(-totalSize / 2, 0, totalSize / 2);

  return group;
}


let grid = new THREE.GridHelper(700, 70);
scene.add(grid);

track2 = createTrack2();
scene.add(track2);

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

render();