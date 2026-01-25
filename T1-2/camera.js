// camera.js - Sistema de câmera

import * as THREE from 'three';

export function updateCamera(dt, { camera, cars }) {
  const effectiveFrame = dt * 60;
  const relCameraOffset = new THREE.Vector3(0, cars[0].position.y+14, 30);
  const cameraOffset = relCameraOffset.applyMatrix4(cars[0].matrixWorld);
  const cameraFollowSpeed = 0.08 * effectiveFrame;

  camera.position.lerp(cameraOffset, Math.min(cameraFollowSpeed, 1.0));
  camera.lookAt(cars[0].position);
}
