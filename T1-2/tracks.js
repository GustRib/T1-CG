import * as THREE from 'three';
import {setDefaultMaterial } from "../libs/util/util.js";
import { CSG } from '../libs/other/CSGMesh.js'   
const floorYAxis = 0.01;
const floorWidth = 60;
const floorHeight = 60;

export class Track {
    wallAABBs = [];
    trackGroup;
    startCenter;
    checkpoints = {};
    checkPointsBoxes = [];
    tunnel;
    constructor(trackNumber, tunnel) {
        switch(trackNumber) {
            case 1:
                this.startCenter = new THREE.Vector2(90, 270);
                this.checkpoints = {
                  '1': {orientation: 'v',position: new THREE.Vector2(-239, 270),object:{},arrived:false},
                  '2': {orientation: 'h',position: new THREE.Vector2(270, 240),object:{},arrived:false},
                  '3': {orientation: 'v',position: new THREE.Vector2(239, -270),object:{},arrived:false},
                  '4': {orientation: 'h',position: new THREE.Vector2(-270, -239),object:{},arrived:false}
                };
                this.tunnel = tunnel;
                this.trackGroup = createTrack1(this.wallAABBs,this.checkpoints, this.checkPointsBoxes, this.startCenter, this.tunnel);
                break;
            case 2:
                this.startCenter = new THREE.Vector2(90, 270);
                this.checkpoints = {
                  '1': {orientation: 'v',position: new THREE.Vector2(-239, 270),object:{},arrived:false},
                  '2': {orientation: 'h',position: new THREE.Vector2(270, 240),object:{},arrived:false},
                  '3': {orientation: 'v',position: new THREE.Vector2(61, -30),object:{},arrived:false},
                  '4': {orientation: 'v',position: new THREE.Vector2(-239, -270),object:{},arrived:false},
                };
                this.tunnel = tunnel;
                this.trackGroup = createTrack2(this.wallAABBs,this.checkpoints, this.checkPointsBoxes, this.startCenter, this.tunnel);
                break;
            case 3:
                this.startCenter = new THREE.Vector2(210, 270);
                this.checkpoints = {
                  '1': {orientation: 'v',position: new THREE.Vector2(60, 270),object:{},arrived:false},
                  '2': {orientation: 'h',position: new THREE.Vector2(270, 240),object:{},arrived:false},
                  '3': {orientation: 'h',position: new THREE.Vector2(30, -120),object:{},arrived:false},
                  '4': {orientation: 'v',position: new THREE.Vector2(181, -30),object:{},arrived:false},
                  '5': {orientation: 'v',position: new THREE.Vector2(-181, -30),object:{},arrived:false},
                  '6': {orientation: 'v',position: new THREE.Vector2(-239, -270),object:{},arrived:false},
                };
                this.tunnel = tunnel;
                this.trackGroup = createTrack3(this.wallAABBs,this.checkpoints, this.checkPointsBoxes, this.startCenter, this.tunnel);
                break;
            default:
                this.trackGroup = createTrack1(this.wallAABBs);
                this.startCenter = new THREE.Vector2(90, 270);
                break;
        }
    }

    getWallAABBs() {
        return this.wallAABBs;
    }

    getTrackGroup() {
        return this.trackGroup;
    }

    getStartCenter() {
        return this.startCenter;
    }

    getCheckpoints() {
        return this.checkpoints;
    }

    getCheckPointsBoxes() {
        return this.checkPointsBoxes;
    }
}


// Cria Paredes
 function createWall(x, y, z, orientation, colors = ["white", "red"]) {
    const wall = new THREE.Group();
    const halfGeom = new THREE.BoxGeometry(2, 5, 30);
    
    for (let i = 0; i < 2; i++) {
        const mat = setDefaultMaterial(colors[i % 2]);
    const half = new THREE.Mesh(halfGeom, mat);
    if (orientation === 'v') {
      half.position.set(x, 2.5, z + i * 30);
      half.userData.orient = 'v';
    } else {
      half.rotation.y = Math.PI / 2;
      half.position.set(x + i * 30, 2.5, z);
      half.userData.orient = 'h';
    }
    wall.add(half);
  }
  return wall;
}

function addWallAABB(wallGroup, wallAABBs) {
  const bb = new THREE.Box3().setFromObject(wallGroup);
  wallAABBs.push(bb);
}

 function createTile(color) {
  const tileSize = 60;
  const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
  const tileMaterial1 = setDefaultMaterial(color || "#553030");
  const tile = new THREE.Mesh(tileGeometry, tileMaterial1);
  tile.rotation.x = -Math.PI / 2;
  tile.position.y = floorYAxis;
  return tile;
}

function createCheckPointTile(orientation) {
  const checkPointGeometry = new THREE.PlaneGeometry(60, 2);
  const checkPointMaterial = setDefaultMaterial("#fffb00");
  const checkPointTile = new THREE.Mesh(checkPointGeometry, checkPointMaterial);
  if (orientation === 'v') {
    checkPointTile.rotation.z = Math.PI / 2;
  }
  checkPointTile.rotation.x = -Math.PI / 2;
  checkPointTile.position.y = floorYAxis;
  return checkPointTile;
}


 function createTrack1(wallAABBs, checkpoints, checkPointsBoxes, startCenter, tunnel) {

  const group = new THREE.Group();

  for (let i = 0; i < 8; i++) {
    let tileLower;
    if (i == 5) {
      tileLower = createTile("orange");
      let startLineGeometry = new THREE.PlaneGeometry(10, 60);
      let startLineMaterial = setDefaultMaterial("white");
      let startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
      startLine.rotation.x = -Math.PI / 2;
      startLine.position.set(-210 + i * floorWidth, floorYAxis + 0.02, 270);
      group.add(startLine);
    } else {
      tileLower = createTile();
    }
    let tileUpper = createTile();
    tileUpper.position.set(-210 + i * floorWidth, floorYAxis, -270);
    tileLower.position.set(-210 + i * floorWidth, floorYAxis, 270);
    group.add(tileUpper, tileLower);
  }

  for (let i = 0; i < 10; i++) {
    let tileLeft = createTile();
    let tileRight = createTile();
    tileLeft.position.set(-270, floorYAxis, 270 - (i * (floorHeight)));
    tileRight.position.set(270, floorYAxis, 270 - (i * (floorHeight)));
    group.add(tileLeft, tileRight);
  }

  //Paredes Externas
  for (let i = 0; i < 10; i++) {
    let wall1 = createWall(-285 + i * 60, 0, -301);
    let wall2 = createWall(-285 + i * 60, 0, 301);
    let wall3 = createWall(-299, 0, 255 - i * 60, 'v');
    let wall4 = createWall(299, 0, 255 - i * 60, 'v');
    group.add(wall1, wall2, wall3, wall4);
    addWallAABB(wall1, wallAABBs);
    addWallAABB(wall2, wallAABBs);
    addWallAABB(wall3, wallAABBs);
    addWallAABB(wall4, wallAABBs);
  }

  //Paredes Internas
  for (let i = 0; i < 8; i++) {
    let wall1 = createWall(-225 + i * 60, 0, -241);
    let wall2 = createWall(-225 + i * 60, 0, 241);
    let wall3 = createWall(-239, 0, 195 - i * 60, 'v');
    let wall4 = createWall(239, 0, 195 - i * 60, 'v');
    group.add(wall1, wall2, wall3, wall4);
    addWallAABB(wall1, wallAABBs);
    addWallAABB(wall2, wallAABBs);
    addWallAABB(wall3, wallAABBs);
    addWallAABB(wall4, wallAABBs);
  }

  for(let checkPoint in checkpoints){
    let cpTile = createCheckPointTile(checkpoints[checkPoint].orientation);
    cpTile.position.set(checkpoints[checkPoint].position.x, floorYAxis + 0.02, checkpoints[checkPoint].position.y);
    checkpoints[checkPoint].object = cpTile;
    const box = new THREE.Box3().setFromObject(cpTile);
    checkPointsBoxes.push(box);
    group.add(cpTile);
  }

  tunnel.rotation.x = -Math.PI / 2;
  tunnel.position.set(-269, 4, 0);

  group.add(tunnel);
  return group;
}

 function createTrack2(wallAABBs, checkpoints, checkPointsBoxes, startCenter, tunnel) {
  const group = new THREE.Group(); 
  let colorFloor = "#313f50";
  
 for (let i = 0; i < 9; i++) {
    let tileLower;
    if (i == 5) {
      tileLower = createTile("orange");
      let startLineGeometry = new THREE.PlaneGeometry(10, 60);
      let startLineMaterial = setDefaultMaterial("white");
      let startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
      startLine.rotation.x = -Math.PI / 2;
      startLine.position.set(-210 + i * floorWidth, floorYAxis + 0.02, 270);
      group.add(startLine);
    } else {
      tileLower = createTile(colorFloor);
    }
    tileLower.position.set(-210 + i * floorWidth, floorYAxis, 270);
    group.add(tileLower);
  }

  for (let i = 0; i < 10; i++) {
    let tileLeft = createTile(colorFloor);
    tileLeft.position.set(-270, floorYAxis, 270 - (i * (floorHeight)));
    group.add(tileLeft);
  }

  for (let i = 0; i < 5; i++) {
    let tileUpperHalf = createTile(colorFloor);
    let tileHalfRight = createTile(colorFloor);
    tileHalfRight.position.set(270, floorYAxis, 210 - (i * (floorHeight)));
    tileUpperHalf.position.set(-210 + i * floorWidth, floorYAxis, -270);
    group.add(tileUpperHalf,tileHalfRight);
  }

  for (let i = 0; i < 4; i++) {
    let tileHalfLeft = createTile(colorFloor);
    tileHalfLeft.position.set(30, floorYAxis, -210 + (i * (floorHeight)));
    if(i < 3){
      let tileHalfLower = createTile(colorFloor);
      tileHalfLower.position.set(90 + i * floorWidth, floorYAxis, -30);
      group.add( tileHalfLower,tileHalfLeft); 
    }else{
      group.add(tileHalfLeft);
    }
  }
  
  //Paredes Externas
  for (let i = 0; i < 10; i++) {
    let wall1 = createWall(-285 + i * 60, 0, 299,'h', ['white', 'blue']);
    let wall2 = createWall(-299, 0, 255 - i * 60, 'v', ['white', 'blue']);
    group.add(wall1, wall2);
    addWallAABB(wall1,wallAABBs);
    addWallAABB(wall2,wallAABBs);
  }
  for(let i = 0; i < 6; i++){
    let wall1 = createWall(300, 0, 255 - i * 60, 'v', ['blue', 'white']);
    let wall2 = createWall(-285 + i * 60, 0, -300, 'h', ['blue', 'white']);
    group.add(wall1,wall2);
    addWallAABB(wall1,wallAABBs);
    addWallAABB(wall2,wallAABBs);
  }
  for(let i = 0; i < 4; i++){
    let wall1 = createWall(76 + i * 60, 0, -61,'h', ['blue', 'white']);
    let wall2 = createWall(60, 0, -285 + i * 60, 'v', ['blue', 'white']);
    group.add(wall1, wall2);
    addWallAABB(wall1,wallAABBs);
    addWallAABB(wall2,wallAABBs);
  }

  //Paredes Internas
  for(let i = 0; i < 8; i++){
    let wall1 = createWall(-225 + i * 60, 0, 239,'h', ['white', 'blue']);
    let wall2 = createWall(-239, 0, 195 - i * 60, 'v', ['white', 'blue']);
    group.add(wall1, wall2);
    addWallAABB(wall1, wallAABBs);
    addWallAABB(wall2, wallAABBs);    
  }
  for(let i = 0; i < 4; i++){
    let wall1 = createWall(15 + i * 60, 0, 0,'h', ['blue', 'white']);
    let wall2 = createWall(239, 0, 15 + i * 60, 'v', ['blue', 'white']);
    let wall3 = createWall(-224 + i * 60, 0, -239,'h', ['blue', 'white']);
    let wall4 = createWall(0, 0, -224 + i * 60, 'v', ['blue', 'white']);
    group.add(wall1, wall2,wall3,wall4);
    addWallAABB(wall1, wallAABBs);
    addWallAABB(wall2, wallAABBs);
    addWallAABB(wall3, wallAABBs);
    addWallAABB(wall4, wallAABBs);

  }
  
  for(let checkPoint in checkpoints){
    let cpTile = createCheckPointTile(checkpoints[checkPoint].orientation);
    cpTile.position.set(checkpoints[checkPoint].position.x, floorYAxis + 0.02, checkpoints[checkPoint].position.y);
    checkpoints[checkPoint].object = cpTile;
    const box = new THREE.Box3().setFromObject(cpTile);
    checkPointsBoxes.push(box);
    group.add(cpTile);
  }
  tunnel.rotation.x = -Math.PI / 2;
  tunnel.position.set(-269, 4, 0);

  group.add(tunnel);

  return group;
}



 function createTrack3(wallAABBs,checkpoints, checkPointsBoxes, startCenter, tunnel){
    const group = new THREE.Group();
    let colorFloor = "#315035";

    for (let i = 0; i < 10; i++) {
        let tileMiddle = createTile(colorFloor);
        let tileLower = createTile(colorFloor);
        let tileUpper = createTile(colorFloor);
        if(i <5){
            if (i == 3) {
                tileLower = createTile("orange");
                let startLineGeometry = new THREE.PlaneGeometry(10, 60);
                let startLineMaterial = setDefaultMaterial("white");
                let startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
                startLine.rotation.x = -Math.PI / 2;
                startLine.position.set(floorWidth/2 + i * floorWidth, floorYAxis + 0.02, 270);
                group.add(startLine);
            }
            tileLower.position.set(floorWidth/2 + i * floorWidth, floorYAxis, 270);
            tileUpper.position.set(-270 + i * floorWidth, floorYAxis, -270);
            group.add(tileUpper, tileLower);

        }

        tileMiddle.position.set(-270 + i * floorWidth, floorYAxis, -30);
        group.add(tileMiddle);
    }

    for(let i = 0; i < 4; i++){
        let tileLeftUpper = createTile(colorFloor);
        let tileLeftLower = createTile(colorFloor);
        let tileRightUpper = createTile(colorFloor);
        let tileRightLower = createTile(colorFloor);

        if(i < 3){
            tileLeftUpper.position.set(-270, floorYAxis, -210 + i * floorHeight);
            group.add(tileLeftUpper);
        }

        if(i< 4){           
            tileRightUpper.position.set(30, floorYAxis, -270 + i * floorHeight);
            group.add(tileRightUpper);
        }


        tileLeftLower.position.set(30, floorYAxis, 210 - i * floorHeight);
        tileRightLower.position.set(270, floorYAxis, 210 - i * floorHeight);
        group.add( tileLeftLower, tileRightLower);

    }

    //Paredes Externas
    for(let i=0; i<4; i++){
        let wallUpperRight = createWall(61, 0, -107 - i * floorHeight, 'v', ['white', 'green']);
        let wallLowerUpper = createWall(75 + i * floorWidth, 0, -61,'h', ['white', 'green']);
        group.add(wallUpperRight, wallLowerUpper);
        addWallAABB(wallUpperRight, wallAABBs);
        addWallAABB(wallLowerUpper, wallAABBs);
    }

    for(let i=0; i<5; i++){
        let wallLower = createWall(15 + i * floorWidth, 0, 301,'h', ['white', 'green']);
        let wallLowerLeft = createWall(-1, 0, 17+i * floorWidth, 'v', ['white', 'green']);
        let wallUpperLower = createWall(-285 + i * floorWidth, 0, 1, 'h', ['green', 'white']);
        let wallUpperLeft = createWall(-299, 0, -45 - i * floorHeight, 'v', ['green', 'white']);
        group.add(wallLower, wallLowerLeft, wallUpperLower, wallUpperLeft);
        addWallAABB(wallLower, wallAABBs);
        addWallAABB(wallLowerLeft, wallAABBs);
        addWallAABB(wallUpperLower, wallAABBs);
        addWallAABB(wallUpperLeft, wallAABBs);
    }

    for(let i=0; i<6; i++){
        let wallLowerRight = createWall(299, 0, 255 - i * floorHeight, 'v', ['white', 'green']);
        let wallUpper = createWall(-285 + i * floorWidth, 0, -301, 'h', ['green', 'white']);
        group.add(wallLowerRight, wallUpper);
        addWallAABB(wallLowerRight, wallAABBs);
        addWallAABB(wallUpper, wallAABBs);
    }

    //Paredes Internas
    for(let i=0; i<3; i++){
        let wallUpperRight = createWall(-1, 0, -225 + i * floorHeight,'v', ['white','green']);
        let wallUpperLeft = createWall(-239, 0, -225 + i * floorHeight, 'v', ['green','white']);
        let wallLower = createWall(75 + i * floorWidth, 0, 239,'h', ['white', 'green']);
        let wallLowerUpper = createWall(75 + i * floorWidth, 0, 1, 'h', ['green', 'white']);
        group.add(wallUpperLeft, wallUpperRight, wallLower, wallLowerUpper);
        addWallAABB(wallUpperLeft, wallAABBs);
        addWallAABB(wallUpperRight, wallAABBs);
        addWallAABB(wallLower, wallAABBs);
        addWallAABB(wallLowerUpper, wallAABBs);
    }

    for(let i=0; i<4; i++){
        let wallUpper = createWall(-225 + i * floorWidth, 0, -239,'h', ['green', 'white']);
        let wallUpperLower = createWall(-225 + i * floorWidth, 0, -61,'h', ['white', 'green']);
        let wallLowerLeft = createWall(61, 0, 15 + i * floorHeight,'v', ['green', 'white']);
        let wallLowerRight = createWall(239, 0, 15 + i * floorHeight,'v', ['white', 'green']);
        group.add(wallUpper, wallUpperLower, wallLowerLeft, wallLowerRight);
        addWallAABB(wallUpper, wallAABBs);
        addWallAABB(wallUpperLower, wallAABBs);
        addWallAABB(wallLowerLeft, wallAABBs);
        addWallAABB(wallLowerRight, wallAABBs);
    }
    

    for(let checkPoint in checkpoints){
      let cpTile = createCheckPointTile(checkpoints[checkPoint].orientation);
      cpTile.position.set(checkpoints[checkPoint].position.x, floorYAxis + 0.02, checkpoints[checkPoint].position.y);
      checkpoints[checkPoint].object = cpTile;
      const box = new THREE.Box3().setFromObject(cpTile);
      checkPointsBoxes.push(box);
      group.add(cpTile);
    }
  tunnel.rotation.x = -Math.PI / 2;
  tunnel.position.set(30, 4, 120);

  group.add(tunnel);

    return group;
}

function updateObject(mesh)
{
   mesh.matrixAutoUpdate = false;
   mesh.updateMatrix();
}

export function buildTunnel()
{
  let auxMat = new THREE.Matrix4();
  let cylinderMesh = new THREE.Mesh(new THREE.CylinderGeometry( 31, 31, 170));
  let cylinderMesh2 = new THREE.Mesh(new THREE.CylinderGeometry( 29, 29, 170));
  // freeze cylinders so CSG uses their final matrices (like you already do for cube/spheres)
  updateObject(cylinderMesh);
  updateObject(cylinderMesh2);
  let cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(62, 170, 62));
  let sphereMesh = new THREE.Mesh( new THREE.SphereGeometry(10, 32, 32) );
  let csgObject, cubeCSG, cylinderCSG, cylinderCSG2, sphereCSG;
  let spherePositions = [
    {x: 20, y: -70, z: 25},
    {x: -15, y: -15, z: 30},
    {x: 25, y: 40, z: 20},
    {x: -20, y: 70, z: 30},
  ];
  cubeMesh.position.set(0, 0, -30);
  updateObject(cubeMesh);
  cubeCSG = CSG.fromMesh( cubeMesh);
  cylinderCSG = CSG.fromMesh( cylinderMesh );
  cylinderCSG2 = CSG.fromMesh( cylinderMesh2 );
  //Cilindro Subtract Cubo
  csgObject = cylinderCSG.subtract(cubeCSG);
  //Cilindro Subtract Cilindro Interno
  csgObject = csgObject.subtract(cylinderCSG2);
  //Cilindro Subtract Esferas

    sphereMesh.position.set(spherePositions[0].x, spherePositions[0].y, spherePositions[0].z);
    updateObject(sphereMesh);
    sphereCSG = CSG.fromMesh( sphereMesh );
    csgObject = csgObject.subtract(sphereCSG);

    sphereMesh.position.set(spherePositions[1].x, spherePositions[1].y, spherePositions[1].z);
    updateObject(sphereMesh);
    sphereCSG = CSG.fromMesh( sphereMesh );
    csgObject = csgObject.subtract(sphereCSG);

    sphereMesh.position.set(spherePositions[2].x, spherePositions[2].y, spherePositions[2].z);
    updateObject(sphereMesh);
    sphereCSG = CSG.fromMesh( sphereMesh );
    csgObject = csgObject.subtract(sphereCSG);

    sphereMesh.position.set(spherePositions[3].x, spherePositions[3].y, spherePositions[3].z);
    updateObject(sphereMesh);
    sphereCSG = CSG.fromMesh( sphereMesh );
    csgObject = csgObject.subtract(sphereCSG);

  let mesh1 = CSG.toMesh(csgObject, auxMat);
  mesh1.material = new THREE.MeshPhongMaterial({color: 'gray'});
  mesh1.position.set(0, 0, 0);
  let cylinder = mesh1;


  return cylinder;
}

