"use client";

import React, { useState } from "react";
import { Play, AlertTriangle, Camera } from "lucide-react";

interface ZoneData {
  id: string;
  name: string;
  type: string;
  density: number;
}

const initialZones: ZoneData[] = [
  { id: "1", name: "Food Court North", type: "FOOD", density: 10 },
  { id: "2", name: "Gate A", type: "GATE", density: 11 },
  { id: "3", name: "Gate B", type: "GATE", density: 19 },
  { id: "4", name: "North Parking", type: "PARKING", density: 18 },
  { id: "5", name: "Restrooms West", type: "RESTROOM", density: 29 },
  { id: "6", name: "Snacks South", type: "FOOD", density: 16 },
  { id: "7", name: "South Parking", type: "PARKING", density: 12 },
  { id: "8", name: "Stand V1", type: "SEATING", density: 29 },
];

export default function LiveCrowdSimulatorCore() {
  const [zones, setZones] = useState<ZoneData[]>(initialZones);

  const handleDensityChange = (id: string, newDensity: number) => {
    setZones(zones.map(z => z.id === id ? { ...z, density: newDensity } : z));
  };

  return (
    <div className="glass-panel border border-white/5 bg-black/60 p-4 neon-glow-cyan h-full flex flex-col font-mono text-xs text-white/70">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-widest text-white/80 uppercase">
            LIVE CROWD SIMULATOR CORE
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] font-bold">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-colors">
            <Play className="w-3 h-3" /> SIMULATE
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            SYNC: ACTIVE
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 text-[9px] uppercase tracking-wider text-white/40 pb-2 border-b border-white/5">
        <div className="col-span-3">Zone Name</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-5 text-center">Crowd Density</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto pr-1 mt-2 flex flex-col gap-3">
        {zones.map((zone) => (
          <div key={zone.id} className="grid grid-cols-12 gap-2 items-center text-[10px]">
            {/* Name */}
            <div className="col-span-3 font-semibold text-white/90">
              {zone.name}
            </div>
            
            {/* Type */}
            <div className="col-span-2 text-white/40">
              {zone.type}
            </div>

            {/* Density Slider */}
            <div className="col-span-5 flex items-center gap-3">
              <div className="flex-1 relative h-1 bg-white/5 rounded-full flex items-center">
                {/* Custom Slider Input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={zone.density}
                  onChange={(e) => handleDensityChange(zone.id, parseInt(e.target.value))}
                  className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                />
                {/* Track Fill */}
                <div 
                  className="absolute h-1 bg-emerald-400 rounded-full" 
                  style={{ width: `${zone.density}%` }}
                />
                {/* Thumb styling */}
                <div 
                  className="absolute w-2 h-4 bg-emerald-400 rounded shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all pointer-events-none"
                  style={{ left: `calc(${zone.density}% - 4px)` }}
                />
              </div>
              <span className="text-emerald-400 font-bold w-8 text-right font-sans">
                {zone.density.toString().padStart(3, '0')}%
              </span>
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center justify-end gap-2 text-white/30">
              <button className="hover:text-amber-400 transition-colors">
                <AlertTriangle className="w-3.5 h-3.5" />
              </button>
              <button className="hover:text-cyan-400 transition-colors">
                <Camera className="w-3.5 h-3.5" />
              </button>
              <button className="hover:text-white transition-colors text-[9px] font-bold tracking-wider">
                CLR
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
