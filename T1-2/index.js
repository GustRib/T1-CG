import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js';
import {TrackballControls} from '../build/jsm/controls/TrackballControls.js';
import {initRenderer, initCamera, initDefaultBasicLight, createGroundPlane, onWindowResize} from "../libs/util/util.js";
import { CSG } from '../libs/other/CSGMesh.js';

const scene = new THREE.Scene();
const stats = new Stats();
const renderer = initRenderer();
renderer.setClearColor("rgb(30, 30, 40)");
const camera = initCamera(new THREE.Vector3(8, -20, 10));
camera.up.set(0, 0, 1);
initDefaultBasicLight(scene, true, new THREE.Vector3(12, -15, 20), 28, 1024);

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

const ground = createGroundPlane(40, 40);
scene.add(ground);

const axes = new THREE.AxesHelper(12);
scene.add(axes);

const trackballControls = new TrackballControls(camera, renderer.domElement);

// util: fixa matriz do mesh antes do CSG
function freeze(mesh) {
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
}

// Constroi o túnel com furos usando CSG
function buildTunnel() {
  // Geometrias / parâmetros
  const length = 40;
  const outerR = 4.0;
  const innerR = 3.2;
  const radialSegs = 64;

  // Cilindros (abertos) orientados no eixo X
  const outerGeom = new THREE.CylinderGeometry(outerR, outerR, length, radialSegs, 1, true);
  const innerGeom = new THREE.CylinderGeometry(innerR, innerR, length + 2, radialSegs, 1, true); // ligeiramente maior para evitar bordas

  const matDummy = new THREE.MeshPhongMaterial({ color: 'gray' });

  const outerMesh = new THREE.Mesh(outerGeom, matDummy);
  const innerMesh = new THREE.Mesh(innerGeom, matDummy);

  // alinhar eixo do cilindro para X
  outerMesh.rotation.z = Math.PI / 2;
  innerMesh.rotation.z = Math.PI / 2;

  // manter ambos centrados
  freeze(outerMesh);
  freeze(innerMesh);

  // transforma em CSG e subtrai o interior -> tubo oco
  let csg = CSG.fromMesh(outerMesh);
  const innerCSG = CSG.fromMesh(innerMesh);
  csg = csg.subtract(innerCSG);

  // Criar esferas para furar o tubo (posições ao longo do eixo X, alternando topo/base)
  const holeRadius = 1.05;
  const holePositions = [-12, -6, 0, 6, 12];
  for (let i = 0; i < holePositions.length; i++) {
    const x = holePositions[i];
    // duas esferas por posição: topo e base (alternar Z)
    const zOffset = (i % 2 === 0) ? 1.6 : -1.6;
    const sTop = new THREE.Mesh(new THREE.SphereGeometry(holeRadius, 32, 32), matDummy);
    sTop.position.set(x, 0, zOffset);
    freeze(sTop);
    const sTopCSG = CSG.fromMesh(sTop);
    csg = csg.subtract(sTopCSG);

    // adicionar também um furo lateral (opcional)
    const sSide = new THREE.Mesh(new THREE.SphereGeometry(holeRadius, 32, 32), matDummy);
    sSide.position.set(x, 1.8, 0);
    freeze(sSide);
    csg = csg.subtract(CSG.fromMesh(sSide));
  }

  // Converter CSG final em mesh e adicionar materiais visíveis
  const resultMesh = CSG.toMesh(csg, new THREE.Matrix4());
  resultMesh.material = new THREE.MeshPhongMaterial({ color: '#8fb6d6', shininess: 30 });
  resultMesh.position.set(0, 0, 0);
  resultMesh.castShadow = true;
  resultMesh.receiveShadow = true;

  scene.add(resultMesh);

  // opcional: adicione um "tubo interior" com material transparente para visualizar a espessura
  const innerPreview = new THREE.Mesh(new THREE.CylinderGeometry(innerR, innerR, length - 0.2, 32, 1, true), new THREE.MeshPhongMaterial({ color: '#222233', transparent: true, opacity: 0.15 }));
  innerPreview.rotation.z = Math.PI / 2;
  scene.add(innerPreview);
}

buildTunnel();

function render() {
  stats.update();
  trackballControls.update();
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

render();