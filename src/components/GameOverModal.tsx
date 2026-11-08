/**
 * Game Over & Respawn Modal
 */

import React from 'react';
import { GameEngine } from '../game/engine';
import { RotateCcw, Home } from 'lucide-react';

interface GameOverModalProps {
  engine: GameEngine;
  onRespawn: () => void;
  onQuitToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ engine, onRespawn, onQuitToMenu }) => {
  return (
    <div className="fixed inset-0 z-50 bg-red-950/85 flex items-center justify-center p-4 backdrop-blur-none font-mono">
      <div className="bg-stone-900 border-4 border-red-700 rounded-lg p-6 w-full max-w-md text-white shadow-2xl flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-extrabold text-red-500 tracking-widest drop-shadow-[0_2px_10px_rgba(239,68,68,0.5)]">
          YOU DIED!
        </h1>

        <p className="text-stone-300 text-xs max-w-xs">
          Your journey came to an untimely end. Ready to build and explore once more?
        </p>

        <div className="flex flex-col gap-2.5 w-full mt-3">
          <button
            onClick={onRespawn}
            className="w-full py-3 rounded bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            Respawn
          </button>

          <button
            onClick={onQuitToMenu}
            className="w-full py-2.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-300 text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Home className="w-4 h-4" />
            Return to Title Screen
          </button>
        </div>
      </div>
    </div>
  );
};
