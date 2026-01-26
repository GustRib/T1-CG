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

// --- CONFIGURAÇÕES GERAIS ---
const NUM_CPUS = 3; 
const TOTAL_CARS = 1 + NUM_CPUS; // 1 Player + N CPUs
const PLAYER_IDX = 0; // Jogador é sempre o índice 0

// --- Variáveis de controle de jogo e áudio ---
let gameLoaded = false;
let raceStarted = false; 
let startSoundBuffer = null;
const audioListener = new THREE.AudioListener();
const soundPlayer = new THREE.Audio(audioListener);
const shootSound = new THREE.Audio(audioListener);
const hitSound = new THREE.Audio(audioListener);
const finalLapSound = new THREE.Audio(audioListener); 
let musicPlayer = new THREE.Audio(audioListener); 
let musicBuffers = {}; 
let musicEnabled = true; 
let musicVolume = 0.3; 
let shootBuffer = null;
let hitBuffer = null;
let finalLapBuffer = null;

// --- Loading Manager ---
const loadingManager = new THREE.LoadingManager(() => {
    const loadingScreen = document.getElementById('loading-screen');
    const loaderText = document.getElementById('loader');
    const startBtn = document.getElementById('start-btn');
    
    if(loaderText) loaderText.style.display = 'none';
    if(startBtn) startBtn.style.display = 'block';

    if(startBtn) {
        startBtn.addEventListener('click', () => {
            if(loadingScreen) {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => loadingScreen.remove(), 500);
            }
            gameLoaded = true;
            
            // --- CORREÇÃO AQUI ---
            // Garante que o contexto de áudio esteja ativo (navegadores bloqueiam autoplay)
            if (audioListener.context.state === 'suspended') {
                audioListener.context.resume();
            }
            
            // Toca a música da pista 1
            playTrackMusic(1); 
            
            startCountdown(); 
        });
    }
});

// Textures
const textureLoader = new THREE.TextureLoader(loadingManager);
const grassTexture = textureLoader.load('./assets/gravelly_sand_diff_4k.jpg');
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(8, 8);
grassTexture.anisotropy = 16;
const skyTexture = textureLoader.load('../assets/textures/skybox/panorama1.jpg');

// Audio Loading
const audioLoader = new THREE.AudioLoader(loadingManager);
// Ajuste os caminhos se necessário, mantive conforme seu código original
audioLoader.load('./0_assets_T3/start01.mp3', buffer => { startSoundBuffer = buffer; soundPlayer.setBuffer(buffer); soundPlayer.setVolume(0.5); });
audioLoader.load('./0_assets_T3/track1.mp3', buffer => musicBuffers[1] = buffer);
audioLoader.load('./0_assets_T3/track2.mp3', buffer => musicBuffers[2] = buffer);
audioLoader.load('./0_assets_T3/track3.mp3', buffer => musicBuffers[3] = buffer);
audioLoader.load('./0_assets_T3/shoot.mp3', buffer => { shootBuffer = buffer; shootSound.setBuffer(buffer); shootSound.setVolume(0.4); });
audioLoader.load('./0_assets_T3/hit.mp3', buffer => { hitBuffer = buffer; hitSound.setBuffer(buffer); hitSound.setVolume(0.6); });
audioLoader.load('./0_assets_T3/final_lap.mp3', buffer => { finalLapBuffer = buffer; finalLapSound.setBuffer(buffer); finalLapSound.setVolume(1.0); });

let tunnel = buildTunnel();
let scene, renderer, camera, orbit;
let trackNumber=1, currentTrack = new Track(1, tunnel);

const container = document.getElementById( 'container' );
const stats = new Stats();
container.appendChild( stats.dom );

// --- ESTRUTURA UNIFICADA DOS CARROS ---
// Cada objeto no array 'cars' terá todas as propriedades necessárias
let cars = [];

/* Estrutura de um carro:
{
    mesh: THREE.Object3D,
    type: 'player' | 'cpu',
    speed: 0,
    maxSpeed: 3.0, // CPUs podem variar
    acceleration: 0.008,
    velocityY: 0,
    laps: 0,
    checkpoints: {}, // Clone dos checkpoints da pista
    shots: 4,
    penaltyEndTime: 0,
    wasInsideStart: false,
    
    // Específico de CPU
    cpuTargetIndex: 0,
    cpuLastShotTime: 0,
    cpuShootInterval: 5.0
}
*/

const totalLaps = 4;
let raceFinished = false;
let winner = null;

// Configurações Físicas Globais
const gravity = -0.10;
const groundLevel = 5;
const shotsMax = 4;
let projectiles = [];
let particles = [];
let wallAABBs = []; 

// Waypoints para IA (estático)
const checkpointsList = {
  1: [ new THREE.Vector3(-270, 0, 270), new THREE.Vector3(-270, 0, -270), new THREE.Vector3(270, 0, -270), new THREE.Vector3(270, 0, 270) ],
  2: [ new THREE.Vector3(-270, 0, 270), new THREE.Vector3(-270, 0, -270), new THREE.Vector3(30, 0, -270), new THREE.Vector3(30, 0, -20), new THREE.Vector3(270, 0, -18), new THREE.Vector3(270, 0, 270) ],
  3: [ new THREE.Vector3(53, 0, 384), new THREE.Vector3(30, 0, -370), new THREE.Vector3(-360, 0, -370), new THREE.Vector3(-365, 0, 5), new THREE.Vector3(365, 0, 10), new THREE.Vector3(370, 0, 370) ],
};

// Input
let keys = {};
let clock = new THREE.Clock();
let prevShootPressed = false;

// Funções de Áudio
function playTrackMusic(trackNum) {
    if (musicPlayer.isPlaying) musicPlayer.stop();
    if (musicBuffers[trackNum]) {
        musicPlayer.setBuffer(musicBuffers[trackNum]);
        musicPlayer.setLoop(true);
        musicPlayer.setVolume(musicVolume);
        if (musicEnabled) musicPlayer.play();
    }
}

function startCountdown() {
    raceStarted = false;
    const el = document.getElementById('countdown');
    if(el) {
        el.style.display = 'block';
        let count = 3;
        el.textContent = count;
        const interval = setInterval(() => {
            count--;
            if (count > 0) el.textContent = count;
            else if (count === 0) {
                el.textContent = "GO!";
                raceStarted = true;
                if (startSoundBuffer && soundPlayer.context.state === 'running') {
                    if(soundPlayer.isPlaying) soundPlayer.stop();
                    soundPlayer.play();
                }
            } else {
                el.style.display = 'none';
                clearInterval(interval);
            }
        }, 1000);
    } else {
        raceStarted = true; // Fallback se não tiver HTML
    }
}

// SETUP INICIAL DA CENA
scene = new THREE.Scene();
let plane = createGroundPlaneXZ(960, 960);
plane.material = setDefaultMaterial("white", grassTexture);
plane.position.set(0, 0, 0);
scene.add(plane);

renderer = initRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

camera = initCamera(new THREE.Vector3(0, 800, 0));
camera.add(audioListener);
scene.add(camera);

const skyGeometry = new THREE.SphereGeometry(700, 60, 40);
const skyMaterial = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, depthWrite: false });
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
sky.frustumCulled = false;
sky.renderOrder = -1;
scene.add(sky);

// Iluminação
const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048; 
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 1; 
mainLight.shadow.camera.far = 800;
const shadowExtent = 220;
mainLight.shadow.camera.left = -shadowExtent; mainLight.shadow.camera.right = shadowExtent;
mainLight.shadow.camera.top = shadowExtent; mainLight.shadow.camera.bottom = -shadowExtent;
mainLight.shadow.bias = -0.0006;

const lightDirection = new THREE.Vector3(-0.7, -1.0, -0.3).normalize();
const mainLightTarget = new THREE.Object3D();
scene.add(mainLightTarget);
mainLight.target = mainLightTarget;
scene.add(mainLight);

const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
scene.add(hemi);
const fillDir = new THREE.DirectionalLight(0xffffff, 0.25);
fillDir.position.set(-50, 30, -50);
scene.add(fillDir);

orbit = new OrbitControls(camera, renderer.domElement);

// Event Listeners
window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;
  if (e.code === 'Space') { keys['space'] = true; e.preventDefault(); }
  if (key === 'q') toggleMusic();
});
window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = false;
  if (e.code === 'Space') { keys['space'] = false; e.preventDefault(); }
});

function toggleMusic() {
    musicEnabled = !musicEnabled;
    console.log("Música: " + (musicEnabled ? "ON" : "OFF"));
    if (musicEnabled) {
        if (!musicPlayer.isPlaying && musicPlayer.buffer) musicPlayer.play();
        soundPlayer.setVolume(0.5);
    } else {
        if (musicPlayer.isPlaying) musicPlayer.pause();
        soundPlayer.setVolume(0);
    }
}

// INICIALIZAÇÃO DOS CARROS
function initCars() {
    // Limpa carros existentes se houver
    cars.forEach(c => scene.remove(c.mesh));
    cars = [];

    // Player (Índice 0)
    let playerMesh = createCar(); // createCar() sem args cria o carro vermelho/padrão
    let player = {
        id: 0,
        mesh: playerMesh,
        type: 'player',
        speed: 0,
        maxSpeed: 3.0,
        acceleration: 0.008,
        velocityY: 0,
        laps: 0,
        checkpoints: cloneCheckpoints(currentTrack.getCheckpoints()),
        shots: shotsMax,
        penaltyEndTime: 0,
        wasInsideStart: false
    };
    scene.add(playerMesh);
    cars.push(player);

    // CPUs (Índices 1 a N)
    for(let i=1; i<=NUM_CPUS; i++) {
        // createCar(2) cria o modelo alternativo. Podemos variar cores se createCar suportar.
        // Assumindo createCar(type) onde type define cor/modelo.
        let cpuMesh = createCar(2); 
        let cpu = {
            id: i,
            mesh: cpuMesh,
            type: 'cpu',
            speed: 0,
            maxSpeed: 2.3, // Variar velocidade levemente (2.3 a 2.6)
            acceleration: 0.008,
            velocityY: 0,
            laps: 0,
            checkpoints: cloneCheckpoints(currentTrack.getCheckpoints()),
            shots: shotsMax,
            penaltyEndTime: 0,
            wasInsideStart: false,
            // IA Props
            cpuTargetIndex: 0,
            cpuLastShotTime: 0,
            cpuShootInterval: 4.0 + Math.random() * 3.0
        };
        scene.add(cpuMesh);
        cars.push(cpu);
    }
}

// Checkpoints helper
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

scene.add(currentTrack.getTrackGroup());

// Inicializa a primeira vez
initCars();
resetPositions(1);

// POSICIONAMENTO DO GRID DE LARGADA
function resetPositions(track=1) {
  // Define o ponto base de largada
  let startX = 110;
  let startZ = 260; // (Lado Direito da Pista)
  
  if (track === 3){ 
    startX = 290;
    startZ = 380;
  }

  const colWidth = 15; // Distância entre Frente/Trás
  const rowDepth = 15; // Distância entre Esquerda/Direita

  cars.forEach((car, index) => {
      let gridIndex;
      
      // Mapeamento manual das posições para garantir a ordem correta
      if (index === 0) gridIndex = 1;      // Player: Direita Trás
      else if (index === 1) gridIndex = 0; // CPU 1:  Direita Frente (Pole)
      else if (index === 2) gridIndex = 3; // CPU 2:  Esquerda Trás
      else gridIndex = 2;                  // CPU 3:  Esquerda Frente

      // Cálculo das coordenadas baseado no índice fixo acima
      // Row 0 = Direita, Row 1 = Esquerda
      // Col 0 = Frente, Col 1 = Trás
      const row = Math.floor(gridIndex / 2); 
      const col = gridIndex % 2;           
      
      const x = startX + (col * colWidth);
      const z = startZ + (row * rowDepth);

      car.mesh.position.set(x, 5, z);
      car.mesh.rotation.y = Math.PI / 2; // Virado para a pista (movimento em -X)
      car.speed = 0;
      car.velocityY = 0;
      car.shots = shotsMax;
      car.laps = 0;
      car.penaltyEndTime = 0;
      car.checkpoints = cloneCheckpoints(currentTrack.getCheckpoints());
      
      // --- RESET IA ---
      car.cpuTargetIndex = 0; 
      car.currentWaypointVector = null;
  });
}

function switchTrack(track) {
  wallAABBs.length = 0;
  raceFinished = false; 
  winner = null;
  winnerBanner.style.display = 'none';
  
  if (currentTrack) scene.remove(currentTrack.getTrackGroup());

  // Limpar projéteis e partículas
  for (const p of projectiles) scene.remove(p.mesh);
  projectiles.length = 0;
  particles.forEach(p => scene.remove(p.mesh));
  particles = [];

  // Nova Pista
  currentTrack = new Track(track, tunnel);
  trackNumber = track;
  scene.add(currentTrack.getTrackGroup());

  // Resetar Carros e Checkpoints
  resetPositions(track);
  
  playTrackMusic(track);
  startCountdown();
}

// --- PHYSICS ENGINE ---

function resolveCollisionsAABB(dt) {
  const effectiveFrame = dt * 60;
  const carRadius = 3.7;
  const walls = currentTrack.getWallAABBs();
  const waterAABBs = currentTrack.getWaterAABBs();
  const tiles = currentTrack.getTilesAABBs();
  const jumpPads = currentTrack.getJumpPads();

  // 1. Colisão Carro x Ambiente (MANTIDO IGUAL AO SEU CÓDIGO)
  cars.forEach(car => {
      const carSphere = new THREE.Sphere(car.mesh.position.clone(), carRadius);

      if (waterAABBs) {
          for (const water of waterAABBs) {
              if (water.intersectsSphere(carSphere)) {
                  createWaterParticles(car.mesh.position, car.speed, 5);
                  while(car.speed > car.maxSpeed * 0.92) car.speed *= 0.92;
              }
          }
      }

      for (const wall of walls) {
          if (wall.intersectsSphere(carSphere)) {
              const closestPoint = wall.clampPoint(car.mesh.position.clone(), new THREE.Vector3());
              const direction = car.mesh.position.clone().sub(closestPoint).normalize();
              car.mesh.position.copy(closestPoint.addScaledVector(direction, carRadius));
              
              const carDir = new THREE.Vector3(-Math.sin(car.mesh.rotation.y), 0, -Math.cos(car.mesh.rotation.y)).normalize();
              const angleDeg = THREE.MathUtils.radToDeg(carDir.angleTo(direction));
              let reduction = 0;
              if (angleDeg > 90) reduction = (angleDeg - 90) / 1080;
              car.speed *= (1 - reduction);
          }
      }

      jumpPads.forEach(pad => {
          if (pad.intersectsSphere(carSphere)) car.velocityY = 4.0;
      });

      car.velocityY += gravity * effectiveFrame;
      car.mesh.position.y += car.velocityY * effectiveFrame;

      let onGround = false;
      for(const tile of tiles) {
          if (tile.intersectsSphere(carSphere)) {
              if(car.mesh.position.y - carRadius < tile.max.y) {
                 car.velocityY = 0;
                 car.mesh.position.y = tile.max.y;
                 onGround = true;
              }
          }
      }
      
      if(car.mesh.position.y < -5) {
          resetPositions(trackNumber);
      }
  });

  // ==========================================================
  // 2. Colisão Carro x Carro (REFATORADO PARA FLUIDEZ ARCADE)
  // ==========================================================
  for(let i=0; i<cars.length; i++) {
      for(let j=i+1; j<cars.length; j++) {
          const c1 = cars[i];
          const c2 = cars[j];
          
          const dist = c1.mesh.position.distanceTo(c2.mesh.position);
          const minDist = carRadius * 2;

          if (dist < minDist) {
              // --- A. Separação Física (Anti-Sobreposição) ---
              // Isso garante que eles não fiquem grudados visualmente
              const n = c1.mesh.position.clone().sub(c2.mesh.position).normalize();
              const overlap = (minDist - dist) / 2;
              
              c1.mesh.position.addScaledVector(n, overlap);
              c2.mesh.position.addScaledVector(n, -overlap);

              // --- B. Lógica de "Bump" (Empurrão) ---
              const fwd1 = new THREE.Vector3(-Math.sin(c1.mesh.rotation.y), 0, -Math.cos(c1.mesh.rotation.y));
              const fwd2 = new THREE.Vector3(-Math.sin(c2.mesh.rotation.y), 0, -Math.cos(c2.mesh.rotation.y));
              
              // Verifica alinhamento (1 = mesma direção, -1 = frente a frente, 0 = cruzamento em T)
              const alignment = fwd1.dot(fwd2);

              if (alignment > 0.5) { 
                  // === BATIDA NA TRASEIRA (Mesmo sentido) ===
                  // O carro mais rápido transfere momento para o mais lento, mas sem parar.
                  
                  if (c1.speed > c2.speed) {
                      // C1 bateu na traseira de C2
                      const speedDiff = c1.speed - c2.speed;
                      c2.speed += speedDiff * 0.6; // O da frente ganha um bom impulso (60% da diferença)
                      c1.speed -= speedDiff * 0.1; // O de trás perde quase nada (só 10% de atrito)
                  } else {
                      // C2 bateu na traseira de C1
                      const speedDiff = c2.speed - c1.speed;
                      c1.speed += speedDiff * 0.6;
                      c2.speed -= speedDiff * 0.1;
                  }
              } else {
                  // === BATIDA LATERAL OU FRONTAL ===
                  // Apenas deslizam um no outro (atrito mínimo)
                  // Isso permite ultrapassagens "raspando" sem perder velocidade
                  c1.speed *= 0.99;
                  c2.speed *= 0.99;
              }
          }
      }
  }

  // 3. Colisão Projéteis (MANTIDO IGUAL AO SEU CÓDIGO)
  for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      const pSphere = new THREE.Sphere(p.mesh.position.clone(), p.radius);
      let hit = false;

      for(const wall of walls) {
          if(wall.intersectsSphere(pSphere)) { hit = true; break; }
      }

      if(!hit) {
          for(const car of cars) {
              if(car.type === p.ownerType && car.id === p.ownerId) continue; 
              if(p.ownerType === 'cpu' && car.type === 'cpu') continue;

              const cSphere = new THREE.Sphere(car.mesh.position.clone(), carRadius);
              if(pSphere.intersectsSphere(cSphere)) {
                  applyPenaltyTo(car);
                  hit = true;
                  break;
              }
          }
      }

      if (hit) destroyProjectile(i);
  }
}

// HELPER FUNCTIONS DO JOGO

function applyPenaltyTo(car) {
    if (hitBuffer && musicEnabled) {
        if (hitSound.isPlaying) hitSound.stop();
        hitSound.play();
    }
    const now = clock.getElapsedTime();
    car.speed *= 0.3; // Reduz drasticamente a velocidade
    car.penaltyEndTime = now + 3.0; // 3 segundos de penalidade
}

function createProjectile(ownerCar) {
    const radius = 1.2;
    const geom = new THREE.SphereGeometry(radius, 16, 12);
    const mat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x550000, shininess: 120 });
    const mesh = new THREE.Mesh(geom, mat);

    const forward = new THREE.Vector3(-Math.sin(ownerCar.mesh.rotation.y), 0, -Math.cos(ownerCar.mesh.rotation.y)).normalize();
    mesh.position.copy(ownerCar.mesh.position).addScaledVector(forward, 8);
    mesh.position.y += 1.5;
    scene.add(mesh);

    if (shootBuffer && musicEnabled) { 
        if (shootSound.isPlaying) shootSound.stop();
        shootSound.play();
    }

    projectiles.push({
        mesh,
        vel: forward.clone(),
        radius,
        ownerType: ownerCar.type,
        ownerId: ownerCar.id
    });
}

function destroyProjectile(index) {
  const p = projectiles[index];
  if (!p) return;
  scene.remove(p.mesh);
  projectiles.splice(index, 1);
}

function updateProjectiles(dt) {
    const speed = 480;
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const move = p.vel.clone().multiplyScalar(speed * dt);
        p.mesh.position.add(move);
        // Remove se for muito longe (otimização)
        if(p.mesh.position.length() > 2000) destroyProjectile(i);
    }
}

function createWaterParticles(position, velocity, count=5) {
    if (Math.abs(velocity) < 0.1) return;
    for(let i=0; i<count; i++) {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.5), 
            new THREE.MeshBasicMaterial({color:0x0099ff, transparent:true})
        );
        mesh.position.copy(position).addScalar((Math.random()-0.5)*5);
        scene.add(mesh);
        particles.push({
            mesh, 
            pos: mesh.position, 
            vel: new THREE.Vector3((Math.random()-0.5), Math.random()+0.5, (Math.random()-0.5)), 
            life: 1.0
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt * 2;
        if(p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        } else {
            p.vel.y -= 9.8 * dt; // gravidade
            p.pos.addScaledVector(p.vel, dt);
            p.mesh.position.copy(p.pos);
            p.mesh.material.opacity = p.life;
        }
    }
}

// LOGICA DO JOGADOR
function handlePlayerInput(player, dt) {
    const effectiveFrame = dt * 60;
    const now = clock.getElapsedTime();
    const penalized = now < player.penaltyEndTime;

    // Atalhos Pista
    if (keys['1']) switchTrack(1);
    if (keys['2']) switchTrack(2);
    if (keys['3']) switchTrack(3);

    if(!raceStarted || raceFinished) return;

    // Direção
    const turnSpeed = 0.03 * effectiveFrame;
    if (keys['arrowleft']) player.mesh.rotation.y += turnSpeed;
    if (keys['arrowright']) player.mesh.rotation.y -= turnSpeed;

    // Tiro
    const shootPressed = !!keys['z'] || !!keys['space'];
    if (shootPressed && !prevShootPressed) {
        if(player.shots > 0) {
            createProjectile(player);
            player.shots--;
        }
    }
    prevShootPressed = shootPressed;

    // Aceleração
    const acc = player.acceleration;
    const maxS = player.maxSpeed;
    const accelerating = (keys['arrowup'] || keys['x']) && !penalized;
    const braking = keys['arrowdown'];

    if (accelerating && !braking) {
        player.speed += acc * effectiveFrame;
        if(player.speed > maxS) player.speed = maxS;
    } else if (braking) {
        player.speed -= acc * 3 * effectiveFrame;
        if(player.speed < -1) player.speed = -1; // Ré
    } else {
        player.speed *= Math.pow(0.98, effectiveFrame); // Inércia
    }

    // Aplica movimento
    const move = player.speed * effectiveFrame;
    player.mesh.position.x -= Math.sin(player.mesh.rotation.y) * move;
    player.mesh.position.z -= Math.cos(player.mesh.rotation.y) * move;
}

function updateCPUs(dt) {
    if(!raceStarted || raceFinished) return;
    const effectiveFrame = dt * 60;
    const now = clock.getElapsedTime();
    const trackWaypoints = (checkpointsList[trackNumber] || []);

    cars.filter(c => c.type === 'cpu').forEach(cpu => {
        // --- 1. Navegação com Variação (Humanização) ---
        
        // Se ainda não tem um alvo fixo calculado (ou acabou de mudar de WP), calcula um novo
        if (!cpu.currentWaypointVector) {
             const basePoint = trackWaypoints[cpu.cpuTargetIndex];
             // Cria uma variação aleatória de +/- 12 no X e Z
             // A pista tem largura ~60, então +/- 12 mantém eles seguros no asfalto
             const variationRange = 24; 
             const offsetX = (Math.random() - 0.5) * variationRange; 
             const offsetZ = (Math.random() - 0.5) * variationRange;
             
             cpu.currentWaypointVector = basePoint.clone().add(new THREE.Vector3(offsetX, 0, offsetZ));
        }

        const target = cpu.currentWaypointVector;
        const dir = target.clone().sub(cpu.mesh.position);
        const dist = dir.length();
        dir.normalize();

        // Virar para o waypoint "customizado"
        const desiredAngle = Math.atan2(-dir.x, -dir.z);
        let angleDiff = desiredAngle - cpu.mesh.rotation.y;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)); // Normaliza -PI a PI
        
        cpu.mesh.rotation.y += angleDiff * 0.06 * effectiveFrame;

        // Chegou perto? Troca para o próximo e limpa o vetor para gerar nova variação
        if(dist < 20) { 
            cpu.cpuTargetIndex = (cpu.cpuTargetIndex + 1) % trackWaypoints.length;
            cpu.currentWaypointVector = null; // Isso forçará o cálculo de um novo ponto aleatório no próximo frame
        }

        // --- 2. Movimento (Mantido) ---
        const penalized = now < cpu.penaltyEndTime;
        if (!penalized) {
            cpu.speed += cpu.acceleration * effectiveFrame;
            if(cpu.speed > cpu.maxSpeed) cpu.speed = cpu.maxSpeed;
        } else {
            cpu.speed *= 0.95;
        }

        const move = cpu.speed * effectiveFrame;
        cpu.mesh.position.x -= Math.sin(cpu.mesh.rotation.y) * move;
        cpu.mesh.position.z -= Math.cos(cpu.mesh.rotation.y) * move;

        // --- 3. Atirar em QUALQUER UM ---
        if(cpu.shots > 0 && (now - cpu.cpuLastShotTime > cpu.cpuShootInterval)) {
            
            // Itera sobre TODOS os carros para achar um alvo
            for(let otherCar of cars) {
                if (otherCar === cpu) continue; // Não atirar em si mesmo

                const toTarget = otherCar.mesh.position.clone().sub(cpu.mesh.position);
                const distToTarget = toTarget.length();
                
                // Se está perto o suficiente
                if(distToTarget < 120) { 
                    const forward = new THREE.Vector3(-Math.sin(cpu.mesh.rotation.y), 0, -Math.cos(cpu.mesh.rotation.y));
                    const angle = forward.angleTo(toTarget);
                    
                    // Se está na mira (Cone de aprox 11 graus)
                    if(angle < 0.2) { 
                        createProjectile(cpu);
                        cpu.shots--;
                        cpu.cpuLastShotTime = now;
                        // Define um novo intervalo aleatório para o próximo tiro (entre 2 e 6 segundos)
                        cpu.cpuShootInterval = 2.0 + Math.random() * 4.0;
                        break; // Já atirou, para de procurar alvos neste frame
                    }
                }
            }
        }
    });
}

// LOGICA DE CORRIDA (VOLTAS E CHECKPOINTS)
function updateRaceLogic() {
    if(raceFinished) return;
    
    const startCenter = currentTrack.getStartCenter();
    
    cars.forEach(car => {
        // 1. Atualiza Checkpoints alcançados
        // Precisamos criar Boxes temporários para colisão com checkpoints
        // (Nota: Idealmente cachearíamos os Box3 dos checkpoints, mas clonamos obj a obj aqui)
        const carSphere = new THREE.Sphere(car.mesh.position.clone(), 3.7);
        
        for(let k in car.checkpoints) {
            if(!car.checkpoints[k].arrived) {
                const cpObj = car.checkpoints[k].object;
                const bb = new THREE.Box3().setFromObject(cpObj);
                if(bb.intersectsSphere(carSphere)) {
                    car.checkpoints[k].arrived = true;
                }
            }
        }

        // 2. Verifica Linha de Chegada/Volta
        const dx = car.mesh.position.x - startCenter.x;
        const dz = car.mesh.position.z - startCenter.y; // track.startCenter usa X,Y como coordenadas 2D do plano
        // Range da linha de chegada
        const insideStart = (Math.abs(dx) < 15 && Math.abs(dz) < 15);

        // Verifica se completou todos checkpoints
        const allCPs = Object.values(car.checkpoints).every(cp => cp.arrived);

        if(insideStart && !car.wasInsideStart && allCPs) {
            car.laps++;
            car.shots = shotsMax; // Recarrega armas
            
            // Reset checkpoints
            for(let k in car.checkpoints) car.checkpoints[k].arrived = false;

            // Eventos Especiais para Player
            if(car.type === 'player') {
                if(car.laps === totalLaps - 1) { // Última volta
                   if(finalLapBuffer && musicEnabled) finalLapSound.play();
                   showBanner("FINAL LAP!", "red", 2000);
                }
            }

            // Checar Vitoria
            if(car.laps >= totalLaps) {
                raceFinished = true;
                winner = (car.type === 'player') ? "VOCÊ VENCEU!" : `CPU ${car.id} VENCEU!`;
                showBanner(winner, "#ff0");
            }
        }
        car.wasInsideStart = insideStart;
    });
}

function showBanner(text, color, time=0) {
    const b = document.getElementById('countdown'); // Reutilizando div
    if(b) {
        b.textContent = text;
        b.style.display = 'block';
        b.style.color = color;
        b.style.fontSize = "60px";
        if(time > 0) setTimeout(() => { b.style.display = 'none'; }, time);
    }
    // Banner fixo de fim de jogo
    if(raceFinished && winnerBanner) {
        winnerBanner.textContent = text;
        winnerBanner.style.display = 'block';
    }
}

// HUD
const hudDiv = document.createElement('div');
hudDiv.style.cssText = `position:fixed; top:10px; right:10px; color:white; font-family:monospace; background:rgba(0,0,0,0.5); padding:10px; border-radius:5px; pointer-events:none;`;
document.body.appendChild(hudDiv);

const winnerBanner = document.createElement('div');
winnerBanner.style.cssText = `position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:#ff0; font-size:48px; padding:30px; border-radius:15px; display:none; z-index:2000;`;
document.body.appendChild(winnerBanner);

function updateHUD() {
    let html = "<strong>CLASSIFICAÇÃO</strong><br/>";
    // Ordenar carros por progresso (Voltas > Checkpoints)
    // Simplificado: apenas mostra lista
    cars.forEach(c => {
        let cpCount = Object.values(c.checkpoints).filter(cp => cp.arrived).length;
        let name = (c.type === 'player') ? "P1 (Você)" : `CPU ${c.id}`;
        let style = (c.type === 'player') ? "color:#0f0" : "color:#fff";
        html += `<span style="${style}">${name}: L${c.laps}/${totalLaps} [CP:${cpCount}] Speed:${Math.abs(c.speed*70).toFixed(0)}</span><br/>`;
    });
    // Ammo do player
    html += `<br/>Munição: ${cars[0].shots}`;
    hudDiv.innerHTML = html;
}

// MAIN LOOP
function render() {
  stats.update();
  const deltaTime = clock.getDelta();
  
  handlePlayerInput(cars[0], deltaTime);
  updateCPUs(deltaTime);
  resolveCollisionsAABB(deltaTime);
  updateProjectiles(deltaTime);
  updateParticles(deltaTime);
  updateRaceLogic();
  updateHUD();

  // Camera Follow Player
  const player = cars[0];
  const camOffset = new THREE.Vector3(0, 18, 35).applyMatrix4(player.mesh.matrixWorld);
  camera.position.lerp(camOffset, 0.1);
  camera.lookAt(player.mesh.position);

  // Luz segue player
  const lightTarget = player.mesh.position.clone();
  mainLight.position.set(lightTarget.x + 20, 60, lightTarget.z + 20);
  mainLight.target.position.copy(lightTarget);
  
  sky.position.copy(camera.position);

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

// Info Box Inicial
let infoBox = new InfoBox();
infoBox.add("Rock 'n Roll Racing 3D - Battle Mode");
infoBox.addParagraph();
infoBox.add("Setas: Dirigir");
infoBox.add("Z ou Espaço: Atirar");
infoBox.add("Q: Música On/Off");
infoBox.show();

render();