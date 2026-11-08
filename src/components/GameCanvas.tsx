/**
 * GameCanvas - Isolated WebGL Container with Pointer Lock and Touch Look handling
 */

import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';

interface GameCanvasProps {
  engine: GameEngine | null;
  onPointerLockChange: (isLocked: boolean) => void;
  isPaused: boolean;
  isInventoryOpen: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  onPointerLockChange,
  isPaused,
  isInventoryOpen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (engine && containerRef.current) {
        engine.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [engine]);

  // Pointer lock handling for desktop mouse look
  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === containerRef.current;
      onPointerLockChange(isLocked);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === containerRef.current && engine && !isPaused && !isInventoryOpen) {
        engine.addLookDelta(e.movementX, e.movementY);
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [engine, isPaused, isInventoryOpen, onPointerLockChange]);

  // Request pointer lock when canvas is clicked
  const handleCanvasClick = () => {
    if (isPaused || isInventoryOpen) return;
    if (containerRef.current && document.pointerLockElement !== containerRef.current) {
      containerRef.current.requestPointerLock?.();
    }
  };

  // Touch look handling on right half of screen for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isPaused || isInventoryOpen) return;
    const touch = e.touches[0];
    // Only handle touch on right half of screen for camera look
    if (touch.clientX > window.innerWidth * 0.4) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isPaused || isInventoryOpen || !engine) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    engine.addLookDelta(dx * 1.5, dy * 1.5);
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="absolute inset-0 w-full h-full cursor-crosshair overflow-hidden touch-none select-none"
    />
  );
};
