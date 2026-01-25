// utils.js - Funções utilitárias

import * as THREE from 'three';

export function applyPenaltyTo(carIndex, { carSpeeds, carPenaltyEndTime, clock }) {
  const now = clock.getElapsedTime();
  carSpeeds[carIndex] *= 0.3;
  carPenaltyEndTime[carIndex] = now + 3;
}

export function tryShootPlayer({ carShots, cars, projectiles, scene, shotsMax, raceFinished, createProjectile }) {
  if (raceFinished) return;
  if (carShots[0] <= 0) return;
  carShots[0]--;
  createProjectile(cars[0], 0, { scene, projectiles });
}

export function cloneCheckpoints(srcCheckpoints) {
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

export function getFloorHeightAt(x, z, { currentTrack }) {
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
