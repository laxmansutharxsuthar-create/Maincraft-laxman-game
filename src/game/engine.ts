/**
 * Master 3D Game Engine - Scene, Renderer, Day/Night Cycle, Physics, Interactions
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { WorldManager, WATER_LEVEL } from './world';
import { PlayerController } from './player';
import { MobManager } from './mobs';
import { ParticleManager } from './particles';
import { TextureManager } from './textures';
import { AudioManager } from './audio';
import { InventoryManager } from './crafting';
import { BlockType, GameMode, ItemType } from './types';
import { BLOCK_DEFS } from './blocks';
import { StorageManager, GameSaveData } from './storage';

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public world: WorldManager;
  public player: PlayerController;
  public mobs: MobManager;
  public particles: ParticleManager;
  public inventory: InventoryManager;
  public audio: AudioManager;
  public isRunning = false;
  public isPaused = false;

  // Day & Night Cycle
  public timeOfDay = 0.25; // 0.0: midnight, 0.25: sunrise/morning, 0.5: noon, 0.75: sunset
  public dayDuration = 240; // 4 minutes full cycle
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private cloudsMesh: THREE.Mesh;

  // Targeting & Mining
  public targetedBlock: {
    blockX: number;
    blockY: number;
    blockZ: number;
    faceNormal: [number, number, number];
    blockType: BlockType;
  } | null = null;

  public targetedMobId: string | null = null;

  private highlightBox: THREE.LineSegments;
  private crackMesh: THREE.Mesh;
  private miningProgress = 0; // 0.0 to 1.0
  private isMiningHeld = false;
  private lastMiningBlock: string | null = null;

  // Input states
  public moveInput = { x: 0, y: 0 };
  public actions = { jump: false, sprint: false, crouch: false, flyToggle: false };
  public mouseLook = { dx: 0, dy: 0 };
  public mouseSensitivity = 0.0022;

  // Frame timing
  private clock = new THREE.Clock();
  private animFrameId: number | null = null;
  private isSoftwareGl = false;

  // Listeners
  public onStateChange?: () => void;

  constructor(container: HTMLDivElement) {
    this.scene = new THREE.Scene();
    this.audio = AudioManager.getInstance();
    this.inventory = new InventoryManager();

    // Check Software WebGL guard as per guidelines
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    container.appendChild(this.renderer.domElement);

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 400);

    // Subsystems
    this.world = new WorldManager(this.scene);
    this.player = new PlayerController(this.camera, this.world);
    this.mobs = new MobManager(this.scene, this.world);
    this.particles = new ParticleManager(this.scene);

    // Procedural Environment & Lighting
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d3023, 0.6);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    this.dirLight.castShadow = !this.isSoftwareGl;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 80;
    this.dirLight.shadow.camera.left = -25;
    this.dirLight.shadow.camera.right = 25;
    this.dirLight.shadow.camera.top = 25;
    this.dirLight.shadow.camera.bottom = -25;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Sun & Moon procedural meshes
    const sunGeo = new THREE.BoxGeometry(6, 6, 2);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff9a6 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    const moonGeo = new THREE.BoxGeometry(4, 4, 2);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);

    // Procedural Voxel Clouds
    this.cloudsMesh = this.createClouds();
    this.scene.add(this.cloudsMesh);

    // Highlight wireframe box for targeted block
    const boxGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const edges = new THREE.EdgesGeometry(boxGeo);
    this.highlightBox = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
    );
    this.highlightBox.visible = false;
    this.scene.add(this.highlightBox);

    // Breaking Crack Overlay Mesh
    const tm = TextureManager.getInstance();
    const crackMat = new THREE.MeshBasicMaterial({
      map: tm.breakStages[0],
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.crackMesh = new THREE.Mesh(boxGeo, crackMat);
    this.crackMesh.visible = false;
    this.scene.add(this.crackMesh);

    // Try loading saved game
    const saved = StorageManager.loadGame();
    if (saved) {
      this.loadSavedState(saved);
    } else {
      this.world.updatePlayerChunks(this.player.position);
      this.mobs.spawnInitialMobs(this.player.position);
    }

    // Auto-save timer
    window.setInterval(() => {
      if (this.isRunning && !this.player.stats.isDead) {
        this.saveCurrentGame();
      }
    }, 30000);
  }

  // Create voxel clouds layer drifting at high altitude
  private createClouds(): THREE.Mesh {
    const cloudGeo = new THREE.BoxGeometry(220, 3, 220);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    clouds.position.y = 36;
    return clouds;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    this.audio.startMusic();
    this.tick();
  }

  public pause() {
    this.isPaused = true;
    if (this.onStateChange) this.onStateChange();
  }

  public resume() {
    this.isPaused = false;
    this.clock.start();
    if (this.onStateChange) this.onStateChange();
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Mouse camera look
  public addLookDelta(dx: number, dy: number) {
    this.player.rotation.y -= dx * this.mouseSensitivity;
    this.player.rotation.x -= dy * this.mouseSensitivity;
    // Clamp vertical look pitch between -89° and +89°
    this.player.rotation.x = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, this.player.rotation.x));
  }

  // Start mining / attacking
  public setMiningHeld(isHeld: boolean) {
    this.isMiningHeld = isHeld;
    if (!isHeld) {
      this.miningProgress = 0;
      this.crackMesh.visible = false;
    }
  }

  // Break targeted block or attack mob
  public interactBreak() {
    this.player.swingArm();

    // Check if mob is targeted
    if (this.targetedMobId) {
      const selectedItem = this.inventory.getSelectedItem();
      let damage = 2; // bare fist
      if (selectedItem?.damage) damage = selectedItem.damage;

      const fwd = new THREE.Vector3(-Math.sin(this.player.rotation.y), 0, -Math.cos(this.player.rotation.y));
      const res = this.mobs.hitMob(this.targetedMobId, damage, fwd);
      if (res?.isDead && res.loot) {
        this.inventory.addItem({
          id: res.loot,
          name: res.loot.includes('meat') ? 'Raw Beef' : res.loot.includes('wool') ? 'Wool' : 'Item',
          count: 1,
          maxStack: 64,
          itemType: ItemType.FOOD,
          foodRestore: 4,
        });
        this.audio.playPickup();
      }
      return;
    }

    if (!this.targetedBlock) return;

    const { blockX, blockY, blockZ, blockType } = this.targetedBlock;
    if (blockType === BlockType.AIR || blockType === BlockType.BEDROCK) return;

    // Instant break in creative
    if (this.player.gameMode === 'creative') {
      this.breakCurrentBlock(blockX, blockY, blockZ, blockType);
    }
  }

  // Break block, emit particles, drop item to inventory
  private breakCurrentBlock(wx: number, wy: number, wz: number, type: BlockType) {
    const def = BLOCK_DEFS[type];
    this.world.setBlock(wx, wy, wz, BlockType.AIR);
    this.particles.emitBlockBreak(wx, wy, wz, type);
    this.audio.playBlockBreak(def.soundType);

    if (this.player.gameMode === 'survival' && def.dropType !== BlockType.AIR) {
      const dropDef = BLOCK_DEFS[def.dropType];
      this.inventory.addItem({
        id: 'block_' + def.dropType,
        blockType: def.dropType,
        name: dropDef.name,
        count: def.dropCount || 1,
        maxStack: 64,
        itemType: ItemType.BLOCK,
      });
      this.audio.playPickup();
    }

    this.miningProgress = 0;
    this.crackMesh.visible = false;
    this.targetedBlock = null;
    this.highlightBox.visible = false;
  }

  // Place active block or use food/tool
  public interactPlace() {
    this.player.swingArm();
    const selectedItem = this.inventory.getSelectedItem();
    if (!selectedItem) return;

    // Food eating
    if (selectedItem.itemType === ItemType.FOOD && selectedItem.foodRestore) {
      if (this.player.eat(selectedItem.foodRestore)) {
        this.inventory.consumeSelectedItem();
        if (this.onStateChange) this.onStateChange();
        return;
      }
    }

    // Block placing
    if (selectedItem.itemType === ItemType.BLOCK && selectedItem.blockType && this.targetedBlock) {
      const { blockX, blockY, blockZ, faceNormal, blockType: targetType } = this.targetedBlock;

      // Right clicking Crafting Table opens 3x3 table
      if (targetType === BlockType.CRAFTING_TABLE) {
        this.inventory.isTableMode = true;
        this.pause();
        return;
      }

      const placeX = blockX + faceNormal[0];
      const placeY = blockY + faceNormal[1];
      const placeZ = blockZ + faceNormal[2];

      // Prevent placing inside player's AABB
      const playerPos = this.player.position;
      const halfW = this.player.width / 2;
      const collidesPlayer =
        placeX >= Math.floor(playerPos.x - halfW) &&
        placeX <= Math.floor(playerPos.x + halfW) &&
        placeZ >= Math.floor(playerPos.z - halfW) &&
        placeZ <= Math.floor(playerPos.z + halfW) &&
        placeY >= Math.floor(playerPos.y) &&
        placeY <= Math.floor(playerPos.y + this.player.height);

      if (collidesPlayer) return;

      this.world.setBlock(placeX, placeY, placeZ, selectedItem.blockType);
      this.audio.playBlockPlace();

      if (this.player.gameMode === 'survival') {
        this.inventory.consumeSelectedItem();
      }

      if (this.onStateChange) this.onStateChange();
    }
  }

  // Update Day-Night cycle, lighting & sky colors
  private updateDayNight(dt: number) {
    this.timeOfDay = (this.timeOfDay + dt / this.dayDuration) % 1.0;

    // Angle of celestial bodies
    const angle = this.timeOfDay * Math.PI * 2;
    const radius = 60;
    const playerPos = this.player.position;

    const sunX = playerPos.x + Math.sin(angle) * radius;
    const sunY = Math.cos(angle) * radius;
    const sunZ = playerPos.z + 15;

    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.sunMesh.lookAt(playerPos);

    this.moonMesh.position.set(playerPos.x - Math.sin(angle) * radius, -Math.cos(angle) * radius, sunZ);
    this.moonMesh.lookAt(playerPos);

    // Directional Light tracks Sun when up, Moon when down
    const isDay = sunY > 0;
    this.dirLight.position.set(isDay ? sunX : -sunX, Math.max(10, Math.abs(sunY)), sunZ);
    this.dirLight.target.position.copy(playerPos);

    // Sky colors: Interpolate between Noon Sky, Sunset Gold, and Midnight Navy
    let skyColor = new THREE.Color(0x87ceeb); // Day
    if (this.timeOfDay > 0.2 && this.timeOfDay < 0.3) {
      // Sunrise
      skyColor = new THREE.Color(0xff8a65);
    } else if (this.timeOfDay >= 0.3 && this.timeOfDay <= 0.7) {
      // Full Day
      skyColor = new THREE.Color(0x87ceeb);
    } else if (this.timeOfDay > 0.7 && this.timeOfDay < 0.8) {
      // Sunset
      skyColor = new THREE.Color(0xff7043);
    } else {
      // Night
      skyColor = new THREE.Color(0x0b1021);
    }

    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(skyColor, 0.018);

    const sunIntensity = Math.max(0.2, (sunY / radius) * 1.2);
    this.dirLight.intensity = isDay ? sunIntensity : 0.25;
    this.hemiLight.intensity = isDay ? 0.6 : 0.2;

    // Drift clouds
    this.cloudsMesh.position.x = (this.cloudsMesh.position.x + dt * 0.8) % 200;
    this.cloudsMesh.position.z = playerPos.z;
  }

  // Update block raycasting & highlight
  private updateRaycast() {
    const eyePos = new THREE.Vector3(this.player.position.x, this.player.position.y + this.player.eyeHeight, this.player.position.z);
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(this.player.rotation);

    // 1. Raycast Mobs
    this.targetedMobId = null;
    let closestMobDist = 4.5;
    for (const [id, data] of this.mobs.mobs.entries()) {
      const mobPos = new THREE.Vector3(data.entity.x, data.entity.y + 0.8, data.entity.z);
      const toMob = mobPos.clone().sub(eyePos);
      const dist = toMob.length();
      if (dist < closestMobDist) {
        const dot = dir.dot(toMob.normalize());
        if (dot > 0.94) {
          closestMobDist = dist;
          this.targetedMobId = id;
        }
      }
    }

    if (this.targetedMobId) {
      this.targetedBlock = null;
      this.highlightBox.visible = false;
      this.crackMesh.visible = false;
      return;
    }

    // 2. Raycast Voxel Blocks
    const hit = this.world.raycast(eyePos, dir, 5.5);
    if (hit) {
      this.targetedBlock = hit;
      this.highlightBox.position.set(hit.blockX + 0.5, hit.blockY + 0.5, hit.blockZ + 0.5);
      this.highlightBox.visible = true;
    } else {
      this.targetedBlock = null;
      this.highlightBox.visible = false;
      this.crackMesh.visible = false;
      this.miningProgress = 0;
    }
  }

  // Update ongoing block mining breaking progress
  private updateMining(dt: number) {
    if (!this.isMiningHeld || !this.targetedBlock || this.player.gameMode === 'creative') {
      return;
    }

    const { blockX, blockY, blockZ, blockType } = this.targetedBlock;
    if (blockType === BlockType.BEDROCK || blockType === BlockType.AIR) return;

    const blockKey = `${blockX},${blockY},${blockZ}`;
    if (this.lastMiningBlock !== blockKey) {
      this.lastMiningBlock = blockKey;
      this.miningProgress = 0;
    }

    const def = BLOCK_DEFS[blockType];
    const selectedItem = this.inventory.getSelectedItem();

    let speedMultiplier = 1.0;
    if (selectedItem?.itemType === ItemType.TOOL && def.toolRequired === selectedItem.toolType) {
      speedMultiplier = 2.0 + (selectedItem.toolTier || 1) * 2.0;
    }

    const breakDuration = Math.max(0.1, def.hardness / speedMultiplier);
    this.miningProgress += dt / breakDuration;

    // Update crack stage overlay texture
    const tm = TextureManager.getInstance();
    const stage = Math.min(9, Math.floor(this.miningProgress * 10));
    (this.crackMesh.material as THREE.MeshBasicMaterial).map = tm.breakStages[stage];
    this.crackMesh.position.set(blockX + 0.5, blockY + 0.5, blockZ + 0.5);
    this.crackMesh.visible = true;

    // Periodic crunchy breaking sound
    if (Math.random() < dt * 6.0) {
      this.audio.playBlockBreak(def.soundType);
      this.player.swingArm();
    }

    // Finished breaking!
    if (this.miningProgress >= 1.0) {
      this.breakCurrentBlock(blockX, blockY, blockZ, blockType);
    }
  }

  // Master game loop tick
  private tick = () => {
    if (!this.isRunning) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (!this.isPaused) {
      // 1. Update Player Physics & Collisions
      this.player.update(dt, this.moveInput, this.actions);

      // 2. Update Chunks around player
      this.world.updatePlayerChunks(this.player.position);

      // 3. Update Mobs AI & animations
      this.mobs.update(dt, this.player);

      // 4. Update Particle effects
      this.particles.update(dt);

      // 5. Update Day-Night cycle
      this.updateDayNight(dt);

      // 6. Raycast crosshair & Highlight box
      this.updateRaycast();

      // 7. Update mining progress
      this.updateMining(dt);

      if (this.onStateChange) {
        this.onStateChange();
      }
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  // Save game progress
  public saveCurrentGame() {
    const data: GameSaveData = {
      version: 1,
      timestamp: Date.now(),
      gameMode: this.player.gameMode,
      seed: 4242,
      player: {
        x: this.player.position.x,
        y: this.player.position.y,
        z: this.player.position.z,
        yaw: this.player.rotation.y,
        pitch: this.player.rotation.x,
        stats: this.player.stats,
      },
      inventory: {
        slots: this.inventory.slots,
        selectedHotbarIndex: this.inventory.selectedHotbarIndex,
      },
      modifiedBlocks: Array.from(this.world.modifiedBlocks.entries()),
    };
    StorageManager.saveGame(data);
  }

  // Load saved game
  public loadSavedState(data: GameSaveData) {
    this.player.setGameMode(data.gameMode);
    this.player.position.set(data.player.x, data.player.y, data.player.z);
    this.player.rotation.y = data.player.yaw;
    this.player.rotation.x = data.player.pitch;
    this.player.stats = { ...data.player.stats };

    this.inventory.slots = data.inventory.slots;
    this.inventory.selectedHotbarIndex = data.inventory.selectedHotbarIndex;

    for (const [key, type] of data.modifiedBlocks) {
      const [wx, wy, wz] = key.split(',').map(Number);
      this.world.setBlock(wx, wy, wz, type);
    }

    this.world.updatePlayerChunks(this.player.position);
  }

  public dispose() {
    this.stop();
    this.renderer.dispose();
  }
}
