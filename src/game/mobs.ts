/**
 * Procedural 3D Mobs & Entity AI (Zombies, Skeletons, Cows, Sheep, Pigs)
 */

import * as THREE from 'three';
import { MobEntity, MobType, BlockType } from './types';
import { WorldManager } from './world';
import { AudioManager } from './audio';
import { PlayerController } from './player';

export class MobManager {
  public mobs: Map<string, { entity: MobEntity; group: THREE.Group; leftLeg: THREE.Mesh; rightLeg: THREE.Mesh; leftArm?: THREE.Mesh; rightArm?: THREE.Mesh; materials: THREE.MeshStandardMaterial[] }> = new Map();
  private scene: THREE.Scene;
  private world: WorldManager;
  private audio: AudioManager;

  constructor(scene: THREE.Scene, world: WorldManager) {
    this.scene = scene;
    this.world = world;
    this.audio = AudioManager.getInstance();
  }

  // Spawn initial mobs around player
  public spawnInitialMobs(playerPos: THREE.Vector3) {
    const mobTypes: MobType[] = ['cow', 'sheep', 'pig', 'zombie', 'skeleton', 'cow', 'sheep'];
    for (let i = 0; i < mobTypes.length; i++) {
      const angle = (i / mobTypes.length) * Math.PI * 2;
      const dist = 10 + Math.random() * 14;
      const x = playerPos.x + Math.cos(angle) * dist;
      const z = playerPos.z + Math.sin(angle) * dist;

      // Find surface y
      let y = 20;
      for (let searchY = 28; searchY >= 2; searchY--) {
        const b = this.world.getBlock(Math.floor(x), searchY, Math.floor(z));
        if (b !== BlockType.AIR && b !== BlockType.WATER) {
          y = searchY + 1;
          break;
        }
      }

      this.createMob(mobTypes[i], x, y, z);
    }
  }

  public createMob(type: MobType, x: number, y: number, z: number): MobEntity {
    const id = 'mob_' + Math.random().toString(36).substring(2, 9);
    const isHostile = type === 'zombie' || type === 'skeleton';
    const maxHealth = isHostile ? 20 : 10;

    const entity: MobEntity = {
      id,
      type,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.random() * Math.PI * 2,
      health: maxHealth,
      maxHealth,
      isHostile,
      hurtTimer: 0,
      walkCycle: Math.random() * 10,
    };

    const group = new THREE.Group();
    const materials: THREE.MeshStandardMaterial[] = [];
    let leftLeg!: THREE.Mesh;
    let rightLeg!: THREE.Mesh;
    let leftArm: THREE.Mesh | undefined;
    let rightArm: THREE.Mesh | undefined;

    const regMat = (mat: THREE.MeshStandardMaterial) => {
      materials.push(mat);
      return mat;
    };

    if (type === 'zombie') {
      // 1. Head (Green)
      const headMat = regMat(new THREE.MeshStandardMaterial({ color: '#4caf50', roughness: 0.8 }));
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMat);
      head.position.y = 1.5;
      group.add(head);

      // Dark hair
      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.52), regMat(new THREE.MeshStandardMaterial({ color: '#2e7d32' })));
      hair.position.y = 0.2;
      head.add(hair);

      // 2. Torso (Cyan)
      const torsoMat = regMat(new THREE.MeshStandardMaterial({ color: '#00acc1', roughness: 0.7 }));
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.25), torsoMat);
      torso.position.y = 0.88;
      group.add(torso);

      // 3. Arms held out straight forward
      const armMat = regMat(new THREE.MeshStandardMaterial({ color: '#4caf50', roughness: 0.8 }));
      const armGeo = new THREE.BoxGeometry(0.22, 0.72, 0.22);
      armGeo.translate(0, -0.26, 0);

      leftArm = new THREE.Mesh(armGeo, armMat);
      leftArm.position.set(-0.36, 1.15, 0);
      leftArm.rotation.x = -Math.PI / 2; // arms forward!
      group.add(leftArm);

      rightArm = new THREE.Mesh(armGeo, armMat);
      rightArm.position.set(0.36, 1.15, 0);
      rightArm.rotation.x = -Math.PI / 2;
      group.add(rightArm);

      // 4. Legs (Blue)
      const legMat = regMat(new THREE.MeshStandardMaterial({ color: '#1565c0', roughness: 0.8 }));
      const legGeo = new THREE.BoxGeometry(0.24, 0.72, 0.24);
      legGeo.translate(0, -0.36, 0);

      leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.13, 0.72, 0);
      group.add(leftLeg);

      rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.13, 0.72, 0);
      group.add(rightLeg);

    } else if (type === 'skeleton') {
      // Skeleton: Bone white skull, ribcage, bow
      const boneMat = regMat(new THREE.MeshStandardMaterial({ color: '#dcdcdc', roughness: 0.9 }));
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), boneMat);
      head.position.y = 1.5;
      group.add(head);

      // Eye sockets
      const eyeMat = regMat(new THREE.MeshStandardMaterial({ color: '#1a1a1a' }));
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), eyeMat);
      eye.position.set(-0.1, 0, 0.25);
      const eye2 = eye.clone();
      eye2.position.x = 0.1;
      head.add(eye, eye2);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.72, 0.2), boneMat);
      torso.position.y = 0.88;
      group.add(torso);

      const armGeo = new THREE.BoxGeometry(0.16, 0.72, 0.16);
      armGeo.translate(0, -0.26, 0);
      leftArm = new THREE.Mesh(armGeo, boneMat);
      leftArm.position.set(-0.32, 1.15, 0);
      leftArm.rotation.x = -Math.PI / 2.3;
      group.add(leftArm);

      rightArm = new THREE.Mesh(armGeo, boneMat);
      rightArm.position.set(0.32, 1.15, 0);
      rightArm.rotation.x = -Math.PI / 2.3;
      group.add(rightArm);

      const legGeo = new THREE.BoxGeometry(0.16, 0.72, 0.16);
      legGeo.translate(0, -0.36, 0);
      leftLeg = new THREE.Mesh(legGeo, boneMat);
      leftLeg.position.set(-0.12, 0.72, 0);
      group.add(leftLeg);

      rightLeg = new THREE.Mesh(legGeo, boneMat);
      rightLeg.position.set(0.12, 0.72, 0);
      group.add(rightLeg);

    } else if (type === 'cow') {
      // Cow: Brown & white patched body, 4 legs, horns
      const cowBodyMat = regMat(new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.85 }));
      const cowWhiteMat = regMat(new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.8 }));

      // Body (horizontal)
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 1.2), cowBodyMat);
      body.position.y = 0.85;
      group.add(body);

      // White patches
      const patch = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.4, 0.6), cowWhiteMat);
      body.add(patch);

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), cowBodyMat);
      head.position.set(0, 1.2, 0.75);
      group.add(head);

      // Pink muzzle
      const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.2), regMat(new THREE.MeshStandardMaterial({ color: '#f48fb1' })));
      muzzle.position.set(0, -0.12, 0.3);
      head.add(muzzle);

      // Horns
      const hornMat = regMat(new THREE.MeshStandardMaterial({ color: '#e0e0e0' }));
      const leftHorn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), hornMat);
      leftHorn.position.set(-0.25, 0.28, -0.05);
      const rightHorn = leftHorn.clone();
      rightHorn.position.x = 0.25;
      head.add(leftHorn, rightHorn);

      // 4 Legs
      const legGeo = new THREE.BoxGeometry(0.24, 0.6, 0.24);
      legGeo.translate(0, -0.3, 0);
      leftLeg = new THREE.Mesh(legGeo, cowBodyMat);
      leftLeg.position.set(-0.28, 0.6, 0.4);
      group.add(leftLeg);

      rightLeg = new THREE.Mesh(legGeo, cowBodyMat);
      rightLeg.position.set(0.28, 0.6, 0.4);
      group.add(rightLeg);

      const backLeftLeg = new THREE.Mesh(legGeo, cowBodyMat);
      backLeftLeg.position.set(-0.28, 0.6, -0.4);
      group.add(backLeftLeg);

      const backRightLeg = new THREE.Mesh(legGeo, cowBodyMat);
      backRightLeg.position.set(0.28, 0.6, -0.4);
      group.add(backRightLeg);

    } else if (type === 'sheep') {
      // Sheep: Fluffy white wool cube body, pink face
      const woolMat = regMat(new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.95 }));
      const skinMat = regMat(new THREE.MeshStandardMaterial({ color: '#ffccbc', roughness: 0.8 }));

      // Wool Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 1.1), woolMat);
      body.position.y = 0.9;
      group.add(body);

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.45), skinMat);
      head.position.set(0, 1.15, 0.68);
      group.add(head);

      // Wool top on head
      const headWool = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.44), woolMat);
      headWool.position.y = 0.2;
      head.add(headWool);

      // 4 Legs
      const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
      legGeo.translate(0, -0.3, 0);
      leftLeg = new THREE.Mesh(legGeo, skinMat);
      leftLeg.position.set(-0.25, 0.6, 0.35);
      group.add(leftLeg);

      rightLeg = new THREE.Mesh(legGeo, skinMat);
      rightLeg.position.set(0.25, 0.6, 0.35);
      group.add(rightLeg);

      const backLeftLeg = new THREE.Mesh(legGeo, skinMat);
      backLeftLeg.position.set(-0.25, 0.6, -0.35);
      group.add(backLeftLeg);

      const backRightLeg = new THREE.Mesh(legGeo, skinMat);
      backRightLeg.position.set(0.25, 0.6, -0.35);
      group.add(backRightLeg);

    } else if (type === 'pig') {
      // Pig: Pink body and snout
      const pigMat = regMat(new THREE.MeshStandardMaterial({ color: '#f8bbd0', roughness: 0.7 }));
      const snoutMat = regMat(new THREE.MeshStandardMaterial({ color: '#f48fb1', roughness: 0.7 }));

      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 1.0), pigMat);
      body.position.y = 0.75;
      group.add(body);

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), pigMat);
      head.position.set(0, 0.95, 0.65);
      group.add(head);

      // Snout
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.12), snoutMat);
      snout.position.set(0, -0.06, 0.28);
      head.add(snout);

      // 4 short legs
      const legGeo = new THREE.BoxGeometry(0.2, 0.45, 0.2);
      legGeo.translate(0, -0.22, 0);
      leftLeg = new THREE.Mesh(legGeo, pigMat);
      leftLeg.position.set(-0.22, 0.45, 0.32);
      group.add(leftLeg);

      rightLeg = new THREE.Mesh(legGeo, pigMat);
      rightLeg.position.set(0.22, 0.45, 0.32);
      group.add(rightLeg);

      const backLeftLeg = new THREE.Mesh(legGeo, pigMat);
      backLeftLeg.position.set(-0.22, 0.45, -0.32);
      group.add(backLeftLeg);

      const backRightLeg = new THREE.Mesh(legGeo, pigMat);
      backRightLeg.position.set(0.22, 0.45, -0.32);
      group.add(backRightLeg);
    }

    group.position.set(x, y, z);
    this.scene.add(group);

    this.mobs.set(id, {
      entity,
      group,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      materials,
    });

    return entity;
  }

  // Damage mob from player attack
  public hitMob(id: string, damage: number, knockbackDir: THREE.Vector3): { isDead: boolean; loot: string } | null {
    const data = this.mobs.get(id);
    if (!data) return null;

    data.entity.health -= damage;
    data.entity.hurtTimer = 0.3; // flash red for 300ms
    data.entity.vx += knockbackDir.x * 6;
    data.entity.vy = 4.5;
    data.entity.vz += knockbackDir.z * 6;

    this.audio.playHit();
    this.audio.playMobSound(data.entity.type);

    if (data.entity.health <= 0) {
      // Drop loot & remove
      let loot = 'food_meat';
      if (data.entity.type === 'cow') loot = 'food_meat';
      else if (data.entity.type === 'sheep') loot = 'block_8'; // wool
      else if (data.entity.type === 'pig') loot = 'food_meat';
      else if (data.entity.type === 'zombie') loot = 'resource_flesh';
      else if (data.entity.type === 'skeleton') loot = 'resource_bone';

      this.removeMob(id);
      return { isDead: true, loot };
    }

    return { isDead: false, loot: '' };
  }

  public removeMob(id: string) {
    const data = this.mobs.get(id);
    if (data) {
      this.scene.remove(data.group);
      this.mobs.delete(id);
    }
  }

  // Update all mobs AI, physics, walk cycles, and player interaction
  public update(dt: number, player: PlayerController) {
    const playerPos = player.position;

    for (const [id, data] of this.mobs.entries()) {
      const mob = data.entity;

      // Hurt timer & damage flash
      if (mob.hurtTimer > 0) {
        mob.hurtTimer -= dt;
        for (const mat of data.materials) {
          mat.color.set(mob.hurtTimer > 0 ? '#ff5252' : '#ffffff');
        }
      }

      // AI Behavior: Chase player if hostile, or wander
      const distToPlayer = Math.hypot(playerPos.x - mob.x, playerPos.z - mob.z);

      let targetSpeed = 1.6;
      let targetYaw = mob.yaw;

      if (mob.isHostile && distToPlayer < 14.0 && !player.stats.isDead && player.gameMode === 'survival') {
        // Chase player!
        targetYaw = Math.atan2(playerPos.x - mob.x, playerPos.z - mob.z);
        targetSpeed = 2.8;

        // Attack player if within 1.4 blocks
        if (distToPlayer < 1.4 && Math.abs(playerPos.y - mob.y) < 1.8) {
          player.takeDamage(2.0, mob.type);
          this.audio.playMobSound(mob.type);
        }
      } else {
        // Peaceful wander / idle
        if (Math.random() < dt * 0.3) {
          targetYaw = Math.random() * Math.PI * 2;
        }
      }

      // Smooth rotate towards targetYaw
      let diff = targetYaw - mob.yaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      mob.yaw += diff * Math.min(1.0, 5.0 * dt);

      // Move velocity forward
      const fwdX = Math.sin(mob.yaw);
      const fwdZ = Math.cos(mob.yaw);
      mob.vx += (fwdX * targetSpeed - mob.vx) * Math.min(1.0, 6.0 * dt);
      mob.vz += (fwdZ * targetSpeed - mob.vz) * Math.min(1.0, 6.0 * dt);

      // Gravity
      mob.vy -= 22.0 * dt;

      // Move Y
      mob.y += mob.vy * dt;
      let groundY = -1;
      const curBlock = this.world.getBlock(Math.floor(mob.x), Math.floor(mob.y), Math.floor(mob.z));
      if (curBlock !== 0 && curBlock !== BlockType.WATER) {
        mob.y = Math.floor(mob.y) + 1.0;
        mob.vy = 0;
        groundY = mob.y;
      }

      // Move X & Z with jump over 1-block obstacles
      const nextX = mob.x + mob.vx * dt;
      const nextZ = mob.z + mob.vz * dt;
      const obstacleBlock = this.world.getBlock(Math.floor(nextX), Math.floor(mob.y), Math.floor(nextZ));
      const headObstacle = this.world.getBlock(Math.floor(nextX), Math.floor(mob.y + 1), Math.floor(nextZ));

      if (obstacleBlock !== 0 && obstacleBlock !== BlockType.WATER) {
        if (headObstacle === 0 || headObstacle === BlockType.WATER) {
          // Jump over 1-block obstacle!
          mob.vy = 5.5;
        } else {
          mob.vx = 0;
          mob.vz = 0;
          mob.yaw += Math.PI * 0.7; // turn away
        }
      } else {
        mob.x = nextX;
        mob.z = nextZ;
      }

      // Periodic mob sounds
      if (Math.random() < dt * 0.04 && distToPlayer < 18) {
        this.audio.playMobSound(mob.type);
      }

      // Update 3D visual position & limb oscillation
      data.group.position.set(mob.x, mob.y, mob.z);
      data.group.rotation.y = mob.yaw;

      const isWalking = Math.hypot(mob.vx, mob.vz) > 0.2;
      if (isWalking) {
        mob.walkCycle += dt * 8.0;
        const legSwing = Math.sin(mob.walkCycle) * 0.5;
        data.leftLeg.rotation.x = legSwing;
        data.rightLeg.rotation.x = -legSwing;
      } else {
        data.leftLeg.rotation.x = 0;
        data.rightLeg.rotation.x = 0;
      }
    }
  }
}
