import React from 'react';
import { SystemStats, CameraViewMode } from '../types';
import { Orbit, Activity, Disc, Eye, Zap } from 'lucide-react';

interface TopHUDProps {
  stats: SystemStats;
  cameraMode: CameraViewMode;
  selectedBodyName: string | null;
  onChangeCameraMode: (mode: CameraViewMode) => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  stats,
  cameraMode,
  selectedBodyName,
  onChangeCameraMode
}) => {
  return (
     <div className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-3 select-none pointer-events-none">
       {/* Title & App Badge */}
       <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-950/80 backdrop-blur-xl border border-slate-800 px-3.5 py-2 rounded-2xl shadow-xl">
         <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-sky-400 flex items-center justify-center text-slate-950 shadow-md">
           <Orbit className="w-4 h-4 animate-spin-slow" />
         </div>
         <div>
           <h1 className="text-xs font-black tracking-wider uppercase text-slate-100 flex items-center gap-1.5">
            N-Body Gravity <span className="text-amber-400 font-mono text-[10px] font-bold px-1.5 py-0.2 bg-amber-500/10 border border-amber-500/30 rounded">3D</span>
           </h1>
           <p className="text-[10px] text-slate-400 font-medium">WebGL Gravitational Simulator</p>
         </div>
       </div>

       {/* Real-Time System Metrics */}
       <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/80 backdrop-blur-xl border border-slate-800 px-3 py-2 rounded-2xl text-[11px] font-mono text-slate-300 shadow-xl">
         <div className="flex items-center gap-1.5">
           <Disc className="w-3.5 h-3.5 text-sky-400" />
           <span className="text-slate-400">Bodies:</span>
           <span className="font-bold text-sky-300">{stats.bodyCount}</span>
         </div>

         <div className="h-3 w-px bg-slate-800" />

         <div className="flex items-center gap-1.5">
           <Activity className="w-3.5 h-3.5 text-amber-400" />
           <span className="text-slate-400">Mass:</span>
           <span className="font-bold text-amber-300">
             {stats.totalMass >= 1000 ? `${(stats.totalMass / 1000).toFixed(1)}k` : stats.totalMass.toFixed(1)} M
           </span>
         </div>

         <div className="h-3 w-px bg-slate-800 hidden sm:block" />

         <div className="hidden sm:flex items-center gap-1.5">
           <Zap className="w-3.5 h-3.5 text-emerald-400" />
           <span className="text-slate-400">Kinetic E:</span>
           <span className="font-bold text-emerald-300">{Math.round(stats.kineticEnergy)} J</span>
         </div>
       </div>

       {/* Camera Mode Indicator Badge */}
       <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/80 backdrop-blur-xl border border-slate-800 px-3 py-1.5 rounded-2xl text-[11px] shadow-xl">
         <Eye className="w-3.5 h-3.5 text-amber-400" />
         <span className="text-slate-400">View:</span>
         <button
          onClick={() => onChangeCameraMode('free')}
          className="font-semibold text-amber-300 hover:underline capitalize"
         >
           {cameraMode === 'follow' && selectedBodyName ? `Tracking ${selectedBodyName}` : cameraMode}
         </button>
       </div>
     </div>
  );
};