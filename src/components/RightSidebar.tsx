import React from 'react';
import { CelestialBody, SpawnConfig, CameraViewMode, BodyType, SpawnMode } from '../types';
import {
  Sparkles,
  Camera,
  Trash2,
  Copy,
  Zap,
  Anchor,
  Globe,
  Sun,
  Disc,
  Flame,
  PlusCircle,
  Eye,
  Sliders,
  CircleDot,
  X
} from 'lucide-react';
import { calculateOrbitalVelocity, calculateRadius } from '../physics/nbodyEngine';

interface RightSidebarProps {
  selectedBody: CelestialBody | null;
  spawnConfig: SpawnConfig;
  cameraMode: CameraViewMode;
  bodies: CelestialBody[];
  gConstant: number;
  onUpdateBody: (updatedBody: CelestialBody) => void;
  onDeleteBody: (id: string) => void;
  onDuplicateBody: (body: CelestialBody) => void;
  onExplodeBody: (body: CelestialBody) => void;
  onUpdateSpawnConfig: (config: Partial<SpawnConfig>) => void;
  onChangeCameraMode: (mode: CameraViewMode) => void;
  onSelectBody: (id: string | null) => void;
  onSpawnRingDisk: (count: number, radius: number, mass: number, color: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedBody,
  spawnConfig,
  cameraMode,
  bodies,
  gConstant,
  onUpdateBody,
  onDeleteBody,
  onDuplicateBody,
  onExplodeBody,
  onUpdateSpawnConfig,
  onChangeCameraMode,
  onSelectBody,
  onSpawnRingDisk
}) => {

   // Archetype-specific mass ranges for Spawn Creator
  const ARCHETYPE_MASS_RANGES: Record<BodyType, { min: number; max: number; step: number }> = {
    asteroid: { min: 0.001, max: 0.1, step: 0.001 },
    rocky: { min: 0.1, max: 10, step: 0.1 },
    gas_giant: { min: 10, max: 100, step: 1 },
    star: { min: 100, max: 5000, step: 10 },
    black_hole: { min: 5000, max: 10000, step: 50 },
    fragment: { min: 0.001, max: 0.1, step: 0.001 },
   };

  const getMassRangeForType = (type: BodyType) => ARCHETYPE_MASS_RANGES[type] ?? ARCHETYPE_MASS_RANGES.rocky;

    // Preset Colors
  const COLOR_PRESETS = [
      '#38bdf8', '#3b82f6', '#06b6d4', '#10b981',
      '#a3e635', '#f59e0b', '#f97316', '#ef4444',
      '#ec4899', '#c084fc', '#f87171', '#fbbf24',
      '#cbd5e1', '#ffffff'
    ];

  const handleSetCircularOrbit = () => {
    if (!selectedBody) return;
    const attractor = bodies
        .filter(b => b.id !== selectedBody.id)
        .reduce((prev, curr) => (curr.mass > (prev?.mass || 0) ? curr : prev), bodies[0]);

    if (attractor) {
      const vOrb = calculateOrbitalVelocity(selectedBody.position, attractor, gConstant);
      onUpdateBody({
        ...selectedBody,
        velocity: vOrb
      });
    }
  };

  const getSpeedMagnitude = (b: CelestialBody) => {
    return Math.sqrt(b.velocity.x ** 2 + b.velocity.y ** 2 + b.velocity.z ** 2);
  };

  const handleSetSpeedMagnitude = (newSpeed: number) => {
    if (!selectedBody) return;
    const currentSpeed = getSpeedMagnitude(selectedBody) || 1;
    const factor = newSpeed / currentSpeed;

    onUpdateBody({
      ...selectedBody,
      velocity: {
        x: selectedBody.velocity.x * factor,
        y: selectedBody.velocity.y * factor,
        z: selectedBody.velocity.z * factor
      }
    });
  };

  return (
     <div
     className="relative z-30 flex flex-col h-full w-80 bg-slate-950/85 backdrop-blur-xl border-l border-slate-800/80 text-slate-200 select-none"
      >
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-4 space-y-5">
          {/* Section 1: Inspector Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                {selectedBody ? 'Body Inspector' : 'Spawn Creator'}
              </h2>
            </div>
          </div>

          {/* Body Selection Dropdown (only shown when a body is selected) */}
          {selectedBody && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Select Body</label>
              <select
                value={selectedBody.id}
                onChange={(e) => {
                  const target = bodies.find(b => b.id === e.target.value);
                  if (target) onSelectBody(target.id);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 text-xs font-mono appearance-none cursor-pointer"
              >
                {bodies.map((body) => (
                  <option key={body.id} value={body.id}>
                    {body.name} ({body.mass >= 1000 ? `${(body.mass / 1000).toFixed(1)}k` : body.mass.toFixed(2)} M)
                  </option>
                ))}
              </select>
            </div>
          )}

        {/* MODE A: SELECTED BODY INSPECTOR */}
        {selectedBody ? (
          <div className="space-y-4 text-xs">
            {/* Name & Type */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Object Name</label>
              <input
                type="text"
                value={selectedBody.name}
                onChange={(e) => onUpdateBody({ ...selectedBody, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 font-semibold"
              />
            </div>

            {/* Color Picker & Swatches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Body Color</label>
                <input
                  type="color"
                  value={selectedBody.color}
                  onChange={(e) => onUpdateBody({ ...selectedBody, color: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onUpdateBody({ ...selectedBody, color: c })}
                    className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
                      selectedBody.color === c ? 'border-white scale-110 shadow-md ring-2 ring-amber-400/50' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Mass Slider & Input */}
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-300">Mass (Solar Units M)</span>
                <input
                  type="number"
                  step="1"
                  min="0.001"
                  max="10000"
                  value={selectedBody.mass}
                  onChange={(e) => {
                    const m = Math.max(0.001, Math.min(10000, parseFloat(e.target.value) || 0.1));
                    onUpdateBody({
                      ...selectedBody,
                      mass: m,
                      radius: calculateRadius(m, selectedBody.type)
                    });
                  }}
                  className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-amber-400"
                />
              </div>
              <input
                type="range"
                min="0.001"
                max="10000"
                step="0.001"
                value={selectedBody.mass}
                onChange={(e) => {
                  const m = parseFloat(e.target.value);
                  onUpdateBody({
                    ...selectedBody,
                    mass: m,
                    radius: calculateRadius(m, selectedBody.type)
                  });
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.001 M</span>
                <span>Radius: {selectedBody.radius.toFixed(2)} R</span>
                <span>10000 M</span>
              </div>
            </div>

            {/* Speed & Orbital Mechanics */}
            <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-300">Speed Magnitude</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {getSpeedMagnitude(selectedBody).toFixed(2)} m/s
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.2"
                value={getSpeedMagnitude(selectedBody)}
                onChange={(e) => handleSetSpeedMagnitude(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />

              <button
                onClick={handleSetCircularOrbit}
                className="w-full mt-2 flex items-center justify-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 py-1.5 px-3 rounded-lg font-semibold text-xs transition-colors"
              >
                <CircleDot className="w-3.5 h-3.5" />
                Auto Circularize Orbit
              </button>
            </div>

            {/* Velocity Components Vector XYZ */}
            <div className="space-y-2 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Velocity Vector (m/s)</span>
              <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Vx</span>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedBody.velocity.x.toFixed(1)}
                    onChange={(e) => onUpdateBody({ ...selectedBody, velocity: { ...selectedBody.velocity, x: parseFloat(e.target.value) || 0 } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center"
                  />
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Vy</span>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedBody.velocity.y.toFixed(1)}
                    onChange={(e) => onUpdateBody({ ...selectedBody, velocity: { ...selectedBody.velocity, y: parseFloat(e.target.value) || 0 } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center"
                  />
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Vz</span>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedBody.velocity.z.toFixed(1)}
                    onChange={(e) => onUpdateBody({ ...selectedBody, velocity: { ...selectedBody.velocity, z: parseFloat(e.target.value) || 0 } })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center"
                  />
                </div>
              </div>
            </div>

            {/* Camera Tracking Modes for Selected Body */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Camera Tracking View</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onChangeCameraMode(cameraMode === 'follow' ? 'free' : 'follow')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                    cameraMode === 'follow' ? 'bg-sky-600 border-sky-400 text-white shadow-md' : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Orbit Follow
                </button>
                <button
                  onClick={() => onChangeCameraMode(cameraMode === 'first_person' ? 'free' : 'first_person')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                    cameraMode === 'first_person' ? 'bg-amber-600 border-amber-400 text-white shadow-md' : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Surface View
                </button>
              </div>
            </div>

            {/* Anchor & Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => onUpdateBody({ ...selectedBody, isFixed: !selectedBody.isFixed })}
                className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                  selectedBody.isFixed
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <Anchor className="w-3.5 h-3.5" />
                {selectedBody.isFixed ? 'Fixed Anchor Star (Immovable)' : 'Anchor Position (Make Fixed)'}
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onExplodeBody(selectedBody)}
                  className="flex flex-col items-center justify-center py-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 rounded-lg text-[10px] font-bold transition-colors"
                >
                  <Zap className="w-4 h-4 mb-0.5 text-rose-400" />
                  Fragment
                </button>
                <button
                  onClick={() => onDuplicateBody(selectedBody)}
                  className="flex flex-col items-center justify-center py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-colors"
                >
                  <Copy className="w-4 h-4 mb-0.5 text-sky-400" />
                  Duplicate
                </button>
                <button
                  onClick={() => onDeleteBody(selectedBody.id)}
                  className="flex flex-col items-center justify-center py-2 bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-300 rounded-lg text-[10px] font-bold transition-colors"
                >
                  <Trash2 className="w-4 h-4 mb-0.5 text-red-400" />
                  Remove
                </button>
              </div>

              {/* Remove Focus Button */}
              <button
                onClick={() => onSelectBody(null)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Remove Focus
              </button>
            </div>
          </div>
        ) : (
          /* MODE B: SPAWN CREATOR SETTINGS */
          <div className="space-y-4 text-xs">
            {/* Celestial Type Archetype */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Object Archetype</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { type: 'star' as BodyType, name: 'Star', icon: Sun, color: '#fbbf24' },
                  { type: 'rocky' as BodyType, name: 'Planet', icon: Globe, color: '#38bdf8' },
                  { type: 'gas_giant' as BodyType, name: 'Gas Giant', icon: Disc, color: '#f97316' },
                  { type: 'asteroid' as BodyType, name: 'Asteroid', icon: Sparkles, color: '#94a3b8' },
                  { type: 'black_hole' as BodyType, name: 'BlackHole', icon: Flame, color: '#c084fc' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = spawnConfig.type === item.type;
                  return (
                      <button
                      key={item.type}
                      onClick={() => {
                        let defaultMass = 1.0;
                        if (item.type === 'star') defaultMass = 800;
                        if (item.type === 'gas_giant') defaultMass = 20;
                        if (item.type === 'black_hole') defaultMass = 7500;
                        if (item.type === 'asteroid') defaultMass = 0.02;

                        onUpdateSpawnConfig({
                          type: item.type,
                          mass: defaultMass,
                          color: item.color,
                          name: item.name
                        });
                      }}
                      className={`flex flex-col items-center py-2 px-1 rounded-lg border text-[10px] font-semibold transition-all ${
                        isActive
                          ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                      >
                        <Icon className="w-4 h-4 mb-1" style={{ color: item.color }} />
                        {item.name}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Color Picker & Swatches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Color Accent</label>
                <input
                  type="color"
                  value={spawnConfig.color}
                  onChange={(e) => onUpdateSpawnConfig({ color: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onUpdateSpawnConfig({ color: c })}
                    className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
                      spawnConfig.color === c ? 'border-white scale-110 shadow-md ring-2 ring-amber-400/50' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Mass Slider */}
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-300">Creation Mass</span>
                <input
                  type="number"
                  step={getMassRangeForType(spawnConfig.type).step}
                  value={spawnConfig.mass}
                  onChange={(e) => {
                    const range = getMassRangeForType(spawnConfig.type);
                    let mass = parseFloat(e.target.value);
                    if (isNaN(mass)) mass = range.min;
                    mass = Math.max(range.min, Math.min(range.max, mass));
                    onUpdateSpawnConfig({ mass });
                  }}
                  className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-amber-400"
                />
              </div>
              <input
                type="range"
                min={getMassRangeForType(spawnConfig.type).min}
                max={getMassRangeForType(spawnConfig.type).max}
                step={getMassRangeForType(spawnConfig.type).step}
                value={spawnConfig.mass}
                onChange={(e) => onUpdateSpawnConfig({ mass: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>{getMassRangeForType(spawnConfig.type).min} M</span>
                <span>Radius: {calculateRadius(spawnConfig.mass, spawnConfig.type).toFixed(2)} R</span>
                <span>{getMassRangeForType(spawnConfig.type).max} M</span>
              </div>
            </div>

            {/* Spawn Tool Mode */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mouse Spawn Placement Tool</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { mode: 'single_drag' as SpawnMode, label: 'Click & Drag Throw' },
                  { mode: 'auto_orbit' as SpawnMode, label: 'Auto Orbit Vector' },
                  { mode: 'stream' as SpawnMode, label: 'Stream Bombardment' },
                  { mode: 'ring_disk' as SpawnMode, label: 'Ring Generator' }
                ].map((tool) => (
                  <button
                    key={tool.mode}
                    onClick={() => onUpdateSpawnConfig({ spawnMode: tool.mode })}
                    className={`py-2 px-2.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                      spawnConfig.spawnMode === tool.mode
                        ? 'bg-sky-950/80 border-sky-500 text-sky-300 shadow-md ring-1 ring-sky-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stream Rate Control if stream mode active */}
            {spawnConfig.spawnMode === 'stream' && (
              <div className="space-y-1.5 bg-sky-950/40 p-3 rounded-lg border border-sky-800/60">
                <div className="flex justify-between items-center text-sky-200">
                  <span className="font-semibold">Bombardment Rate</span>
                  <span className="font-mono">{spawnConfig.streamRate} / sec</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={spawnConfig.streamRate}
                  onChange={(e) => onUpdateSpawnConfig({ streamRate: parseInt(e.target.value) })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <p className="text-[10px] text-sky-400/80">
                  Click & hold anywhere on canvas to continuously fire a stream of bodies to grow target planets!
                </p>
              </div>
            )}

            {/* Ring Disk Generator Controls */}
            {spawnConfig.spawnMode === 'ring_disk' && (
              <div className="space-y-3 bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Ring Radius</span>
                    <span className="font-mono">{spawnConfig.ringRadius} AU</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    value={spawnConfig.ringRadius}
                    onChange={(e) => onUpdateSpawnConfig({ ringRadius: parseInt(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Body Count</span>
                    <span className="font-mono">{spawnConfig.ringCount} objects</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={spawnConfig.ringCount}
                    onChange={(e) => onUpdateSpawnConfig({ ringCount: parseInt(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => onSpawnRingDisk(spawnConfig.ringCount, spawnConfig.ringRadius, spawnConfig.mass, spawnConfig.color)}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Generate Ring Orbit System
                </button>
              </div>
            )}

            {/* Instructions Tip */}
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 space-y-1 leading-relaxed">
              <span className="font-bold text-amber-400 block">💡 Usage Tip:</span>
              <p>Click on canvas to spawn objects, or click and drag to throw with custom velocity vector. Click any object to inspect & edit!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};