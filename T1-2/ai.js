// ai.js - Sistema de IA dos adversários

export function updateCPU(dt, {
  cars, carSpeeds, carVelocityY, carPenaltyEndTime, carLaps, carShots,
  cpuTargetIndex, cpuMaxSpeed, cpuAcceleration, cpuLastShotTime, prevCpuAhead,
  cpuCheckpoints, carCheckpoints, clock, raceFinished, createProjectile, shotsMax, cpuShootInterval
}) {
  if (raceFinished) return;

  const effectiveFrame = dt * 60;

  // Atualizar todos os 3 adversários (índices 1, 2, 3)
  for (let advIdx = 1; advIdx < cars.length; advIdx++) {
    let targetIndex = cpuTargetIndex[advIdx - 1];
    let target = cpuCheckpoints[targetIndex];
    if (!target) continue;

    const dir = target.clone().sub(cars[advIdx].position);
    const distance = dir.length();
    dir.normalize();

    // virar em direção ao checkpoint
    const desiredAngle = Math.atan2(-dir.x, -dir.z);
    let angleDiff = desiredAngle - cars[advIdx].rotation.y;

    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

    cars[advIdx].rotation.y += angleDiff * 0.06 * effectiveFrame;

    // tempo atual e penalidade do adversário
    const now = clock.getElapsedTime();
    const cpuPenalized = now < carPenaltyEndTime[advIdx];

    // velocidade do adversário (bloqueada se penalizado)
    if (!cpuPenalized) {
      carSpeeds[advIdx] += cpuAcceleration * effectiveFrame;
      if (carSpeeds[advIdx] > cpuMaxSpeed) carSpeeds[advIdx] = cpuMaxSpeed;
    }

    const moveSpeed = carSpeeds[advIdx] * effectiveFrame;

    // movimento
    cars[advIdx].position.x -= Math.sin(cars[advIdx].rotation.y) * moveSpeed;
    cars[advIdx].position.z -= Math.cos(cars[advIdx].rotation.y) * moveSpeed;
 
    // chegou no checkpoint?
    if (distance < 12) {
      cpuTargetIndex[advIdx - 1]++;
      if (cpuTargetIndex[advIdx - 1] >= cpuCheckpoints.length) cpuTargetIndex[advIdx - 1] = 0;
    }
  }

  // Lógica de disparo: "todos contra todos"
  try {
    if (!raceFinished) {
      const now = clock.getElapsedTime();

      function computeProgress(carIdx) {
        const laps = carLaps[carIdx];
        const carCheckpointsObj = carCheckpoints[carIdx];
        const carObj = cars[carIdx];
        
        let arrived = 0;
        let nextPos = null;
        const keys = Object.keys(carCheckpointsObj).sort((a,b) => parseInt(a) - parseInt(b));
        for (let k of keys) {
          if (carCheckpointsObj[k].arrived) arrived++;
          else { nextPos = carCheckpointsObj[k].position; break; }
        }
        let dist = 0;
        if (nextPos) {
          const THREE = require('three');
          const cp = new THREE.Vector3(nextPos.x, carObj.position.y, nextPos.y);
          dist = carObj.position.distanceTo(cp);
        }

        return (laps * 100000) + (arrived * 1000) + Math.max(0, 1000 - dist);
      }

      // Cada adversário dispara no player e em outros adversários
      for (let advIdx = 1; advIdx < cars.length; advIdx++) {
        const advProgress = computeProgress(advIdx);
        const playerProgress = computeProgress(0);

        // Dispara se está à frente do player
        if (advProgress > playerProgress) {
          if (carShots[advIdx] > 0 && !prevCpuAhead[advIdx - 1]) {
            createProjectile(cars[advIdx], advIdx);
            carShots[advIdx]--;
            cpuLastShotTime[advIdx - 1] = now;
          }
          prevCpuAhead[advIdx - 1] = true;
        } else if ((now - cpuLastShotTime[advIdx - 1] >= cpuShootInterval)) {
          // Dispara periodicamente se está atrás
          if (carShots[advIdx] > 0) {
            createProjectile(cars[advIdx], advIdx);
            carShots[advIdx]--;
            cpuLastShotTime[advIdx - 1] = now;
          }
          prevCpuAhead[advIdx - 1] = false;
        } else {
          prevCpuAhead[advIdx - 1] = advProgress > playerProgress;
        }
      }
    }
  } catch (e) {
    console.warn('CPU shooting logic error:', e);
  }
}
