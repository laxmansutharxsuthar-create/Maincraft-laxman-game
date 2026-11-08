/**
 * Pause Menu & Settings Modal
 */

import React, { useState } from 'react';
import { GameEngine } from '../game/engine';
import { Play, Save, Settings, LogOut, Check, Sparkles, Shield } from 'lucide-react';

interface PauseModalProps {
  engine: GameEngine;
  onResume: () => void;
  onQuitToMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ engine, onResume, onQuitToMenu }) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [gameMode, setGameMode] = useState(engine.player.gameMode);
  const [soundVol, setSoundVol] = useState(80);
  const [musicVol, setMusicVol] = useState(40);
  const [mouseSens, setMouseSens] = useState(Math.round(engine.mouseSensitivity * 10000));

  const handleSave = () => {
    engine.saveCurrentGame();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleToggleMode = (mode: 'survival' | 'creative') => {
    engine.player.setGameMode(mode);
    setGameMode(mode);
  };

  const handleSoundChange = (val: number) => {
    setSoundVol(val);
    engine.audio.setSoundVolume(val / 100);
  };

  const handleMusicChange = (val: number) => {
    setMusicVol(val);
    engine.audio.setMusicVolume(val / 100);
  };

  const handleSensChange = (val: number) => {
    setMouseSens(val);
    engine.mouseSensitivity = val / 10000;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-none font-mono">
      <div className="bg-stone-800 border-4 border-stone-600 rounded-lg p-6 w-full max-w-md text-white shadow-2xl flex flex-col gap-4">
        <h2 className="text-xl font-bold text-center tracking-wider text-amber-400 border-b border-stone-600 pb-2">
          GAME PAUSED
        </h2>

        {/* Game Mode Switch */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-stone-300 font-semibold uppercase">Game Mode</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleToggleMode('survival')}
              className={`p-2.5 rounded border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                gameMode === 'survival'
                  ? 'border-emerald-400 bg-emerald-900/60 text-emerald-200'
                  : 'border-stone-600 bg-stone-700/60 text-stone-400 hover:bg-stone-700'
              }`}
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              Survival
            </button>
            <button
              onClick={() => handleToggleMode('creative')}
              className={`p-2.5 rounded border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                gameMode === 'creative'
                  ? 'border-purple-400 bg-purple-900/60 text-purple-200'
                  : 'border-stone-600 bg-stone-700/60 text-stone-400 hover:bg-stone-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              Creative
            </button>
          </div>
        </div>

        {/* Audio & Sensitivity Sliders */}
        <div className="bg-stone-900/60 p-3 rounded border border-stone-700 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-stone-300">
              <span>Sound Effects</span>
              <span>{soundVol}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={soundVol}
              onChange={(e) => handleSoundChange(Number(e.target.value))}
              className="accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-stone-300">
              <span>Ambient Music</span>
              <span>{musicVol}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={musicVol}
              onChange={(e) => handleMusicChange(Number(e.target.value))}
              className="accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-stone-300">
              <span>Mouse Sensitivity</span>
              <span>{mouseSens}</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              value={mouseSens}
              onChange={(e) => handleSensChange(Number(e.target.value))}
              className="accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Buttons: Resume, Save, Quit */}
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={onResume}
            className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4" />
            Resume Game
          </button>

          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 border-2 border-blue-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow transition-all active:scale-[0.98]"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                World Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save World Progress
              </>
            )}
          </button>

          <button
            onClick={onQuitToMenu}
            className="w-full py-2 rounded bg-stone-700 hover:bg-stone-600 border border-stone-500 text-stone-300 text-xs flex items-center justify-center gap-1.5 transition-all mt-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Quit to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
