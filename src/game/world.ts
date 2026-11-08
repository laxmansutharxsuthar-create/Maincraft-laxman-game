/**
 * Voxel World Engine - Chunk Management, Procedural Terrain, Caves, Village & Meshing
 */

import * as THREE from 'three';
import { BlockType } from './types';
import { BLOCK_DEFS } from './blocks';
import { SimplexNoise } from './noise';
import { TextureManager } from './textures';

export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_HEIGHT = 32;
export const WATER_LEVEL = 9;

// Material Indices for BufferGeometry.addGroup
export const MAT_GRASS_SIDE = 0;
export const MAT_GRASS_TOP = 1;
export const MAT_DIRT = 2;
export const MAT_STONE = 3;
export const MAT_COBBLE = 4;
export const MAT_WOOD_SIDE = 5;
export const MAT_WOOD_TOP = 6;
export const MAT_PLANKS = 7;
export const MAT_LEAVES = 8;
export const MAT_SAND = 9;
export const MAT_WATER = 10;
export const MAT_GLASS = 11;
export const MAT_BEDROCK = 12;
export const MAT_BRICKS = 13;
export const MAT_BOOKSHELF = 14;
export const MAT_CRAFT_TOP = 15;
export const MAT_CRAFT_SIDE = 16;
export const MAT_FURNACE_FRONT = 17;
export const MAT_COAL = 18;
export const MAT_IRON = 19;
export const MAT_GOLD = 20;
export const MAT_DIAMOND = 21;
export const MAT_TNT_SIDE = 22;
export const MAT_TNT_TOP = 23;
export const MAT_GLOWSTONE = 24;
export const MAT_TORCH = 25;
export const MAT_FLOWER_RED = 26;
export const MAT_FLOWER_YELLOW = 27;

export class Chunk {
  public cx: number;
  public cz: number;
  public voxels: Uint8Array;
  public opaqueMesh: THREE.Mesh | null = null;
  public transparentMesh: THREE.Mesh | null = null;
  public isDirty = false;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.voxels = new Uint8Array(CHUNK_SIZE_X * CHUNK_HEIGHT * CHUNK_SIZE_Z);
  }

  public getIndex(lx: number, y: number, lz: number): number {
    return (y * CHUNK_SIZE_Z + lz) * CHUNK_SIZE_X + lx;
  }

  public getBlock(lx: number, y: number, lz: number): BlockType {
    if (lx < 0 || lx >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return BlockType.AIR;
    }
    return this.voxels[this.getIndex(lx, y, lz)] as BlockType;
  }

  public setBlock(lx: number, y: number, lz: number, type: BlockType) {
    if (lx < 0 || lx >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return;
    }
    this.voxels[this.getIndex(lx, y, lz)] = type;
    this.isDirty = true;
  }
}

export class WorldManager {
  public chunks: Map<string, Chunk> = new Map();
  public scene: THREE.Scene;
  public simplex: SimplexNoise;
  public masterMaterials: THREE.Material[] = [];
  public modifiedBlocks: Map<string, BlockType> = new Map();
  public spawnPoint: THREE.Vector3 = new THREE.Vector3(0, 16, 0);

  // Render distance in chunks around player
  public chunkRadius = 3; // 7x7 chunks = 112x112 blocks
  public currentCenterChunk: { cx: number; cz: number } = { cx: 0, cz: 0 };

  constructor(scene: THREE.Scene, seed = 4242) {
    this.scene = scene;
    this.simplex = new SimplexNoise(seed);
    this.initMasterMaterials();
  }

  private initMasterMaterials() {
    const tm = TextureManager.getInstance();
    const getMat = (type: BlockType, face?: 'side' | 'top') => {
      const mat = tm.blockMaterials.get(type);
      if (Array.isArray(mat)) {
        if (face === 'top') return mat[2];
        return mat[0];
      }
      return mat!;
    };

    // Populate master materials matching MAT_* constants
    this.masterMaterials[MAT_GRASS_SIDE] = (tm.blockMaterials.get(BlockType.GRASS) as THREE.Material[])[0];
    this.masterMaterials[MAT_GRASS_TOP] = (tm.blockMaterials.get(BlockType.GRASS) as THREE.Material[])[2];
    this.masterMaterials[MAT_DIRT] = getMat(BlockType.DIRT);
    this.masterMaterials[MAT_STONE] = getMat(BlockType.STONE);
    this.masterMaterials[MAT_COBBLE] = getMat(BlockType.COBBLESTONE);
    this.masterMaterials[MAT_WOOD_SIDE] = (tm.blockMaterials.get(BlockType.WOOD) as THREE.Material[])[0];
    this.masterMaterials[MAT_WOOD_TOP] = (tm.blockMaterials.get(BlockType.WOOD) as THREE.Material[])[2];
    this.masterMaterials[MAT_PLANKS] = getMat(BlockType.PLANKS);
    this.masterMaterials[MAT_LEAVES] = getMat(BlockType.LEAVES);
    this.masterMaterials[MAT_SAND] = getMat(BlockType.SAND);
    this.masterMaterials[MAT_WATER] = getMat(BlockType.WATER);
    this.masterMaterials[MAT_GLASS] = getMat(BlockType.GLASS);
    this.masterMaterials[MAT_BEDROCK] = getMat(BlockType.BEDROCK);
    this.masterMaterials[MAT_BRICKS] = getMat(BlockType.BRICKS);
    this.masterMaterials[MAT_BOOKSHELF] = (tm.blockMaterials.get(BlockType.BOOKSHELF) as THREE.Material[])[0];
    this.masterMaterials[MAT_CRAFT_TOP] = (tm.blockMaterials.get(BlockType.CRAFTING_TABLE) as THREE.Material[])[2];
    this.masterMaterials[MAT_CRAFT_SIDE] = (tm.blockMaterials.get(BlockType.CRAFTING_TABLE) as THREE.Material[])[0];
    this.masterMaterials[MAT_FURNACE_FRONT] = (tm.blockMaterials.get(BlockType.FURNACE) as THREE.Material[])[4];
    this.masterMaterials[MAT_COAL] = getMat(BlockType.COAL_ORE);
    this.masterMaterials[MAT_IRON] = getMat(BlockType.IRON_ORE);
    this.masterMaterials[MAT_GOLD] = getMat(BlockType.GOLD_ORE);
    this.masterMaterials[MAT_DIAMOND] = getMat(BlockType.DIAMOND_ORE);
    this.masterMaterials[MAT_TNT_SIDE] = (tm.blockMaterials.get(BlockType.TNT) as THREE.Material[])[0];
    this.masterMaterials[MAT_TNT_TOP] = (tm.blockMaterials.get(BlockType.TNT) as THREE.Material[])[2];
    this.masterMaterials[MAT_GLOWSTONE] = getMat(BlockType.GLOWSTONE);
    this.masterMaterials[MAT_TORCH] = getMat(BlockType.TORCH);
    this.masterMaterials[MAT_FLOWER_RED] = getMat(BlockType.FLOWER_RED);
    this.masterMaterials[MAT_FLOWER_YELLOW] = getMat(BlockType.FLOWER_YELLOW);
  }

  public getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.getChunkKey(cx, cz));
  }

  public getOrCreateChunk(cx: number, cz: number): Chunk {
    const key = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz);
      this.generateTerrain(chunk);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  // Get block at global world coordinates
  public getBlock(wx: number, wy: number, wz: number): BlockType {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return BlockType.AIR;
    const key = `${wx},${wy},${wz}`;
    if (this.modifiedBlocks.has(key)) {
      return this.modifiedBlocks.get(key)!;
    }
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BlockType.AIR;
    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    return chunk.getBlock(lx, wy, lz);
  }

  // Set block at global world coordinates
  public setBlock(wx: number, wy: number, wz: number, type: BlockType) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return;
    const key = `${wx},${wy},${wz}`;
    this.modifiedBlocks.set(key, type);

    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;

    const chunk = this.getOrCreateChunk(cx, cz);
    chunk.setBlock(lx, wy, lz, type);
    this.rebuildChunkMesh(chunk);

    // Rebuild neighbor chunks if on border
    if (lx === 0) {
      const neighbor = this.getChunk(cx - 1, cz);
      if (neighbor) this.rebuildChunkMesh(neighbor);
    }
    if (lx === CHUNK_SIZE_X - 1) {
      const neighbor = this.getChunk(cx + 1, cz);
      if (neighbor) this.rebuildChunkMesh(neighbor);
    }
    if (lz === 0) {
      const neighbor = this.getChunk(cx, cz - 1);
      if (neighbor) this.rebuildChunkMesh(neighbor);
    }
    if (lz === CHUNK_SIZE_Z - 1) {
      const neighbor = this.getChunk(cx, cz + 1);
      if (neighbor) this.rebuildChunkMesh(neighbor);
    }
  }

  // Generate terrain for a chunk
  private generateTerrain(chunk: Chunk) {
    const startX = chunk.cx * CHUNK_SIZE_X;
    const startZ = chunk.cz * CHUNK_SIZE_Z;

    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        const wx = startX + lx;
        const wz = startZ + lz;

        // Base continental noise
        const n1 = this.simplex.fbm2D(wx * 0.015, wz * 0.015, 3, 0.5, 2.0);
        // Mountain peaks noise
        const n2 = Math.max(0, this.simplex.noise2D(wx * 0.03, wz * 0.03));
        const mountainElevation = Math.pow(n2, 2.2) * 12;

        let height = Math.floor(12 + n1 * 8 + mountainElevation);
        height = Math.max(4, Math.min(CHUNK_HEIGHT - 3, height));

        // Fill column
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          let block = BlockType.AIR;

          if (y === 0) {
            block = BlockType.BEDROCK;
          } else if (y < height - 3) {
            // Stone layer + Ores + 3D Caves
            const caveVal = this.simplex.noise3D(wx * 0.06, y * 0.1, wz * 0.06);
            if (caveVal > 0.45 && y > 2 && y < height - 2) {
              // Cave air pocket
              block = BlockType.AIR;
            } else {
              // Ore generation
              const oreRand = Math.abs(this.simplex.noise3D(wx * 0.2, y * 0.2, wz * 0.2));
              if (y < 7 && oreRand > 0.88) {
                block = BlockType.DIAMOND_ORE;
              } else if (y < 12 && oreRand > 0.82) {
                block = BlockType.GOLD_ORE;
              } else if (y < 18 && oreRand > 0.75) {
                block = BlockType.IRON_ORE;
              } else if (oreRand > 0.7) {
                block = BlockType.COAL_ORE;
              } else {
                block = BlockType.STONE;
              }
            }
          } else if (y < height) {
            // Sub-surface dirt
            if (height <= WATER_LEVEL + 1) {
              block = BlockType.SAND;
            } else {
              block = BlockType.DIRT;
            }
          } else if (y === height) {
            // Surface layer
            if (height <= WATER_LEVEL + 1) {
              block = BlockType.SAND;
            } else if (height > 22) {
              block = BlockType.STONE; // rocky mountain top
            } else {
              block = BlockType.GRASS;
            }
          } else if (y <= WATER_LEVEL && height < WATER_LEVEL) {
            // Water layer
            block = BlockType.WATER;
          }

          if (block !== BlockType.AIR) {
            chunk.setBlock(lx, y, lz, block);
          }
        }

        // Surface flora (flowers)
        if (height > WATER_LEVEL + 1 && height < 22) {
          const flowerVal = this.simplex.noise2D(wx * 0.2, wz * 0.2);
          if (flowerVal > 0.65) {
            chunk.setBlock(lx, height + 1, lz, BlockType.FLOWER_RED);
          } else if (flowerVal < -0.65) {
            chunk.setBlock(lx, height + 1, lz, BlockType.FLOWER_YELLOW);
          }
        }
      }
    }

    // Procedural Trees
    const treeSeed = Math.abs(chunk.cx * 37 + chunk.cz * 59);
    const numTrees = Math.floor(pseudoRandom(treeSeed) * 4); // 0 to 3 trees per chunk
    for (let t = 0; t < numTrees; t++) {
      const tx = 3 + Math.floor(pseudoRandom(treeSeed + t * 11) * 10);
      const tz = 3 + Math.floor(pseudoRandom(treeSeed + t * 23) * 10);
      const wx = startX + tx;
      const wz = startZ + tz;

      // Find surface y
      let surfaceY = -1;
      for (let y = CHUNK_HEIGHT - 6; y >= WATER_LEVEL + 1; y--) {
        if (chunk.getBlock(tx, y, tz) === BlockType.GRASS) {
          surfaceY = y;
          break;
        }
      }

      if (surfaceY > 0 && surfaceY + 6 < CHUNK_HEIGHT) {
        this.growTree(chunk, tx, surfaceY + 1, tz);
      }
    }

    // Procedural Village in chunk (0, 0) and (0, 1)
    if (chunk.cx === 0 && chunk.cz === 0) {
      this.generateVillage(chunk);
    }
  }

  // Grow an oak tree (wood trunk + leaves dome)
  private growTree(chunk: Chunk, lx: number, y: number, lz: number) {
    const trunkHeight = 4 + Math.floor(Math.random() * 2);
    // Trunk
    for (let ty = 0; ty < trunkHeight; ty++) {
      chunk.setBlock(lx, y + ty, lz, BlockType.WOOD);
    }
    // Leaves canopy
    const leafStart = y + trunkHeight - 2;
    for (let dy = 0; dy <= 3; dy++) {
      const radius = dy >= 2 ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) === radius && Math.abs(dz) === radius && dy >= 2) continue;
          const targetX = lx + dx;
          const targetY = leafStart + dy;
          const targetZ = lz + dz;
          if (chunk.getBlock(targetX, targetY, targetZ) === BlockType.AIR) {
            chunk.setBlock(targetX, targetY, targetZ, BlockType.LEAVES);
          }
        }
      }
    }
  }

  // Generate Village structures: cottages, cobblestone well, path
  private generateVillage(chunk: Chunk) {
    // Village Well at center (lx: 7-9, lz: 7-9)
    const baseGround = 13;
    for (let x = 6; x <= 10; x++) {
      for (let z = 6; z <= 10; z++) {
        for (let y = 1; y <= baseGround; y++) {
          chunk.setBlock(x, y, z, BlockType.COBBLESTONE);
        }
        chunk.setBlock(x, baseGround + 1, z, BlockType.AIR);
        chunk.setBlock(x, baseGround + 2, z, BlockType.AIR);
      }
    }
    // Well walls
    for (let x = 7; x <= 9; x++) {
      for (let z = 7; z <= 9; z++) {
        if (x === 7 || x === 9 || z === 7 || z === 9) {
          chunk.setBlock(x, baseGround + 1, z, BlockType.COBBLESTONE);
        } else {
          chunk.setBlock(x, baseGround, z, BlockType.WATER);
        }
      }
    }
    // Well posts & roof
    chunk.setBlock(7, baseGround + 2, 7, BlockType.WOOD);
    chunk.setBlock(9, baseGround + 2, 7, BlockType.WOOD);
    chunk.setBlock(7, baseGround + 2, 9, BlockType.WOOD);
    chunk.setBlock(9, baseGround + 2, 9, BlockType.WOOD);
    for (let x = 7; x <= 9; x++) {
      for (let z = 7; z <= 9; z++) {
        chunk.setBlock(x, baseGround + 3, z, BlockType.PLANKS);
      }
    }

    // Cozy Village Cottage (House 1) at lx: 1-5, lz: 1-6
    this.buildHouse(chunk, 1, baseGround, 1, 5, 4, 5);

    // Gravel/Cobble walkway
    for (let z = 0; z < CHUNK_SIZE_Z; z++) {
      chunk.setBlock(7, baseGround, z, BlockType.COBBLESTONE);
    }
  }

  private buildHouse(chunk: Chunk, startX: number, groundY: number, startZ: number, width: number, height: number, depth: number) {
    for (let x = startX; x < startX + width; x++) {
      for (let z = startZ; z < startZ + depth; z++) {
        // Floor
        chunk.setBlock(x, groundY, z, BlockType.PLANKS);

        // Hollow interior
        for (let y = groundY + 1; y <= groundY + height; y++) {
          const isCorner = (x === startX || x === startX + width - 1) && (z === startZ || z === startZ + depth - 1);
          const isWall = (x === startX || x === startX + width - 1 || z === startZ || z === startZ + depth - 1);

          if (isCorner) {
            chunk.setBlock(x, y, z, BlockType.WOOD); // Corner oak pillars
          } else if (isWall) {
            // Door opening
            if (x === startX + 2 && z === startZ + depth - 1 && (y === groundY + 1 || y === groundY + 2)) {
              chunk.setBlock(x, y, z, BlockType.AIR);
            } else if ((x === startX || x === startX + width - 1) && y === groundY + 2 && z === startZ + 2) {
              chunk.setBlock(x, y, z, BlockType.GLASS); // Glass windows!
            } else {
              chunk.setBlock(x, y, z, BlockType.PLANKS);
            }
          } else {
            chunk.setBlock(x, y, z, BlockType.AIR); // Room air
          }
        }

        // Roof
        chunk.setBlock(x, groundY + height + 1, z, BlockType.WOOD);
      }
    }

    // Furniture inside
    chunk.setBlock(startX + 1, groundY + 1, startZ + 1, BlockType.CRAFTING_TABLE);
    chunk.setBlock(startX + 2, groundY + 1, startZ + 1, BlockType.FURNACE);
    chunk.setBlock(startX + 3, groundY + 1, startZ + 1, BlockType.BOOKSHELF);
    chunk.setBlock(startX + 2, groundY + 3, startZ + 2, BlockType.TORCH);
  }

  // Load and mesh all chunks within radius around player
  public updatePlayerChunks(playerPos: THREE.Vector3) {
    const centerCx = Math.floor(playerPos.x / CHUNK_SIZE_X);
    const centerCz = Math.floor(playerPos.z / CHUNK_SIZE_Z);

    if (centerCx === this.currentCenterChunk.cx && centerCz === this.currentCenterChunk.cz && this.chunks.size > 0) {
      return;
    }

    this.currentCenterChunk = { cx: centerCx, cz: centerCz };

    for (let dx = -this.chunkRadius; dx <= this.chunkRadius; dx++) {
      for (let dz = -this.chunkRadius; dz <= this.chunkRadius; dz++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        const chunk = this.getOrCreateChunk(cx, cz);
        if (!chunk.opaqueMesh) {
          this.rebuildChunkMesh(chunk);
        }
      }
    }
  }

  // Master chunk mesh builder with face culling & ambient occlusion
  public rebuildChunkMesh(chunk: Chunk) {
    if (chunk.opaqueMesh) {
      this.scene.remove(chunk.opaqueMesh);
      chunk.opaqueMesh.geometry.dispose();
      chunk.opaqueMesh = null;
    }
    if (chunk.transparentMesh) {
      this.scene.remove(chunk.transparentMesh);
      chunk.transparentMesh.geometry.dispose();
      chunk.transparentMesh = null;
    }

    const opaquePositions: number[] = [];
    const opaqueNormals: number[] = [];
    const opaqueUvs: number[] = [];
    const opaqueColors: number[] = [];
    const opaqueGroups: { start: number; count: number; materialIndex: number }[] = [];

    const transPositions: number[] = [];
    const transNormals: number[] = [];
    const transUvs: number[] = [];
    const transColors: number[] = [];
    const transGroups: { start: number; count: number; materialIndex: number }[] = [];

    const startX = chunk.cx * CHUNK_SIZE_X;
    const startZ = chunk.cz * CHUNK_SIZE_Z;

    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
          const block = chunk.getBlock(lx, y, lz);
          if (block === BlockType.AIR) continue;

          const def = BLOCK_DEFS[block];
          const isTransparent = def.isTransparent;
          const isWater = block === BlockType.WATER;
          const isFlower = block === BlockType.FLOWER_RED || block === BlockType.FLOWER_YELLOW;

          const wx = startX + lx;
          const wz = startZ + lz;

          // Target vertex buffers
          const posList = isTransparent ? transPositions : opaquePositions;
          const normList = isTransparent ? transNormals : opaqueNormals;
          const uvList = isTransparent ? transUvs : opaqueUvs;
          const colList = isTransparent ? transColors : opaqueColors;
          const groupList = isTransparent ? transGroups : opaqueGroups;

          // Special cross-geometry for flowers and torch
          if (isFlower) {
            const matIdx = block === BlockType.FLOWER_RED ? MAT_FLOWER_RED : MAT_FLOWER_YELLOW;
            this.buildCrossGeometry(wx, y, wz, posList, normList, uvList, colList, groupList, matIdx);
            continue;
          }

          if (block === BlockType.TORCH) {
            this.buildTorchGeometry(wx, y, wz, posList, normList, uvList, colList, groupList);
            continue;
          }

          // 6 Faces: 0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z
          const faces = [
            { dir: [1, 0, 0], norm: [1, 0, 0], face: 'side' as const, corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
            { dir: [-1, 0, 0], norm: [-1, 0, 0], face: 'side' as const, corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
            { dir: [0, 1, 0], norm: [0, 1, 0], face: 'top' as const, corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
            { dir: [0, -1, 0], norm: [0, -1, 0], face: 'bottom' as const, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
            { dir: [0, 0, 1], norm: [0, 0, 1], face: 'side' as const, corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
            { dir: [0, 0, -1], norm: [0, 0, -1], face: 'side' as const, corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
          ];

          for (let f = 0; f < 6; f++) {
            const { dir, norm, face, corners } = faces[f];
            const nx = wx + dir[0];
            const ny = y + dir[1];
            const nz = wz + dir[2];
            const neighbor = this.getBlock(nx, ny, nz);

            // Culling condition:
            // Don't draw face if neighbor is solid opaque.
            // If water, only draw if neighbor is not water.
            // If leaves, only draw if neighbor is air/different.
            if (neighbor !== BlockType.AIR) {
              const nDef = BLOCK_DEFS[neighbor];
              if (!nDef.isTransparent) continue; // culled by solid block
              if (isWater && neighbor === BlockType.WATER) continue; // water adjacent to water culled
            }

            const matIndex = this.getMaterialIndex(block, face, f);
            const startIndex = posList.length / 3;

            // Push 2 triangles (6 vertices) with Ambient Occlusion
            const c = corners;
            const uvs = [
              [0, 0], [0, 1], [1, 1],
              [0, 0], [1, 1], [1, 0]
            ];
            const vertIndices = [0, 1, 2, 0, 2, 3];

            for (let i = 0; i < 6; i++) {
              const vi = vertIndices[i];
              const pt = c[vi];
              posList.push(wx + pt[0], y + pt[1], wz + pt[2]);
              normList.push(norm[0], norm[1], norm[2]);
              uvList.push(uvs[i][0], uvs[i][1]);

              // Ambient occlusion shading (0.75 - 1.0)
              const ao = this.calcVertexAO(wx, y, wz, pt, dir);
              colList.push(ao, ao, ao);
            }

            // Record group
            if (groupList.length > 0 && groupList[groupList.length - 1].materialIndex === matIndex) {
              groupList[groupList.length - 1].count += 6;
            } else {
              groupList.push({ start: startIndex, count: 6, materialIndex: matIndex });
            }
          }
        }
      }
    }

    // Build Opaque Mesh
    if (opaquePositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(opaquePositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(opaqueNormals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(opaqueUvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(opaqueColors, 3));
      for (const g of opaqueGroups) {
        geo.addGroup(g.start, g.count, g.materialIndex);
      }
      chunk.opaqueMesh = new THREE.Mesh(geo, this.masterMaterials);
      chunk.opaqueMesh.castShadow = true;
      chunk.opaqueMesh.receiveShadow = true;
      this.scene.add(chunk.opaqueMesh);
    }

    // Build Transparent Mesh
    if (transPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(transPositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(transNormals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(transUvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(transColors, 3));
      for (const g of transGroups) {
        geo.addGroup(g.start, g.count, g.materialIndex);
      }
      chunk.transparentMesh = new THREE.Mesh(geo, this.masterMaterials);
      chunk.transparentMesh.renderOrder = 1;
      this.scene.add(chunk.transparentMesh);
    }
  }

  // Cross-plane geometry for flowers
  private buildCrossGeometry(
    wx: number, y: number, wz: number,
    pos: number[], norm: number[], uv: number[], col: number[],
    groups: { start: number; count: number; materialIndex: number }[],
    matIdx: number
  ) {
    const startIndex = pos.length / 3;
    // Plane 1 (diagonal)
    const p1 = [
      wx, y, wz,  wx + 1, y, wz + 1,  wx + 1, y + 1, wz + 1,
      wx, y, wz,  wx + 1, y + 1, wz + 1,  wx, y + 1, wz
    ];
    // Plane 2 (opposite diagonal)
    const p2 = [
      wx + 1, y, wz,  wx, y, wz + 1,  wx, y + 1, wz + 1,
      wx + 1, y, wz,  wx, y + 1, wz + 1,  wx + 1, y + 1, wz
    ];
    const uvs = [
      0, 0, 1, 0, 1, 1,
      0, 0, 1, 1, 0, 1
    ];

    for (let i = 0; i < 18; i += 3) {
      pos.push(p1[i], p1[i + 1], p1[i + 2]);
      norm.push(0, 1, 0);
      uv.push(uvs[(i / 3) * 2], uvs[(i / 3) * 2 + 1]);
      col.push(1, 1, 1);
    }
    for (let i = 0; i < 18; i += 3) {
      pos.push(p2[i], p2[i + 1], p2[i + 2]);
      norm.push(0, 1, 0);
      uv.push(uvs[(i / 3) * 2], uvs[(i / 3) * 2 + 1]);
      col.push(1, 1, 1);
    }

    groups.push({ start: startIndex, count: 12, materialIndex: matIdx });
  }

  // Torch 3D box geometry
  private buildTorchGeometry(
    wx: number, y: number, wz: number,
    pos: number[], norm: number[], uv: number[], col: number[],
    groups: { start: number; count: number; materialIndex: number }[]
  ) {
    const startIndex = pos.length / 3;
    const x0 = wx + 0.4375, x1 = wx + 0.5625;
    const y0 = y, y1 = y + 0.625;
    const z0 = wz + 0.4375, z1 = wz + 0.5625;

    // +Z face
    pos.push(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y0, z1, x1, y1, z1, x0, y1, z1);
    norm.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
    uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    for (let i = 0; i < 6; i++) col.push(1, 1, 1);

    // +X face
    pos.push(x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y0, z0, x1, y1, z1, x1, y1, z0);
    norm.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
    uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    for (let i = 0; i < 6; i++) col.push(1, 1, 1);

    groups.push({ start: startIndex, count: 12, materialIndex: MAT_TORCH });
  }

  // Ambient occlusion computation for block corner/edge
  private calcVertexAO(wx: number, wy: number, wz: number, corner: number[], faceDir: number[]): number {
    // If face points up/down, check horizontal neighbors
    let occluders = 0;
    const testDirs = [
      [faceDir[0] === 0 ? corner[0] * 2 - 1 : 0, faceDir[1] === 0 ? corner[1] * 2 - 1 : 0, 0],
      [0, faceDir[1] === 0 ? corner[1] * 2 - 1 : 0, faceDir[2] === 0 ? corner[2] * 2 - 1 : 0],
    ];

    for (const d of testDirs) {
      if (d[0] === 0 && d[1] === 0 && d[2] === 0) continue;
      const b = this.getBlock(wx + faceDir[0] + d[0], wy + faceDir[1] + d[1], wz + faceDir[2] + d[2]);
      if (b !== BlockType.AIR && !BLOCK_DEFS[b].isTransparent) {
        occluders++;
      }
    }

    if (occluders >= 2) return 0.7;
    if (occluders === 1) return 0.85;
    return 1.0;
  }

  private getMaterialIndex(type: BlockType, face: 'side' | 'top' | 'bottom', faceIdx: number): number {
    switch (type) {
      case BlockType.GRASS:
        if (face === 'top') return MAT_GRASS_TOP;
        if (face === 'bottom') return MAT_DIRT;
        return MAT_GRASS_SIDE;
      case BlockType.DIRT: return MAT_DIRT;
      case BlockType.STONE: return MAT_STONE;
      case BlockType.COBBLESTONE: return MAT_COBBLE;
      case BlockType.WOOD:
        if (face === 'top' || face === 'bottom') return MAT_WOOD_TOP;
        return MAT_WOOD_SIDE;
      case BlockType.PLANKS: return MAT_PLANKS;
      case BlockType.LEAVES: return MAT_LEAVES;
      case BlockType.SAND: return MAT_SAND;
      case BlockType.WATER: return MAT_WATER;
      case BlockType.GLASS: return MAT_GLASS;
      case BlockType.BEDROCK: return MAT_BEDROCK;
      case BlockType.BRICKS: return MAT_BRICKS;
      case BlockType.BOOKSHELF:
        if (face === 'top' || face === 'bottom') return MAT_PLANKS;
        return MAT_BOOKSHELF;
      case BlockType.CRAFTING_TABLE:
        if (face === 'top') return MAT_CRAFT_TOP;
        if (face === 'bottom') return MAT_PLANKS;
        return MAT_CRAFT_SIDE;
      case BlockType.FURNACE:
        if (faceIdx === 4) return MAT_FURNACE_FRONT; // front
        return MAT_COBBLE;
      case BlockType.COAL_ORE: return MAT_COAL;
      case BlockType.IRON_ORE: return MAT_IRON;
      case BlockType.GOLD_ORE: return MAT_GOLD;
      case BlockType.DIAMOND_ORE: return MAT_DIAMOND;
      case BlockType.TNT:
        if (face === 'top' || face === 'bottom') return MAT_TNT_TOP;
        return MAT_TNT_SIDE;
      case BlockType.GLOWSTONE: return MAT_GLOWSTONE;
      default: return MAT_DIRT;
    }
  }

  // Fast DDA Voxel Raycast (Amanatides & Woo algorithm)
  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDist = 6): {
    hit: boolean;
    blockX: number;
    blockY: number;
    blockZ: number;
    faceNormal: [number, number, number];
    blockType: BlockType;
  } | null {
    let px = origin.x;
    let py = origin.y;
    let pz = origin.z;

    const dx = direction.x;
    const dy = direction.y;
    const dz = direction.z;

    let mapX = Math.floor(px);
    let mapY = Math.floor(py);
    let mapZ = Math.floor(pz);

    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;

    const deltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const deltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const deltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;

    let maxX = dx > 0 ? (Math.floor(px) + 1 - px) * deltaX : (px - Math.floor(px)) * deltaX;
    let maxY = dy > 0 ? (Math.floor(py) + 1 - py) * deltaY : (py - Math.floor(py)) * deltaY;
    let maxZ = dz > 0 ? (Math.floor(pz) + 1 - pz) * deltaZ : (pz - Math.floor(pz)) * deltaZ;

    let normalX = 0, normalY = 0, normalZ = 0;
    let dist = 0;

    while (dist < maxDist) {
      if (maxX < maxY) {
        if (maxX < maxZ) {
          mapX += stepX;
          dist = maxX;
          maxX += deltaX;
          normalX = -stepX; normalY = 0; normalZ = 0;
        } else {
          mapZ += stepZ;
          dist = maxZ;
          maxZ += deltaZ;
          normalX = 0; normalY = 0; normalZ = -stepZ;
        }
      } else {
        if (maxY < maxZ) {
          mapY += stepY;
          dist = maxY;
          maxY += deltaY;
          normalX = 0; normalY = -stepY; normalZ = 0;
        } else {
          mapZ += stepZ;
          dist = maxZ;
          maxZ += deltaZ;
          normalX = 0; normalY = 0; normalZ = -stepZ;
        }
      }

      if (dist > maxDist) break;

      const block = this.getBlock(mapX, mapY, mapZ);
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        return {
          hit: true,
          blockX: mapX,
          blockY: mapY,
          blockZ: mapZ,
          faceNormal: [normalX, normalY, normalZ],
          blockType: block,
        };
      }
    }

    return null;
  }
}

function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}
