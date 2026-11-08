/**
 * Inventory Management & Crafting System
 */

import { BlockType, InventoryItem, ItemType } from './types';
import { BLOCK_DEFS } from './blocks';

export interface CraftingRecipe {
  id: string;
  name: string;
  result: InventoryItem;
  pattern: (string | null)[][]; // 2x2 or 3x3 pattern
}

export class InventoryManager {
  // 36 slots: 0-8 are Hotbar, 9-35 are Main Inventory
  public slots: (InventoryItem | null)[] = new Array(36).fill(null);
  public selectedHotbarIndex = 0;

  // 2x2 pocket crafting or 3x3 table crafting
  public craftingGrid: (InventoryItem | null)[] = new Array(9).fill(null);
  public craftingOutput: InventoryItem | null = null;
  public isTableMode = false;

  constructor() {
    this.initStartingInventory();
  }

  // Populate starting items (Survival tools & building materials)
  public initStartingInventory() {
    this.slots.fill(null);

    // Initial hotbar items
    this.slots[0] = {
      id: 'tool_pickaxe_wood',
      name: 'Wooden Pickaxe',
      count: 1,
      maxStack: 1,
      itemType: ItemType.TOOL,
      toolType: 'pickaxe',
      toolTier: 1,
      durability: 60,
      maxDurability: 60,
      damage: 3,
    };
    this.slots[1] = {
      id: 'tool_sword_wood',
      name: 'Wooden Sword',
      count: 1,
      maxStack: 1,
      itemType: ItemType.TOOL,
      toolType: 'sword',
      toolTier: 1,
      durability: 60,
      maxDurability: 60,
      damage: 5,
    };
    this.slots[2] = {
      id: 'block_' + BlockType.WOOD,
      blockType: BlockType.WOOD,
      name: 'Oak Log',
      count: 16,
      maxStack: 64,
      itemType: ItemType.BLOCK,
    };
    this.slots[3] = {
      id: 'block_' + BlockType.TORCH,
      blockType: BlockType.TORCH,
      name: 'Torch',
      count: 12,
      maxStack: 64,
      itemType: ItemType.BLOCK,
    };
    this.slots[4] = {
      id: 'food_apple',
      name: 'Apple',
      count: 8,
      maxStack: 64,
      itemType: ItemType.FOOD,
      foodRestore: 4,
    };
    this.slots[5] = {
      id: 'food_bread',
      name: 'Bread',
      count: 6,
      maxStack: 64,
      itemType: ItemType.FOOD,
      foodRestore: 5,
    };
    this.slots[6] = {
      id: 'block_' + BlockType.COBBLESTONE,
      blockType: BlockType.COBBLESTONE,
      name: 'Cobblestone',
      count: 32,
      maxStack: 64,
      itemType: ItemType.BLOCK,
    };
  }

  public getSelectedItem(): InventoryItem | null {
    return this.slots[this.selectedHotbarIndex];
  }

  // Add item to inventory (stack if existing, otherwise find empty slot)
  public addItem(item: InventoryItem): boolean {
    // 1. Try to stack with existing items
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot && slot.id === item.id && slot.count < slot.maxStack) {
        const canAdd = Math.min(item.count, slot.maxStack - slot.count);
        slot.count += canAdd;
        item.count -= canAdd;
        if (item.count <= 0) return true;
      }
    }

    // 2. Put into first empty slot
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i]) {
        this.slots[i] = { ...item };
        return true;
      }
    }

    return false; // inventory full
  }

  // Consume 1 count of selected item
  public consumeSelectedItem(): boolean {
    const item = this.getSelectedItem();
    if (!item) return false;
    item.count--;
    if (item.count <= 0) {
      this.slots[this.selectedHotbarIndex] = null;
    }
    return true;
  }

  // Swap or move items between slots
  public swapSlots(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const temp = this.slots[fromIndex];
    this.slots[fromIndex] = this.slots[toIndex];
    this.slots[toIndex] = temp;
  }

  // Check recipes in crafting grid
  public checkCrafting(): InventoryItem | null {
    const g = this.craftingGrid;
    const is3x3 = this.isTableMode;

    // Helper: count filled crafting slots
    const filledCount = g.filter((s) => s !== null && s.count > 0).length;
    if (filledCount === 0) {
      this.craftingOutput = null;
      return null;
    }

    // 1. Wood Log -> 4 Planks (1 item anywhere)
    if (filledCount === 1) {
      const singleItem = g.find((s) => s !== null);
      if (singleItem && singleItem.blockType === BlockType.WOOD) {
        this.craftingOutput = {
          id: 'block_' + BlockType.PLANKS,
          blockType: BlockType.PLANKS,
          name: 'Oak Planks',
          count: 4,
          maxStack: 64,
          itemType: ItemType.BLOCK,
        };
        return this.craftingOutput;
      }
    }

    // 2. 4 Planks (2x2) -> Crafting Table
    if (filledCount === 4) {
      const allPlanks = g.every((s, idx) => {
        if (!is3x3 && idx < 4) return s?.blockType === BlockType.PLANKS;
        if (is3x3 && (idx === 0 || idx === 1 || idx === 3 || idx === 4)) return s?.blockType === BlockType.PLANKS;
        return s === null;
      });
      if (allPlanks) {
        this.craftingOutput = {
          id: 'block_' + BlockType.CRAFTING_TABLE,
          blockType: BlockType.CRAFTING_TABLE,
          name: 'Crafting Table',
          count: 1,
          maxStack: 64,
          itemType: ItemType.BLOCK,
        };
        return this.craftingOutput;
      }
    }

    // 3. 2 Planks vertical -> 4 Sticks
    if (filledCount === 2) {
      const isPlank = (item: InventoryItem | null) => item?.blockType === BlockType.PLANKS;
      if ((isPlank(g[0]) && isPlank(g[is3x3 ? 3 : 2])) || (isPlank(g[1]) && isPlank(g[is3x3 ? 4 : 3]))) {
        this.craftingOutput = {
          id: 'resource_stick',
          name: 'Stick',
          count: 4,
          maxStack: 64,
          itemType: ItemType.RESOURCE,
        };
        return this.craftingOutput;
      }

      // Coal + Stick -> 4 Torches
      const isTorchCraft = (top: InventoryItem | null, bottom: InventoryItem | null) =>
        (top?.blockType === BlockType.COAL_ORE || top?.id === 'resource_coal') && bottom?.id === 'resource_stick';

      if (isTorchCraft(g[0], g[is3x3 ? 3 : 2]) || isTorchCraft(g[1], g[is3x3 ? 4 : 3])) {
        this.craftingOutput = {
          id: 'block_' + BlockType.TORCH,
          blockType: BlockType.TORCH,
          name: 'Torch',
          count: 4,
          maxStack: 64,
          itemType: ItemType.BLOCK,
        };
        return this.craftingOutput;
      }
    }

    // 4. Tools (Pickaxe, Sword) in 3x3 Table mode
    if (is3x3) {
      // Pickaxe: 3 materials on top row, 2 sticks below center
      const row0Match = g[0] && g[1] && g[2] && g[0].id === g[1].id && g[1].id === g[2].id;
      const sticksBelow = g[4]?.id === 'resource_stick' && g[7]?.id === 'resource_stick';
      if (row0Match && sticksBelow && filledCount === 5) {
        const mat = g[0]!;
        let tier = 1;
        let toolName = 'Wooden Pickaxe';
        let dur = 60;
        if (mat.blockType === BlockType.COBBLESTONE) { tier = 2; toolName = 'Stone Pickaxe'; dur = 130; }
        else if (mat.blockType === BlockType.IRON_ORE || mat.id === 'resource_iron') { tier = 3; toolName = 'Iron Pickaxe'; dur = 250; }
        else if (mat.blockType === BlockType.DIAMOND_ORE || mat.id === 'resource_diamond') { tier = 4; toolName = 'Diamond Pickaxe'; dur = 1000; }

        this.craftingOutput = {
          id: 'tool_pickaxe_' + tier,
          name: toolName,
          count: 1,
          maxStack: 1,
          itemType: ItemType.TOOL,
          toolType: 'pickaxe',
          toolTier: tier,
          durability: dur,
          maxDurability: dur,
          damage: 2 + tier,
        };
        return this.craftingOutput;
      }

      // Sword: 2 materials vertically, 1 stick at bottom
      const swordBlade = g[1] && g[4] && g[1].id === g[4].id;
      const swordStick = g[7]?.id === 'resource_stick';
      if (swordBlade && swordStick && filledCount === 3) {
        const mat = g[1]!;
        let tier = 1;
        let toolName = 'Wooden Sword';
        let dur = 60;
        if (mat.blockType === BlockType.COBBLESTONE) { tier = 2; toolName = 'Stone Sword'; dur = 130; }
        else if (mat.blockType === BlockType.IRON_ORE) { tier = 3; toolName = 'Iron Sword'; dur = 250; }
        else if (mat.blockType === BlockType.DIAMOND_ORE) { tier = 4; toolName = 'Diamond Sword'; dur = 1000; }

        this.craftingOutput = {
          id: 'tool_sword_' + tier,
          name: toolName,
          count: 1,
          maxStack: 1,
          itemType: ItemType.TOOL,
          toolType: 'sword',
          toolTier: tier,
          durability: dur,
          maxDurability: dur,
          damage: 4 + tier * 2,
        };
        return this.craftingOutput;
      }

      // 8 Cobblestone around border -> Furnace
      const isFurnace = g[0] && g[1] && g[2] && g[3] && !g[4] && g[5] && g[6] && g[7] && g[8] &&
        [g[0], g[1], g[2], g[3], g[5], g[6], g[7], g[8]].every(s => s?.blockType === BlockType.COBBLESTONE);
      if (isFurnace) {
        this.craftingOutput = {
          id: 'block_' + BlockType.FURNACE,
          blockType: BlockType.FURNACE,
          name: 'Furnace',
          count: 1,
          maxStack: 64,
          itemType: ItemType.BLOCK,
        };
        return this.craftingOutput;
      }
    }

    this.craftingOutput = null;
    return null;
  }

  // Execute craft: consumes 1 from each populated crafting slot and puts output into inventory
  public executeCraft(): boolean {
    if (!this.craftingOutput) return false;
    const output = { ...this.craftingOutput };

    if (!this.addItem(output)) return false;

    // Deduct 1 from used crafting ingredients
    for (let i = 0; i < this.craftingGrid.length; i++) {
      const item = this.craftingGrid[i];
      if (item) {
        item.count--;
        if (item.count <= 0) {
          this.craftingGrid[i] = null;
        }
      }
    }

    this.checkCrafting();
    return true;
  }
}
