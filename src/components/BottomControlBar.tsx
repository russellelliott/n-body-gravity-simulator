import React from 'react';
import { SimulationSettings, CollisionMode } from '../types';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Grid,
  TrendingUp,
  Tag,
  Layers,
  Compass
} from 'lucide-react';

interface BottomControlBarProps {
  isPaused: boolean;
  settings: SimulationSettings;
  onTogglePause: () => void;
  onStepFrame: () => void;
  onUpdateSettings: (updated: Partial<SimulationSettings>) => void;
  onClearAll: () => void;
  onOpenPresets: () => void;
}

export const BottomControlBar: React.FC<BottomControlBarProps> = ({
  isPaused,
  settings,
  onTogglePause,
  onStepFrame,
  onUpdateSettings,
  onClearAll,
  onOpenPresets
}) => {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-5xl w-[92%] sm:w-auto bg-slate-950/85 backdrop-blur-xl border border-slate-800/90 rounded-2xl px-4 py-2.5 shadow-2xl text-slate-200 select-none flex flex-wrap items-center justify-between gap-3 sm:gap-6">
      {/* Play / Pause & Step Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePause}
          className={`p-2.5 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg ${
            isPaused
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 scale-105 ring-2 ring-amber-400/50'
              : 'bg-slate-800 hover:bg-slate-700 text-amber-400'
          }`}
          title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
        >
          {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
        </button>

        {isPaused && (
          <button
            onClick={onStepFrame}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition-colors"
            title="Step Single Frame"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Speed Slider */}
      <div className="flex items-center gap-2 text-xs bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
        <span className="text-slate-400 font-mono text-[11px]">Speed:</span>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={settings.simSpeed}
          onChange={(e) => onUpdateSettings({ simSpeed: parseFloat(e.target.value) })}
          className="w-16 sm:w-24 accent-amber-500 cursor-pointer"
        />
        <span className="font-mono text-amber-400 w-9 text-right font-bold">{settings.simSpeed.toFixed(1)}x</span>
      </div>

      {/* Gravity Constant G Slider */}
      <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
        <span className="text-slate-400 font-mono text-[11px]">Gravity G:</span>
        <input
          type="range"
          min="0.1"
          max="10.0"
          step="0.1"
          value={settings.gConstant}
          onChange={(e) => onUpdateSettings({ gConstant: parseFloat(e.target.value) })}
          className="w-20 accent-sky-500 cursor-pointer"
        />
        <span className="font-mono text-sky-400 w-8 text-right font-bold">{settings.gConstant.toFixed(1)}</span>
      </div>

      {/* Collision Mode Selector */}
      <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
        {[
          { mode: 'merge' as CollisionMode, label: 'Merge' },
          { mode: 'fragment' as CollisionMode, label: 'Fragment' },
          { mode: 'bounce' as CollisionMode, label: 'Bounce' }
        ].map((item) => (
          <button
            key={item.mode}
            onClick={() => onUpdateSettings({ collisionMode: item.mode })}
            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
              settings.collisionMode === item.mode
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Visual Feature Toggles */}
      <div className="flex items-center gap-1 border-l border-slate-800/80 pl-2">
        <button
          onClick={() => onUpdateSettings({ showTrails: !settings.showTrails })}
          className={`p-2 rounded-lg border transition-all ${
            settings.showTrails ? 'bg-sky-950/80 border-sky-500 text-sky-300' : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Motion Trails"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <button
          onClick={() => onUpdateSettings({ showOrbits: !settings.showOrbits })}
          className={`p-2 rounded-lg border transition-all ${
            settings.showOrbits ? 'bg-sky-950/80 border-sky-500 text-sky-300' : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Orbital Predictions"
        >
          <TrendingUp className="w-4 h-4" />
        </button>

        <button
          onClick={() => onUpdateSettings({ showGravityGrid: !settings.showGravityGrid })}
          className={`p-2 rounded-lg border transition-all ${
            settings.showGravityGrid ? 'bg-sky-950/80 border-sky-500 text-sky-300' : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Spacetime Gravity Grid"
        >
          <Grid className="w-4 h-4" />
        </button>

        <button
          onClick={() => onUpdateSettings({ showVectors: !settings.showVectors })}
          className={`p-2 rounded-lg border transition-all ${
            settings.showVectors ? 'bg-sky-950/80 border-sky-500 text-sky-300' : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Velocity Vectors"
        >
          <Compass className="w-4 h-4" />
        </button>

        <button
          onClick={() => onUpdateSettings({ showLabels: !settings.showLabels })}
          className={`p-2 rounded-lg border transition-all ${
            settings.showLabels ? 'bg-sky-950/80 border-sky-500 text-sky-300' : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Body Labels"
        >
          <Tag className="w-4 h-4" />
        </button>

        <button
          onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
          className={`p-2 rounded-lg border transition-all ${
            settings.soundEnabled ? 'bg-amber-950/80 border-amber-500 text-amber-300' : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Collision Sound Effects"
        >
          {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Presets & Clear All Actions */}
      <div className="flex items-center gap-2 border-l border-slate-800/80 pl-2">
        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Presets</span>
        </button>

        <button
          onClick={onClearAll}
          className="p-2 bg-slate-900 hover:bg-red-950/80 border border-slate-800 hover:border-red-700/80 text-slate-400 hover:text-red-300 rounded-xl transition-colors"
          title="Clear All Bodies"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
