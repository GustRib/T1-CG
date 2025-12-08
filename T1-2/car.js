import * as THREE from 'three';
import {setDefaultMaterial } from "../libs/util/util.js";
// Cria carro 
export function createCar(type=1) {
  let carGroup = new THREE.Group();
  const matBody = type == 1? setDefaultMaterial("rgba(29, 27, 27, 0.49)") : new THREE.MeshLambertMaterial({color: "rgba(52, 52, 66, 0.49)"});
  const matDetail = type == 1? setDefaultMaterial("rgba(212, 22, 22, 0.71)") : new THREE.MeshPhongMaterial({color: "rgba(84, 229, 255, 0.71)", shininess: 200, specular: "rgb(255, 255, 255)"});
  const carLength = 8.0;
  const carWidth = 6.0;
  const carHeight = 0.8;
  const radius = carWidth / 2;
  const straightLength = carLength - (2 * radius);

  const shapeWidth = carLength;
  const shapeHeight = carWidth;
  const shapeRadius = shapeHeight / 2;
  const shapeStraight = shapeWidth - (2 * shapeRadius);

  const racetrackShape = new THREE.Shape();

  racetrackShape.moveTo(-shapeStraight / 2, shapeRadius);
  racetrackShape.lineTo(shapeStraight / 2, shapeRadius);
  racetrackShape.absarc(shapeStraight / 2, 0, shapeRadius, Math.PI * 0.5, Math.PI * 1.5, true);
  racetrackShape.lineTo(-shapeStraight / 2, -shapeRadius);
  racetrackShape.absarc(-shapeStraight / 2, 0, shapeRadius, Math.PI * 1.5, Math.PI * 0.5, true);

  const extrudeSettings = {
    depth: carHeight * 0.1,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: carHeight * 0.45,
    bevelThickness: carHeight * 0.45,
  };



  const baseGeom = new THREE.ExtrudeGeometry(racetrackShape, extrudeSettings);
  const baseRoxa = new THREE.Mesh(baseGeom, matBody);

  baseRoxa.rotation.x = Math.PI / 2;
  baseRoxa.rotation.z = Math.PI / 2;
  baseRoxa.position.y = carHeight / 2;
  carGroup.add(baseRoxa);

  const bumperHeight = 0.4;
  const ajusteY = 0.1;

  const bumperCenterGeom = new THREE.BoxGeometry(carWidth, bumperHeight, straightLength);
  const bumperCenter = new THREE.Mesh(bumperCenterGeom, matDetail);
  bumperCenter.position.y = carHeight + (bumperHeight / 2) - ajusteY;
  carGroup.add(bumperCenter);

  const bumperEndGeom = new THREE.CylinderGeometry(radius, radius, bumperHeight, 32);
  const bumperFront = new THREE.Mesh(bumperEndGeom, matDetail);

  bumperFront.position.y = carHeight + (bumperHeight / 2) - ajusteY;
  bumperFront.position.z = straightLength / 2;
  carGroup.add(bumperFront);
  const bumperBack = new THREE.Mesh(bumperEndGeom, matDetail);
  bumperBack.position.y = carHeight + (bumperHeight / 2) - ajusteY;
  bumperBack.position.z = -straightLength / 2;
  carGroup.add(bumperBack);

  const cabineGeom = new THREE.CylinderGeometry(1.0, 2.0, 1.5, 11);
  const cabine = new THREE.Mesh(cabineGeom, matBody);

  const cabineYOriginal = carHeight + bumperHeight + (1.5 / 2);
  const cabineYCorrigida = cabineYOriginal - ajusteY;

  cabine.scale.set(0.7, 1.0, 1.3);

  cabine.position.set(0, cabineYCorrigida, -1.0);
  carGroup.add(cabine);

  let antennaGroup = new THREE.Group();

  const stickHeight = 1.2;
  const stickThickness = 0.3;

  const turbineRadius = 0.6;
  const bladeLength = 2.2;
  const bladeWidth = 0.3;
  const bladeThickness = 0.15;

  const stickGeom = new THREE.BoxGeometry(stickThickness, stickHeight, stickThickness);
  const stick = new THREE.Mesh(stickGeom, matBody);
  stick.position.y = stickHeight / 2;
  antennaGroup.add(stick);
  let turbineGroup = new THREE.Group();

  const domeGeom = new THREE.SphereGeometry(turbineRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeom, matDetail);
  turbineGroup.add(dome);

  const bladeGeom = new THREE.BoxGeometry(bladeLength, bladeThickness, bladeWidth);
  const blade1 = new THREE.Mesh(bladeGeom, matDetail);
  turbineGroup.add(blade1);
  const blade2 = blade1.clone();
  blade2.rotation.y = Math.PI / 4;
  turbineGroup.add(blade2);

  const blade3 = blade1.clone();
  blade3.rotation.y = Math.PI / 2;
  turbineGroup.add(blade3);

  const blade4 = blade1.clone();
  blade4.rotation.y = (Math.PI / 4) * 3;
  turbineGroup.add(blade4);

  turbineGroup.rotation.x = Math.PI / 2;
  turbineGroup.position.y = stickHeight;
  antennaGroup.add(turbineGroup);

  const antennaY = carHeight + bumperHeight - ajusteY;
  antennaGroup.position.set(0, antennaY, 3.0);
  carGroup.add(antennaGroup);

  carGroup.position.y = 0.1;

  // Ensure all meshes in the car cast and receive shadows
  carGroup.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return carGroup;
}