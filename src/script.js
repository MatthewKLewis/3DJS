import './style.css'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { Vector3 } from 'three';

const canvas = document.querySelector('canvas.webgl')
const stats = document.querySelector('#stats')
const popup = document.querySelector('#popup')
const inventory = document.querySelector('#inventory')
const icon = document.querySelector('#icon')
const comms = document.querySelector('#comms')
const healthAmmo = document.querySelector('#health-ammo')
const youDied = document.querySelector('#you-died')

const scene = new THREE.Scene()

//global array instantiations
let monsters = []
let sprites = []
let powerups = []
var chunksMade = new Map();

//#region [rgba(0, 126, 255, 0.15) ] PURE UTILITY
/*  
* This section has NPC and STORY info
*/
function randBetween(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

//#endregion

// ----------------------------SET-------------------------------- //

//#region [rgba(255, 25, 25, 0.15) ] STORY
/*  
* This section has NPC and STORY info
*/
const NAMES = ["Adam", "Alex", "Aaron", "Ben", "Carl", "Dan", "David", "Edward", "Fred", "Frank", "George", "Hal", "Hank", "Ike", "John", "Jack", "Joe",
    "Larry", "Monte", "Matthew", "Mark", "Nathan", "Otto", "Paul", "Peter", "Roger", "Roger", "Steve", "Thomas", "Tim", "Ty", "Victor", "Walter", "Zeke"]

//105 syllables, 5460 combinations at 2 sylls, 187,460 at 3 sylls, 4,780,230 at 4 sylls.
var SYLLABLES = []
const VOWELS = "aeiou".split('')
const CONSONANTS = "bcdfghjklmnpqrstvwxyz".split('')
for (let i = 0; i < CONSONANTS.length; i++) {
    for (let j = 0; j < VOWELS.length; j++) {
        SYLLABLES.push(CONSONANTS[i] + VOWELS[j])
    }
}
function getAbjadWord(syllables) {
    var tempString = ""
    for (let i = 0; i < syllables; i++) {
        tempString += SYLLABLES[Math.floor((Math.random() * SYLLABLES.length) + 1)]
    }
    return tempString;
}
function getName() {
    return NAMES[Math.floor((Math.random() * NAMES.length) + 1)];
}
const story = [
    "You'll be able to carry yourself through ego death.",
    "Sounds contradictory? It's not really a well named concept.",
    "Pass through the dark eye at the center of the universe...",
    "Give birth to yourself from the inky blackness and be torn apart by the light.",
    "Feel the membrane on the periphery of the experience. We're not sure what it is except to say, it's you."
]
//#endregion

//#region [rgba(25, 255, 25, 0.15) ] MATERIALS
/*  
* This section sets up a map for basic color materials, as well as a few textured materials.
*/
const loader = new THREE.TextureLoader();
loader.crossOrigin = '';

//Basic Color Materials
const mRed = new THREE.MeshBasicMaterial({ color: new THREE.Color('red') })
const mBlue = new THREE.MeshBasicMaterial({ color: new THREE.Color('lightblue') })
const mGrey = new THREE.MeshBasicMaterial({ color: new THREE.Color('darkgrey') })

//Textured Materials
var waterMap = loader.load('assets/images/water2.png')
var cobbleMap = loader.load('assets/images/tile2.png')
waterMap.magFilter = THREE.NearestFilter;
cobbleMap.magFilter = THREE.NearestFilter;
const mWater = new THREE.MeshBasicMaterial({ map: waterMap });
const mCobble = new THREE.MeshBasicMaterial({ map: cobbleMap });

//Monster Sprites
let monsterSpriteMaterials = new Map()
let monsterSpriteURLS = ['monster']
for (let i = 0; i < monsterSpriteURLS.length; i++) {
    var tempMap = new THREE.TextureLoader().load(`assets/images/${monsterSpriteURLS[i]}.png`);
    tempMap.magFilter = THREE.NearestFilter;
    tempMap.minFilter = THREE.LinearMipMapLinearFilter;
    tempMap.scale = 0.5
    var tempMat = new THREE.SpriteMaterial({ map: tempMap });
    monsterSpriteMaterials.set(monsterSpriteURLS[i], tempMat);
}

//Powerup Sprites
let powerupSpriteMaterials = new Map()
let powerupSpriteURLS = ['ammo']
for (let i = 0; i < powerupSpriteURLS.length; i++) {
    var tempMap = new THREE.TextureLoader().load(`assets/images/${powerupSpriteURLS[i]}.png`);
    tempMap.magFilter = THREE.NearestFilter;
    tempMap.minFilter = THREE.LinearMipMapLinearFilter;
    var tempMat = new THREE.SpriteMaterial({ map: tempMap });
    powerupSpriteMaterials.set(powerupSpriteURLS[i], tempMat);
}

//Effect Sprites
let effectSpriteMaterials = new Map()
let effectSpriteURLS = ['blood1']
for (let i = 0; i < effectSpriteURLS.length; i++) {
    var tempMap = new THREE.TextureLoader().load(`assets/images/${effectSpriteURLS[i]}.png`);
    tempMap.magFilter = THREE.NearestFilter;
    tempMap.minFilter = THREE.LinearMipMapLinearFilter;
    var tempMat = new THREE.SpriteMaterial({ map: tempMap });
    effectSpriteMaterials.set(effectSpriteURLS[i], tempMat);
}

//#endregion

//#region [rgba(128, 25, 25, 0.15) ] SCENERY
/*  
* This section sets up the objects to display in the scene.
*/
const objLoader = new OBJLoader();
const gltfLoader = new GLTFLoader();
let CHUNK_SIDE_LENGTH = 10;
class Chunk {
    constructor(x, z, tileArray) {
        this.x = x
        this.z = z
        this.tileArray = tileArray
        this.name = getAbjadWord(4);
    }
}
class Tile {
    constructor(x, z, y, i, type, xChunk, zChunk) {
        this.index = i
        this.xChunk = xChunk
        this.zChunk = zChunk
        this.flavor = type;
        if (type == 'ground') {
            this.geometry = new THREE.BoxBufferGeometry(1, 1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mCobble)
        } else if (type == 'water') {
            this.geometry = new THREE.BoxBufferGeometry(1, 1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mWater)
            this.mesh.flavor = type;
        } else if (type == 'land') {
            this.geometry = new THREE.BoxBufferGeometry(1, 1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mGrey)
            this.mesh.flavor = type;
        } else if (type == 'sea') {
            this.geometry = new THREE.BoxBufferGeometry(1, 1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mBlue)
            this.mesh.flavor = type;
        }
        this.mesh.position.x = x;
        this.mesh.position.z = z;
        this.mesh.position.y = y;
    }
}
function generateFloorChunkIndex() {
    var tempIndex = []
    for (let i = 0; i < (CHUNK_SIDE_LENGTH * CHUNK_SIDE_LENGTH); i++) {
        tempIndex.push(randBetween(1, 4))
    }
    tempIndex.reverse()
    return tempIndex;
}
function addChunk(xChunk, zChunk) {
    var xNewChunkOrigin = xChunk * CHUNK_SIDE_LENGTH;
    var zNewChunkOrigin = zChunk * CHUNK_SIDE_LENGTH;
    //LOAD TILED CHUNK
    if (chunksMade.get(`${xChunk},${zChunk}`)) {
        var existingTileArray = chunksMade.get(`${xChunk},${zChunk}`).tileArray || []
        for (let i = 0; i < existingTileArray.length; i++) {
            scene.add(existingTileArray[i].mesh)
        }
    } else {
        var floorIndex = generateFloorChunkIndex();
        var floorGameObjectArray = []
        for (let i = 0; i < floorIndex.length; i++) {
            switch (floorIndex[i]) {
                case 1:
                    var tempFloorTile = new Tile((i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin, 0, i, 'water', 0, 0)
                    floorGameObjectArray.push(tempFloorTile);
                    scene.add(tempFloorTile.mesh)
                    break;
                case 2:
                    var tempFloorTile = new Tile((i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin, 0, i, 'ground', 0, 0)
                    floorGameObjectArray.push(tempFloorTile);
                    scene.add(tempFloorTile.mesh)
                    break;
                case 3:
                    var tempFloorTile = new Tile((i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin, 0, i, 'land', 0, 0)
                    floorGameObjectArray.push(tempFloorTile);
                    scene.add(tempFloorTile.mesh)
                    break;
                case 4:
                    var tempFloorTile = new Tile((i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin, 0, i, 'sea', 0, 0)
                    floorGameObjectArray.push(tempFloorTile);
                    scene.add(tempFloorTile.mesh)
                    break;
                default:
                    var tempFloorTile = new Tile((i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin, .1, i, 'ground', 0, 0)
                    floorGameObjectArray.push(tempFloorTile);
                    scene.add(tempFloorTile.mesh)
                    break;
            }
        }
        chunksMade.set(`${xChunk},${zChunk}`, new Chunk(xChunk, zChunk, floorGameObjectArray));
    }
}
function removeChunk(xChunk, zChunk) {
    var chunkToDelete = chunksMade.get(`${xChunk},${zChunk}`);
    for (let i = 0; i < chunkToDelete.tileArray.length; i++) {
        scene.remove(chunkToDelete.tileArray[i].mesh);
    }
}
function addAndRemoveNeighborChunks(xChunk, zChunk, lastXChunk, lastZChunk) {
    var xDif = xChunk - lastXChunk;
    var zDif = zChunk - lastZChunk;

    try {
        //5 to make, 5 to remove
        if (xDif == 1 && zDif == 1) {
            addChunk(xChunk, zChunk + 1)
            addChunk(xChunk + 1, zChunk)
            addChunk(xChunk + 1, zChunk + 1)
            addChunk(xChunk - 1, zChunk + 1)
            addChunk(xChunk + 1, zChunk - 1)
            removeChunk(xChunk - 2, zChunk - 2)
            removeChunk(xChunk - 2, zChunk - 1)
            removeChunk(xChunk - 1, zChunk - 2)
            removeChunk(xChunk, zChunk - 2)
            removeChunk(xChunk - 2, zChunk)
            console.log('diag up left! done!');
        } else if (xDif == 1 && zDif == -1) {
            console.log('diag down left!');
            return;
        } else if (xDif == -1 && zDif == 1) {
            console.log('diag up right!');
            return;
        } else if (xDif == -1 && zDif == -1) {
            addChunk(xChunk - 1, zChunk)
            addChunk(xChunk, zChunk - 1)
            addChunk(xChunk - 1, zChunk - 1)
            addChunk(xChunk + 1, zChunk - 1)
            addChunk(xChunk - 1, zChunk + 1)
            removeChunk(xChunk + 2, zChunk + 2)
            removeChunk(xChunk + 2, zChunk + 1)
            removeChunk(xChunk + 1, zChunk + 2)
            removeChunk(xChunk, zChunk + 2)
            removeChunk(xChunk + 2, zChunk)
            console.log('diag down right!');
        } //3 to make, 3 to remove
        else if (xDif == 1 && zDif == 0) {
            addChunk(xChunk + 1, zChunk)
            addChunk(xChunk + 1, zChunk - 1)
            addChunk(xChunk + 1, zChunk + 1)
            removeChunk(xChunk - 2, zChunk)
            removeChunk(xChunk - 2, zChunk - 1)
            removeChunk(xChunk - 2, zChunk + 1)
        } else if (xDif == -1 && zDif == 0) {
            addChunk(xChunk - 1, zChunk)
            addChunk(xChunk - 1, zChunk - 1)
            addChunk(xChunk - 1, zChunk + 1)
            removeChunk(xChunk + 2, zChunk)
            removeChunk(xChunk + 2, zChunk - 1)
            removeChunk(xChunk + 2, zChunk + 1)
        } else if (zDif == 1 && xDif == 0) {
            addChunk(xChunk, zChunk + 1)
            addChunk(xChunk - 1, zChunk + 1)
            addChunk(xChunk + 1, zChunk + 1)
            removeChunk(xChunk, zChunk - 2)
            removeChunk(xChunk - 1, zChunk - 2)
            removeChunk(xChunk + 1, zChunk - 2)
        } else if (zDif == -1 && xDif == 0) {
            addChunk(xChunk, zChunk - 1)
            addChunk(xChunk - 1, zChunk - 1)
            addChunk(xChunk + 1, zChunk - 1)
            removeChunk(xChunk, zChunk + 2)
            removeChunk(xChunk - 1, zChunk + 2)
            removeChunk(xChunk + 1, zChunk + 2)
        }
    }
    catch {
        alert('improper chunk generation')
    }
}
// Add the starting 9 chunks
for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
        addChunk(i, j)
    }
}

//Add Fog
let fog = new THREE.FogExp2(0x6699cc, 0.1)
scene.fog = fog;
scene.background = new THREE.Color(0x6699cc)

//#endregion

//#region [rgba(128, 40, 255, 0.15) ] AUDIO
/*  
* This section sets up audios to play
*/

const gunshot = new Audio('./assets/audios/gunshot_short.mp3')
const gunclick = new Audio('./assets/audios/gunclick.mp3')
const bkgMusic = new Audio('./assets/audios/Flossed In Paradise - In The No.mp3')
gunshot.volume = 0.25;
gunclick.volume = 0.25;
bkgMusic.volume = 0.1;

//#endregion

// ----------------------------MVC-------------------------------- //

//#region [rgba(25, 25, 128, 0.15) ] CONTROLS (CONTROLLER)
/*  
* This section sets up the controls.
*/
// Camera Built-in Properties
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
var width = 10;
var height = 10;
//const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
const camera = new THREE.OrthographicCamera(width / - 2, width / 2, height / 2, height / - 2, 0, 100);
camera.offsetX = -2;
camera.offsetY = 3;
camera.offsetZ = -2;
camera.lookAt(0, 0, 0)
scene.add(camera)
camera.geo = new THREE.BoxBufferGeometry(0.4, 0.4, 0.6)
camera.sprite = new THREE.Sprite(monsterSpriteMaterials.get('monster'))
camera.sprite.scale.set(.5, 1, .5)
camera.sprite.lookAt(camera.position)
camera.sprite.position.x = 0;
camera.sprite.position.y = 1;
camera.sprite.position.z = 0;
scene.add(camera.sprite)
camera.health = 100;
camera.target = { x: 0, z: 0 }
camera.canMove = true;
camera.speed = 0.08;
camera.lastChunkKey = [0, 0];
camera.currentChunkKey = [0, 0];
camera.currentChunk = chunksMade.get(`0,0`)
camera.currentIndex = 0
camera.currentTile = 'Unknown'

// Raycaster
const rayCaster = new THREE.Raycaster();
const mousePosition = new THREE.Vector2();

window.addEventListener('keypress', (e) => {
    if (e.key == 'e') {
        console.log('e')
    } else if (e.key == 'i') {
        if (inventory.className == 'inventory') {
            inventory.className = 'hidden'
        } else {
            inventory.className = 'inventory'
        }
    }
})
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})
canvas.addEventListener('click', (e) => {
    mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = - (e.clientY / window.innerHeight) * 2 + 1;
    rayCaster.setFromCamera(mousePosition, camera)
    var objs = rayCaster.intersectObjects(scene.children)
    if (objs.length > 0) {
        //console.log(objs[0].object)
        camera.target = { x: objs[0].object.position.x, z: objs[0].object.position.z }
    }
})

// This is a pseudo-Model class, in that it is called every frame.
function acceptPlayerInputs() {

    let tileOffsetX = 0.5
    let tileOffsetZ = 0.5
    camera.currentChunkKey = [Math.floor((camera.sprite.position.x + 0.5) / CHUNK_SIDE_LENGTH), Math.floor((camera.sprite.position.z + 0.5) / CHUNK_SIDE_LENGTH)]
    camera.currentChunk = chunksMade.get(`${camera.currentChunkKey[0]},${camera.currentChunkKey[1]}`)

    if (camera.currentChunkKey[0] != camera.lastChunkKey[0] || camera.currentChunkKey[1] != camera.lastChunkKey[1]) {
        addAndRemoveNeighborChunks(camera.currentChunkKey[0], camera.currentChunkKey[1], camera.lastChunkKey[0], camera.lastChunkKey[1])
    }

    var index = (Math.floor(camera.sprite.position.x + tileOffsetX) % 10) + ((Math.floor(camera.sprite.position.z + tileOffsetZ) * 10) % 100)
    if (index < 0) { index = 100 - Math.abs(index) }
    camera.currentIndex = index;
    camera.currentTile = camera.currentChunk.tileArray[camera.currentIndex];

    if (camera.health <= 0) {
        camera.canMove = false;
        canvas.classList.add('dead')
        youDied.classList.add('died')
    } else {
        if (camera.sprite.position.x > camera.target.x - camera.speed / 2
            && camera.sprite.position.x < camera.target.x + camera.speed / 2
            && camera.sprite.position.z > camera.target.z - camera.speed / 2
            && camera.sprite.position.z < camera.target.z + camera.speed / 2) {
            camera.sprite.position.z = camera.target.z;
            camera.sprite.position.x = camera.target.x;
        } else {
            if (camera.sprite.position.x < camera.target.x) {
                camera.sprite.position.x += camera.speed
            }
            if (camera.sprite.position.x > camera.target.x) {
                camera.sprite.position.x -= camera.speed
            }
            if (camera.sprite.position.z < camera.target.z) {
                camera.sprite.position.z += camera.speed
            }
            if (camera.sprite.position.z > camera.target.z) {
                camera.sprite.position.z -= camera.speed
            }
        }
    }
    camera.position.x = camera.sprite.position.x + camera.offsetX;
    camera.position.y = camera.sprite.position.y + camera.offsetY;
    camera.position.z = camera.sprite.position.z + camera.offsetZ;
    camera.lookAt(camera.sprite.position)
    camera.lastChunkKey = camera.currentChunkKey;
}
//#endregion

//#region [rgba(128, 25, 128, 0.15) ] GAME OBJECTS
/*  
* This section sets up the camera and player.
*/
function createButton(x, y, z, callback) {
    var buttonGeo = new THREE.BoxBufferGeometry(.2, .2, .2)
    var buttonMesh = new THREE.Mesh(buttonGeo, mRed)
    buttonMesh.position.x = x
    buttonMesh.position.y = y
    buttonMesh.position.z = z
    buttonMesh.callback = callback;
    buttonMesh.flavor = "button"
    return buttonMesh;
}
function createCreatureSprite(name, x, y, z) {
    var tempSprite = new THREE.Sprite(monsterSpriteMaterials.get(name));
    tempSprite.rayCaster = new THREE.Raycaster(new Vector3(x, y, z), new Vector3(x, y, z - 1));
    tempSprite.rayCaster.camera = new THREE.PerspectiveCamera();
    tempSprite.position.x = x;
    tempSprite.position.y = y;
    tempSprite.position.z = z;
    tempSprite.scale.set(1.2, 1.2)
    tempSprite.name = getName()
    tempSprite.health = 20
    tempSprite.status = "idle"
    return tempSprite;
}
function createPowerupSprite(name, x, y, z) {
    var tempSprite = new THREE.Sprite(powerupSpriteMaterials.get(name));
    tempSprite.position.x = x;
    tempSprite.position.y = y;
    tempSprite.position.z = z;
    tempSprite.scale.set(.5, .5)
    return tempSprite;
}
function createEffectSprite(name, x, y, z) {
    var tempSprite = new THREE.Sprite(effectSpriteMaterials.get(name));
    var tempSprite = new THREE.Sprite(tempMat);
    tempSprite.position.x = x;
    tempSprite.position.y = y;
    tempSprite.position.z = z;
    tempSprite.timer = 0
    tempSprite.lifeSpan = 20
    return tempSprite;
}

function worldMoves() {
    //monster decisions
    if (Math.random() > .95) {
        for (let i = 0; i < monsters.length; i++) {
            var randomChoice = randBetween(1, 5)
            switch (randomChoice) {
                case 1:
                    monsters[i].status = "move forward"
                    break;
                case 2:
                    monsters[i].status = "move backward"
                    break;
                case 3:
                    monsters[i].status = "move left"
                    break;
                case 4:
                    monsters[i].status = "move right"
                    break;
                case 5:
                    monsters[i].status = "idle"
                    break;
            }
        }
    }
    //monster actions
    for (let i = 0; i < monsters.length; i++) {
        if (monsters[i].health <= 0) {
            scene.remove(monsters[i])
            monsters.splice(i, 1);
        }

        if (monsters[i].status == 'idle') {
            if (monsters[i].position.distanceTo(camera.position) < 8 && Math.random() > .95) {
                //console.log('ATTACK FROM ' + monsters[i].name)
            }
        } else if (monsters[i].status == 'move forward') {
            monsters[i].position.z += .01;
        } else if (monsters[i].status == 'move backward') {
            monsters[i].position.z -= .01;
        } else if (monsters[i].status == 'move left') {
            monsters[i].position.x += .01;
        } else if (monsters[i].status == 'move right') {
            monsters[i].position.x -= .01;
        }
    }
    for (let i = 0; i < sprites.length; i++) {
        sprites[i].timer++;
        if (sprites[i].timer == sprites[i].lifeSpan) {
            scene.remove(sprites[i])
            sprites.splice(i, 1);
        }
    }
}
//#endregion

//#region [rgba(25, 128, 128, 0.15) ] RENDERER (VIEW)
/*  
* This section sets up rendering.
*/
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
//renderer.outputEncoding = THREE.sRGBEncoding;

const renderPass = new RenderPass(scene, camera)
const composer = new EffectComposer(renderer)
composer.addPass(renderPass)

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
function generateHUDText(elapsedTime) {
    // //STATS
    stats.innerText = "FPS: " + (1 / (elapsedTime - timeOfLastFrame)).toFixed(0) + "\n"
    stats.innerText += "Position: " + camera.sprite.position.x.toFixed(2) + " " + camera.sprite.position.z.toFixed(2) + "\n"
    stats.innerText += "Index: " + camera.currentIndex + "\n"
    stats.innerText += "Target Coords: " + camera.target.x + " " + camera.target.z + "\n"
    if (camera.currentTile) {
        stats.innerText += "Current Tile Flavor: " + camera.currentTile.flavor + "\n"
        stats.innerText += "Current Chunk Index: " + camera.currentChunkKey[0] + " " + camera.currentChunkKey[1] + "\n"
    }
}

function generateCommsText() {

}
//#endregion

//#region [rgba(128, 128, 128, 0.15) ] GAME LOOP
/*  
* This section sets off the game loop.
*/
const clock = new THREE.Clock()
var timeOfLastFrame = 0
const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    //CONTROLLER
    acceptPlayerInputs();

    //MODEL
    worldMoves();

    //VIEW
    composer.render(scene, camera)

    //Call tick again after this
    window.requestAnimationFrame(tick)

    // //Generate Overlay
    generateHUDText(elapsedTime);
    generateCommsText();

    //This will be a number of milliseconds slower than elapsed time at the beginning of next frame.
    timeOfLastFrame = elapsedTime
}
tick()
//#endregion