/**
 * Player Controller - Physics, AABB Voxel Collisions, 1st/3rd Person Cameras, 3D Character Model
 */

import * as THREE from 'three';
import { CameraMode, GameMode, PlayerStats } from './types';
import { WorldManager, WATER_LEVEL } from './world';
import { BLOCK_DEFS } from './blocks';
import { AudioManager } from './audio';
import { TextureManager } from './textures';

export class PlayerController {
  public position: THREE.Vector3 = new THREE.Vector3(8, 15, 8);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ'); // yaw (Y), pitch (X)

  // Camera settings
  public camera: THREE.PerspectiveCamera;
  public cameraMode: CameraMode = 'first_person';
  public thirdPersonDistance = 3.5;

  // Visual Character Mesh (3-12 part procedural model)
  public playerGroup: THREE.Group = new THREE.Group();
  public headMesh!: THREE.Mesh;
  public torsoMesh!: THREE.Mesh;
  public leftArmMesh!: THREE.Mesh;
  public rightArmMesh!: THREE.Mesh;
  public leftLegMesh!: THREE.Mesh;
  public rightLegMesh!: THREE.Mesh;
  public heldItemMesh: THREE.Mesh | null = null;
  public firstPersonHandGroup: THREE.Group = new THREE.Group();

  // Physics state
  public isGrounded = false;
  public isInWater = false;
  public isHeadUnderwater = false;
  public isFlying = false;
  public isSprinting = false;
  public isCrouching = false;
  public gameMode: GameMode = 'survival';

  // Stats
  public stats: PlayerStats = {
    health: 20,
    maxHealth: 20,
    hunger: 20,
    maxHunger: 20,
    air: 20,
    maxAir: 20,
    isDead: false,
    score: 0,
    level: 1,
    xp: 0,
    isFlying: false,
    isSprinting: false,
    isCrouching: false,
    isUnderwater: false,
  };

  // Dimensions
  public readonly width = 0.6;
  public readonly height = 1.8;
  public readonly eyeHeight = 1.62;

  // Animation & audio timers
  private walkTime = 0;
  private footstepTimer = 0;
  private swingAnimation = 0;
  private fallDistance = 0;
  private hungerTimer = 0;
  private healthRegenTimer = 0;

  private world: WorldManager;
  private audio: AudioManager;

  constructor(camera: THREE.PerspectiveCamera, world: WorldManager) {
    this.camera = camera;
    this.world = world;
    this.audio = AudioManager.getInstance();

    this.buildCharacterModel();
    this.buildFirstPersonHand();
    world.scene.add(this.playerGroup);
    this.camera.add(this.firstPersonHandGroup);
    world.scene.add(this.camera);

    this.respawn();
  }

  // Respawn player at safe ground height
  public respawn() {
    this.position.set(8.5, 16, 8.5);
    // Find solid ground
    for (let y = 30; y >= 2; y--) {
      const b = this.world.getBlock(Math.floor(this.position.x), y, Math.floor(this.position.z));
      if (b !== 0 && BLOCK_DEFS[b]?.isSolid) {
        this.position.y = y + 1;
        break;
      }
    }
    this.velocity.set(0, 0, 0);
    this.stats.health = 20;
    this.stats.hunger = 20;
    this.stats.air = 20;
    this.stats.isDead = false;
    this.fallDistance = 0;
  }

  // Build 3D Character Model (Steve-style composite 3-12 parts)
  private buildCharacterModel() {
    this.playerGroup = new THREE.Group();

    // 1. Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshStandardMaterial({ color: '#d7a17c', roughness: 0.8 });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.y = 1.5;
    this.headMesh.castShadow = true;
    this.playerGroup.add(this.headMesh);

    // Hair accent on head
    const hairGeo = new THREE.BoxGeometry(0.52, 0.16, 0.52);
    const hairMat = new THREE.MeshStandardMaterial({ color: '#4a2d13', roughness: 0.9 });
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.y = 0.2;
    this.headMesh.add(hairMesh);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#3f51b5' });
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.06, 0.02);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 0.02, 0.26);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 0.02, 0.26);
    this.headMesh.add(leftEye, rightEye);

    // 2. Torso (Cyan shirt)
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.72, 0.25);
    const torsoMat = new THREE.MeshStandardMaterial({ color: '#00acc1', roughness: 0.7 });
    this.torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    this.torsoMesh.position.y = 0.88;
    this.torsoMesh.castShadow = true;
    this.playerGroup.add(this.torsoMesh);

    // 3. Left Arm
    const armGeo = new THREE.BoxGeometry(0.24, 0.72, 0.24);
    armGeo.translate(0, -0.26, 0); // pivot at shoulder
    const armMat = new THREE.MeshStandardMaterial({ color: '#00838f', roughness: 0.7 });
    this.leftArmMesh = new THREE.Mesh(armGeo, armMat);
    this.leftArmMesh.position.set(-0.38, 1.15, 0);
    this.leftArmMesh.castShadow = true;
    this.playerGroup.add(this.leftArmMesh);

    // 4. Right Arm
    this.rightArmMesh = new THREE.Mesh(armGeo, armMat);
    this.rightArmMesh.position.set(0.38, 1.15, 0);
    this.rightArmMesh.castShadow = true;
    this.playerGroup.add(this.rightArmMesh);

    // 5. Left Leg (Blue jeans)
    const legGeo = new THREE.BoxGeometry(0.24, 0.72, 0.24);
    legGeo.translate(0, -0.36, 0); // pivot at hip
    const legMat = new THREE.MeshStandardMaterial({ color: '#283593', roughness: 0.85 });
    this.leftLegMesh = new THREE.Mesh(legGeo, legMat);
    this.leftLegMesh.position.set(-0.13, 0.72, 0);
    this.leftLegMesh.castShadow = true;
    this.playerGroup.add(this.leftLegMesh);

    // 6. Right Leg
    this.rightLegMesh = new THREE.Mesh(legGeo, legMat);
    this.rightLegMesh.position.set(0.13, 0.72, 0);
    this.rightLegMesh.castShadow = true;
    this.playerGroup.add(this.rightLegMesh);
  }

  // Build First Person swinging hand
  private buildFirstPersonHand() {
    this.firstPersonHandGroup = new THREE.Group();
    const handGeo = new THREE.BoxGeometry(0.16, 0.45, 0.16);
    const handMat = new THREE.MeshStandardMaterial({ color: '#d7a17c', roughness: 0.8 });
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.set(0.35, -0.32, -0.6);
    hand.rotation.set(-0.3, -0.2, 0.1);
    this.firstPersonHandGroup.add(hand);
  }

  // Trigger arm swinging animation when breaking or attacking
  public swingArm() {
    this.swingAnimation = 1.0;
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
  }

  public toggleCameraMode() {
    this.cameraMode = this.cameraMode === 'first_person' ? 'third_person' : 'first_person';
  }

  public setGameMode(mode: GameMode) {
    this.gameMode = mode;
    if (mode === 'creative') {
      this.stats.health = 20;
      this.stats.hunger = 20;
      this.stats.air = 20;
    } else {
      this.isFlying = false;
    }
  }

  // Take damage from mobs, drowning, or falls
  public takeDamage(amount: number, cause = 'damage') {
    if (this.gameMode === 'creative' || this.stats.isDead) return;
    this.stats.health = Math.max(0, this.stats.health - amount);
    this.audio.playHit();
    if (this.stats.health <= 0) {
      this.stats.isDead = true;
    }
  }

  // Eat food from inventory
  public eat(restoreAmount: number) {
    if (this.stats.hunger >= 20 && this.stats.health >= 20) return false;
    this.stats.hunger = Math.min(20, this.stats.hunger + restoreAmount);
    this.stats.health = Math.min(20, this.stats.health + Math.floor(restoreAmount * 0.5));
    this.audio.playEat();
    return true;
  }

  // Update physics, input, collisions, and camera
  public update(
    dt: number,
    moveInput: { x: number; y: number }, // joystick or WASD normalized
    actions: { jump: boolean; sprint: boolean; crouch: boolean; flyToggle: boolean }
  ) {
    if (this.stats.isDead) return;

    // Creative flight toggle
    if (actions.flyToggle && this.gameMode === 'creative') {
      this.isFlying = !this.isFlying;
      if (!this.isFlying) this.velocity.y = 0;
    }

    this.isSprinting = actions.sprint && this.stats.hunger > 6 && !this.isCrouching;
    this.isCrouching = actions.crouch;

    // Movement speeds
    let moveSpeed = 4.3; // m/s
    if (this.isSprinting) moveSpeed = 6.2;
    if (this.isCrouching) moveSpeed = 2.2;
    if (this.isFlying) moveSpeed = 10.0;
    if (this.isInWater) moveSpeed = 2.5;

    // Calculate forward & right movement vectors from yaw
    const forward = new THREE.Vector3(-Math.sin(this.rotation.y), 0, -Math.cos(this.rotation.y));
    const right = new THREE.Vector3(Math.cos(this.rotation.y), 0, -Math.sin(this.rotation.y));

    const targetVx = (forward.x * moveInput.y + right.x * moveInput.x) * moveSpeed;
    const targetVz = (forward.z * moveInput.y + right.z * moveInput.x) * moveSpeed;

    // Smooth horizontal acceleration
    const accel = this.isGrounded ? 15.0 : 4.0;
    this.velocity.x += (targetVx - this.velocity.x) * Math.min(1.0, accel * dt);
    this.velocity.z += (targetVz - this.velocity.z) * Math.min(1.0, accel * dt);

    // Vertical physics & Gravity
    if (this.isFlying) {
      if (actions.jump) {
        this.velocity.y = moveSpeed;
      } else if (actions.crouch) {
        this.velocity.y = -moveSpeed;
      } else {
        this.velocity.y = 0;
      }
    } else {
      // In Water physics
      if (this.isInWater) {
        if (actions.jump) {
          this.velocity.y = 3.2; // swim up
        } else {
          this.velocity.y += (-4.0 - this.velocity.y) * 4.0 * dt; // gentle sink
        }
      } else {
        // Normal Gravity
        if (actions.jump && this.isGrounded) {
          this.velocity.y = 8.5; // jump impulse
          this.isGrounded = false;
          this.audio.playJump();
        } else {
          this.velocity.y -= 26.0 * dt; // gravity
        }
      }
    }

    // Track falling distance for fall damage
    if (this.velocity.y < 0 && !this.isInWater && !this.isFlying) {
      this.fallDistance += Math.abs(this.velocity.y) * dt;
    } else if (this.isGrounded) {
      if (this.fallDistance > 3.5 && this.gameMode === 'survival') {
        const dmg = Math.floor((this.fallDistance - 3.0) * 2.5);
        if (dmg > 0) this.takeDamage(dmg, 'fall');
      }
      this.fallDistance = 0;
    }

    // AABB Collision Detection and Resolution against Solid Voxels
    this.resolveVoxelCollisions(dt);

    // Water test at body and head
    const bodyBlock = this.world.getBlock(Math.floor(this.position.x), Math.floor(this.position.y + 0.8), Math.floor(this.position.z));
    const headBlock = this.world.getBlock(Math.floor(this.position.x), Math.floor(this.position.y + this.eyeHeight), Math.floor(this.position.z));
    this.isInWater = bodyBlock === 9; // BlockType.WATER
    this.isHeadUnderwater = headBlock === 9;
    this.stats.isUnderwater = this.isHeadUnderwater;

    // Drowning & Air timer
    if (this.isHeadUnderwater && this.gameMode === 'survival') {
      this.stats.air = Math.max(0, this.stats.air - dt * 2.5);
      if (this.stats.air <= 0) {
        this.takeDamage(dt * 3.0, 'drowning');
      }
    } else {
      this.stats.air = Math.min(20, this.stats.air + dt * 6.0);
    }

    // Hunger & health regeneration in Survival Mode
    if (this.gameMode === 'survival') {
      this.hungerTimer += dt;
      if (this.hungerTimer >= 4.0) {
        this.hungerTimer = 0;
        if (this.isSprinting && (moveInput.x !== 0 || moveInput.y !== 0)) {
          this.stats.hunger = Math.max(0, this.stats.hunger - 0.25);
        }
      }

      // Natural health regeneration when well fed
      if (this.stats.hunger >= 18 && this.stats.health < 20) {
        this.healthRegenTimer += dt;
        if (this.healthRegenTimer >= 3.0) {
          this.healthRegenTimer = 0;
          this.stats.health = Math.min(20, this.stats.health + 1);
          this.stats.hunger = Math.max(0, this.stats.hunger - 0.5);
        }
      }
    }

    // Footstep audio
    const isMoving = (Math.abs(this.velocity.x) > 0.5 || Math.abs(this.velocity.z) > 0.5) && this.isGrounded;
    if (isMoving) {
      this.walkTime += dt * (this.isSprinting ? 12 : 8);
      this.footstepTimer += dt * (this.isSprinting ? 1.5 : 1.0);
      if (this.footstepTimer >= 0.4) {
        this.footstepTimer = 0;
        const groundBlock = this.world.getBlock(Math.floor(this.position.x), Math.floor(this.position.y - 0.2), Math.floor(this.position.z));
        const soundType = BLOCK_DEFS[groundBlock]?.soundType || 'dirt';
        this.audio.playFootstep(soundType);
      }
    } else {
      this.walkTime = 0;
      this.footstepTimer = 0;
    }

    // Arm swing mining animation decay
    if (this.swingAnimation > 0) {
      this.swingAnimation = Math.max(0, this.swingAnimation - dt * 4.0);
    }

    // Update 3D Character Model and Camera placement
    this.updateCharacterVisuals();
    this.updateCamera();
  }

  // Robust AABB Collision Resolution against Voxel Grid
  private resolveVoxelCollisions(dt: number) {
    const halfW = this.width / 2;
    const p = this.position;

    // 1. Move Y
    p.y += this.velocity.y * dt;
    this.isGrounded = false;

    let minX = Math.floor(p.x - halfW);
    let maxX = Math.floor(p.x + halfW);
    let minZ = Math.floor(p.z - halfW);
    let maxZ = Math.floor(p.z + halfW);
    let minY = Math.floor(p.y);
    let maxY = Math.floor(p.y + this.height);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          const b = this.world.getBlock(x, y, z);
          if (b !== 0 && BLOCK_DEFS[b]?.isSolid) {
            if (this.velocity.y < 0) {
              p.y = y + 1.0;
              this.velocity.y = 0;
              this.isGrounded = true;
            } else if (this.velocity.y > 0) {
              p.y = y - this.height;
              this.velocity.y = 0;
            }
          }
        }
      }
    }

    // 2. Move X
    p.x += this.velocity.x * dt;
    minX = Math.floor(p.x - halfW);
    maxX = Math.floor(p.x + halfW);
    minY = Math.floor(p.y + 0.1);
    maxY = Math.floor(p.y + this.height - 0.1);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const b = this.world.getBlock(x, y, z);
          if (b !== 0 && BLOCK_DEFS[b]?.isSolid) {
            // Auto step-up assist: if step is 0.5 block high and head is clear
            if (this.isGrounded && y === Math.floor(p.y) && this.world.getBlock(x, y + 1, z) === 0) {
              p.y += 0.5;
              continue;
            }
            if (this.velocity.x > 0) {
              p.x = x - halfW;
              this.velocity.x = 0;
            } else if (this.velocity.x < 0) {
              p.x = x + 1 + halfW;
              this.velocity.x = 0;
            }
          }
        }
      }
    }

    // 3. Move Z
    p.z += this.velocity.z * dt;
    minZ = Math.floor(p.z - halfW);
    maxZ = Math.floor(p.z + halfW);

    for (let z = minZ; z <= maxZ; z++) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const b = this.world.getBlock(x, y, z);
          if (b !== 0 && BLOCK_DEFS[b]?.isSolid) {
            // Auto step-up assist
            if (this.isGrounded && y === Math.floor(p.y) && this.world.getBlock(x, y + 1, z) === 0) {
              p.y += 0.5;
              continue;
            }
            if (this.velocity.z > 0) {
              p.z = z - halfW;
              this.velocity.z = 0;
            } else if (this.velocity.z < 0) {
              p.z = z + 1 + halfW;
              this.velocity.z = 0;
            }
          }
        }
      }
    }
  }

  // Update 3D Character Model and limb walking animations
  private updateCharacterVisuals() {
    this.playerGroup.position.copy(this.position);
    this.playerGroup.rotation.y = this.rotation.y;

    // Limb walking oscillation
    const limbAngle = Math.sin(this.walkTime) * 0.6;
    this.leftLegMesh.rotation.x = limbAngle;
    this.rightLegMesh.rotation.x = -limbAngle;

    // Head pitch
    this.headMesh.rotation.x = this.rotation.x;

    // Arm animation (walking swing + mining swing)
    const swingProgress = Math.sin(this.swingAnimation * Math.PI);
    this.rightArmMesh.rotation.x = -limbAngle - swingProgress * 1.5;
    this.leftArmMesh.rotation.x = limbAngle;

    // First person hand swing
    if (this.firstPersonHandGroup) {
      this.firstPersonHandGroup.position.set(0.35, -0.32 + Math.sin(this.walkTime * 0.5) * 0.02, -0.6);
      this.firstPersonHandGroup.rotation.x = -0.3 - swingProgress * 0.8;
      this.firstPersonHandGroup.rotation.y = -0.2 + swingProgress * 0.3;
    }

    // Visibility based on camera mode
    if (this.cameraMode === 'first_person') {
      this.playerGroup.visible = false;
      this.firstPersonHandGroup.visible = true;
    } else {
      this.playerGroup.visible = true;
      this.firstPersonHandGroup.visible = false;
    }
  }

  // Position and orient the camera
  private updateCamera() {
    if (this.cameraMode === 'first_person') {
      this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
      this.camera.rotation.copy(this.rotation);
    } else {
      // 3rd Person camera: orbit behind player with obstacle collision avoidance
      const eyePos = new THREE.Vector3(this.position.x, this.position.y + this.eyeHeight, this.position.z);
      const camOffset = new THREE.Vector3(0, 0.4, this.thirdPersonDistance);
      camOffset.applyEuler(new THREE.Euler(this.rotation.x * 0.5, this.rotation.y, 0, 'YXZ'));

      let targetCamPos = eyePos.clone().add(camOffset);

      // Check ray from eye to camera to prevent clipping through blocks
      const dir = targetCamPos.clone().sub(eyePos);
      const dist = dir.length();
      dir.normalize();

      const rayHit = this.world.raycast(eyePos, dir, dist);
      if (rayHit) {
        targetCamPos = eyePos.clone().add(dir.multiplyScalar(Math.max(0.6, rayHit.blockX !== undefined ? dist * 0.8 : dist)));
      }

      this.camera.position.copy(targetCamPos);
      this.camera.lookAt(eyePos.x, eyePos.y + 0.1, eyePos.z);
    }
  }
}
