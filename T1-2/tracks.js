import * as THREE from 'three';
import {setDefaultMaterial } from "../libs/util/util.js";
import { CSG } from '../libs/other/CSGMesh.js'   
import { Water } from '../build/jsm/objects/Water.js';
const floorYAxis = 0.01;
const floorWidth = 60;
const floorHeight = 60;

// Textures
const textureLoader = new THREE.TextureLoader();
const asphaltTexture = textureLoader.load('./assets/asphalt_track_diff_4k.jpg');
asphaltTexture.wrapS = asphaltTexture.wrapT = THREE.RepeatWrapping;
asphaltTexture.repeat.set(1, 1);
asphaltTexture.anisotropy = 16;
const tunnelTexture = textureLoader.load('./assets/concrete_wall_007_diff_4k.jpg');
const brickTexture = textureLoader.load('./assets/cracked_concrete_wall_diff_4k.jpg');
brickTexture.wrapS = brickTexture.wrapT = THREE.RepeatWrapping;
brickTexture.repeat.set(1, 1);
brickTexture.anisotropy = 8;
const herringWallTexture = textureLoader.load('./assets/herringbone_brick_diff_4k.jpg');
herringWallTexture.wrapS = herringWallTexture.wrapT = THREE.RepeatWrapping;
herringWallTexture.repeat.set(2, 1);
herringWallTexture.anisotropy = 8;
const plasterWallTexture = textureLoader.load('./assets/rough_plaster_brick_diff_4k.jpg');
plasterWallTexture.wrapS = plasterWallTexture.wrapT = THREE.RepeatWrapping;
plasterWallTexture.repeat.set(1, 1);
plasterWallTexture.anisotropy = 8;
const finishLineTexture = textureLoader.load('./assets/checkered_pavement_tiles_diff_4k.jpg');
finishLineTexture.wrapS = finishLineTexture.wrapT = THREE.RepeatWrapping;
finishLineTexture.anisotropy = 16;
const barkTexture = textureLoader.load('../assets/textures/wood.png');
barkTexture.wrapS = barkTexture.wrapT = THREE.RepeatWrapping;
barkTexture.repeat.set(1, 2);
barkTexture.anisotropy = 8;
const foliageTexture = textureLoader.load('../assets/textures/grass.jpg');
foliageTexture.wrapS = foliageTexture.wrapT = THREE.RepeatWrapping;
foliageTexture.repeat.set(1, 1);
foliageTexture.anisotropy = 8;
const checkpointTexture = textureLoader.load('./assets/metal_plate_diff_4k.jpg');
checkpointTexture.wrapS = checkpointTexture.wrapT = THREE.RepeatWrapping;
checkpointTexture.repeat.set(6, 1);
checkpointTexture.anisotropy = 16;
const checkpointMaterial = new THREE.MeshStandardMaterial({
  map: checkpointTexture,
  color: "#00d4ff",
  roughness: 0.5,
  metalness: 0.6,
  emissive: "#00aaff",
  emissiveIntensity: 1.2
});
// Laterais
const lateral1Texture = textureLoader.load('./assets/lateral1.jpg');
lateral1Texture.wrapS = lateral1Texture.wrapT = THREE.RepeatWrapping;
lateral1Texture.repeat.set(2, 1);
lateral1Texture.anisotropy = 16;
const lateral2Texture = textureLoader.load('./assets/lateral2.jpg');
lateral2Texture.wrapS = lateral2Texture.wrapT = THREE.RepeatWrapping;
lateral2Texture.repeat.set(1, 1);
lateral2Texture.anisotropy = 8;
const lateral3Texture = textureLoader.load('./assets/lateral3.jpg');
lateral3Texture.wrapS = lateral3Texture.wrapT = THREE.RepeatWrapping;
lateral3Texture.repeat.set(2, 1);
lateral3Texture.anisotropy = 8;
function createFinishLineMaterial(repeatX, repeatY) {
  const tex = finishLineTexture.clone();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 16;
  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.9,
    metalness: 0.0
  });
}
const finishLineMaterialLong = createFinishLineMaterial(2, 6);

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
 function createWall(x, y, z, orientation, color = "cracked") {
   const wallHeight = 4;
   const wallCenterY = 5.5;
   y = y == 0 ? 8 : y;
   const wall = new THREE.Group();
   const halfGeom = new THREE.BoxGeometry(2, wallHeight, 30);
   
   // Mapear cores para texturas
   const textureMap = {
     'cracked': brickTexture,
     'plaster': plasterWallTexture,
     'herring': herringWallTexture,

   };
   
   const textureToUse = textureMap[color] || brickTexture;
   const wallMaterial = new THREE.MeshStandardMaterial({
     map: textureToUse,
     roughness: 0.9,
     metalness: 0.0
   });
    
   for (let i = 0; i < 2; i++) {
    const half = new THREE.Mesh(halfGeom, wallMaterial);
    if (orientation === 'v') {
      half.position.set(x, wallCenterY, z + i * 30);
      half.userData.orient = 'v';
    } else {
      half.rotation.y = Math.PI / 2;
      half.position.set(x + i * 30, wallCenterY, z);
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

 function createTile(color, lateral) {
  const tileSize = 60;
  // const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
  const tileGeometry = new THREE.BoxGeometry( 60, 60, 10 );

  const tileMaterial = new THREE.MeshStandardMaterial({
    map: asphaltTexture.clone(),
    color: color || 0xffffff,
    roughness: 0.8,
    metalness: 0.2
  });

  if (tileMaterial.map) {
    tileMaterial.map.wrapS = tileMaterial.map.wrapT = THREE.RepeatWrapping;
    tileMaterial.map.repeat.set(1, 1);
  }
  const tile = new THREE.Mesh(tileGeometry, tileMaterial);
  tile.rotation.x = -Math.PI / 2;
  tile.position.y = floorYAxis;
  
  // Criar lateral se parametro foi fornecido
  if (lateral) {
    const lateralGeometry = new THREE.BoxGeometry(65, 65, 8);
    let lateralTexture;
    
    // Selecionar textura baseada no parâmetro
    if (lateral === 'lateral1') lateralTexture = lateral1Texture;
    else if (lateral === 'lateral2') lateralTexture = lateral2Texture;
    else if (lateral === 'lateral3') lateralTexture = lateral3Texture;
    else lateralTexture = lateral1Texture; // padrão
    
    const lateralMaterial = new THREE.MeshStandardMaterial({
      map: lateralTexture,
      roughness: 0.8,
      metalness: 0.2
    });
    
    const lateralMesh = new THREE.Mesh(lateralGeometry, lateralMaterial);
    tile.add(lateralMesh);
  }
  
  return tile;
}

function createCheckPointTile(orientation) {
  const checkPointGeometry = new THREE.BoxGeometry(60, 2, 10);
  const checkPointGroup = new THREE.Group();
  const base = new THREE.Mesh(checkPointGeometry, checkpointMaterial);
  checkPointGroup.add(base);

  const stripeMaterial = new THREE.MeshStandardMaterial({
    color: "#ff3b6a",
    emissive: "#ff3b6a",
    emissiveIntensity: 3.0,
    roughness: 0.4,
    metalness: 0.2
  });
  const stripeGeometry = new THREE.BoxGeometry(60, 0.6, 2);
  const stripe1 = new THREE.Mesh(stripeGeometry, stripeMaterial);
  const stripe2 = new THREE.Mesh(stripeGeometry, stripeMaterial);
  stripe1.position.set(0, 1.3, -2.5);
  stripe2.position.set(0, 1.3, 2.5);
  checkPointGroup.add(stripe1, stripe2);

  if (orientation === 'v') {
    checkPointGroup.rotation.z = Math.PI / 2;
  }
  checkPointGroup.rotation.x = -Math.PI / 2;
  return checkPointGroup;
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
      tileLower = createTile(undefined, 'lateral1');
      let startLineGeometry = new THREE.BoxGeometry(20, 60,10);
      let startLineMaterial = finishLineMaterialLong;
      let startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
      startLine.rotation.x = -Math.PI / 2;
      startLine.position.set(-210 + i * floorWidth, floorYAxis + 0.02, 270);
      group.add(startLine);
    } else {
      tileLower = createTile(undefined, 'lateral1');
    }
    let tileUpper = createTile(undefined, 'lateral1');
    tileUpper.position.set(-210 + i * floorWidth, floorYAxis, -270);
    tileLower.position.set(-210 + i * floorWidth, floorYAxis, 270);
    group.add(tileUpper, tileLower);
    addTileAABB(tileUpper, tilesAABBs);
    addTileAABB(tileLower, tilesAABBs);
  }

  for (let i = 0; i < 10; i++) {
    let tileLeft = createTile(undefined, 'lateral1');
    let tileRight = createTile(undefined, 'lateral1');
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

  tunnel.rotation.x = -Math.PI / 2;
  tunnel.position.set(-269, 4, 0);
  group.add(tunnel);

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
  
 for (let i = 0; i < 9; i++) {
    let tileLower;
    if (i == 5) {
      tileLower = createTile(undefined, 'lateral2');
      let startLineGeometry = new THREE.BoxGeometry(20, 60, 10);
      let startLineMaterial = finishLineMaterialLong;
      let startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
      startLine.rotation.x = -Math.PI / 2;
      startLine.position.set(-210 + i * floorWidth, floorYAxis + 0.02, 270);
      group.add(startLine);
    } else {
      tileLower = createTile(undefined, 'lateral2');
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
      tileUnderWater = createTile(undefined, 'lateral2');
      tileUnderWater.position.set(-270, -0.8, 270 - (i * (floorHeight)));
      tileLeft.position.set(-270, 5, 270 - (i * (floorHeight)));
      group.add(tileUnderWater);
      addWaterAABB(tileLeft, waterAABBs);
    }else{
    tileLeft = createTile(undefined, 'lateral2');
    tileLeft.position.set(-270, floorYAxis, 270 - (i * (floorHeight)));
    }
    group.add(tileLeft);
    addTileAABB(tileLeft, tilesAABBs);
  }

  for (let i = 0; i < 5; i++) {
    let tileUpperHalf = createTile(undefined, 'lateral2');
    let tileHalfRight = createTile(undefined, 'lateral2');
    tileHalfRight.position.set(270, floorYAxis, 210 - (i * (floorHeight)));
    tileUpperHalf.position.set(-210 + i * floorWidth, floorYAxis, -270);
    group.add(tileUpperHalf,tileHalfRight);
    addTileAABB(tileUpperHalf, tilesAABBs);
    addTileAABB(tileHalfRight, tilesAABBs);
  }

  for (let i = 0; i < 4; i++) {
    let tileHalfLeft = createTile(undefined, 'lateral2');
    tileHalfLeft.position.set(30, floorYAxis, -210 + (i * (floorHeight)));
    if(i < 3){
      let tileHalfLower = createTile(undefined, 'lateral2');
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
    let wall1 = createWall(-285 + i * 60, 0, 299,'h', 'herring');
    let wall2 = createWall(-299, 10, 255 - i * 60, 'v', 'herring');
    group.add(wall1, wall2);
    addWallAABB(wall1,wallAABBs);
    addWallAABB(wall2,wallAABBs);
  }
  for(let i = 0; i < 6; i++){
    let wall1 = createWall(300, 0, 255 - i * 60, 'v', 'herring');
    let wall2 = createWall(-285 + i * 60, 0, -300, 'h', 'herring');
    group.add(wall1,wall2);
    addWallAABB(wall1,wallAABBs);
    addWallAABB(wall2,wallAABBs);
  }
  for(let i = 0; i < 4; i++){
    let wall1 = createWall(76 + i * 60, 0, -61,'h', 'herring');
    let wall2 = createWall(60, 0, -285 + i * 60, 'v', 'herring');
    group.add(wall1, wall2);
    addWallAABB(wall1,wallAABBs);
    addWallAABB(wall2,wallAABBs);
  }

  //Paredes Internas
  for(let i = 0; i < 8; i++){
    let wall1 = createWall(-225 + i * 60, 0, 239,'h', 'herring');
    let wall2 = createWall(-239, 0, 195 - i * 60, 'v', 'herring');
    group.add(wall1, wall2);
    addWallAABB(wall1, wallAABBs);
    addWallAABB(wall2, wallAABBs);    
  }
  for(let i = 0; i < 4; i++){
    let wall1 = createWall(15 + i * 60, 0, 0,'h', 'herring');
    let wall2 = createWall(239, 0, 15 + i * 60, 'v', 'herring');
    let wall3 = createWall(-224 + i * 60, 0, -239,'h', 'herring');
    let wall4 = createWall(0, 0, -224 + i * 60, 'v', 'herring');
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

    for(let i=0; i<14; i++){
        if(i <= 8 || i >= 12){
        let tileMiddle = createTile(undefined, 'lateral3');
        tileMiddle.position.set(30, floorYAxis, 390 - i * floorHeight);
        group.add(tileMiddle);
        addTileAABB(tileMiddle, tilesAABBs);
        }

        if(i == 7){
          let jumpPadGeometry = new THREE.BoxGeometry(30,10,5)
          let jumpPadMaterial = setDefaultMaterial("pink")
          let jumpPad = new THREE.Mesh(jumpPadGeometry, jumpPadMaterial)
          jumpPad.position.set(30, 0.2 , -121)
          group.add(jumpPad)
          addJumpPad(jumpPad, jumpPads)
        }

        if(i<7){
          let tileLeftUpper = createTile(undefined, 'lateral3');
          let tileLeftLower = createTile(undefined, 'lateral3');
          let tileRightUpper = createTile(undefined, 'lateral3');
          let tileRightLower = createTile(undefined, 'lateral3');
          
          tileLeftUpper.position.set(-390 + i * floorHeight, floorYAxis, -390);
          tileLeftLower.position.set(-390 + i * floorHeight, floorYAxis, 30);
          tileRightUpper.position.set(30 + i * floorHeight, floorYAxis, 30);
          if(i==4){
            tileRightLower = createTile(undefined, 'lateral3');
            let startLineGeometry = new THREE.BoxGeometry(20, 10, 60);
            let startLineMaterial = finishLineMaterialLong;
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
          let tileLeftUpper = createTile(undefined, 'lateral3');
          let tileRightLower = createTile(undefined, 'lateral3');
          tileLeftUpper.position.set(-390, floorYAxis, -30 - i * floorHeight);
          tileRightLower.position.set(390, floorYAxis, 30 + i * floorHeight);
          group.add(tileLeftUpper, tileRightLower);
          addTileAABB(tileLeftUpper, tilesAABBs)
          addTileAABB(tileRightLower, tilesAABBs)
        }

    }

    // Paredes Externas
    for(let i=0; i<8; i++){
        let wallLeft = createWall(-419, 0, -405 + i * floorHeight, 'v', 'plaster');
        let wallLeftUpper = createWall(-405 + i * floorHeight, 0, -419, 'h', 'plaster');
        group.add(wallLeft,wallLeftUpper);
        addWallAABB(wallLeft, wallAABBs);
        addWallAABB(wallLeftUpper, wallAABBs);
    }

    for(let i=0; i<7; i++){
        let wallUpperRight = createWall(61, 0, -45 - i * floorHeight, 'v', 'plaster');
        let wallUpperLeft = createWall(-405 + i * floorHeight, 0, 61, 'h', 'plaster');
        let wallLowerRight = createWall(15 + i * floorHeight, 0, 420, 'h', 'plaster');
        let wallLowerRight2 = createWall(419, 0, 375 - i * floorHeight, 'v', 'plaster');
        group.add(wallUpperRight, wallUpperLeft, wallLowerRight,wallLowerRight2);
        addWallAABB(wallUpperRight, wallAABBs);
        addWallAABB(wallUpperLeft, wallAABBs);
        addWallAABB(wallLowerRight, wallAABBs);
        addWallAABB(wallLowerRight2, wallAABBs);
    }

    for(let i=0; i<6; i++){
      let wallLowerLeft = createWall(1, 0, 375 - i * floorHeight, 'v', 'plaster');
      let wallLowerUpper = createWall(75 + i * floorHeight, 0, -1, 'h', 'plaster');
      group.add(wallLowerLeft, wallLowerUpper);
      addWallAABB(wallLowerLeft, wallAABBs);
      addWallAABB(wallLowerUpper, wallAABBs);
    }

    // Paredes Internas
    for(let i = 0; i<5; i++){
      let wallLowerDown = createWall(75 + i * floorHeight, 0, 360, 'h', 'plaster');
      let wallLowerUp = createWall(75 + i * floorHeight, 0, 61, 'h', 'plaster');
      let wallLowerLeft = createWall(61, 0, 75 + i * floorHeight, 'v', 'plaster');
      let wallLowerRight = createWall(360, 0, 75 + i * floorHeight, 'v', 'plaster');
      group.add(wallLowerDown, wallLowerUp,wallLowerLeft, wallLowerRight);
      addWallAABB(wallLowerDown, wallAABBs);
      addWallAABB(wallLowerUp, wallAABBs);
      addWallAABB(wallLowerLeft, wallAABBs);
      addWallAABB(wallLowerRight, wallAABBs);
    }
    
    for(let i = 0; i<6; i++){
      let wallUpperLeft = createWall(-360, 0, -345 + i * floorHeight, 'v', 'plaster');
      let wallUpperRight = createWall(-1, 0, -345 + i * floorHeight, 'v', 'plaster');
      let wallUpperDown = createWall(-346 + i * floorHeight, 0, -359, 'h', 'plaster');
      let wallUpperUp = createWall(-345 + i * floorHeight, 0, -1, 'h', 'plaster');
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
  tunnel.rotation.x = -Math.PI / 2;
  tunnel.position.set(30, 4, 220);
  group.add(tunnel);

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
  mesh1.material = new THREE.MeshPhongMaterial({map: tunnelTexture, side: THREE.DoubleSide});
  mesh1.position.set(0, 0, 0);
  let cylinder = mesh1;


  return cylinder;
}

function createLowPolyTree(type = 1, options = {}) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({
    map: barkTexture,
    color: options.trunkColor || "#6b3e1b",
    roughness: 0.9,
    metalness: 0.0
  });
  const foliageMat1 = new THREE.MeshStandardMaterial({
    map: foliageTexture,
    color: options.foliageColor || "#2f8b2f",
    roughness: 0.8,
    metalness: 0.0
  });
  const foliageMat2 = new THREE.MeshStandardMaterial({
    map: foliageTexture,
    color: options.foliageColor2 || "#2f8b2f",
    roughness: 0.8,
    metalness: 0.0
  });

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