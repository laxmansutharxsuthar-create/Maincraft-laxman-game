/**
 * Procedural Pixel Textures Generator (16x16)
 * Generates crisp Minecraft-style CanvasTextures with THREE.NearestFilter
 * Zero external image dependencies.
 */

import * as THREE from 'three';
import { BlockType } from './types';

// Helper to create a 16x16 HTML5 Canvas with pixel manipulation
function createCanvas(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 16): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx, size);
  return canvas;
}

// Pseudo random for deterministic texture noise
function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export class TextureManager {
  private static instance: TextureManager;
  public blockMaterials: Map<BlockType, THREE.Material | THREE.Material[]> = new Map();
  public itemIcons: Map<string, string> = new Map();
  public breakStages: THREE.Texture[] = [];
  public waterMaterial!: THREE.MeshStandardMaterial;

  private constructor() {
    this.initTextures();
  }

  public static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }
    return TextureManager.instance;
  }

  private createTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private initTextures() {
    // 1. Dirt Canvas
    const dirtCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#866043';
      ctx.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = pseudoRandom(x * 17 + y * 31);
          if (r < 0.25) {
            ctx.fillStyle = '#735138';
            ctx.fillRect(x, y, 1, 1);
          } else if (r > 0.8) {
            ctx.fillStyle = '#9b7151';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // 2. Grass Top Canvas
    const grassTopCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#5c8e32';
      ctx.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = pseudoRandom(x * 43 + y * 79);
          if (r < 0.25) {
            ctx.fillStyle = '#4e7a2b';
            ctx.fillRect(x, y, 1, 1);
          } else if (r > 0.8) {
            ctx.fillStyle = '#6fa43c';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // 3. Grass Side Canvas
    const grassSideCanvas = createCanvas((ctx) => {
      // Background dirt
      ctx.drawImage(dirtCanvas, 0, 0);
      // Top grassy layer with drooping pixels
      ctx.fillStyle = '#5c8e32';
      for (let x = 0; x < 16; x++) {
        const drop = Math.floor(pseudoRandom(x * 97) * 3); // 2 to 4 pixels deep
        ctx.fillRect(x, 0, 1, 2 + drop);
        if (pseudoRandom(x * 13) > 0.5) {
          ctx.fillStyle = '#4e7a2b';
          ctx.fillRect(x, 0, 1, 1);
          ctx.fillStyle = '#5c8e32';
        }
      }
    });

    // 4. Stone Canvas
    const stoneCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#7a7a7a';
      ctx.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = pseudoRandom(x * 53 + y * 67);
          if (r < 0.2) {
            ctx.fillStyle = '#656565';
            ctx.fillRect(x, y, 1, 1);
          } else if (r > 0.85) {
            ctx.fillStyle = '#8f8f8f';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // 5. Cobblestone Canvas
    const cobbleCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#6c6c6c';
      ctx.fillRect(0, 0, 16, 16);
      // Cobble mortar & stones
      const stones = [
        [1, 1, 6, 4], [8, 1, 7, 3],
        [1, 6, 7, 4], [9, 5, 6, 5],
        [1, 11, 6, 4], [8, 11, 7, 4]
      ];
      for (const [sx, sy, sw, sh] of stones) {
        ctx.fillStyle = '#868686';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.fillStyle = '#9e9e9e';
        ctx.fillRect(sx, sy, sw, 1);
        ctx.fillStyle = '#545454';
        ctx.fillRect(sx, sy + sh - 1, sw, 1);
        ctx.fillRect(sx + sw - 1, sy, 1, sh);
      }
      // Mortar lines
      ctx.fillStyle = '#424242';
      ctx.fillRect(0, 0, 16, 1);
      ctx.fillRect(0, 5, 16, 1);
      ctx.fillRect(0, 10, 16, 1);
      ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(7, 0, 1, 6);
      ctx.fillRect(8, 5, 1, 6);
      ctx.fillRect(7, 10, 1, 6);
    });

    // 6. Wood Bark Canvas (Oak)
    const woodBarkCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#674a2d';
      ctx.fillRect(0, 0, 16, 16);
      for (let x = 0; x < 16; x++) {
        const isDark = (x % 4 === 0 || x % 4 === 3);
        for (let y = 0; y < 16; y++) {
          const r = pseudoRandom(x * 19 + y * 83);
          if (isDark) {
            ctx.fillStyle = r > 0.4 ? '#4a331c' : '#573d22';
          } else {
            ctx.fillStyle = r > 0.4 ? '#785634' : '#674a2d';
          }
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });

    // 7. Wood Rings Top Canvas
    const woodTopCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#9c7b4f';
      ctx.fillRect(0, 0, 16, 16);
      // Ring bark border
      ctx.strokeStyle = '#4a331c';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 14, 14);
      // Concentric rings
      ctx.fillStyle = '#846740';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = '#9c7b4f';
      ctx.fillRect(5, 5, 6, 6);
      ctx.fillStyle = '#674a2d';
      ctx.fillRect(7, 7, 2, 2);
    });

    // 8. Planks Canvas
    const planksCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#b8945f';
      ctx.fillRect(0, 0, 16, 16);
      // Plank horizontal grooves
      for (let y = 0; y < 16; y += 4) {
        ctx.fillStyle = '#7a5e37';
        ctx.fillRect(0, y, 16, 1);
        // Vertical grain lines and nails
        ctx.fillStyle = '#5c4627';
        const splitX = (y % 8 === 0) ? 6 : 12;
        ctx.fillRect(splitX, y, 1, 4);
        // Nails
        ctx.fillStyle = '#3a2b16';
        ctx.fillRect((splitX + 2) % 16, y + 2, 1, 1);
      }
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          if (pseudoRandom(x * 29 + y * 71) > 0.8) {
            ctx.fillStyle = '#c7a36f';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // 9. Leaves Canvas (Transparent cutouts)
    const leavesCanvas = createCanvas((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = pseudoRandom(x * 61 + y * 47);
          if (r < 0.12) {
            // Cutout transparent pixel
            continue;
          } else if (r < 0.45) {
            ctx.fillStyle = '#2e5d16';
          } else if (r < 0.8) {
            ctx.fillStyle = '#3f7c20';
          } else {
            ctx.fillStyle = '#529d2b';
          }
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });

    // 10. Sand Canvas
    const sandCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#dbce95';
      ctx.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = pseudoRandom(x * 37 + y * 59);
          if (r < 0.25) {
            ctx.fillStyle = '#cebf82';
            ctx.fillRect(x, y, 1, 1);
          } else if (r > 0.85) {
            ctx.fillStyle = '#e8dcab';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // 11. Water Canvas
    const waterCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#2f6bc7';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#4585e6';
      ctx.fillRect(1, 2, 5, 2);
      ctx.fillRect(8, 6, 6, 2);
      ctx.fillRect(3, 11, 7, 2);
      ctx.fillStyle = '#6ca2fa';
      ctx.fillRect(2, 3, 3, 1);
      ctx.fillRect(9, 7, 3, 1);
    });

    // 12. Glass Canvas
    const glassCanvas = createCanvas((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      // Border frame
      ctx.fillStyle = 'rgba(230, 245, 255, 0.7)';
      ctx.fillRect(0, 0, 16, 1);
      ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(0, 0, 1, 16);
      ctx.fillRect(15, 0, 1, 16);
      // Diagonal glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(3, 3, 2, 1);
      ctx.fillRect(4, 4, 2, 1);
      ctx.fillRect(10, 10, 3, 1);
      ctx.fillRect(12, 11, 2, 1);
    });

    // 13. Bedrock Canvas
    const bedrockCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#1c1c1c';
      ctx.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = pseudoRandom(x * 89 + y * 97);
          if (r < 0.3) {
            ctx.fillStyle = '#333333';
            ctx.fillRect(x, y, 1, 1);
          } else if (r > 0.8) {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // 14. Bricks Canvas
    const bricksCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#9b4737';
      ctx.fillRect(0, 0, 16, 16);
      // Mortar
      ctx.fillStyle = '#c5b8a5';
      ctx.fillRect(0, 3, 16, 1);
      ctx.fillRect(0, 7, 16, 1);
      ctx.fillRect(0, 11, 16, 1);
      ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(4, 0, 1, 3);
      ctx.fillRect(12, 0, 1, 3);
      ctx.fillRect(8, 4, 1, 3);
      ctx.fillRect(4, 8, 1, 3);
      ctx.fillRect(12, 8, 1, 3);
      ctx.fillRect(8, 12, 1, 3);
    });

    // 15. Bookshelf Canvas
    const bookshelfCanvas = createCanvas((ctx) => {
      ctx.drawImage(planksCanvas, 0, 0);
      // 2 shelf recesses
      ctx.fillStyle = '#3a2717';
      ctx.fillRect(1, 2, 14, 5);
      ctx.fillRect(1, 9, 14, 5);
      // Books on top shelf
      const colors = ['#a82b2b', '#2b6ea8', '#388e3c', '#d4a017', '#8e24aa'];
      let bx = 2;
      while (bx < 14) {
        ctx.fillStyle = colors[bx % colors.length];
        const bw = (bx % 3 === 0) ? 2 : 1;
        ctx.fillRect(bx, 2, bw, 5);
        ctx.fillStyle = '#fff';
        ctx.fillRect(bx, 4, bw, 1); // bookmark / pages
        bx += bw;
      }
      // Books on bottom shelf
      bx = 2;
      while (bx < 14) {
        ctx.fillStyle = colors[(bx + 2) % colors.length];
        const bw = (bx % 2 === 0) ? 2 : 1;
        ctx.fillRect(bx, 9, bw, 5);
        ctx.fillStyle = '#fff';
        ctx.fillRect(bx, 11, bw, 1);
        bx += bw;
      }
    });

    // 16. Crafting Table Top Canvas
    const craftTopCanvas = createCanvas((ctx) => {
      ctx.drawImage(planksCanvas, 0, 0);
      ctx.strokeStyle = '#5c4021';
      ctx.lineWidth = 1;
      ctx.strokeRect(2.5, 2.5, 11, 11);
      // 3x3 grid lines
      ctx.fillStyle = '#5c4021';
      ctx.fillRect(6, 3, 1, 10);
      ctx.fillRect(10, 3, 1, 10);
      ctx.fillRect(3, 6, 10, 1);
      ctx.fillRect(3, 10, 10, 1);
    });

    // Crafting Table Side Canvas
    const craftSideCanvas = createCanvas((ctx) => {
      ctx.drawImage(planksCanvas, 0, 0);
      ctx.fillStyle = '#5c4021';
      ctx.fillRect(2, 2, 12, 1);
      // Saw & hammer silhouette
      ctx.fillStyle = '#7a7a7a';
      ctx.fillRect(4, 5, 2, 7);
      ctx.fillRect(3, 10, 4, 2);
      ctx.fillRect(10, 5, 3, 2);
      ctx.fillStyle = '#5c4021';
      ctx.fillRect(11, 7, 1, 5);
    });

    // 17. Furnace Front Canvas
    const furnaceFrontCanvas = createCanvas((ctx) => {
      ctx.drawImage(cobbleCanvas, 0, 0);
      // Opening
      ctx.fillStyle = '#1c1c1c';
      ctx.fillRect(3, 5, 10, 8);
      // Fiery glowing embers inside
      ctx.fillStyle = '#e65100';
      ctx.fillRect(4, 9, 8, 3);
      ctx.fillStyle = '#ffb300';
      ctx.fillRect(5, 10, 6, 2);
      ctx.fillStyle = '#ffe082';
      ctx.fillRect(7, 10, 2, 1);
    });

    // Helper for Ores based on stone
    const createOreCanvas = (oreColor: string, shineColor?: string) => {
      return createCanvas((ctx) => {
        ctx.drawImage(stoneCanvas, 0, 0);
        const flecks = [
          [2, 3], [3, 4], [4, 3],
          [10, 2], [11, 3],
          [6, 8], [7, 8], [7, 9],
          [2, 11], [3, 12],
          [12, 11], [13, 11], [12, 12],
          [8, 13]
        ];
        ctx.fillStyle = oreColor;
        for (const [ox, oy] of flecks) {
          ctx.fillRect(ox, oy, 1, 1);
        }
        if (shineColor) {
          ctx.fillStyle = shineColor;
          ctx.fillRect(3, 3, 1, 1);
          ctx.fillRect(7, 8, 1, 1);
          ctx.fillRect(12, 11, 1, 1);
        }
      });
    };

    // 18. Coal Ore
    const coalOreCanvas = createOreCanvas('#212121', '#424242');
    // 19. Iron Ore
    const ironOreCanvas = createOreCanvas('#d8af93', '#f2d4bf');
    // 20. Gold Ore
    const goldOreCanvas = createOreCanvas('#fbc02d', '#fff59d');
    // 21. Diamond Ore
    const diamondOreCanvas = createOreCanvas('#26c6da', '#b2ebf2');

    // 22. TNT Canvas
    const tntSideCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(0, 0, 16, 16);
      // White band
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 5, 16, 6);
      // "TNT" text pixels
      ctx.fillStyle = '#111';
      // T
      ctx.fillRect(2, 6, 3, 1);
      ctx.fillRect(3, 7, 1, 3);
      // N
      ctx.fillRect(6, 6, 1, 4);
      ctx.fillRect(7, 7, 1, 1);
      ctx.fillRect(8, 8, 1, 1);
      ctx.fillRect(9, 6, 1, 4);
      // T
      ctx.fillRect(11, 6, 3, 1);
      ctx.fillRect(12, 7, 1, 3);
    });

    const tntTopCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#424242';
      ctx.fillRect(7, 7, 2, 2); // fuse center
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(6, 6, 1, 1);
    });

    // 23. Glowstone Canvas
    const glowstoneCanvas = createCanvas((ctx) => {
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = pseudoRandom(x * 67 + y * 73);
          if (r < 0.2) {
            ctx.fillStyle = '#ffb300';
            ctx.fillRect(x, y, 1, 1);
          } else if (r > 0.8) {
            ctx.fillStyle = '#fff9c4';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // 24. Torch Canvas (for block / item)
    const torchCanvas = createCanvas((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      // Stick
      ctx.fillStyle = '#674a2d';
      ctx.fillRect(7, 6, 2, 8);
      // Coal tip
      ctx.fillStyle = '#212121';
      ctx.fillRect(7, 4, 2, 2);
      // Flame
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(6, 2, 4, 3);
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(7, 2, 2, 2);
    });

    // 25. Flower Red (Poppy)
    const flowerRedCanvas = createCanvas((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      // Stem
      ctx.fillStyle = '#388e3c';
      ctx.fillRect(7, 8, 2, 8);
      ctx.fillRect(6, 11, 1, 2);
      // Petals
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(5, 4, 6, 5);
      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(6, 5, 4, 3);
      ctx.fillStyle = '#212121';
      ctx.fillRect(7, 6, 2, 1);
    });

    // 26. Flower Yellow (Dandelion)
    const flowerYellowCanvas = createCanvas((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      // Stem
      ctx.fillStyle = '#388e3c';
      ctx.fillRect(7, 8, 2, 8);
      // Flower head
      ctx.fillStyle = '#fbc02d';
      ctx.fillRect(5, 4, 6, 5);
      ctx.fillStyle = '#fff59d';
      ctx.fillRect(6, 5, 4, 3);
    });

    // Convert canvases to Three.js textures
    const texDirt = this.createTexture(dirtCanvas);
    const texGrassTop = this.createTexture(grassTopCanvas);
    const texGrassSide = this.createTexture(grassSideCanvas);
    const texStone = this.createTexture(stoneCanvas);
    const texCobble = this.createTexture(cobbleCanvas);
    const texWoodBark = this.createTexture(woodBarkCanvas);
    const texWoodTop = this.createTexture(woodTopCanvas);
    const texPlanks = this.createTexture(planksCanvas);
    const texLeaves = this.createTexture(leavesCanvas);
    const texSand = this.createTexture(sandCanvas);
    const texWater = this.createTexture(waterCanvas);
    const texGlass = this.createTexture(glassCanvas);
    const texBedrock = this.createTexture(bedrockCanvas);
    const texBricks = this.createTexture(bricksCanvas);
    const texBookshelf = this.createTexture(bookshelfCanvas);
    const texCraftTop = this.createTexture(craftTopCanvas);
    const texCraftSide = this.createTexture(craftSideCanvas);
    const texFurnaceFront = this.createTexture(furnaceFrontCanvas);
    const texCoal = this.createTexture(coalOreCanvas);
    const texIron = this.createTexture(ironOreCanvas);
    const texGold = this.createTexture(goldOreCanvas);
    const texDiamond = this.createTexture(diamondOreCanvas);
    const texTntSide = this.createTexture(tntSideCanvas);
    const texTntTop = this.createTexture(tntTopCanvas);
    const texGlowstone = this.createTexture(glowstoneCanvas);
    const texTorch = this.createTexture(torchCanvas);
    const texFlowerRed = this.createTexture(flowerRedCanvas);
    const texFlowerYellow = this.createTexture(flowerYellowCanvas);

    // Standard material factory
    const makeMat = (map: THREE.Texture, roughness = 0.85, metalness = 0.05) =>
      new THREE.MeshStandardMaterial({ map, roughness, metalness });

    // Multi-face material order in Three.js Box: [ +X, -X, +Y, -Y, +Z, -Z ]
    // (Right, Left, Top, Bottom, Front, Back)

    // Grass: side, side, top, bottom, side, side
    const matGrassSide = makeMat(texGrassSide);
    const matGrassTop = makeMat(texGrassTop);
    const matDirt = makeMat(texDirt);
    this.blockMaterials.set(BlockType.GRASS, [
      matGrassSide, matGrassSide, matGrassTop, matDirt, matGrassSide, matGrassSide
    ]);

    this.blockMaterials.set(BlockType.DIRT, matDirt);
    this.blockMaterials.set(BlockType.STONE, makeMat(texStone, 0.9));
    this.blockMaterials.set(BlockType.COBBLESTONE, makeMat(texCobble, 0.95));

    // Wood Log
    const matWoodBark = makeMat(texWoodBark, 0.8);
    const matWoodTop = makeMat(texWoodTop, 0.8);
    this.blockMaterials.set(BlockType.WOOD, [
      matWoodBark, matWoodBark, matWoodTop, matWoodTop, matWoodBark, matWoodBark
    ]);

    this.blockMaterials.set(BlockType.PLANKS, makeMat(texPlanks, 0.7));
    this.blockMaterials.set(BlockType.LEAVES, new THREE.MeshStandardMaterial({
      map: texLeaves,
      transparent: true,
      alphaTest: 0.2,
      roughness: 0.6,
    }));
    this.blockMaterials.set(BlockType.SAND, makeMat(texSand, 0.9));

    // Water
    this.waterMaterial = new THREE.MeshStandardMaterial({
      map: texWater,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.1,
    });
    this.blockMaterials.set(BlockType.WATER, this.waterMaterial);

    // Glass
    this.blockMaterials.set(BlockType.GLASS, new THREE.MeshStandardMaterial({
      map: texGlass,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
    }));

    this.blockMaterials.set(BlockType.BEDROCK, makeMat(texBedrock, 0.9, 0.1));
    this.blockMaterials.set(BlockType.BRICKS, makeMat(texBricks, 0.85));

    // Bookshelf
    const matBookshelf = makeMat(texBookshelf, 0.7);
    const matPlank = makeMat(texPlanks, 0.7);
    this.blockMaterials.set(BlockType.BOOKSHELF, [
      matBookshelf, matBookshelf, matPlank, matPlank, matBookshelf, matBookshelf
    ]);

    // Crafting table
    const matCraftTop = makeMat(texCraftTop, 0.7);
    const matCraftSide = makeMat(texCraftSide, 0.7);
    this.blockMaterials.set(BlockType.CRAFTING_TABLE, [
      matCraftSide, matCraftSide, matCraftTop, matPlank, matCraftSide, matCraftSide
    ]);

    // Furnace
    const matFurnaceFront = makeMat(texFurnaceFront, 0.9);
    const matCobble = makeMat(texCobble, 0.95);
    this.blockMaterials.set(BlockType.FURNACE, [
      matCobble, matCobble, matCobble, matCobble, matFurnaceFront, matCobble
    ]);

    this.blockMaterials.set(BlockType.COAL_ORE, makeMat(texCoal, 0.9));
    this.blockMaterials.set(BlockType.IRON_ORE, makeMat(texIron, 0.8, 0.2));
    this.blockMaterials.set(BlockType.GOLD_ORE, makeMat(texGold, 0.6, 0.4));
    this.blockMaterials.set(BlockType.DIAMOND_ORE, makeMat(texDiamond, 0.5, 0.3));

    // TNT
    const matTntSide = makeMat(texTntSide, 0.7);
    const matTntTop = makeMat(texTntTop, 0.7);
    this.blockMaterials.set(BlockType.TNT, [
      matTntSide, matTntSide, matTntTop, matTntTop, matTntSide, matTntSide
    ]);

    // Glowstone
    this.blockMaterials.set(BlockType.GLOWSTONE, new THREE.MeshStandardMaterial({
      map: texGlowstone,
      emissive: new THREE.Color('#ffe082'),
      emissiveIntensity: 0.6,
      roughness: 0.4
    }));

    // Torch
    this.blockMaterials.set(BlockType.TORCH, new THREE.MeshStandardMaterial({
      map: texTorch,
      transparent: true,
      alphaTest: 0.3,
      emissive: new THREE.Color('#ffb300'),
      emissiveIntensity: 0.5,
    }));

    // Flowers
    this.blockMaterials.set(BlockType.FLOWER_RED, new THREE.MeshStandardMaterial({
      map: texFlowerRed,
      transparent: true,
      alphaTest: 0.3,
      side: THREE.DoubleSide
    }));

    this.blockMaterials.set(BlockType.FLOWER_YELLOW, new THREE.MeshStandardMaterial({
      map: texFlowerYellow,
      transparent: true,
      alphaTest: 0.3,
      side: THREE.DoubleSide
    }));

    // Breaking Stage textures (cracks 0 to 9)
    for (let stage = 0; stage < 10; stage++) {
      const crackCanvas = createCanvas((ctx) => {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const count = (stage + 1) * 7;
        for (let i = 0; i < count; i++) {
          const cx = Math.floor(pseudoRandom(i * 13 + stage * 71) * 16);
          const cy = Math.floor(pseudoRandom(i * 29 + stage * 43) * 16);
          ctx.fillRect(cx, cy, 1, 1);
        }
      });
      const crackTex = this.createTexture(crackCanvas);
      this.breakStages.push(crackTex);
    }

    // Cache Data URLs for Inventory UI Icons
    this.itemIcons.set('block_' + BlockType.GRASS, grassSideCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.DIRT, dirtCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.STONE, stoneCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.COBBLESTONE, cobbleCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.WOOD, woodBarkCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.PLANKS, planksCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.LEAVES, leavesCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.SAND, sandCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.WATER, waterCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.GLASS, glassCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.BEDROCK, bedrockCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.BRICKS, bricksCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.BOOKSHELF, bookshelfCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.CRAFTING_TABLE, craftTopCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.FURNACE, furnaceFrontCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.COAL_ORE, coalOreCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.IRON_ORE, ironOreCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.GOLD_ORE, goldOreCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.DIAMOND_ORE, diamondOreCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.TNT, tntSideCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.GLOWSTONE, glowstoneCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.TORCH, torchCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.FLOWER_RED, flowerRedCanvas.toDataURL());
    this.itemIcons.set('block_' + BlockType.FLOWER_YELLOW, flowerYellowCanvas.toDataURL());

    // Tools & Food item icons
    this.generateToolAndFoodIcons();
  }

  private generateToolAndFoodIcons() {
    // Pickaxe Icon
    const pickCanvas = createCanvas((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      // Handle
      ctx.fillStyle = '#674a2d';
      for (let i = 0; i < 9; i++) {
        ctx.fillRect(3 + i, 12 - i, 1, 1);
      }
      // Head
      ctx.fillStyle = '#7a7a7a';
      ctx.fillRect(8, 2, 6, 2);
      ctx.fillRect(12, 4, 2, 3);
      ctx.fillRect(6, 4, 3, 2);
    });
    this.itemIcons.set('tool_pickaxe', pickCanvas.toDataURL());

    // Sword Icon
    const swordCanvas = createCanvas((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      // Blade
      ctx.fillStyle = '#9e9e9e';
      for (let i = 0; i < 9; i++) {
        ctx.fillRect(5 + i, 10 - i, 2, 2);
      }
      // Guard
      ctx.fillStyle = '#4a331c';
      ctx.fillRect(4, 11, 4, 1);
      ctx.fillRect(5, 12, 1, 3);
    });
    this.itemIcons.set('tool_sword', swordCanvas.toDataURL());

    // Axe Icon
    const axeCanvas = createCanvas((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#674a2d';
      for (let i = 0; i < 9; i++) ctx.fillRect(3 + i, 12 - i, 1, 1);
      ctx.fillStyle = '#7a7a7a';
      ctx.fillRect(9, 2, 4, 4);
      ctx.fillRect(13, 3, 2, 2);
    });
    this.itemIcons.set('tool_axe', axeCanvas.toDataURL());

    // Apple Icon
    const appleCanvas = createCanvas((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#4a331c';
      ctx.fillRect(8, 2, 1, 2); // stem
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillRect(5, 12, 6, 1);
      ctx.fillRect(5, 3, 6, 1);
      ctx.fillStyle = '#ff7961';
      ctx.fillRect(5, 5, 2, 2); // shine
    });
    this.itemIcons.set('food_apple', appleCanvas.toDataURL());

    // Bread Icon
    const breadCanvas = createCanvas((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#c79a5b';
      ctx.fillRect(2, 6, 12, 5);
      ctx.fillStyle = '#8d5e23';
      ctx.fillRect(3, 5, 10, 1);
      ctx.fillRect(4, 7, 2, 1);
      ctx.fillRect(8, 7, 2, 1);
    });
    this.itemIcons.set('food_bread', breadCanvas.toDataURL());

    // Meat (Steak) Icon
    const meatCanvas = createCanvas((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#8d433b';
      ctx.fillRect(3, 5, 10, 6);
      ctx.fillStyle = '#b76359';
      ctx.fillRect(4, 6, 6, 3);
      ctx.fillStyle = '#eee';
      ctx.fillRect(11, 4, 2, 2); // bone
    });
    this.itemIcons.set('food_meat', meatCanvas.toDataURL());
  }
}
