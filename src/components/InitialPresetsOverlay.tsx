import React from 'react';
import { PRESETS, Preset } from '../physics/presets';
import { Sun, Stars, Disc, Infinity as InfinityIcon, Zap, Orbit, PlusCircle } from 'lucide-react';

interface InitialPresetsOverlayProps {
  onSelectPreset: (preset: Preset) => void;
}

export const InitialPresetsOverlay: React.FC<InitialPresetsOverlayProps> = ({
  onSelectPreset
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Sun': return <Sun className="w-8 h-8 text-amber-400" />;
      case 'Stars': return <Stars className="w-8 h-8 text-sky-400" />;
      case 'Disc': return <Disc className="w-8 h-8 text-purple-400" />;
      case 'Infinity': return <InfinityIcon className="w-8 h-8 text-emerald-400" />;
      case 'Zap': return <Zap className="w-8 h-8 text-rose-400" />;
      case 'Orbit': return <Orbit className="w-8 h-8 text-cyan-400" />;
      default: return <PlusCircle className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
     <div className="fixed inset-0 z-50 flex items-center justify-center"
       style={{
         background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.06) 0%, rgba(2,6,23,0.97) 70%)'
       }}>
       {/* Ambient background glow */}
       <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.06),transparent_70%)]" />

      <div className="relative w-full max-w-4xl px-6 animate-fade-in">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center justify-center gap-3">
            <span className="text-4xl">🌌</span> Gravitational Simulator
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-mono">
            Select a simulation to begin
          </p>
        </div>

        {/* Preset Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p)}
              className="group p-5 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/5 flex flex-col justify-between text-left"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-amber-500/30 transition-colors">
                    {getIcon(p.iconName)}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                    Launch →
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-100 group-hover:text-amber-300 transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                  {p.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom hint */}
        <div className="text-center mt-8">
          <span className="text-[11px] text-slate-600 font-mono">
            or use "Presets" in the control bar after loading
          </span>
        </div>
      </div>
    </div>
  );
};