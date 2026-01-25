// particles.js - Sistema de partículas

import * as THREE from 'three';

export function createWaterParticles(position, carVelocity, count = 8, { scene, particles }) {
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

export function updateParticles(dt, { particles, scene }) {
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
