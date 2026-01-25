// checkpoints.js - Sistema de checkpoints e voltas

import * as THREE from 'three';

export function updateCheckpointCounterFor(targetCar, carCheckpoints) {
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

export function updateLapCounterFor(carIndex, {
  cars, carCheckpoints, carLaps, carShots, wasInsideStart,
  currentTrack, totalLaps, shotsMax, raceFinished, winner, clock
}) {
  if (raceFinished) return false;

  const targetCar = cars[carIndex];
  const checkpointsData = carCheckpoints[carIndex];

  const c = currentTrack.getStartCenter();
  const dx = targetCar.position.x - c.x;
  const dz = targetCar.position.z - c.y;
  const inside = (dx <= 5 && dz <= 30) && (dx >= -5 && dz >= -30);

  // verifica se todos checkpoints foram atingidos por este carro
  let checkPointsArrived = true;
  for (let k in checkpointsData) {
    if (checkpointsData[k].arrived === false) {
      checkPointsArrived = false;
      break;
    }
  }

  if (inside && !wasInsideStart[carIndex] && checkPointsArrived) {
    carLaps[carIndex]++;
    carShots[carIndex] = shotsMax;
    for (let k in checkpointsData) checkpointsData[k].arrived = false;
    
    if (carLaps[carIndex] >= totalLaps) { 
      return true; // Retorna true quando termina
    }
  }
  wasInsideStart[carIndex] = inside;
  return false;
}
