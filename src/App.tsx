/**
 * Block World 3D - Main App Shell
 * Coordinates Title Screen, WebGL Game Canvas, HUD, Inventory, Pause, and Game Over modals.
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from './game/engine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { InventoryModal } from './components/InventoryModal';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { GameMode } from './game/types';

type AppState = 'title' | 'playing' | 'paused' | 'inventory' | 'gameover';

export default function App() {
  const [appState, setAppState] = useState<AppState>('title');
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const engineRef = useRef<GameEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Engine once
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;

    // Start engine in background for title panorama
    engine.start();

    // Check for death to show game over screen
    const interval = setInterval(() => {
      if (engine.player.stats.isDead && appState === 'playing') {
        setAppState('gameover');
      }
    }, 200);

    return () => {
      clearInterval(interval);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Global Keyboard & Mouse Input handling
  useEffect(() => {
    const keysPressed = new Set<string>();

    const updateMovement = () => {
      const engine = engineRef.current;
      if (!engine) return;

      let x = 0;
      let y = 0;
      if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) y += 1;
      if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) y -= 1;
      if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) x -= 1;
      if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) x += 1;

      // Normalize if diagonal
      const len = Math.hypot(x, y);
      if (len > 0) {
        x /= len;
        y /= len;
      }

      engine.moveInput = { x, y };
      engine.actions.jump = keysPressed.has('Space');
      engine.actions.sprint = keysPressed.has('ShiftLeft') || keysPressed.has('ShiftRight');
      engine.actions.crouch = keysPressed.has('ControlLeft') || keysPressed.has('KeyC');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.add(e.code);

      const engine = engineRef.current;
      if (!engine) return;

      // Inventory toggle
      if (e.code === 'KeyE') {
        if (appState === 'playing') {
          setAppState('inventory');
          document.exitPointerLock?.();
        } else if (appState === 'inventory') {
          setAppState('playing');
        }
      }

      // Pause toggle
      if (e.code === 'Escape') {
        if (appState === 'playing') {
          setAppState('paused');
          engine.pause();
        } else if (appState === 'paused' || appState === 'inventory') {
          setAppState('playing');
          engine.resume();
        }
      }

      updateMovement();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
      updateMovement();
    };

    // Mouse click inputs for mining & placing
    const handleMouseDown = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine || appState !== 'playing') return;

      if (e.button === 0) {
        // Left click: Hold to mine / break
        engine.setMiningHeld(true);
        engine.interactBreak();
      } else if (e.button === 2) {
        // Right click: Place block / eat food
        e.preventDefault();
        engine.interactPlace();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (e.button === 0) {
        engine.setMiningHeld(false);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (appState === 'playing') {
        e.preventDefault();
      }
    };

    // Clear held keys on window blur
    const handleBlur = () => {
      keysPressed.clear();
      updateMovement();
      engineRef.current?.setMiningHeld(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleBlur);
    };
  }, [appState]);

  // Start game from title screen
  const handleStartGame = (mode: GameMode, seed: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.player.setGameMode(mode);
    setAppState('playing');
    engine.resume();
  };

  // Resume game from pause
  const handleResume = () => {
    const engine = engineRef.current;
    if (engine) {
      engine.resume();
    }
    setAppState('playing');
  };

  // Respawn from death
  const handleRespawn = () => {
    const engine = engineRef.current;
    if (engine) {
      engine.player.respawn();
      engine.resume();
    }
    setAppState('playing');
  };

  // Return to title screen
  const handleQuitToMenu = () => {
    const engine = engineRef.current;
    if (engine) {
      engine.pause();
    }
    document.exitPointerLock?.();
    setAppState('title');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Transparent Click & Touch Router for Camera Look */}
      {engineRef.current && (
        <GameCanvas
          engine={engineRef.current}
          onPointerLockChange={setIsPointerLocked}
          isPaused={appState !== 'playing'}
          isInventoryOpen={appState === 'inventory'}
        />
      )}

      {/* Screen 1: Title Screen */}
      {appState === 'title' && (
        <TitleScreen onStartGame={handleStartGame} />
      )}

      {/* Screen 2: In-Game HUD */}
      {engineRef.current && (appState === 'playing' || appState === 'inventory') && (
        <HUD
          engine={engineRef.current}
          onOpenInventory={() => setAppState('inventory')}
          onOpenPause={() => {
            setAppState('paused');
            engineRef.current?.pause();
          }}
          isPointerLocked={isPointerLocked}
        />
      )}

      {/* Screen 3: Inventory & Crafting Modal */}
      {appState === 'inventory' && engineRef.current && (
        <InventoryModal
          engine={engineRef.current}
          onClose={() => setAppState('playing')}
        />
      )}

      {/* Screen 4: Pause & Settings Modal */}
      {appState === 'paused' && engineRef.current && (
        <PauseModal
          engine={engineRef.current}
          onResume={handleResume}
          onQuitToMenu={handleQuitToMenu}
        />
      )}

      {/* Screen 5: Game Over Screen */}
      {appState === 'gameover' && engineRef.current && (
        <GameOverModal
          engine={engineRef.current}
          onRespawn={handleRespawn}
          onQuitToMenu={handleQuitToMenu}
        />
      )}
    </div>
  );
}
