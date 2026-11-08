/**
 * Block World 3D - Core Types & Enums
 */

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  COBBLESTONE = 4,
  WOOD = 5,
  PLANKS = 6,
  LEAVES = 7,
  SAND = 8,
  WATER = 9,
  GLASS = 10,
  BEDROCK = 11,
  BRICKS = 12,
  BOOKSHELF = 13,
  CRAFTING_TABLE = 14,
  FURNACE = 15,
  COAL_ORE = 16,
  IRON_ORE = 17,
  GOLD_ORE = 18,
  DIAMOND_ORE = 19,
  TNT = 20,
  GLOWSTONE = 21,
  TORCH = 22,
  FLOWER_RED = 23,
  FLOWER_YELLOW = 24,
}

export enum ItemType {
  BLOCK = 'block',
  TOOL = 'tool',
  FOOD = 'food',
  RESOURCE = 'resource',
}

export interface InventoryItem {
  id: string;
  blockType?: BlockType;
  name: string;
  count: number;
  maxStack: number;
  itemType: ItemType;
  icon?: string;
  durability?: number;
  maxDurability?: number;
  foodRestore?: number;
  damage?: number;
  toolType?: 'pickaxe' | 'axe' | 'sword' | 'shovel';
  toolTier?: number; // 1: wood, 2: stone, 3: iron, 4: diamond
}

export type GameMode = 'survival' | 'creative';

export type CameraMode = 'first_person' | 'third_person';

export interface GameSettings {
  fov: number;
  renderDistance: number;
  mouseSensitivity: number;
  soundVolume: number;
  musicVolume: number;
  viewBobbing: boolean;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  air: number;
  maxAir: number;
  isDead: boolean;
  score: number;
  level: number;
  xp: number;
  isFlying: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  isUnderwater: boolean;
}

export interface VoxelRaycastHit {
  blockX: number;
  blockY: number;
  blockZ: number;
  faceNormal: [number, number, number];
  distance: number;
  blockType: BlockType;
}

export type MobType = 'zombie' | 'skeleton' | 'cow' | 'sheep' | 'pig';

export interface MobEntity {
  id: string;
  type: MobType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  health: number;
  maxHealth: number;
  isHostile: boolean;
  hurtTimer: number;
  walkCycle: number;
  target?: { x: number; y: number; z: number };
}
