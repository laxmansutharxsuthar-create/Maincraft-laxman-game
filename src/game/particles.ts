/**
 * Voxel Particle System - Block break fragments, hit sparks, water splashes
 */

import * as THREE from 'three';
import { BlockType } from './types';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export class ParticleManager {
  private particles: Particle[] = [];
  private instancedMesh: THREE.InstancedMesh;
  private maxParticles = 300;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.frustumCulled = false;
    scene.add(this.instancedMesh);
  }

  public emitBlockBreak(wx: number, wy: number, wz: number, type: BlockType) {
    let baseColor = new THREE.Color('#7a7a7a');
    if (type === BlockType.GRASS) baseColor = new THREE.Color('#5c8e32');
    else if (type === BlockType.DIRT) baseColor = new THREE.Color('#866043');
    else if (type === BlockType.WOOD) baseColor = new THREE.Color('#674a2d');
    else if (type === BlockType.LEAVES) baseColor = new THREE.Color('#3f7c20');
    else if (type === BlockType.SAND) baseColor = new THREE.Color('#dbce95');
    else if (type === BlockType.DIAMOND_ORE) baseColor = new THREE.Color('#26c6da');
    else if (type === BlockType.GOLD_ORE) baseColor = new THREE.Color('#fbc02d');
    else if (type === BlockType.TNT) baseColor = new THREE.Color('#d32f2f');

    const count = 16;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const pColor = baseColor.clone().offsetHSL((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.2);

      this.particles.push({
        x: wx + 0.5 + (Math.random() - 0.5) * 0.6,
        y: wy + 0.5 + (Math.random() - 0.5) * 0.6,
        z: wz + 0.5 + (Math.random() - 0.5) * 0.6,
        vx: (Math.random() - 0.5) * 4.0,
        vy: 2.0 + Math.random() * 3.5,
        vz: (Math.random() - 0.5) * 4.0,
        size: 0.8 + Math.random() * 0.6,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        color: pColor,
      });
    }
  }

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.vy -= 18.0 * dt; // gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }

    // Update InstancedMesh
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        const scale = (1 - p.life / p.maxLife) * p.size;
        this.dummy.position.set(p.x, p.y, p.z);
        this.dummy.scale.set(scale, scale, scale);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
        this.instancedMesh.setColorAt(i, p.color);
      } else {
        this.dummy.position.set(0, -999, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      }
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }
}
