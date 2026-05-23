"use client";

import React from "react";
import { AegisState, GateState, StandState, AegisStore } from "../lib/store/stateStore";
import { MapPin, Users, ShieldAlert, Thermometer, Volume2, Camera, Sun, Droplets, Layers, Zap } from "lucide-react";

interface StadiumMapProps {
  state: AegisState;
  onGateSelect: (gate: GateState) => void;
  onStandSelect: (stand: StandState) => void;
  selectedGate: GateState | null;
  selectedStand: StandState | null;
}

/* ── Color helpers ──────────────────────────────────────────────────── */
function getGateCircleFill(status: GateState["status"]): string {
  if (status === "CRITICAL") return "#f43f5e";
  if (status === "WARNING")  return "#f97316";
  return "#10b981";
}

function getStandFill(stand: StandState, isSelected: boolean): string {
  const alpha = isSelected ? 0.9 : 0.72;
  if (stand.status === "CRITICAL") return `rgba(244,63,94,${alpha})`;
  if (stand.status === "WARNING")  return `rgba(249,115,22,${alpha})`;
  if (stand.occupancy > 80) return `rgba(234,88,12,${alpha})`;
  if (stand.occupancy > 55) return `rgba(249,115,22,${alpha - 0.15})`;
  return `rgba(154,52,18,${alpha - 0.25})`;
}

function getStandStroke(stand: StandState, isSelected: boolean): string {
  if (isSelected)             return "#06b6d4";
  if (stand.status === "CRITICAL") return "#f43f5e";
  if (stand.status === "WARNING")  return "#f97316";
  return "rgba(249,115,22,0.5)";
}

/* ── 3D NMS stadium SVG helper ──────────────────────────────────────── */
function StadiumSVG({
  state,
  onGateSelect,
  onStandSelect,
  selectedGate,
  selectedStand,
}: StadiumMapProps) {
  const { gates, stands, activeIncident } = state;
  const cx = 200, cy = 200;

  // Ring radii
  const Ro = 148, Rm = 124, Ri = 100, Rp = 74, Rfield = 55;

  const toRad = (deg: number) => (deg - 90) * Math.PI / 180;
  const polar = (r: number, deg: number) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });

  const arcPath = (r: number, inner: number, startDeg: number, endDeg: number, gap = 1.5) => {
    const e = endDeg <= startDeg ? endDeg + 360 : endDeg;
    const s = startDeg + gap, en = e - gap;
    const o1 = polar(r, s), o2 = polar(r, en);
    const i2 = polar(inner, en), i1 = polar(inner, s);
    const lf = (en - s) > 180 ? 1 : 0;
    return `M${o1.x},${o1.y} A${r},${r},0,${lf},1,${o2.x},${o2.y} L${i2.x},${i2.y} A${inner},${inner},0,${lf},0,${i1.x},${i1.y} Z`;
  };

  // 4 stands: North, East, South, West
  const segs = [
    { id: "North", label: "RELIANCE END", startDeg: 220, endDeg: 320 },
    { id: "East",  label: "EAST BOWL", startDeg: 320, endDeg: 40  },
    { id: "South", label: "ADANI PAVILION", startDeg: 40,  endDeg: 140 },
    { id: "West",  label: "WEST BOWL", startDeg: 140, endDeg: 220 },
  ];

  // 4 gates
  const gateNodes = [
    { key: "1", deg: 270, label: "G1" },
    { key: "2", deg: 0,   label: "G2" },
    { key: "3", deg: 90,  label: "G3" },
    { key: "4", deg: 180, label: "G4" },
  ];

  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-[340px] h-auto z-10 relative"
      style={{ filter: "drop-shadow(0 0 24px rgba(6,182,212,0.12))" }}>
      <defs>
        <radialGradient id="pitchGrad3d" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#166534" />
          <stop offset="45%"  stopColor="#15803d" />
          <stop offset="100%" stopColor="#052e16" />
        </radialGradient>
        <linearGradient id="pitchStrip3d" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#854d0e" />
          <stop offset="50%"  stopColor="#a16207" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <filter id="glowGreen3d">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="glowRed3d">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="glowCyan3d">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* ── Outer atmosphere rings ── */}
      <circle cx={cx} cy={cy} r={Ro + 32} fill="none"
        stroke="rgba(6,182,212,0.08)" strokeWidth="1" strokeDasharray="4 8" />
      <circle cx={cx} cy={cy} r={Ro + 22} fill="none"
        stroke="rgba(6,182,212,0.06)" strokeWidth="1" />

      {/* ── Roof canopy ring ── */}
      <circle cx={cx} cy={cy} r={Ro + 8}
        fill="none" stroke="rgba(229,231,235,0.18)" strokeWidth="14" />
      {/* Canopy struts (24) */}
      {Array.from({ length: 24 }, (_, i) => {
        const deg = (i / 24) * 360;
        const p1 = polar(Ro, deg), p2 = polar(Ro + 14, deg);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="rgba(209,213,219,0.2)" strokeWidth="1.5" />;
      })}

      {/* ── Seating segments (Upper + Lower tier rings) ── */}
      {segs.map(seg => {
        const stand = stands[seg.id];
        if (!stand) return null;
        const isSelected = selectedStand?.id === seg.id;
        const fill = getStandFill(stand, isSelected);
        const stroke = getStandStroke(stand, isSelected);
        const filterAttr = stand.status === "CRITICAL" ? "url(#glowRed3d)"
          : isSelected ? "url(#glowCyan3d)" : undefined;

        const upperPath = arcPath(Ro, Rm, seg.startDeg, seg.endDeg);
        const lowerPath = arcPath(Rm, Ri, seg.startDeg, seg.endDeg);

        const e = seg.endDeg <= seg.startDeg ? seg.endDeg + 360 : seg.endDeg;
        const midDeg = (seg.startDeg + e) / 2;
        const labelPos = polar((Ro + Rm) / 2 - 2, midDeg);

        // Occupancy arc at outer rim
        const barSpan = ((e - seg.startDeg) - 3) * (stand.occupancy / 100);
        const barPath = barSpan > 0 ? arcPath(Ro - 2, Ro - 9, seg.startDeg + 1.5, seg.startDeg + 1.5 + barSpan, 0) : null;

        return (
          <g key={seg.id} style={{ cursor: "pointer" }}
            onClick={() => onStandSelect(stand)}>
            {/* Upper tier */}
            <path d={upperPath}
              fill={fill} stroke={stroke}
              strokeWidth={isSelected ? 2 : 0.8}
              filter={filterAttr}
              opacity={isSelected ? 1 : 0.85}
              className="transition-all duration-300" />
            {/* Lower tier */}
            <path d={lowerPath}
              fill={fill.replace(/[\d.]+\)$/, "0.5)")}
              stroke={stroke} strokeWidth="0.5" opacity="0.65" />
            {/* Stand label */}
            <text x={labelPos.x} y={labelPos.y}
              fill="rgba(255,255,255,0.9)" fontSize="8" fontWeight="800"
              textAnchor="middle" dominantBaseline="middle"
              style={{ pointerEvents: "none", fontFamily: "monospace", letterSpacing: "0.06em" }}>
              {stand.name.split(" ")[0].toUpperCase()}
            </text>
            {/* Occupancy arc */}
            {barPath && (
              <path d={barPath}
                fill={stand.occupancy > 80 ? "rgba(251,191,36,0.7)" : "rgba(52,211,153,0.6)"}
                stroke="none" />
            )}
            {/* Critical pulse ring */}
            {stand.status === "CRITICAL" && (
              <path d={upperPath}
                fill="none" stroke="rgba(244,63,94,0.5)"
                strokeWidth="3" strokeDasharray="5 4"
                className="animate-pulse" />
            )}
            {/* Warning ring */}
            {stand.status === "WARNING" && (
              <path d={upperPath}
                fill="none" stroke="rgba(249,115,22,0.5)"
                strokeWidth="2" strokeDasharray="4 4"
                className="animate-pulse" />
            )}
          </g>
        );
      })}

      {/* ── Inner track between Ri and Rp ── */}
      <circle cx={cx} cy={cy} r={Ri} fill="rgba(8,12,24,0.95)" />
      <circle cx={cx} cy={cy} r={Ri} fill="none"
        stroke="rgba(6,182,212,0.25)" strokeWidth="1" />

      {/* ── Outfield (green) ── */}
      <circle cx={cx} cy={cy} r={Rp} fill="url(#pitchGrad3d)" />
      {/* Mowing stripes */}
      {Array.from({ length: 7 }, (_, i) => {
        const yOff = -Rp + i * (Rp * 2 / 7);
        const hw = Math.sqrt(Math.max(0, Rp * Rp - yOff * yOff));
        return (
          <rect key={i}
            x={cx - hw} y={cy + yOff} width={hw * 2} height={Rp * 2 / 7}
            fill={i % 2 === 0 ? "rgba(22,101,52,0.5)" : "rgba(21,128,61,0.25)"}
            clipPath="circle" />
        );
      })}

      {/* ── Boundary circle ── */}
      <circle cx={cx} cy={cy} r={Rp - 5}
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2"
        strokeDasharray="3 6" />

      {/* ── Cricket pitch strip ── */}
      <rect x={cx - 5} y={cy - 38} width={10} height={76}
        fill="url(#pitchStrip3d)" rx="1.5"
        stroke="rgba(161,98,7,0.6)" strokeWidth="0.8" />
      {/* Crease lines */}
      <line x1={cx - 12} y1={cy - 31} x2={cx + 12} y2={cy - 31} stroke="white" strokeWidth="1" opacity="0.7" />
      <line x1={cx - 12} y1={cy + 31} x2={cx + 12} y2={cy + 31} stroke="white" strokeWidth="1" opacity="0.7" />
      {/* Stumps */}
      {[-1.2, 0, 1.2].map(o => (
        <React.Fragment key={o}>
          <line x1={cx + o} y1={cy - 35} x2={cx + o} y2={cy - 28} stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" />
          <line x1={cx + o} y1={cy + 28} x2={cx + o} y2={cy + 35} stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" />
        </React.Fragment>
      ))}

      {/* ── AEGIS label centre ── */}
      <text x={cx} y={cy - 3} fill="rgba(6,182,212,0.65)" fontSize="6"
        fontWeight="800" textAnchor="middle" fontFamily="monospace" letterSpacing="0.2em">
        AEGIS
      </text>
      <text x={cx} y={cy + 5} fill="rgba(6,182,212,0.35)" fontSize="4"
        textAnchor="middle" fontFamily="monospace" letterSpacing="0.08em">
        LIVE MONITOR
      </text>

      {/* ── Dynamic Incident overlays ── */}
      {activeIncident === "surge" && (() => {
        const gA = polar(Ro + 22, 270); const gB = polar(Ro + 22, 0);
        return (
          <path d={`M${gA.x},${gA.y} Q${cx},${cy - 120} ${gB.x},${gB.y}`}
            fill="none" stroke="#fbbf24" strokeWidth="2"
            strokeDasharray="6 4"
            style={{ animation: "dash 1.2s linear infinite" }} />
        );
      })()}
      {activeIncident === "threat" && (
        <>
          <circle cx={cx + 25} cy={cy + 60} r={13}
            fill="rgba(244,63,94,0.85)" filter="url(#glowRed3d)"
            className="animate-pulse" />
          <text x={cx + 25} y={cy + 65} fill="white" fontSize="11"
            fontWeight="900" textAnchor="middle">!</text>
        </>
      )}
      {activeIncident === "storm" && (
        <>
          <circle cx={cx} cy={cy - 115} r={22}
            fill="rgba(59,130,246,0.2)" stroke="rgba(59,130,246,0.5)"
            strokeWidth="1.5" className="animate-pulse" />
          <text x={cx} y={cy - 110} fill="#93c5fd" fontSize="18" textAnchor="middle">⚡</text>
        </>
      )}

      {/* ── Flow arrows for weather storm evacuation ── */}
      {activeIncident === "storm" && (
        <>
          {gateNodes.map(gn => {
            const inner = polar(Ri + 5, gn.deg);
            const outer = polar(Ro + 20, gn.deg);
            return <line key={gn.key}
              x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke="rgba(59,130,246,0.5)" strokeWidth="2"
              strokeDasharray="4 3"
              style={{ animation: "dash 1.2s linear infinite" }} />;
          })}
        </>
      )}

      {/* ── Security scan overlay ── */}
      {activeIncident === "threat" && (
        <rect x={cx - Rp} y={cy + 30} width={Rp * 2} height={20}
          fill="rgba(244,63,94,0.06)" stroke="rgba(244,63,94,0.2)"
          strokeWidth="0.5" className="animate-pulse"
          style={{ clipPath: `circle(${Rp}px at ${cx}px ${cy}px)` }} />
      )}

      {/* ── GATE NODES ── */}
      {gateNodes.map(gn => {
        const gate = gates[gn.key];
        if (!gate) return null;
        const pos = polar(Ro + 22, gn.deg);
        const rimPos = polar(Ro + 9, gn.deg);
        const fill = getGateCircleFill(gate.status);
        const isSelected = selectedGate?.id === gn.key;
        const isCritical = gate.status === "CRITICAL";
        const isWarning  = gate.status === "WARNING";

        return (
          <g key={gn.key} style={{ cursor: "pointer" }} onClick={() => onGateSelect(gate)}>
            {/* Connector line */}
            <line x1={rimPos.x} y1={rimPos.y} x2={pos.x} y2={pos.y}
              stroke={fill} strokeWidth="1.5" opacity="0.55" />
            {/* Gate circle */}
            <circle cx={pos.x} cy={pos.y}
              r={isSelected ? 10 : 9}
              fill={fill} opacity="0.9"
              stroke={isSelected ? "white" : "rgba(255,255,255,0.25)"}
              strokeWidth={isSelected ? 1.5 : 0.8}
              filter={(isCritical || isWarning) ? "url(#glowRed3d)" : "url(#glowGreen3d)"}
              className={(isCritical || isWarning) ? "animate-pulse" : ""} />
            {/* Gate label */}
            <text x={pos.x} y={pos.y + 1}
              fill="#000" fontSize="7" fontWeight="900"
              textAnchor="middle" dominantBaseline="middle"
              style={{ pointerEvents: "none", fontFamily: "monospace" }}>
              {gn.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function StadiumMap({
  state,
  onGateSelect,
  onStandSelect,
  selectedGate,
  selectedStand,
}: StadiumMapProps) {
  const { gates, stands } = state;

  return (
    <div className="relative flex flex-col flex-1 h-full w-full p-4 glass-panel border border-white/5 neon-glow-cyan overflow-hidden bg-black/40">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase font-mono">
            3D Stadium · Narendra Modi Stadium
          </h2>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/50 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /><span>Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /><span>Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /><span>Critical</span>
          </div>
        </div>
      </div>

      {/* 3D Map Canvas */}
      <div className="relative flex-1 flex items-center justify-center min-h-[340px] bg-black/30 rounded-lg overflow-hidden border border-cyan-950/30"
        style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(6,182,212,0.04) 0%, rgba(2,5,9,0.95) 70%)"
        }}>

        {/* Perspective 3D tilt wrapper */}
        <div style={{
          perspective: "860px",
          perspectiveOrigin: "50% 20%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            transform: "rotateX(36deg)",
            transformStyle: "preserve-3d",
            transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
            width: "90%",
            maxWidth: "340px",
          }}
            className="hover:[transform:rotateX(24deg)]">
            <StadiumSVG
              state={state}
              onGateSelect={onGateSelect}
              onStandSelect={onStandSelect}
              selectedGate={selectedGate}
              selectedStand={selectedStand}
            />
          </div>
        </div>

        {/* Incident banner overlay */}
        {state.activeIncident && (
          <div className="absolute top-2 left-2 z-20 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border animate-pulse bg-red-950/80 border-red-600/60 text-red-300">
            ● ACTIVE INCIDENT: {state.activeIncident.toUpperCase()}
          </div>
        )}

        {/* Hint */}
        {!selectedGate && !selectedStand && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-800 bg-black/50 px-3 py-1 rounded-full border border-cyan-950/40 pointer-events-none">
            ↕ Hover to tilt · Click a stand or gate
          </div>
        )}
      </div>

      {/* 8-stand mini occupancy strip */}
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {Object.values(stands).map(stand => (
          <button key={stand.id} onClick={() => onStandSelect(stand)}
            className={`rounded border text-[8px] font-mono py-1 text-center transition-all ${
              stand.status === "CRITICAL" ? "border-rose-500/70 bg-rose-950/30 text-rose-300" :
              stand.status === "WARNING"  ? "border-amber-500/70 bg-amber-950/30 text-amber-300" :
              selectedStand?.id === stand.id ? "border-cyan-500/60 bg-cyan-950/30 text-cyan-300" :
              "border-white/10 bg-white/5 text-white/40 hover:border-orange-700/40 hover:text-orange-400"
            }`}>
            <div className="font-bold">{stand.name.split(" ")[0]}</div>
            <div className="text-[7px] opacity-70">{stand.occupancy}%</div>
          </button>
        ))}
      </div>

      {/* Telemetry readout below map */}
      <div className="mt-3 border-t border-white/10 pt-3 min-h-[80px] z-10">
        {selectedGate ? (
          <div className="flex flex-col gap-1.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-white/60 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Gate Sector:
              </span>
              <span className="text-cyan-400 font-bold">{selectedGate.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-white/5 p-1.5 rounded flex flex-col">
                <span className="text-[10px] text-white/40">FLOW RATE</span>
                <span className="text-white font-semibold flex items-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  {selectedGate.flowRate} people/min
                </span>
              </div>
              <div className="bg-white/5 p-1.5 rounded flex flex-col">
                <span className="text-[10px] text-white/40">INFLOW TOTAL</span>
                <span className="text-white font-semibold">
                  {selectedGate.currentInflow} / {selectedGate.maxCapacity}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] bg-white/5 p-1.5 rounded border border-white/5 mt-1">
              <span className="text-white/40">ACTIVE ROUTE MAP:</span>
              <span className={`font-semibold ${
                selectedGate.status === "CRITICAL" ? "text-rose-400 animate-pulse" : "text-emerald-400"
              }`}>
                {selectedGate.activeRoute}
              </span>
            </div>
          </div>
        ) : selectedStand ? (
          <div className="flex flex-col gap-1.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-white/60 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Seating Zone:
              </span>
              <span className="text-cyan-400 font-bold">{selectedStand.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div className="bg-white/5 p-1 rounded flex flex-col items-center">
                <span className="text-[9px] text-white/40 uppercase">Occupancy</span>
                <span className="text-white font-bold mt-0.5">{selectedStand.occupancy}%</span>
              </div>
              <div className="bg-white/5 p-1 rounded flex flex-col items-center">
                <span className="text-[9px] text-white/40 uppercase">Noise</span>
                <span className="text-white font-bold flex items-center gap-0.5 mt-0.5">
                  <Volume2 className="w-3 h-3 text-cyan-400" /> {selectedStand.noise} dB
                </span>
              </div>
              <div className="bg-white/5 p-1 rounded flex flex-col items-center">
                <span className="text-[9px] text-white/40 uppercase">Temp</span>
                <span className="text-white font-bold flex items-center gap-0.5 mt-0.5">
                  <Thermometer className="w-3 h-3 text-emerald-400" /> {selectedStand.temperature}°C
                </span>
              </div>
            </div>
            {selectedStand.incident ? (
              <div className="flex items-center gap-2 bg-rose-950/40 p-1.5 rounded border border-rose-500/20 text-rose-400 mt-1">
                <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0 animate-bounce" />
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  ALERT: {selectedStand.incident}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-white/50 text-[10px] bg-white/5 p-1.5 rounded mt-1">
                <Camera className="w-3.5 h-3.5 text-white/30" />
                <span>CCTV: <span className="text-emerald-400">{selectedStand.cameraFeed}</span></span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-white/30 p-2 font-mono text-xs">
            <Camera className="w-6 h-6 text-white/10 mb-1" />
            <span>Select any Gate (1–4) or seating sector to view telemetry feeds.</span>
          </div>
        )}
      </div>

      {/* ── Narendra Modi Stadium Authentic Sub-systems Telemetry ── */}
      <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-3.5 z-10 font-mono text-[10px]">
        <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold uppercase tracking-wider text-cyan-400">NMS Special Sub-Systems</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          
          {/* Canopy "Ring of Fire" LED Control Panel */}
          <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-white/70">
              <span className="flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Roof LED Ring
              </span>
              <span className="text-amber-400 font-bold">{state.canopyLedIntensity}%</span>
            </div>
            <div className="text-[9px] text-white/40 leading-none">
              Mode: <span className="text-white font-bold">{state.canopyLedMode}</span>
            </div>
            
            {/* Mode selection buttons */}
            <div className="grid grid-cols-4 gap-0.5 mt-0.5">
              {(["ANTI_SHADOW", "STADIUM_LIGHT", "LED_SHOW", "STANDBY"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => AegisStore.setCanopyLedMode(mode)}
                  className={`py-1 rounded text-[7px] text-center border font-bold transition-all ${
                    state.canopyLedMode === mode
                      ? "bg-amber-950/40 border-amber-500 text-amber-300"
                      : "bg-white/5 border-transparent text-white/40 hover:text-white/70"
                  }`}
                  title={mode.replace("_", " ")}
                >
                  {mode.split("_")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Subsoil Drainage Telemetry */}
          <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col gap-1">
            <div className="flex items-center justify-between text-white/70">
              <span className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-blue-400" /> Subsoil Drainage
              </span>
              <span className={`text-[9px] px-1 rounded font-bold uppercase ${
                state.subsoilDrainagePumpsActive ? "bg-blue-500/20 text-blue-400 animate-pulse" : "bg-white/5 text-white/40"
              }`}>
                {state.subsoilDrainagePumpsActive ? "Active" : "Idle"}
              </span>
            </div>
            <div className="flex justify-between items-center text-[9px] mt-1.5">
              <span className="text-white/40">Moisture:</span>
              <span className="text-white font-bold">{state.subsoilMoisture}%</span>
            </div>
            <button
              onClick={() => AegisStore.toggleDrainagePumps()}
              className={`w-full mt-1.5 py-1 px-2 rounded border text-center font-bold text-[8px] transition-all ${
                state.subsoilDrainagePumpsActive
                  ? "bg-blue-950/40 border-blue-500 text-blue-300"
                  : "bg-zinc-950 border-white/10 text-white/50 hover:text-white/80"
              }`}
            >
              {state.subsoilDrainagePumpsActive ? "Deactivate Pumps" : "Activate Subsoil Pumps"}
            </button>
          </div>

        </div>

        {/* Elevated Podium & Plaza Splitting Telemetry */}
        <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-white/70">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-Level Crowd Split (Elevated Podium Plaza)</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-1 text-[9px]">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-white/40">
                <span>12m Pedestrian Plaza:</span>
                <span className="text-emerald-400 font-bold">{state.podiumPlazaDensity}%</span>
              </div>
              <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${state.podiumPlazaDensity}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-white/40">
                <span>Ground Transit Level:</span>
                <span className="text-cyan-400 font-bold">{state.groundTrafficDensity}%</span>
              </div>
              <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${state.groundTrafficDensity}%` }} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
