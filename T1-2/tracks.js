import * as THREE from 'three';
import {setDefaultMaterial } from "../libs/util/util.js";
import { CSG } from '../libs/other/CSGMesh.js'   
import { Water } from '../build/jsm/objects/Water.js';
const floorYAxis = 0.01;
const floorWidth = 60;
const floorHeight = 60;

export class Track {
    wallAABBs = [];
    tilesAABBs = [];
    waterAABBs = [];
    jumpPads = [];
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
                this.trackGroup = createTrack1(this.wallAABBs, this.tilesAABBs, this.checkpoints, this.checkPointsBoxes, this.startCenter, this.tunnel);
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
                this.trackGroup = createTrack2(this.wallAABBs, this.tilesAABBs, this.checkpoints, this.checkPointsBoxes, this.startCenter, this.tunnel, this.waterAABBs);
                break;
            case 3:
                this.startCenter = new THREE.Vector2(270, 390);
                this.checkpoints = {
                  '1': {orientation: 'v',position: new THREE.Vector2(60, 390),object:{},arrived:false},
                  '2': {orientation: 'h',position: new THREE.Vector2(390, 240),object:{},arrived:false},
                  '3': {orientation: 'h',position: new THREE.Vector2(30, -350),object:{},arrived:false},
                  '4': {orientation: 'v',position: new THREE.Vector2(181, 30),object:{},arrived:false},
                  '5': {orientation: 'v',position: new THREE.Vector2(-281, 30),object:{},arrived:false},
                  '6': {orientation: 'v',position: new THREE.Vector2(-239, -390),object:{},arrived:false},
                };
                this.tunnel = tunnel;
                this.trackGroup = createTrack3(this.wallAABBs, this.tilesAABBs, this.checkpoints, this.checkPointsBoxes, this.startCenter, this.tunnel, this.jumpPads);
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

    getTilesAABBs() {
        return this.tilesAABBs;
    }

    getWaterAABBs() {
        return this.waterAABBs;
    }

    getJumpPads() {
        return this.jumpPads;
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
    y = y == 0 ? 10 : y;
    const wall = new THREE.Group();
    const halfGeom = new THREE.BoxGeometry(2, 5, 30);
    
    for (let i = 0; i < 2; i++) {
        const mat = setDefaultMaterial(colors[i % 2]);
    const half = new THREE.Mesh(halfGeom, mat);
    if (orientation === 'v') {
      half.position.set(x, 7.5, z + i * 30);
      half.userData.orient = 'v';
    } else {
      half.rotation.y = Math.PI / 2;
      half.position.set(x + i * 30, 7.5, z);
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

function addTileAABB(tile, tilesAABBs) {
  const bb = new THREE.Box3().setFromObject(tile);
  tilesAABBs.push(bb);
}

function addWaterAABB(water, waterAABBs) {
  const bb = new THREE.Box3().setFromObject(water);
  waterAABBs.push(bb);
}

function addJumpPad(jumpPad, jumpPads) {
  const bb = new THREE.Box3().setFromObject(jumpPad);
  jumpPads.push(bb);
}

 function createTile(color) {
  const tileSize = 60;
  // const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
  const tileGeometry = new THREE.BoxGeometry( 60, 60, 10 );
  const tileMaterial1 = setDefaultMaterial(color || "#553030");
  const tile = new THREE.Mesh(tileGeometry, tileMaterial1);
  tile.rotation.x = -Math.PI / 2;
  tile.position.y = floorYAxis;
  return tile;
}

function createCheckPointTile(orientation) {
  const checkPointGeometry = new THREE.BoxGeometry(60, 2, 10);
  const checkPointMaterial = setDefaultMaterial("#fffb00");
  const checkPointTile = new THREE.Mesh(checkPointGeometry, checkPointMaterial);
  if (orientation === 'v') {
    checkPointTile.rotation.z = Math.PI / 2;
  }
  checkPointTile.rotation.x = -Math.PI / 2;
  checkPointTile.position.y = floorYAxis;
  return checkPointTile;
}

function createJumpPad(position) {
  const jumpPadGeometry = new THREE.BoxGeometry(60, 10, 10);
  const jumpPadMaterial = setDefaultMaterial("#e100ff");
  const jumpPad = new THREE.Mesh(jumpPadGeometry, jumpPadMaterial);
  jumpPad.rotation.x = -Math.PI / 2;
  return jumpPad;
}


 function createTrack1(wallAABBs, tilesAABBs, checkpoints, checkPointsBoxes, startCenter, tunnel) {

  const group = new THREE.Group();

  for (let i = 0; i < 8; i++) {
    let tileLower;
    if (i == 5) {
      tileLower = createTile("orange");
      let startLineGeometry = new THREE.BoxGeometry(10, 60,10);
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
    addTileAABB(tileUpper, tilesAABBs);
    addTileAABB(tileLower, tilesAABBs);
  }

  for (let i = 0; i < 10; i++) {
    let tileLeft = createTile();
    let tileRight = createTile();
    tileLeft.position.set(-270, floorYAxis, 270 - (i * (floorHeight)));
    tileRight.position.set(270, floorYAxis, 270 - (i * (floorHeight)));
    group.add(tileLeft, tileRight);
    addTileAABB(tileLeft, tilesAABBs);
    addTileAABB(tileRight, tilesAABBs);
  }

  //Paredes Externas
  for (let i = 0; i < 10; i++) {
    let wall1 = createWall(-285 + i * 60, 15, -301);
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

  // tunnel.rotation.x = -Math.PI / 2;
  // tunnel.position.set(-269, 4, 0);
  // group.add(tunnel);

  let treesArea1 = createRandomTrees(10, {minX:-200, maxX:200, minZ:-200, maxZ:200}, 5);
  let treesArea2 = createRandomTrees(10, {minX:-350, maxX:-310, minZ:-300, maxZ:300}, 5);
  let treesArea3 = createRandomTrees(10, {minX: 310, maxX:350, minZ:-300, maxZ:300}, 5);
  let treesArea4 = createRandomTrees(10, {minX:-300, maxX:300, minZ:-350, maxZ:-310}, 5);
  let treesArea5 = createRandomTrees(10, {minX:-300, maxX:300, minZ:310, maxZ:350}, 5);

  group.add(treesArea1,treesArea2,treesArea3, treesArea4, treesArea5);
  // Ensure all meshes in the track group cast and receive shadows
  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

 function createTrack2(wallAABBs, tilesAABBs, checkpoints, checkPointsBoxes, startCenter, tunnel, waterAABBs = []) {
  const group = new THREE.Group(); 
  let colorFloor = "#313f50";
  
 for (let i = 0; i < 9; i++) {
    let tileLower;
    if (i == 5) {
      tileLower = createTile("orange");
      let startLineGeometry = new THREE.BoxGeometry(10, 60, 10);
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
    addTileAABB(tileLower, tilesAABBs);
  }

  for (let i = 0; i < 10; i++) {
    let tileLeft
    let tileUnderWater;
    if(i >= 2 && i <= 7){
      tileLeft = createWaterTile();
      tileUnderWater = createTile(colorFloor);
      tileUnderWater.position.set(-270, -0.8, 270 - (i * (floorHeight)));
      tileLeft.position.set(-270, 5, 270 - (i * (floorHeight)));
      group.add(tileUnderWater);
      addWaterAABB(tileLeft, waterAABBs);
    }else{
    tileLeft = createTile(colorFloor);
    tileLeft.position.set(-270, floorYAxis, 270 - (i * (floorHeight)));
    }
    group.add(tileLeft);
    addTileAABB(tileLeft, tilesAABBs);
  }

  for (let i = 0; i < 5; i++) {
    let tileUpperHalf = createTile(colorFloor);
    let tileHalfRight = createTile(colorFloor);
    tileHalfRight.position.set(270, floorYAxis, 210 - (i * (floorHeight)));
    tileUpperHalf.position.set(-210 + i * floorWidth, floorYAxis, -270);
    group.add(tileUpperHalf,tileHalfRight);
    addTileAABB(tileUpperHalf, tilesAABBs);
    addTileAABB(tileHalfRight, tilesAABBs);
  }

  for (let i = 0; i < 4; i++) {
    let tileHalfLeft = createTile(colorFloor);
    tileHalfLeft.position.set(30, floorYAxis, -210 + (i * (floorHeight)));
    if(i < 3){
      let tileHalfLower = createTile(colorFloor);
      tileHalfLower.position.set(90 + i * floorWidth, floorYAxis, -30);
      group.add( tileHalfLower,tileHalfLeft);
      addTileAABB(tileHalfLower, tilesAABBs);
      addTileAABB(tileHalfLeft, tilesAABBs);
    }else{
      group.add(tileHalfLeft);
      addTileAABB(tileHalfLeft, tilesAABBs);
    }
  }
  
  //Paredes Externas
  for (let i = 0; i < 10; i++) {
    let wall1 = createWall(-285 + i * 60, 0, 299,'h', ['white', 'blue']);
    let wall2 = createWall(-299, 10, 255 - i * 60, 'v', ['white', 'blue']);
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
  // tunnel.rotation.x = -Math.PI / 2;
  // tunnel.position.set(-269, 4, 0);

  // group.add(tunnel);

  let treesArea1 = createRandomTrees(8, {minX:-200, maxX:200, minZ:20, maxZ:220}, 5);
  let treesArea2 = createRandomTrees(5, {minX:-200, maxX:-20, minZ:-220, maxZ:-20}, 5);
  let treesArea3 = createRandomTrees(8, {minX:-350, maxX:-310, minZ:-300, maxZ:300}, 5);
  let treesArea4 = createRandomTrees(6, {minX: 310, maxX:350, minZ:30, maxZ:300}, 5);
  let treesArea5 = createRandomTrees(6, {minX:-300, maxX:-30, minZ:-350, maxZ:-310}, 5);
  let treesArea6 = createRandomTrees(8, {minX:-300, maxX:300, minZ:310, maxZ:350}, 5);
  let treesArea7 = createRandomTrees(5, {minX:80, maxX:280, minZ:-350, maxZ:-80}, 5);

  group.add(treesArea1,treesArea2,treesArea3, treesArea4, treesArea5, treesArea6, treesArea7);
  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

 function createTrack3(wallAABBs, tilesAABBs, checkpoints, checkPointsBoxes, startCenter, tunnel, jumpPads=this.jumpPads) {
    const group = new THREE.Group();
    let colorFloor = "#315035";

    for(let i=0; i<14; i++){
        if(i <= 8 || i >= 12){
        let tileMiddle = createTile(colorFloor);
        tileMiddle.position.set(30, floorYAxis, 390 - i * floorHeight);
        group.add(tileMiddle);
        addTileAABB(tileMiddle, tilesAABBs);
        }

        if(i == 7){
          let jumpPadGeometry = new THREE.BoxGeometry(60,10,5)
          let jumpPadMaterial = setDefaultMaterial("pink")
          let jumpPad = new THREE.Mesh(jumpPadGeometry, jumpPadMaterial)
          jumpPad.position.set(30, 0 , -121)
          group.add(jumpPad)
          addJumpPad(jumpPad, jumpPads)
        }

        if(i<7){
          let tileLeftUpper = createTile(colorFloor);
          let tileLeftLower = createTile(colorFloor);
          let tileRightUpper = createTile(colorFloor);
          let tileRightLower = createTile(colorFloor);
          
          tileLeftUpper.position.set(-390 + i * floorHeight, floorYAxis, -390);
          tileLeftLower.position.set(-390 + i * floorHeight, floorYAxis, 30);
          tileRightUpper.position.set(30 + i * floorHeight, floorYAxis, 30);
          if(i==4){
            tileRightLower = createTile("orange");
            let startLineGeometry = new THREE.BoxGeometry(10, 10, 60);
            let startLineMaterial = setDefaultMaterial("white");
            let startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
            startLine.position.set(startCenter.x, floorYAxis + 0.02, startCenter.y);
            group.add(startLine);
          }
          tileRightLower.position.set(30 + i * floorHeight, floorYAxis, 390);
          group.add(tileLeftUpper, tileLeftLower, tileRightUpper,tileRightLower);
          addTileAABB(tileLeftUpper, tilesAABBs)
          addTileAABB(tileLeftLower, tilesAABBs)
          addTileAABB(tileRightUpper, tilesAABBs)
          addTileAABB(tileRightLower, tilesAABBs)
        }

        if(i < 6){  
          let tileLeftUpper = createTile(colorFloor);
          let tileRightLower = createTile(colorFloor);
          tileLeftUpper.position.set(-390, floorYAxis, -30 - i * floorHeight);
          tileRightLower.position.set(390, floorYAxis, 30 + i * floorHeight);
          group.add(tileLeftUpper, tileRightLower);
          addTileAABB(tileLeftUpper, tilesAABBs)
          addTileAABB(tileRightLower, tilesAABBs)
        }

    }

    // Paredes Externas
    for(let i=0; i<8; i++){
        let wallLeft = createWall(-419, 0, -405 + i * floorHeight, 'v', ['white', 'green']);
        let wallLeftUpper = createWall(-405 + i * floorHeight, 0, -419, 'h', ['white', 'green']);
        group.add(wallLeft,wallLeftUpper);
        addWallAABB(wallLeft, wallAABBs);
        addWallAABB(wallLeftUpper, wallAABBs);
    }

    for(let i=0; i<7; i++){
        let wallUpperRight = createWall(61, 0, -45 - i * floorHeight, 'v', ['white', 'green']);
        let wallUpperLeft = createWall(-405 + i * floorHeight, 0, 61, 'h', ['white', 'green']);
        let wallLowerRight = createWall(15 + i * floorHeight, 0, 420, 'h', ['white', 'green']);
        let wallLowerRight2 = createWall(419, 0, 375 - i * floorHeight, 'v', ['white', 'green']);
        group.add(wallUpperRight, wallUpperLeft, wallLowerRight,wallLowerRight2);
        addWallAABB(wallUpperRight, wallAABBs);
        addWallAABB(wallUpperLeft, wallAABBs);
        addWallAABB(wallLowerRight, wallAABBs);
        addWallAABB(wallLowerRight2, wallAABBs);
    }

    for(let i=0; i<6; i++){
      let wallLowerLeft = createWall(1, 0, 375 - i * floorHeight, 'v', ['green', 'white']);
      let wallLowerUpper = createWall(75 + i * floorHeight, 0, -1, 'h', ['green', 'white']);
      group.add(wallLowerLeft, wallLowerUpper);
      addWallAABB(wallLowerLeft, wallAABBs);
      addWallAABB(wallLowerUpper, wallAABBs);
    }

    // Paredes Internas
    for(let i = 0; i<5; i++){
      let wallLowerDown = createWall(75 + i * floorHeight, 0, 360, 'h', ['white', 'green']);
      let wallLowerUp = createWall(75 + i * floorHeight, 0, 61, 'h', ['green', 'white']);
      let wallLowerLeft = createWall(61, 0, 75 + i * floorHeight, 'v', ['green','white']);
      let wallLowerRight = createWall(360, 0, 75 + i * floorHeight, 'v', ['white','green']);
      group.add(wallLowerDown, wallLowerUp,wallLowerLeft, wallLowerRight);
      addWallAABB(wallLowerDown, wallAABBs);
      addWallAABB(wallLowerUp, wallAABBs);
      addWallAABB(wallLowerLeft, wallAABBs);
      addWallAABB(wallLowerRight, wallAABBs);
    }
    
    for(let i = 0; i<6; i++){
      let wallUpperLeft = createWall(-360, 0, -345 + i * floorHeight, 'v', ['white', 'green']);
      let wallUpperRight = createWall(-1, 0, -345 + i * floorHeight, 'v', ['green', 'white']);
      let wallUpperDown = createWall(-346 + i * floorHeight, 0, -359, 'h', ['white', 'green']);
      let wallUpperUp = createWall(-345 + i * floorHeight, 0, -1, 'h', ['green', 'white']);
      group.add(wallUpperLeft, wallUpperRight, wallUpperDown, wallUpperUp);
      addWallAABB(wallUpperLeft, wallAABBs);
      addWallAABB(wallUpperRight, wallAABBs);
      addWallAABB(wallUpperDown, wallAABBs);
      addWallAABB(wallUpperUp, wallAABBs);
    }

    
    for(let checkPoint in checkpoints){
      let cpTile = createCheckPointTile(checkpoints[checkPoint].orientation);
      cpTile.position.set(checkpoints[checkPoint].position.x, floorYAxis + 0.02, checkpoints[checkPoint].position.y);
      checkpoints[checkPoint].object = cpTile;
      const box = new THREE.Box3().setFromObject(cpTile);
      checkPointsBoxes.push(box);
      group.add(cpTile);
    }
  // tunnel.rotation.x = -Math.PI / 2;
  // tunnel.position.set(30, 4, 120);

  // group.add(tunnel);

  let treesArea1 = createRandomTrees(5, {minX:80, maxX:330, minZ:70, maxZ:350}, 5);
  let treesArea2 = createRandomTrees(10, {minX:-330, maxX:-20, minZ:-320, maxZ:-70}, 5);
  let treesArea3 = createRandomTrees(10, {minX:-370, maxX: -20, minZ:70, maxZ:330}, 5);
  let treesArea4 = createRandomTrees(10, {minX:90, maxX: 330, minZ:-360, maxZ:-30}, 5);



  group.add(treesArea1,treesArea2,treesArea3,treesArea4);
  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

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

function createLowPolyTree(type = 1, options = {}) {
  const g = new THREE.Group();
  const trunkMat = setDefaultMaterial(options.trunkColor || "#6b3e1b");
  const foliageMat1 = setDefaultMaterial(options.foliageColor || "#2f8b2f");
  const foliageMat2 = setDefaultMaterial(options.foliageColor2 || "#2f8b2f");

  // tronco base
  const trunkHeight = options.trunkHeight || 1.6;
  const trunkRadius = options.trunkRadius || 0.35;
  const trunkGeom = new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.15, trunkHeight, 6);
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.y = trunkHeight / 2;
  g.add(trunk);

  // Foliage variants
  if (type === 1) {
    // 3 cones empilhados (árvore conífera clássica)
    const sizes = [3.0, 2.2, 1.4];
    let y = trunkHeight;
    for (let i = 0; i < sizes.length; i++) {
      const h = sizes[i] * 0.6;
      const r = sizes[i] * 0.5;
      const coneGeom = new THREE.ConeGeometry(r, h, 6);
      const cone = new THREE.Mesh(coneGeom, i === 0 ? foliageMat2 : foliageMat1);
      cone.position.y = y + h / 2 - 0.2 * i;
      cone.rotation.y = (i % 2) * 0.3;
      g.add(cone);
      y += h * 0.35;
    }
  } else if (type === 2) {
    // Bola low-poly (icosahedron)
    const icoGeom = new THREE.IcosahedronGeometry(2.2, 0);
    const ico = new THREE.Mesh(icoGeom, foliageMat1);
    ico.position.y = trunkHeight + 1.4;
    g.add(ico);

    // pequena segunda bola
    const ico2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), foliageMat2);
    ico2.position.set(0.9, trunkHeight + 0.8, 0.2);
    g.add(ico2);
  } else if (type === 3) {
    // Camadas quadradas (estilizada)
    const layers = [2.6, 2.0, 1.2];
    let y = trunkHeight + 0.2;
    for (let i = 0; i < layers.length; i++) {
      const s = layers[i];
      const boxGeom = new THREE.BoxGeometry(s, s, s * 0.6);
      const box = new THREE.Mesh(boxGeom, i === 1 ? foliageMat2 : foliageMat1);
      box.position.y = y + (s * 0.3);
      box.rotation.y = (i % 2) * 0.5;
      g.add(box);
      y += s * 0.35;
    }
  }

  g.scale.set(options.scale, options.scale, options.scale);

  return g;
}


function createWaterTile(){
  const waterGeometry = new THREE.PlaneGeometry( 60, 60);

  // Water shader parameters
  let water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load( '../assets/textures/NormalMapping/waternormals.jpg', function ( texture ) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      } ),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 2,
    }
  );
  water.rotation.x = - Math.PI / 2;
  return water;
}


function createRandomTrees(count = 20, area = {minX:-150, maxX:150, minZ:-150, maxZ:150}, size = 1) {
  const group = new THREE.Group();
  if (count <= 0) return group;

  // Escolhe um grid quase quadrado para acomodar `count` células
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const areaWidth = Math.max(0.0001, area.maxX - area.minX);
  const areaDepth = Math.max(0.0001, area.maxZ - area.minZ);

  const cellW = areaWidth / cols;
  const cellD = areaDepth / rows;

  // padding dentro de cada célula para evitar árvores coladas nas bordas
  const pad = Math.min(cellW, cellD) * 0.15;

  // Gera lista de índices de células e embaralha para distribuir aleatoriamente
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cells.push({c, r});
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  // Cria até `count` árvores, uma por célula embaralhada
  for (let i = 0; i < Math.min(count, cells.length); i++) {
    const {c, r} = cells[i];
    // posição aleatória dentro da célula (respeitando padding)
    const x = area.minX + c * cellW + pad + Math.random() * Math.max(0, cellW - 2 * pad);
    const z = area.minZ + r * cellD + pad + Math.random() * Math.max(0, cellD - 2 * pad);

    const t = Math.floor(Math.random() * 3) + 1; // tipos 1..3 (como sua createLowPolyTree)
    const tree = createLowPolyTree(t, { scale: size * (0.85 + Math.random() * 0.4) });

    tree.position.set(x, floorYAxis, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    group.add(tree);
  }

  return group;
}