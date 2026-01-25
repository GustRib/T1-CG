// hud.js - Sistema de HUD e interface

import { InfoBox } from '../libs/util/util.js';

export function createHUDs() {
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

  const winnerBanner = document.createElement('div');
  winnerBanner.style.cssText = `
    position:fixed; left:50%; top:40%; transform:translate(-50%,-50%);
    background:rgba(0,0,0,0.75); color:#ff0; font-size:48px; padding:20px 40px;
    border-radius:12px; z-index:1000; display:none;
  `;
  document.body.appendChild(winnerBanner);

  return { hud1, hud2, winnerBanner };
}

export function updateHUDs(hud1, hud2, {
  cars, carSpeeds, carLaps, carShots, carCheckpoints,
  currentTrack, totalLaps, shotsMax
}) {
  const totalCheckpoints = Object.keys(currentTrack.getCheckpoints()).length;

  // Atualizar HUD do Player
  const kmh1 = Math.abs(carSpeeds[0]) * 70;
  let arrived1 = 0;
  for (let k in carCheckpoints[0]) if (carCheckpoints[0][k].arrived) arrived1++;
  hud1.textContent = `Jogador: Velocidade: ${kmh1.toFixed(1)} Km/h | Voltas: ${carLaps[0]}/${totalLaps} | CP: ${arrived1}/${totalCheckpoints} | Tiros: ${carShots[0]}/${shotsMax}`;

  // Atualizar HUD dos Adversários
  let hud2Text = "Adversários: ";
  for (let i = 1; i < cars.length; i++) {
    const kmh = Math.abs(carSpeeds[i]) * 70;
    let arrived = 0;
    for (let k in carCheckpoints[i]) if (carCheckpoints[i][k].arrived) arrived++;
    hud2Text += `Adv${i}(V:${kmh.toFixed(0)} L:${carLaps[i]} T:${carShots[i]}) `;
  }
  hud2.textContent = hud2Text;
}

export function setupInfoBox() {
  let infoBox = new InfoBox();
  infoBox.add("Rock 'n Roll Racing 3D - Protótipo");
  infoBox.addParagraph();
  infoBox.add("Setas ← → : virar");
  infoBox.add("Setas ↑ / X : acelerar");
  infoBox.add("Seta ↓ : frear");
  infoBox.add("1, 2 e 3 : trocar de pista");
  infoBox.add("Espaço : atirar");
  infoBox.show();
}
