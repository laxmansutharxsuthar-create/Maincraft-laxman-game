/**
 * Title Screen - Full Viewport Game Shell with inline SVG lockup and mode selector
 */

import React, { useState, useEffect } from 'react';
import { GameMode } from '../game/types';
import { Play, Sparkles, Shield, HelpCircle, X, Compass } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: (mode: GameMode, seed: number) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('survival');
  const [seed, setSeed] = useState(4242);
  const [showControls, setShowControls] = useState(false);

  // Enter or Space to start game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showControls) {
        if (e.key === 'Escape') setShowControls(false);
        return;
      }
      if (e.key === 'Enter' || e.code === 'Space') {
        onStartGame(selectedMode, seed);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMode, seed, showControls, onStartGame]);

  return (
    <div className="absolute inset-0 z-40 bg-stone-950/80 flex flex-col justify-between items-center p-6 text-white font-mono select-none overflow-y-auto">
      {/* 30-40% Negative Space / Top Header */}
      <div className="w-full flex justify-between items-center max-w-2xl pt-2">
        <span className="text-[11px] text-amber-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5" />
          Voxel Sandbox Engine v1.0
        </span>
        <button
          onClick={() => setShowControls(true)}
          className="text-xs text-stone-300 hover:text-white flex items-center gap-1 bg-stone-800/80 border border-stone-600 px-2.5 py-1 rounded transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          Controls Guide
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke inline SVG Title Lockup */}
      <div className="flex flex-col items-center gap-4 my-auto">
        <div className="flex flex-col items-center drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
          <svg viewBox="0 0 600 130" className="w-[340px] sm:w-[480px] md:w-[580px] h-auto">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#81c784" />
                <stop offset="50%" stopColor="#4caf50" />
                <stop offset="100%" stopColor="#2e7d32" />
              </linearGradient>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fff59d" />
                <stop offset="50%" stopColor="#fbc02d" />
                <stop offset="100%" stopColor="#f57f17" />
              </linearGradient>
              <filter id="shadow">
                <feDropShadow dx="3" dy="5" stdDeviation="2" floodColor="#000" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* BLOCK WORLD 3D isometric pixel letters */}
            <g filter="url(#shadow)">
              {/* "BLOCK" */}
              <text
                x="30"
                y="68"
                fontFamily="monospace"
                fontSize="64"
                fontWeight="900"
                letterSpacing="4"
                fill="url(#titleGrad)"
                stroke="#1b5e20"
                strokeWidth="4"
              >
                BLOCK
              </text>
              {/* "WORLD" */}
              <text
                x="280"
                y="68"
                fontFamily="monospace"
                fontSize="64"
                fontWeight="900"
                letterSpacing="4"
                fill="#ffffff"
                stroke="#37474f"
                strokeWidth="4"
              >
                WORLD
              </text>
              {/* "3D" badge */}
              <rect x="505" y="24" width="75" height="50" rx="6" fill="url(#goldGrad)" stroke="#e65100" strokeWidth="3" />
              <text
                x="517"
                y="62"
                fontFamily="monospace"
                fontSize="40"
                fontWeight="900"
                fill="#3e2723"
              >
                3D
              </text>

              {/* Subtitle banner */}
              <rect x="140" y="88" width="320" height="24" rx="4" fill="#263238" stroke="#455a64" strokeWidth="1.5" />
              <text
                x="155"
                y="104"
                fontFamily="monospace"
                fontSize="13"
                fontWeight="bold"
                fill="#ffca28"
                letterSpacing="2"
              >
                ENDLESS VOXEL SANDBOX
              </text>
            </g>
          </svg>
        </div>

        {/* Mode Selector (Survival vs Creative) */}
        <div className="flex flex-col items-center gap-2 w-full max-w-sm mt-3">
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={() => setSelectedMode('survival')}
              className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                selectedMode === 'survival'
                  ? 'border-emerald-400 bg-emerald-950/70 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                  : 'border-stone-700 bg-stone-900/60 hover:bg-stone-800 text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>SURVIVAL</span>
              </div>
              <span className="text-[10px] text-stone-400 text-center">
                Health, hunger, mobs, crafting & hazards
              </span>
            </button>

            <button
              onClick={() => setSelectedMode('creative')}
              className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                selectedMode === 'creative'
                  ? 'border-purple-400 bg-purple-950/70 shadow-[0_0_15px_rgba(192,132,252,0.3)]'
                  : 'border-stone-700 bg-stone-900/60 hover:bg-stone-800 text-stone-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>CREATIVE</span>
              </div>
              <span className="text-[10px] text-stone-400 text-center">
                Fly mode, instant break, all 24+ blocks
              </span>
            </button>
          </div>

          {/* Seed Input */}
          <div className="flex items-center justify-between w-full bg-stone-900/80 border border-stone-700 px-3 py-1.5 rounded text-xs text-stone-300">
            <span>World Seed:</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value) || 1)}
                className="w-24 bg-stone-800 border border-stone-600 rounded px-2 py-0.5 text-right text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => setSeed(Math.floor(Math.random() * 90000) + 1000)}
                className="text-[10px] text-stone-400 hover:text-white underline"
              >
                Random
              </button>
            </div>
          </div>

          {/* Primary Start CTA */}
          <button
            onClick={() => onStartGame(selectedMode, seed)}
            className="w-full py-3.5 mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-300 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-5 h-5 fill-white" />
            START GAME
          </button>
        </div>
      </div>

      {/* Flat Control-Hint Line */}
      <div className="text-center text-[11px] text-stone-400 border-t border-stone-800/80 pt-3 pb-1 w-full max-w-xl">
        <span className="text-stone-300 font-semibold">WASD</span> Move ·{' '}
        <span className="text-stone-300 font-semibold">Space</span> Jump ·{' '}
        <span className="text-stone-300 font-semibold">Left-Click</span> Mine ·{' '}
        <span className="text-stone-300 font-semibold">Right-Click</span> Place ·{' '}
        <span className="text-stone-300 font-semibold">E</span> Inventory ·{' '}
        <span className="text-stone-300 font-semibold">Esc</span> Pause
      </div>

      {/* Controls Guide Modal */}
      {showControls && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-stone-800 border-4 border-stone-600 rounded-lg p-5 w-full max-w-md text-white shadow-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-stone-600 pb-2">
              <h3 className="font-bold text-amber-400 text-sm">GAME CONTROLS GUIDE</h3>
              <button
                onClick={() => setShowControls(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 text-xs text-stone-300">
              <div className="grid grid-cols-2 gap-1.5 bg-stone-900/60 p-2.5 rounded border border-stone-700">
                <span className="text-amber-300 font-bold">W, A, S, D</span>
                <span>Walk Forward / Back / Strafe</span>

                <span className="text-amber-300 font-bold">Space</span>
                <span>Jump / Swim Up / Fly Up</span>

                <span className="text-amber-300 font-bold">Shift</span>
                <span>Crouch / Fly Down</span>

                <span className="text-amber-300 font-bold">Left Mouse Button</span>
                <span>Hold to Mine Block / Attack Mob</span>

                <span className="text-amber-300 font-bold">Right Mouse Button</span>
                <span>Place Block / Eat Food</span>

                <span className="text-amber-300 font-bold">E</span>
                <span>Open Inventory & Crafting</span>

                <span className="text-amber-300 font-bold">1 - 9 / Scroll</span>
                <span>Select Hotbar Slot</span>

                <span className="text-amber-300 font-bold">V</span>
                <span>Toggle 1st / 3rd Person Camera</span>

                <span className="text-amber-300 font-bold">F (Creative)</span>
                <span>Toggle Fly Mode</span>

                <span className="text-amber-300 font-bold">Esc</span>
                <span>Pause Menu / Unlock Mouse</span>
              </div>

              <div className="bg-stone-900/40 p-2 rounded text-[11px] text-stone-400">
                📱 <strong>Mobile Devices:</strong> Use the left virtual joystick to walk, touch and drag on the right side of the screen to rotate camera, and tap the action buttons to jump, mine, and place blocks.
              </div>
            </div>

            <button
              onClick={() => setShowControls(false)}
              className="w-full py-2 rounded bg-amber-600 hover:bg-amber-500 font-bold text-xs text-white"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
