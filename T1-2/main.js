import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import Stats from '../build/jsm/libs/stats.module.js';
import {
  initRenderer, initCamera, initDefaultBasicLight,
  setDefaultMaterial, InfoBox, onWindowResize, createGroundPlaneXZ
} from "../libs/util/util.js";

//Tracks e Tiles
import { Track, buildTunnel } from './tracks.js';

//Car
import { createCar } from './car.js';


// --- NOVO: Variáveis de controle de jogo e áudio ---
let gameLoaded = false;
let raceStarted = false; // Impede movimento durante contagem
let startSoundBuffer = null;
const audioListener = new THREE.AudioListener();
const soundPlayer = new THREE.Audio(audioListener);
const shootSound = new THREE.Audio(audioListener);
const hitSound = new THREE.Audio(audioListener);
const finalLapSound = new THREE.Audio(audioListener); // Som de "Final Lap!"
// Controle de Música
let musicPlayer = new THREE.Audio(audioListener); // Usa o mesmo listener da câmera
let musicBuffers = {}; // Armazena os buffers das 3 músicas
let musicEnabled = true; // Estado do som (Ligado/Desligado)
let musicVolume = 0.3; // Volume mais baixo para não ofuscar os efeitos
let shootBuffer = null;
let hitBuffer = null;
let finalLapBuffer = null;
// --- NOVO: Loading Manager ---
const loadingManager = new THREE.LoadingManager(() => {
    // Quando tudo carregar:
    const loadingScreen = document.getElementById('loading-screen');
    const loaderText = document.getElementById('loader');
    const startBtn = document.getElementById('start-btn');
    
    loaderText.style.display = 'none';
    startBtn.style.display = 'block';

    // O navegador exige interação do usuário para tocar áudio
    startBtn.addEventListener('click', () => {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => loadingScreen.remove(), 500);
        gameLoaded = true;
        
        // Inicia a contagem da primeira pista
        startCountdown(); 
    });
});

// Textures
const textureLoader = new THREE.TextureLoader(loadingManager);
const grassTexture = textureLoader.load('./assets/gravelly_sand_diff_4k.jpg');
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(8, 8);
grassTexture.anisotropy = 16;
const skyTexture = textureLoader.load('../assets/textures/skybox/panorama1.jpg');

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
let velocityY = 0, velocityY2 = 0;   // velocidade vertical (gravidade)
const gravity = -0.10;               // aceleração para baixo
const groundLevel = 5;               // altura do piso (carros iniciam em Y=5)

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

const shotsMax = 4;
let shots1 = shotsMax, shots2 = shotsMax;
let projectiles = [];
let penaltyEndTime1 = 0, penaltyEndTime2 = 0;
let particles = []; // array de partículas ativas

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
    new THREE.Vector3(53, 0, 384),
    new THREE.Vector3(30, 0, -370),
    new THREE.Vector3(-360, 0, -370),
    new THREE.Vector3(-365, 0, 5),
    new THREE.Vector3(365, 0, 10),
    new THREE.Vector3(370, 0, 370),

  ],
};
const audioLoader = new THREE.AudioLoader(loadingManager);
audioLoader.load('./0_assets_T3/start01.mp3', function(buffer) {
    startSoundBuffer = buffer;
    soundPlayer.setBuffer(startSoundBuffer);
    soundPlayer.setVolume(0.5);
});

audioLoader.load('./0_assets_T3/track1.mp3', function(buffer) {
    musicBuffers[1] = buffer;
});

// Carregar Música da Pista 2
audioLoader.load('./0_assets_T3/track2.mp3', function(buffer) {
    musicBuffers[2] = buffer;
});

// Carregar Música da Pista 3
audioLoader.load('./0_assets_T3/track3.mp3', function(buffer) {
    musicBuffers[3] = buffer;
});
// Carregar SFX de Tiro
audioLoader.load('./0_assets_T3/shoot.mp3', function(buffer) {
    shootBuffer = buffer;
    shootSound.setBuffer(shootBuffer);
    shootSound.setVolume(0.4); // Volume ajustável
});

// Carregar SFX de Colisão/Dano
audioLoader.load('./0_assets_T3/hit.mp3', function(buffer) {
    hitBuffer = buffer;
    hitSound.setBuffer(hitBuffer);
    hitSound.setVolume(0.6);
});

// Carregar SFX de Última Volta
audioLoader.load('./0_assets_T3/final_lap.mp3', function(buffer) {
    finalLapBuffer = buffer;
    finalLapSound.setBuffer(finalLapBuffer);
    finalLapSound.setVolume(1.0); // Bem alto para destaque
});

function playTrackMusic(trackNum) {
    // Para a música anterior se estiver tocando
    if (musicPlayer.isPlaying) {
        musicPlayer.stop();
    }

    // Verifica se o buffer da pista existe
    if (musicBuffers[trackNum]) {
        musicPlayer.setBuffer(musicBuffers[trackNum]);
        musicPlayer.setLoop(true);
        musicPlayer.setVolume(musicVolume);
        
        // Só toca se o mute não estiver ativado
        if (musicEnabled) {
            musicPlayer.play();
        }
    }
}

function startCountdown() {
    raceStarted = false; // Trava os carros
    const el = document.getElementById('countdown');
    el.style.display = 'block';
    
    // Reinicia o contador visual
    let count = 3;
    el.textContent = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            el.textContent = count;
        } else if (count === 0) {
            el.textContent = "GO!";
            raceStarted = true; // Libera o jogo!

            if (startSoundBuffer && soundPlayer.context.state === 'running') {
                if(soundPlayer.isPlaying) soundPlayer.stop();
                soundPlayer.play();
            }
            // --------------------------------------

        } else {
            el.style.display = 'none';
            clearInterval(interval);
        }
    }, 1000);
}

// Cria plano
let plane = createGroundPlaneXZ(960, 960);
plane.material = setDefaultMaterial("white", grassTexture);
plane.position.set(0, 0, 0);

// Inicia cena
scene = new THREE.Scene();
renderer = initRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // sombra suave
//renderer.setClearColor("#87ceeb"); // Céu
camera = initCamera(new THREE.Vector3(0, 800, 0));
camera.add(audioListener);
const skyGeometry = new THREE.SphereGeometry(700, 60, 40);
const skyMaterial = new THREE.MeshBasicMaterial({
  map: skyTexture,
  side: THREE.BackSide,
  depthWrite: false
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
sky.frustumCulled = false;
sky.renderOrder = -1;
scene.add(sky);

// === LUZ PRINCIPAL DIRECIONAL (segue posição do carro sem rotacionar) ===

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
mainLight.shadow.bias = -0.0006; // reduce acne

const lightDirection = new THREE.Vector3(-0.7, -1.0, -0.3).normalize();
const mainLightTarget = new THREE.Object3D();
scene.add(mainLightTarget);
mainLight.target = mainLightTarget;
scene.add(mainLight);

// === LUZ DE PREENCHIMENTO / AMBIENTE (sem sombras) ===
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
scene.add(hemi);
// pequena luz direcional de preenchimento oposta à principal, sem sombras
const fillDir = new THREE.DirectionalLight(0xffffff, 0.25);
fillDir.position.set(-50, 30, -50);
fillDir.castShadow = false;
scene.add(fillDir);

scene.add(camera);
orbit = new OrbitControls(camera, renderer.domElement);

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;
  if (e.code === 'Space') {
    keys['space'] = true;
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = false;
  if (e.code === 'Space') {
    keys['space'] = false;
    e.preventDefault();
  }
});

// Função para pegar a posição do clique na tela
window.addEventListener('click', (event) => {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  // Raycast no plano Y=0 (chão)
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersection = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersection);
  
  console.log(`Clique em: X: ${intersection.x.toFixed(2)}, Y: ${intersection.y.toFixed(2)}, Z: ${intersection.z.toFixed(2)}`);
});

scene.add(plane, currentTrack.getTrackGroup());

// Cria dois carros
let cpuCheckpoints = getCheckpointList() ; 
car = createCar();
car.position.set(110, 5, 275);
car.rotation.y = Math.PI / 2;
scene.add(car);

car2 = createCar(2);
car2.position.set(110, 5, 265); // posicione ligeiramente diferente
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
  let zPos = 250;
  if (track === 3){ 
    xPos = 290 
    zPos = 370
  }
  car.position.set(xPos, 5, zPos+25);
  car.rotation.y = Math.PI / 2;
  speed = 0;

  car2.position.set(xPos, 5, zPos+10);
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
    currentTrack = new Track(2, tunnel);
    trackNumber = 2;
    resetCarPosition()
  }
  if (track === 3) {
    currentTrack = new Track(3, tunnel);
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
  playTrackMusic(track);
  startCountdown();
}

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    // Lógica isolada para o Toggle (apenas uma vez por clique)
    if (key === 'q') {
        musicEnabled = !musicEnabled; // Inverte o estado

        if (musicEnabled) {
            // Se ligou e tem música carregada, toca
            if (!musicPlayer.isPlaying && musicPlayer.buffer) {
                musicPlayer.play();
            }
            // Liga também o som do motor/efeitos se houver
            soundPlayer.setVolume(0.5); 
        } else {
            // Se desligou, pausa tudo
            if (musicPlayer.isPlaying) {
                musicPlayer.pause();
            }
            // Opcional: Mutar efeitos sonoros também
            soundPlayer.setVolume(0); 
        }
        
        // Feedback visual no console (opcional)
        console.log("Música: " + (musicEnabled ? "ON" : "OFF"));
    }
});

function resolveCollisionsAABB(dt) {
  const effectiveFrame = dt * 60;
  const carRadius = 3.7;
  const carSphere = new THREE.Sphere(car.position.clone(), carRadius);
  const car2Sphere = new THREE.Sphere(car2.position.clone(), carRadius);

  // Detectar colisão com água
  const waterAABBs = currentTrack.getWaterAABBs();
  if (waterAABBs && waterAABBs.length > 0) {
    for (const water of waterAABBs) {
      if (water.intersectsSphere(carSphere)) {
        createWaterParticles(car.position, speed, 5);
        while(speed > maxSpeed * 0.92) speed *= 0.92
      }
      if (water.intersectsSphere(car2Sphere)) {
        createWaterParticles(car2.position, speed2, 5);
        while(speed2 > cpuMaxSpeed * 0.92) speed2 *= 0.92
      }
    }
  }

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

  currentTrack.getJumpPads().forEach(jumpPad => {
    if (jumpPad.intersectsSphere(carSphere)) {
      velocityY = 3.5; // impulso para cima
    }
    if (jumpPad.intersectsSphere(car2Sphere)) {
      velocityY2 = 4.5; // impulso para cima
    }
  })

  // Aplicar gravidade
  velocityY += gravity * effectiveFrame;
  velocityY2 += gravity * effectiveFrame;
  car.position.y += velocityY * effectiveFrame;
  car2.position.y += velocityY2 * effectiveFrame;

  currentTrack.getTilesAABBs().forEach(tile => {
    if (tile.intersectsSphere(carSphere)) {
      velocityY = 0; // anula gravidade
      car.position.y = tile.max.y;
    }

    if (tile.intersectsSphere(car2Sphere)) {
      velocityY2 = 0; // anula gravidade
      car2.position.y = tile.max.y;
    }

  });

    if(trackNumber){
      if(car.position.y < -2){
        car.position.set(30, 5, 190)
      }else if(car2.position.y < -2){
        car2.position.set(35, 5, 190)
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

  if (shootBuffer && musicEnabled) { // Verifica se som está ligado
      if (shootSound.isPlaying) shootSound.stop(); // Reinicia se já estiver tocando (tiro rápido)
      shootSound.play();
  }

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

  if (hitBuffer && musicEnabled) {
      if (hitSound.isPlaying) hitSound.stop();
      hitSound.play();
  }

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
  const projectileSpeed = 480;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const startPos = p.mesh.position.clone();
    const moveDist = projectileSpeed * dt;
    const dir = p.vel.clone().normalize();
    const endPos = startPos.clone().addScaledVector(dir, moveDist);

    const ray = new THREE.Ray(startPos, dir);
    let hit = false;
    const tmpPoint = new THREE.Vector3();

    const walls = currentTrack.getWallAABBs();
    for (let w = 0; w < walls.length; w++) {
      const box = walls[w];
      const ip = ray.intersectBox(box, tmpPoint);
      if (ip) {
        const distToIP = ip.distanceTo(startPos);
        if (distToIP <= moveDist + p.radius) {

          destroyProjectile(i);
          hit = true;
          break;
        }
      }
    }

    if (hit) continue;

    p.mesh.position.copy(endPos);
  }
}

// Função para obter altura do piso
function getFloorHeightAt(x, z) {
  const raycaster = new THREE.Raycaster();
  const rayOrigin = new THREE.Vector3(x, 500, z);
  const rayDirection = new THREE.Vector3(0, -1, 0).normalize();
  raycaster.set(rayOrigin, rayDirection);
  
  const tilesAABBs = currentTrack.getTilesAABBs();
  let maxHeight = -500;
  const point = new THREE.Vector3();
  
  for (const tile of tilesAABBs) {
    const intersection = raycaster.ray.intersectBox(tile, point);
    if (intersection) {
      const boxTop = tile.max.y;
      if (boxTop > maxHeight) {
        maxHeight = boxTop;
      }
    }
  }
  
  return maxHeight > -500 ? maxHeight : 5;
}

// Sistema de partículas de água
function createWaterParticles(position, carVelocity, count = 8) {
  // Só gera partículas se o carro está se movendo
  if (Math.abs(carVelocity) < 0.1) return;

  for (let i = 0; i < count; i++) {
    const particle = {
      position: position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        0,
        (Math.random() - 0.5) * 15
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        Math.random() * 0.25 + 0.15,
        (Math.random() - 0.5) * 0.6
      ),
      life: 1.0,
      mesh: null
    };

    const geometry = new THREE.SphereGeometry(0.5, 4, 4);
    const material = new THREE.MeshBasicMaterial({ color: 0x0099ff, transparent: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(particle.position);
    scene.add(mesh);
    particle.mesh = mesh;

    particles.push(particle);
  }
}

// Atualizar partículas
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    
    p.life -= dt * 2;
    
    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
      continue;
    }

    p.velocity.y -= 9.8 * dt;
    p.position.addScaledVector(p.velocity, dt);
    p.mesh.position.copy(p.position);
    p.mesh.material.opacity = p.life;
    p.mesh.scale.set(p.life, p.life, p.life);
  }
}

let prevShootPressed = false;

function handleKeys(dt) {
    const effectiveFrame = dt * 60;

  const now = clock.getElapsedTime();
  const playerPenalized = now < penaltyEndTime1;

    // Troca de pista
    if (keys['1']) switchTrack(1);
    if (keys['2']) switchTrack(2);
    if (keys['3']) switchTrack(3);

    if(!raceStarted || raceFinished) return;

    // Controle de direção
    const turnSpeed = 0.03 * effectiveFrame;
    if (keys['arrowleft']) car.rotation.y += turnSpeed;
    if (keys['arrowright']) car.rotation.y -= turnSpeed;

    const shootPressed = !!keys['z'] || !!keys['space'];
    if (shootPressed && !prevShootPressed) {
      tryShootPlayer();
    }
    prevShootPressed = shootPressed;

    // Controle de aceleração/freio
  const accelerating = keys['arrowup'] || keys['x'];
  const acceleratingEffective = accelerating && !playerPenalized;
  const braking = keys['arrowdown'];
    const maxReverseSpeed = -maxSpeed / 2;

  if (acceleratingEffective && !braking) {
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

      if (laps1 === totalLaps - 1) {
          if (finalLapBuffer && musicEnabled) {
              finalLapSound.play();
          }
          // Opcional: Mostrar aviso na tela
          const banner = document.getElementById('countdown'); // Reusa o elemento
          banner.textContent = "FINAL LAP!";
          banner.style.display = 'block';
          banner.style.color = '#ff0000'; // Vermelho para urgência
          setTimeout(() => { banner.style.display = 'none'; }, 2000);
      }

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
infoBox.add("Q : Liga/Desliga Música");

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

//const gridHelper = new THREE.GridHelper(960, 16);

//scene.add(gridHelper);

function updateCamera(dt) {
  const effectiveFrame = dt * 60;
  const relCameraOffset = new THREE.Vector3(0, car.position.y+14, 30);
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
  resolveCollisionsAABB(deltaTime);
  updateCPU(deltaTime);   // IA do adversarío

  
  // atualizar checkpoints / voltas para cada carro
  updateCheckpointCounterFor(car, car1Checkpoints);
  updateCheckpointCounterFor(car2, car2Checkpoints);

  // atualizar projéteis
  updateProjectiles(deltaTime);

  // atualizar partículas
  updateParticles(deltaTime);

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
  // console.log(car2.position.x);
  
  updateHUDs()
  const lightPos = new THREE.Vector3(
    car.position.x + 20,
    car.position.y + 40,
    car.position.z + 20
  );
  mainLight.position.copy(lightPos);
  mainLight.target.position.copy(lightPos).add(lightDirection);
  mainLight.target.updateMatrixWorld();

  sky.position.copy(camera.position);
  
  renderer.render(scene, camera);
  if (raceFinished){
    resetCarPosition()
  }else{
    // updateCamera(deltaTime);
  }
  requestAnimationFrame(render);
}

//  IA do Carro Adversário ---------

let cpuTargetIndex = 0;
let cpuMaxSpeed = 2.4;
let cpuAcceleration = 0.009;

let cpuLastShotTime = 0;
let prevCpuAhead = false;
const cpuShootInterval = 5.0; // segundos

// Checkpoints estáticos por pista para a IA (ajuste as coordenadas conforme necessário)

function getCheckpointList() {
  return (checkpointsList[trackNumber] || []).map(v => v.clone());
}


function updateCPU(dt) {
    if (!raceStarted || raceFinished) return;

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

    // tempo atual e penalidade do adversário
    const now = clock.getElapsedTime();
    const cpuPenalized = now < penaltyEndTime2;

    // velocidade do adversário (bloqueada se penalizado)
    if (!cpuPenalized) {
      speed2 += cpuAcceleration * effectiveFrame;
      if (speed2 > cpuMaxSpeed) speed2 = cpuMaxSpeed;
    }

    const moveSpeed = speed2 * effectiveFrame;

    // movimento
    car2.position.x -= Math.sin(car2.rotation.y) * moveSpeed;
    car2.position.z -= Math.cos(car2.rotation.y) * moveSpeed;
 
    // chegou no checkpoint?
    if (distance < 12) {
        cpuTargetIndex++;
        if (cpuTargetIndex >= cpuCheckpoints.length) cpuTargetIndex = 0;
    }

    try {
      if (!raceFinished) {
        const now = clock.getElapsedTime();

        function computeProgress(laps, carCheckpointsObj, carObj) {
          let arrived = 0;
          let nextPos = null;
          const keys = Object.keys(carCheckpointsObj).sort((a,b) => parseInt(a) - parseInt(b));
          for (let k of keys) {
            if (carCheckpointsObj[k].arrived) arrived++;
            else { nextPos = carCheckpointsObj[k].position; break; }
          }
          let dist = 0;
          if (nextPos) {
            const cp = new THREE.Vector3(nextPos.x, carObj.position.y, nextPos.y);
            dist = carObj.position.distanceTo(cp);
          }

          return (laps * 100000) + (arrived * 1000) + Math.max(0, 1000 - dist);
        }

        const playerProg = computeProgress(laps1, car1Checkpoints, car);
        const cpuProg = computeProgress(laps2, car2Checkpoints, car2);

        const cpuIsAhead = cpuProg > playerProg;
        if (!prevCpuAhead && cpuIsAhead) {
          if (shots2 > 0) {
            createProjectile(car2, 'cpu');
            shots2--;
            cpuLastShotTime = now;
          }
        }

        if (!cpuIsAhead && (now - cpuLastShotTime >= cpuShootInterval)) {
          if (shots2 > 0) {
            createProjectile(car2, 'cpu');
            shots2--;
            cpuLastShotTime = now;
          }
        }

        prevCpuAhead = cpuIsAhead;
      }
    } catch (e) {
      console.warn('CPU shooting logic error:', e);
    }
}


render();