/**
 * Inventory & Crafting Screen Modal
 */

import React, { useState } from 'react';
import { GameEngine } from '../game/engine';
import { TextureManager } from '../game/textures';
import { BlockType, InventoryItem, ItemType } from '../game/types';
import { BLOCK_DEFS } from '../game/blocks';
import { X, Hammer, Compass, Sparkles } from 'lucide-react';

interface InventoryModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ engine, onClose }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'creative'>('inventory');
  const [, setRefresh] = useState(0);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const tm = TextureManager.getInstance();
  const inv = engine.inventory;
  const isCreative = engine.player.gameMode === 'creative';
  const isTable = inv.isTableMode;

  const handleSlotClick = (slotIndex: number) => {
    if (selectedSlotIndex === null) {
      if (inv.slots[slotIndex]) {
        setSelectedSlotIndex(slotIndex);
      }
    } else {
      inv.swapSlots(selectedSlotIndex, slotIndex);
      setSelectedSlotIndex(null);
      setRefresh((r) => r + 1);
    }
  };

  const handleCraftingGridClick = (gridIndex: number) => {
    if (selectedSlotIndex !== null) {
      const fromItem = inv.slots[selectedSlotIndex];
      if (fromItem) {
        // Place 1 into crafting slot
        const currentCraftItem = inv.craftingGrid[gridIndex];
        if (!currentCraftItem) {
          inv.craftingGrid[gridIndex] = { ...fromItem, count: 1 };
          fromItem.count--;
          if (fromItem.count <= 0) inv.slots[selectedSlotIndex] = null;
        } else if (currentCraftItem.id === fromItem.id) {
          currentCraftItem.count++;
          fromItem.count--;
          if (fromItem.count <= 0) inv.slots[selectedSlotIndex] = null;
        }
      }
      inv.checkCrafting();
      setRefresh((r) => r + 1);
    } else {
      // Pick up from crafting slot back to inventory
      const craftItem = inv.craftingGrid[gridIndex];
      if (craftItem) {
        inv.addItem(craftItem);
        inv.craftingGrid[gridIndex] = null;
        inv.checkCrafting();
        setRefresh((r) => r + 1);
      }
    }
  };

  const handleCraftOutputClick = () => {
    if (inv.executeCraft()) {
      engine.audio.playPickup();
      setRefresh((r) => r + 1);
    }
  };

  // Add creative item to inventory
  const handleCreativeItemClick = (item: InventoryItem) => {
    inv.addItem({ ...item, count: item.maxStack });
    engine.audio.playPickup();
    setRefresh((r) => r + 1);
  };

  // Catalog of all 24+ blocks for Creative Mode
  const creativeBlocks: InventoryItem[] = [
    { id: 'block_' + BlockType.GRASS, blockType: BlockType.GRASS, name: 'Grass Block', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.DIRT, blockType: BlockType.DIRT, name: 'Dirt', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.STONE, blockType: BlockType.STONE, name: 'Stone', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.COBBLESTONE, blockType: BlockType.COBBLESTONE, name: 'Cobblestone', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.WOOD, blockType: BlockType.WOOD, name: 'Oak Log', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.PLANKS, blockType: BlockType.PLANKS, name: 'Oak Planks', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.LEAVES, blockType: BlockType.LEAVES, name: 'Oak Leaves', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.SAND, blockType: BlockType.SAND, name: 'Sand', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.GLASS, blockType: BlockType.GLASS, name: 'Glass', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.BRICKS, blockType: BlockType.BRICKS, name: 'Bricks', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.BOOKSHELF, blockType: BlockType.BOOKSHELF, name: 'Bookshelf', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.CRAFTING_TABLE, blockType: BlockType.CRAFTING_TABLE, name: 'Crafting Table', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.FURNACE, blockType: BlockType.FURNACE, name: 'Furnace', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.COAL_ORE, blockType: BlockType.COAL_ORE, name: 'Coal Ore', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.IRON_ORE, blockType: BlockType.IRON_ORE, name: 'Iron Ore', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.GOLD_ORE, blockType: BlockType.GOLD_ORE, name: 'Gold Ore', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.DIAMOND_ORE, blockType: BlockType.DIAMOND_ORE, name: 'Diamond Ore', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.TNT, blockType: BlockType.TNT, name: 'TNT', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.GLOWSTONE, blockType: BlockType.GLOWSTONE, name: 'Glowstone', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.TORCH, blockType: BlockType.TORCH, name: 'Torch', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.FLOWER_RED, blockType: BlockType.FLOWER_RED, name: 'Red Poppy', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'block_' + BlockType.FLOWER_YELLOW, blockType: BlockType.FLOWER_YELLOW, name: 'Dandelion', count: 64, maxStack: 64, itemType: ItemType.BLOCK },
    { id: 'tool_pickaxe_diamond', name: 'Diamond Pickaxe', count: 1, maxStack: 1, itemType: ItemType.TOOL, toolType: 'pickaxe', toolTier: 4, damage: 6 },
    { id: 'tool_sword_diamond', name: 'Diamond Sword', count: 1, maxStack: 1, itemType: ItemType.TOOL, toolType: 'sword', toolTier: 4, damage: 9 },
    { id: 'food_apple', name: 'Apple', count: 64, maxStack: 64, itemType: ItemType.FOOD, foodRestore: 4 },
    { id: 'food_bread', name: 'Bread', count: 64, maxStack: 64, itemType: ItemType.FOOD, foodRestore: 5 },
    { id: 'food_meat', name: 'Cooked Steak', count: 64, maxStack: 64, itemType: ItemType.FOOD, foodRestore: 8 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-2 backdrop-blur-none">
      <div className="bg-stone-800 border-4 border-stone-600 rounded-lg p-4 w-full max-w-xl text-white shadow-2xl flex flex-col gap-3 font-mono">
        {/* Modal Header & Tabs */}
        <div className="flex justify-between items-center border-b border-stone-600 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1 rounded text-xs font-bold uppercase flex items-center gap-1.5 transition-colors ${
                activeTab === 'inventory' ? 'bg-amber-600 text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
              }`}
            >
              <Hammer className="w-3.5 h-3.5" />
              Crafting & Bag
            </button>
            {isCreative && (
              <button
                onClick={() => setActiveTab('creative')}
                className={`px-3 py-1 rounded text-xs font-bold uppercase flex items-center gap-1.5 transition-colors ${
                  activeTab === 'creative' ? 'bg-purple-600 text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Creative Blocks (20+)
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded bg-stone-700 hover:bg-red-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 1: Inventory & Crafting Grid */}
        {activeTab === 'inventory' && (
          <div className="flex flex-col gap-4">
            {/* Crafting Area (2x2 or 3x3) */}
            <div className="bg-stone-900/70 p-3 rounded border border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider block mb-2">
                  {isTable ? 'Crafting Table (3x3)' : 'Pocket Crafting (2x2)'}
                </span>

                <div
                  className={`grid gap-1.5 ${
                    isTable ? 'grid-cols-3 w-36 h-36' : 'grid-cols-2 w-24 h-24'
                  }`}
                >
                  {(isTable ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [0, 1, 2, 3]).map((gridIdx) => {
                    const item = inv.craftingGrid[gridIdx];
                    const iconUrl = item
                      ? item.blockType
                        ? tm.itemIcons.get('block_' + item.blockType)
                        : tm.itemIcons.get(item.id)
                      : null;

                    return (
                      <div
                        key={gridIdx}
                        onClick={() => handleCraftingGridClick(gridIdx)}
                        className="w-10 h-10 border-2 border-stone-600 bg-stone-800 rounded flex items-center justify-center relative cursor-pointer hover:border-amber-400"
                      >
                        {iconUrl && (
                          <img
                            src={iconUrl}
                            alt=""
                            className="w-7 h-7 pixelated"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        )}
                        {item && item.count > 1 && (
                          <span className="absolute bottom-0 right-1 text-[10px] font-bold text-white">
                            {item.count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Crafting Result Output */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-stone-400 uppercase">Result</span>
                <div
                  onClick={handleCraftOutputClick}
                  className={`w-14 h-14 border-2 rounded flex items-center justify-center relative cursor-pointer transition-all ${
                    inv.craftingOutput
                      ? 'border-emerald-400 bg-emerald-950/40 hover:scale-105 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                      : 'border-stone-700 bg-stone-900/50'
                  }`}
                >
                  {inv.craftingOutput && (
                    <>
                      <img
                        src={
                          inv.craftingOutput.blockType
                            ? tm.itemIcons.get('block_' + inv.craftingOutput.blockType)
                            : tm.itemIcons.get(inv.craftingOutput.id) || tm.itemIcons.get('tool_pickaxe')
                        }
                        alt=""
                        className="w-9 h-9 pixelated"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <span className="absolute bottom-1 right-1.5 text-xs font-bold text-emerald-300">
                        {inv.craftingOutput.count}
                      </span>
                    </>
                  )}
                </div>
                {inv.craftingOutput && (
                  <span className="text-[10px] text-emerald-400 text-center font-bold">
                    Click to Craft!
                  </span>
                )}
              </div>
            </div>

            {/* Main Inventory 27 Slots */}
            <div>
              <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider block mb-1">
                Main Inventory (27 Slots)
              </span>
              <div className="grid grid-cols-9 gap-1 bg-stone-900/60 p-2 rounded border border-stone-700">
                {inv.slots.slice(9, 36).map((item, i) => {
                  const slotIdx = i + 9;
                  const isSelected = selectedSlotIndex === slotIdx;
                  const iconUrl = item
                    ? item.blockType
                      ? tm.itemIcons.get('block_' + item.blockType)
                      : tm.itemIcons.get(item.id) || tm.itemIcons.get('tool_pickaxe')
                    : null;

                  return (
                    <div
                      key={slotIdx}
                      onClick={() => handleSlotClick(slotIdx)}
                      className={`w-10 h-10 border-2 rounded flex items-center justify-center relative cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/40 scale-105'
                          : 'border-stone-600 bg-stone-800 hover:border-stone-400'
                      }`}
                    >
                      {iconUrl && (
                        <img
                          src={iconUrl}
                          alt=""
                          className="w-7 h-7 pixelated"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      )}
                      {item && item.count > 1 && (
                        <span className="absolute bottom-0 right-1 text-[10px] font-bold text-white">
                          {item.count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hotbar 9 Slots */}
            <div>
              <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider block mb-1">
                Hotbar (1-9)
              </span>
              <div className="grid grid-cols-9 gap-1 bg-stone-900/60 p-2 rounded border border-stone-700">
                {inv.slots.slice(0, 9).map((item, slotIdx) => {
                  const isSelected = selectedSlotIndex === slotIdx;
                  const iconUrl = item
                    ? item.blockType
                      ? tm.itemIcons.get('block_' + item.blockType)
                      : tm.itemIcons.get(item.id) || tm.itemIcons.get('tool_pickaxe')
                    : null;

                  return (
                    <div
                      key={slotIdx}
                      onClick={() => handleSlotClick(slotIdx)}
                      className={`w-10 h-10 border-2 rounded flex items-center justify-center relative cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/40 scale-105'
                          : 'border-stone-600 bg-stone-800 hover:border-stone-400'
                      }`}
                    >
                      {iconUrl && (
                        <img
                          src={iconUrl}
                          alt=""
                          className="w-7 h-7 pixelated"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      )}
                      {item && item.count > 1 && (
                        <span className="absolute bottom-0 right-1 text-[10px] font-bold text-white">
                          {item.count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Creative Catalog (Unlimited 64-Stacks) */}
        {activeTab === 'creative' && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-stone-300">
              Click any block or tool to add an unlimited stack to your inventory:
            </span>
            <div className="grid grid-cols-7 sm:grid-cols-9 gap-2 max-h-72 overflow-y-auto p-2 bg-stone-900/60 rounded border border-stone-700">
              {creativeBlocks.map((item, idx) => {
                const iconUrl = item.blockType
                  ? tm.itemIcons.get('block_' + item.blockType)
                  : tm.itemIcons.get(item.id) || tm.itemIcons.get('tool_pickaxe');

                return (
                  <button
                    key={idx}
                    onClick={() => handleCreativeItemClick(item)}
                    title={item.name}
                    className="w-12 h-12 border-2 border-stone-600 bg-stone-800 rounded flex flex-col items-center justify-center p-1 hover:border-purple-400 hover:scale-105 transition-all shadow"
                  >
                    {iconUrl && (
                      <img
                        src={iconUrl}
                        alt={item.name}
                        className="w-7 h-7 pixelated"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    )}
                    <span className="text-[8px] text-gray-300 truncate w-full text-center mt-0.5">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-[11px] text-stone-400 text-center border-t border-stone-700 pt-2">
          Click slot to select item, then click destination to swap or place into crafting grid.
        </div>
      </div>
    </div>
  );
};
