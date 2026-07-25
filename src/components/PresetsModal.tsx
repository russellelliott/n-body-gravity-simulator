import React from 'react';
import { PRESETS, Preset } from '../physics/presets';
import { X, Sun, Stars, Disc, Infinity as InfinityIcon, Zap, Orbit, PlusCircle } from 'lucide-react';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: Preset) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset
}) => {
  if (!isOpen) return null;

  const getIcon = (name: string) => {
    switch (name) {
      case 'Sun': return <Sun className="w-6 h-6 text-amber-400" />;
      case 'Stars': return <Stars className="w-6 h-6 text-sky-400" />;
      case 'Disc': return <Disc className="w-6 h-6 text-purple-400" />;
      case 'Infinity': return <InfinityIcon className="w-6 h-6 text-emerald-400" />;
      case 'Zap': return <Zap className="w-6 h-6 text-rose-400" />;
      case 'Orbit': return <Orbit className="w-6 h-6 text-cyan-400" />;
      default: return <PlusCircle className="w-6 h-6 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🌌 Gravitational System Presets</span>
            </h2>
            <p className="text-xs text-slate-400">Select a pre-configured orbital scenario to simulate</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-5 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
          {PRESETS.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                onSelectPreset(p);
                onClose();
              }}
              className="group p-4 bg-slate-950/70 hover:bg-slate-850 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-amber-500/30">
                  {getIcon(p.iconName)}
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider group-hover:text-amber-400">
                  Load Preset →
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  {p.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
