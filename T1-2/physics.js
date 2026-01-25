// physics.js - Sistema de física e colisões

import * as THREE from 'three';

export function resolveCollisionsAABB(dt, {
  cars, carSpeeds, carVelocityY, currentTrack, maxSpeed, cpuMaxSpeed,
  gravity, projectiles, carPenaltyEndTime, scene, createWaterParticles,
  applyPenaltyTo, destroyProjectile
}) {
  const effectiveFrame = dt * 60;
  const carRadius = 3.7;
  
  // Array de esferas dos carros
  const carSpheres = cars.map(car => new THREE.Sphere(car.position.clone(), carRadius));

  // Detectar colisão com água para todos os carros
  const waterAABBs = currentTrack.getWaterAABBs();
  if (waterAABBs && waterAABBs.length > 0) {
    for (let i = 0; i < cars.length; i++) {
      for (const water of waterAABBs) {
        if (water.intersectsSphere(carSpheres[i])) {
          createWaterParticles(cars[i].position, carSpeeds[i], 5);
          while(carSpeeds[i] > (i === 0 ? maxSpeed : cpuMaxSpeed) * 0.92) 
            carSpeeds[i] *= 0.92;
        }
      }
    }
  }

  // Colisão com paredes para todos os carros
  for (let i = 0; i < cars.length; i++) {
    for (const wall of currentTrack.getWallAABBs()) {
      if (wall.intersectsSphere(carSpheres[i])) {
        const closestPoint = wall.clampPoint(cars[i].position.clone(), new THREE.Vector3());
        const direction = cars[i].position.clone().sub(closestPoint).normalize();

        cars[i].position.copy(
            closestPoint.addScaledVector(direction, carRadius)
        );

        const carDir = new THREE.Vector3(
            -Math.sin(cars[i].rotation.y),
            0,
            -Math.cos(cars[i].rotation.y)
        ).normalize();

        const angleRad = carDir.angleTo(direction);
        const angleDeg = THREE.MathUtils.radToDeg(angleRad);

        let reductionFactor = 0;
        if (angleDeg > 90) {
            reductionFactor = (angleDeg - 90) / 1080;
        }

        carSpeeds[i] *= (1 - reductionFactor);
      }
    }
  }

  // Colisão entre carros (todos contra todos)
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      if (carSpheres[i].intersectsSphere(carSpheres[j])) {
        const delta = cars[i].position.clone().sub(cars[j].position);
        const dist = Math.max(delta.length(), 1e-4);
        const n = delta.clone().divideScalar(dist);

        const penetration = carRadius * 2 - dist;
        if (penetration > 0) {
          cars[i].position.addScaledVector(n, penetration * 0.5);
          cars[j].position.addScaledVector(n, -penetration * 0.5);
        }

        const v1 = new THREE.Vector3(-Math.sin(cars[i].rotation.y), 0, -Math.cos(cars[i].rotation.y)).multiplyScalar(carSpeeds[i]);
        const v2 = new THREE.Vector3(-Math.sin(cars[j].rotation.y), 0, -Math.cos(cars[j].rotation.y)).multiplyScalar(carSpeeds[j]);

        const v1nVal = v1.dot(n);
        const v2nVal = v2.dot(n);
        const v1n = n.clone().multiplyScalar(v1nVal);
        const v2n = n.clone().multiplyScalar(v2nVal);
        const v1t = v1.clone().sub(v1n);
        const v2t = v2.clone().sub(v2n);

        const restitution = 0.65;
        const newV1 = v1t.clone().add(v2n.clone().multiplyScalar(restitution));
        const newV2 = v2t.clone().add(v1n.clone().multiplyScalar(restitution));

        const forward1 = new THREE.Vector3(-Math.sin(cars[i].rotation.y), 0, -Math.cos(cars[i].rotation.y)).normalize();
        const forward2 = new THREE.Vector3(-Math.sin(cars[j].rotation.y), 0, -Math.cos(cars[j].rotation.y)).normalize();

        carSpeeds[i] = forward1.dot(newV1);
        carSpeeds[j] = forward2.dot(newV2);

        const damping = 0.82;
        carSpeeds[i] *= damping;
        carSpeeds[j] *= damping;
      }
    }
  }

  // Colisão de projéteis
  for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      const sphere = new THREE.Sphere(p.mesh.position.clone(), p.radius);
  
      let hitWall = false;
      for (const wall of currentTrack.getWallAABBs()) {
        if (wall.intersectsSphere(sphere)) { hitWall = true; break; }
      }
      if (hitWall) {
        destroyProjectile(i);
        continue;
      }
  
      // Projéteis atingem carros alvo
      if (p.owner === 'player' || p.owner === 0) {
        // Player atira em todos os adversários (índices 1,2,3)
        for (let j = 1; j < cars.length; j++) {
          const sTarget = new THREE.Sphere(cars[j].position.clone(), carRadius);
          if (sphere.intersectsSphere(sTarget)) {
            applyPenaltyTo(j);
            destroyProjectile(i);
            break;
          }
        }
      } else if (typeof p.owner === 'number' && p.owner > 0) {
        // Adversário atira no player (índice 0) e em outros adversários
        const sPlayer = new THREE.Sphere(cars[0].position.clone(), carRadius);
        if (sphere.intersectsSphere(sPlayer)) {
          applyPenaltyTo(0);
          destroyProjectile(i);
          continue;
        }
        // Atira em outros adversários
        for (let j = 1; j < cars.length; j++) {
          if (j !== p.owner) {
            const sTarget = new THREE.Sphere(cars[j].position.clone(), carRadius);
            if (sphere.intersectsSphere(sTarget)) {
              applyPenaltyTo(j);
              destroyProjectile(i);
              break;
            }
          }
        }
      }
  }

  // Jump pads e gravidade
  currentTrack.getJumpPads().forEach(jumpPad => {
    for (let i = 0; i < cars.length; i++) {
      const carSphere = new THREE.Sphere(cars[i].position.clone(), carRadius);
      if (jumpPad.intersectsSphere(carSphere)) {
        carVelocityY[i] = i === 0 ? 3.5 : 4.5;
      }
    }
  })

  // Gravidade para todos
  for (let i = 0; i < cars.length; i++) {
    carVelocityY[i] += gravity * effectiveFrame;
    cars[i].position.y += carVelocityY[i] * effectiveFrame;
  }

  // Colisão com tiles (plataformas)
  currentTrack.getTilesAABBs().forEach(tile => {
    for (let i = 0; i < cars.length; i++) {
      const carSphere = new THREE.Sphere(cars[i].position.clone(), carRadius);
      if (tile.intersectsSphere(carSphere)) {
        carVelocityY[i] = 0;
        cars[i].position.y = tile.max.y;
      }
    }
  });

  // Respawn se caírem muito
  const trackNumber = 1; // Será passado como parâmetro se necessário
  if(trackNumber){
    for (let i = 0; i < cars.length; i++) {
      if(cars[i].position.y < -2) {
        if (i === 0) {
          cars[i].position.set(30, 5, 190);
        } else {
          cars[i].position.set(30 + i*5, 5, 190);
        }
      }
    }
  }
}
