// projectiles.js - Sistema de projéteis

import * as THREE from 'three';

export function createProjectile(owner, ownerTag, { scene, projectiles }) {
  const radius = 1.2;
  const geom = new THREE.SphereGeometry(radius, 16, 12);
  const mat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x550000, shininess: 120 });
  const mesh = new THREE.Mesh(geom, mat);

  const forward = new THREE.Vector3(-Math.sin(owner.rotation.y), 0, -Math.cos(owner.rotation.y)).normalize();
  mesh.position.copy(owner.position).addScaledVector(forward, 8);
  mesh.position.y += 1.5;
  scene.add(mesh);

  projectiles.push({
    mesh,
    vel: forward.clone(),
    radius,
    owner: ownerTag
  });
}

export function destroyProjectile(index, { scene, projectiles }) {
  const p = projectiles[index];
  if (!p) return;
  scene.remove(p.mesh);
  projectiles.splice(index, 1);
}

export function updateProjectiles(dt, { projectiles, currentTrack, scene }) {
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
          destroyProjectile(i, { scene, projectiles });
          hit = true;
          break;
        }
      }
    }

    if (hit) continue;

    p.mesh.position.copy(endPos);
  }
}
