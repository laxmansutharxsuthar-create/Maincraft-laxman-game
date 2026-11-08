/**
 * Game Persistence - LocalStorage Save & Load System
 */

import { BlockType, GameMode, InventoryItem, PlayerStats } from './types';

const SAVE_KEY = 'block_world_3d_save_v1';

export interface GameSaveData {
  version: number;
  timestamp: number;
  gameMode: GameMode;
  seed: number;
  player: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    stats: PlayerStats;
  };
  inventory: {
    slots: (InventoryItem | null)[];
    selectedHotbarIndex: number;
  };
  modifiedBlocks: [string, BlockType][];
}

export class StorageManager {
  public static saveGame(data: GameSaveData): boolean {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(SAVE_KEY, json);
      return true;
    } catch (e) {
      console.warn('Failed to save game to localStorage', e);
      return false;
    }
  }

  public static loadGame(): GameSaveData | null {
    try {
      const json = localStorage.getItem(SAVE_KEY);
      if (!json) return null;
      return JSON.parse(json) as GameSaveData;
    } catch (e) {
      console.warn('Failed to load game from localStorage', e);
      return null;
    }
  }

  public static clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn('Failed to clear save', e);
    }
  }
}
