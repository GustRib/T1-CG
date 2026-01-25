// controls.js - Sistema de controles do player

export function setupKeyListeners() {
  const keys = {};
  
  window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
  
  return keys;
}

export function handleKeys(dt, {
  keys, cars, carSpeeds, carVelocityY, maxSpeed, acceleration, 
  carPenaltyEndTime, clock, raceFinished, switchTrack, tryShootPlayer
}) {
  const effectiveFrame = dt * 60;
  const now = clock.getElapsedTime();
  const playerPenalized = now < carPenaltyEndTime[0];

  // Troca de pista
  if (keys['1']) switchTrack(1);
  if (keys['2']) switchTrack(2);
  if (keys['3']) switchTrack(3);

  if(raceFinished) return;

  // Controle de direção
  const turnSpeed = 0.03 * effectiveFrame;
  if (keys['arrowleft']) cars[0].rotation.y += turnSpeed;
  if (keys['arrowright']) cars[0].rotation.y -= turnSpeed;

  const shootPressed = !!keys[' '];
  if (shootPressed && !handleKeys.prevShootPressed) {
    tryShootPlayer();
  }
  handleKeys.prevShootPressed = shootPressed;

  // Controle de aceleração/freio
  const accelerating = keys['arrowup'] || keys['x'];
  const acceleratingEffective = accelerating && !playerPenalized;
  const braking = keys['arrowdown'];
  const maxReverseSpeed = -maxSpeed / 2;

  if (acceleratingEffective && !braking) {
    carSpeeds[0] += acceleration * effectiveFrame;
    if (carSpeeds[0] > maxSpeed) carSpeeds[0] = maxSpeed;
  } else if (braking && !accelerating) {
    if (carSpeeds[0] > 0) {
      carSpeeds[0] -= acceleration * 5 * effectiveFrame;
      if (carSpeeds[0] < 0) carSpeeds[0] = 0;
    } else if (carSpeeds[0] > maxReverseSpeed) {
      carSpeeds[0] -= acceleration * effectiveFrame;
      if (carSpeeds[0] < maxReverseSpeed) carSpeeds[0] = maxReverseSpeed;
    }
  } else if (accelerating && braking) {
    if (carSpeeds[0] > 0) {
      carSpeeds[0] -= acceleration * 3 * effectiveFrame;
      if (carSpeeds[0] < 0) carSpeeds[0] = 0;
    } else if (carSpeeds[0] > maxReverseSpeed) {
      carSpeeds[0] -= acceleration * 0.5 * effectiveFrame;
      if (carSpeeds[0] < maxReverseSpeed) carSpeeds[0] = maxReverseSpeed;
    }
  } else {
    carSpeeds[0] *= Math.pow(0.988, effectiveFrame);
  }

  // Movimento lateral
  const moveSpeed = carSpeeds[0] * effectiveFrame;
  cars[0].position.x -= Math.sin(cars[0].rotation.y) * moveSpeed;
  cars[0].position.z -= Math.cos(cars[0].rotation.y) * moveSpeed;
}

handleKeys.prevShootPressed = false;
