/**
 * Low-Occlusion HUD - Minecraft Hearts, Hunger, Air, Hotbar, Crosshair & Mobile Controls
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '../game/engine';
import { TextureManager } from '../game/textures';
import { BLOCK_DEFS } from '../game/blocks';
import {
  Camera,
  Backpack,
  Volume2,
  VolumeX,
  Pause,
  Pickaxe,
  Box,
  ChevronUp,
  ChevronDown,
  Zap,
} from 'lucide-react';

interface HUDProps {
  engine: GameEngine;
  onOpenInventory: () => void;
  onOpenPause: () => void;
  isPointerLocked: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  onOpenInventory,
  onOpenPause,
  isPointerLocked,
}) => {
  const [, setTick] = useState(0);
  const [isMuted, setIsMuted] = useState(engine.audio.getIsMuted());
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const joystickTouchIdRef = useRef<number | null>(null);

  // Subscribe to engine state updates
  useEffect(() => {
    const handleUpdate = () => {
      setTick((t) => (t + 1) % 1000);
    };
    engine.onStateChange = handleUpdate;
    return () => {
      engine.onStateChange = undefined;
    };
  }, [engine]);

  // Keyboard shortcut listener for Hotbar slots 1-9 and Q (drop), V (camera)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (engine.isPaused) return;

      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        engine.inventory.selectedHotbarIndex = num - 1;
        setTick((t) => t + 1);
      } else if (e.code === 'KeyV') {
        engine.player.toggleCameraMode();
        setTick((t) => t + 1);
      } else if (e.code === 'KeyF' && engine.player.gameMode === 'creative') {
        engine.player.isFlying = !engine.player.isFlying;
        setTick((t) => t + 1);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (engine.isPaused) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      let nextIndex = engine.inventory.selectedHotbarIndex + dir;
      if (nextIndex < 0) nextIndex = 8;
      if (nextIndex > 8) nextIndex = 0;
      engine.inventory.selectedHotbarIndex = nextIndex;
      setTick((t) => t + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [engine]);

  // Virtual Joystick Touch Handling
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    joystickTouchIdRef.current = touch.identifier;
    setIsJoystickActive(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joystickTouchIdRef.current) {
        updateJoystick(e.touches[i].clientX, e.touches[i].clientY);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    engine.moveInput = { x: 0, y: 0 };
    joystickTouchIdRef.current = null;
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = rect.width / 2;

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const nx = Math.cos(angle) * (clampedDist / maxRadius);
    const ny = Math.sin(angle) * (clampedDist / maxRadius);

    setJoystickPos({ x: Math.cos(angle) * clampedDist, y: Math.sin(angle) * clampedDist });
    engine.moveInput = { x: nx, y: -ny }; // Forward is -Y in screen space
  };

  const tm = TextureManager.getInstance();
  const player = engine.player;
  const stats = player.stats;
  const isCreative = player.gameMode === 'creative';
  const hotbarSlots = engine.inventory.slots.slice(0, 9);
  const selectedItem = engine.inventory.getSelectedItem();

  // Render Minecraft-style Hearts
  const renderHearts = () => {
    if (isCreative) return null;
    const hearts = [];
    const health = stats.health;
    for (let i = 0; i < 10; i++) {
      const heartValue = (i + 1) * 2;
      let state: 'full' | 'half' | 'empty' = 'empty';
      if (health >= heartValue) state = 'full';
      else if (health >= heartValue - 1) state = 'half';

      hearts.push(
        <div key={i} className="relative w-4 h-4">
          <svg viewBox="0 0 16 16" className="w-full h-full drop-shadow">
            {/* Heart outline & dark background */}
            <path
              d="M8,14 L2,8 C0.5,6.5 0.5,4 2,2.5 C3.5,1 6,1 7.5,2.5 L8,3 L8.5,2.5 C10,1 12.5,1 14,2.5 C15.5,4 15.5,6.5 14,8 Z"
              fill="#220000"
              stroke="#000"
              strokeWidth="1"
            />
            {state !== 'empty' && (
              <path
                d={
                  state === 'half'
                    ? 'M8,14 L2,8 C0.5,6.5 0.5,4 2,2.5 C3.5,1 6,1 7.5,2.5 L8,3 Z'
                    : 'M8,14 L2,8 C0.5,6.5 0.5,4 2,2.5 C3.5,1 6,1 7.5,2.5 L8,3 L8.5,2.5 C10,1 12.5,1 14,2.5 C15.5,4 15.5,6.5 14,8 Z'
                }
                fill="#e53935"
              />
            )}
            {/* Specular shine */}
            {state !== 'empty' && (
              <circle cx="4" cy="4" r="1" fill="#ffcdd2" />
            )}
          </svg>
        </div>
      );
    }
    return <div className="flex gap-0.5 items-center">{hearts}</div>;
  };

  // Render Minecraft-style Hunger drumsticks
  const renderHunger = () => {
    if (isCreative) return null;
    const drumsticks = [];
    const hunger = stats.hunger;
    for (let i = 0; i < 10; i++) {
      const hungerValue = (i + 1) * 2;
      let state: 'full' | 'half' | 'empty' = 'empty';
      if (hunger >= hungerValue) state = 'full';
      else if (hunger >= hungerValue - 1) state = 'half';

      drumsticks.push(
        <div key={i} className="relative w-4 h-4">
          <svg viewBox="0 0 16 16" className="w-full h-full drop-shadow">
            <path
              d="M12,2 C9.5,2 8,4 8,6.5 C8,8 9,9 10,9.5 L7,13.5 L5,12 L3,14 L5,16 L7,14 L8.5,14 L11.5,10 C13,9.5 15,8 15,5.5 C15,3.5 13.5,2 12,2 Z"
              fill="#2b1a0a"
              stroke="#000"
              strokeWidth="0.8"
            />
            {state !== 'empty' && (
              <path
                d={
                  state === 'half'
                    ? 'M12,2 C10.5,2 9.5,3.2 9.5,5 C9.5,6.2 10,7 10.5,7.5 L8,11 L6.5,12 L5,13.5 L6,14.5 L7.5,13 L8.5,13 L11.5,10 Z'
                    : 'M12,2 C9.5,2 8,4 8,6.5 C8,8 9,9 10,9.5 L7,13.5 L5,12 L3,14 L5,16 L7,14 L8.5,14 L11.5,10 C13,9.5 15,8 15,5.5 C15,3.5 13.5,2 12,2 Z'
                }
                fill="#c67c3b"
              />
            )}
          </svg>
        </div>
      );
    }
    return <div className="flex gap-0.5 items-center flex-row-reverse">{drumsticks}</div>;
  };

  // Render Air bubbles when underwater
  const renderAir = () => {
    if (!stats.isUnderwater || isCreative) return null;
    const bubbles = [];
    const air = stats.air;
    for (let i = 0; i < 10; i++) {
      const isFilled = air >= (i + 1) * 2;
      bubbles.push(
        <div
          key={i}
          className={`w-3.5 h-3.5 rounded-full border border-blue-900 ${
            isFilled ? 'bg-cyan-400' : 'bg-transparent'
          }`}
        />
      );
    }
    return (
      <div className="flex gap-1 items-center justify-end mb-1">
        {bubbles}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3">
      {/* Top Header Cluster: Coordinates, Mode, Action Buttons */}
      <div className="flex justify-between items-start pointer-events-auto">
        {/* Game Stats & Coordinates */}
        <div className="bg-black/60 border border-white/20 backdrop-blur-none px-3 py-1.5 rounded text-xs text-white/90 font-mono flex flex-col gap-0.5 shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">Block World 3D</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                isCreative ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {player.gameMode}
            </span>
          </div>
          <div className="text-[11px] text-gray-300">
            XYZ:{' '}
            <span className="text-white">
              {Math.floor(player.position.x)}, {Math.floor(player.position.y)},{' '}
              {Math.floor(player.position.z)}
            </span>
          </div>
          <div className="text-[10px] text-gray-400">
            {engine.timeOfDay > 0.25 && engine.timeOfDay < 0.75 ? '☀️ Day' : '🌙 Night'} ·{' '}
            {player.isFlying ? 'Flying (Space/Shift)' : player.isGrounded ? 'Grounded' : 'Airborne'}
          </div>
        </div>

        {/* Action Buttons: Camera Mode, Inventory, Sound, Pause */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => player.toggleCameraMode()}
            title="Toggle Camera (V)"
            className="w-10 h-10 rounded bg-black/60 border border-white/25 active:bg-white/20 text-white flex items-center justify-center shadow hover:border-amber-400 transition-colors"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenInventory}
            title="Inventory (E)"
            className="w-10 h-10 rounded bg-black/60 border border-white/25 active:bg-white/20 text-white flex items-center justify-center shadow hover:border-amber-400 transition-colors"
          >
            <Backpack className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsMuted(engine.audio.toggleMute())}
            title="Mute Audio"
            className="w-10 h-10 rounded bg-black/60 border border-white/25 active:bg-white/20 text-white flex items-center justify-center shadow hover:border-amber-400 transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onOpenPause}
            title="Pause Menu (Esc)"
            className="w-10 h-10 rounded bg-black/60 border border-white/25 active:bg-white/20 text-white flex items-center justify-center shadow hover:border-amber-400 transition-colors"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Reticle / Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        {/* Crosshair lines */}
        <div className="relative w-6 h-6 flex items-center justify-center">
          <div className="w-0.5 h-4 bg-white/80 shadow" />
          <div className="absolute h-0.5 w-4 bg-white/80 shadow" />
          <div className="absolute w-1 h-1 bg-black/60 rounded-full" />
        </div>

        {/* Target name tag */}
        {engine.targetedBlock && (
          <div className="mt-4 px-2 py-0.5 bg-black/70 border border-white/30 rounded text-xs text-white font-mono shadow">
            {BLOCK_DEFS[engine.targetedBlock.blockType]?.name || 'Block'}
          </div>
        )}
        {engine.targetedMobId && (
          <div className="mt-4 px-2 py-0.5 bg-red-950/80 border border-red-500/50 rounded text-xs text-red-200 font-mono shadow uppercase">
            Mob In Range
          </div>
        )}
      </div>

      {/* Desktop Click-to-Lock Overlay Prompt */}
      {!isPointerLocked && !engine.isPaused && (
        <div className="hidden md:flex absolute top-16 left-1/2 -translate-x-1/2 bg-black/75 border border-white/20 px-4 py-1.5 rounded-full text-xs text-white font-medium shadow items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Click game viewport to lock mouse cursor · Esc to unlock
        </div>
      )}

      {/* Bottom Area: Survival Status Bars, Mobile Controls, 9-Slot Hotbar */}
      <div className="w-full flex flex-col items-center gap-2">
        {/* Survival Indicators (Hearts & Hunger & Air) */}
        {!isCreative && (
          <div className="w-full max-w-md flex flex-col gap-1 px-2 pointer-events-none">
            {renderAir()}
            <div className="flex justify-between items-center w-full">
              {renderHearts()}
              {renderHunger()}
            </div>
          </div>
        )}

        {/* Selected Item Label */}
        {selectedItem && (
          <div className="text-white text-xs font-mono font-semibold bg-black/60 px-3 py-0.5 rounded border border-white/20 shadow">
            {selectedItem.name} {selectedItem.count > 1 ? `(${selectedItem.count})` : ''}
          </div>
        )}

        {/* 9-Slot Minecraft Hotbar */}
        <div className="pointer-events-auto flex gap-1 p-1 bg-black/70 border-2 border-stone-600 rounded-lg shadow-2xl">
          {hotbarSlots.map((item, idx) => {
            const isSelected = engine.inventory.selectedHotbarIndex === idx;
            const iconUrl = item
              ? item.blockType
                ? tm.itemIcons.get('block_' + item.blockType)
                : tm.itemIcons.get(item.id) || tm.itemIcons.get('tool_pickaxe')
              : null;

            return (
              <button
                key={idx}
                onClick={() => {
                  engine.inventory.selectedHotbarIndex = idx;
                  setTick((t) => t + 1);
                }}
                className={`relative w-10 h-10 md:w-12 md:h-12 border-2 rounded transition-all flex items-center justify-center ${
                  isSelected
                    ? 'border-white bg-white/20 scale-105 shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                    : 'border-stone-500 bg-stone-800/80 active:bg-stone-700'
                }`}
              >
                {/* Slot index key number */}
                <span className="absolute top-0.5 left-1 text-[9px] text-gray-400 font-mono">
                  {idx + 1}
                </span>

                {/* Pixelated Item Icon */}
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt={item?.name}
                    className="w-7 h-7 md:w-8 md:h-8 pixelated pointer-events-none drop-shadow"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}

                {/* Stack count badge */}
                {item && item.count > 1 && (
                  <span className="absolute bottom-0.5 right-1 text-[11px] font-bold text-white font-mono drop-shadow">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Virtual Touch Controls (Visible on touch screens & small viewports) */}
      <div className="md:hidden pointer-events-none absolute inset-0 flex justify-between items-end p-4 pb-20">
        {/* Left: Virtual Analog Joystick */}
        <div
          ref={joystickRef}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          className="pointer-events-auto w-28 h-28 rounded-full bg-black/40 border-2 border-white/25 relative flex items-center justify-center touch-none shadow-lg"
        >
          {/* Base Cross Indicators */}
          <div className="absolute w-full h-0.5 bg-white/10" />
          <div className="absolute h-full w-0.5 bg-white/10" />

          {/* Stick Knob */}
          <div
            className={`w-12 h-12 rounded-full border-2 border-white/60 transition-transform ${
              isJoystickActive ? 'bg-amber-400/80 scale-110' : 'bg-white/40'
            }`}
            style={{
              transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
            }}
          />
        </div>

        {/* Right: Action Buttons (Jump, Break, Place, Sprint, Crouch, Fly) */}
        <div className="pointer-events-auto flex flex-col gap-2 items-end">
          {/* Creative Fly Controls */}
          {isCreative && (
            <div className="flex gap-2 mb-1">
              <button
                onTouchStart={() => (engine.actions.jump = true)}
                onTouchEnd={() => (engine.actions.jump = false)}
                className="w-12 h-12 rounded-full bg-purple-700/80 border-2 border-purple-400 text-white flex items-center justify-center font-bold text-xs active:bg-purple-600 shadow"
              >
                <ChevronUp className="w-6 h-6" />
              </button>
              <button
                onTouchStart={() => (engine.actions.crouch = true)}
                onTouchEnd={() => (engine.actions.crouch = false)}
                className="w-12 h-12 rounded-full bg-purple-700/80 border-2 border-purple-400 text-white flex items-center justify-center font-bold text-xs active:bg-purple-600 shadow"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            {/* Sprint Toggle */}
            <button
              onClick={() => {
                engine.actions.sprint = !engine.actions.sprint;
                setTick((t) => t + 1);
              }}
              className={`w-12 h-12 rounded-full border-2 text-white flex items-center justify-center font-bold text-xs shadow ${
                engine.actions.sprint
                  ? 'bg-amber-500 border-amber-300'
                  : 'bg-black/50 border-white/30 active:bg-white/20'
              }`}
            >
              <Zap className="w-5 h-5" />
            </button>

            {/* Place / Use Button */}
            <button
              onClick={() => engine.interactPlace()}
              className="w-14 h-14 rounded-full bg-emerald-700/80 border-2 border-emerald-400 text-white flex items-center justify-center active:bg-emerald-600 shadow-lg"
            >
              <Box className="w-7 h-7" />
            </button>
          </div>

          <div className="flex gap-2">
            {/* Mine / Attack Button */}
            <button
              onTouchStart={() => {
                engine.setMiningHeld(true);
                engine.interactBreak();
              }}
              onTouchEnd={() => engine.setMiningHeld(false)}
              className="w-14 h-14 rounded-full bg-red-700/80 border-2 border-red-400 text-white flex items-center justify-center active:bg-red-600 shadow-lg"
            >
              <Pickaxe className="w-7 h-7" />
            </button>

            {/* Jump Button */}
            <button
              onTouchStart={() => (engine.actions.jump = true)}
              onTouchEnd={() => (engine.actions.jump = false)}
              className="w-16 h-16 rounded-full bg-blue-700/80 border-2 border-blue-400 text-white flex items-center justify-center font-bold text-sm active:bg-blue-600 shadow-lg"
            >
              JUMP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
