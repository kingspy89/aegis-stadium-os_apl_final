"use client";

import React, { useState } from "react";
import { AegisState, AegisStore } from "../lib/store/stateStore";
import { Sliders, Volume2, VolumeX, RefreshCw, AlertTriangle, ShieldCheck, CloudLightning, HelpCircle, ArrowRight } from "lucide-react";

interface DemoControllerProps {
  state: AegisState;
}

export default function DemoController({ state }: DemoControllerProps) {
  const { activeIncident, voiceAlertsEnabled, apiMode, isSimulating, operatorApproved } = state;
  const [customFeedback, setCustomFeedback] = useState("");

  const handleAct1 = () => AegisStore.triggerAct1();
  const handleAct2 = () => AegisStore.triggerAct2();
  const handleAct3 = () => AegisStore.triggerAct3();
  const handleReset = () => AegisStore.resetState();
  const handleToggleVoice = () => AegisStore.toggleVoiceAlerts();
  const handleToggleApi = () => AegisStore.toggleApiMode();

  const handleApproveSop = () => AegisStore.approveSop();

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFeedback.trim()) return;
    AegisStore.addFeedback(customFeedback);
    setCustomFeedback("");
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full font-mono text-xs">
      
      {/* Demo Controls Section */}
      <div className="glass-panel border border-white/5 bg-black/45 p-4 neon-glow-cyan">
        
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="font-bold tracking-wider text-cyan-400 uppercase">
              Presenter Demo Controller
            </span>
          </div>
          <button 
            onClick={handleReset}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Reset All Telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Core Config toggles */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          
          {/* API Mode Toggler */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/40 uppercase">Orchestration Core</span>
            <button
              onClick={handleToggleApi}
              className={`py-2 px-2.5 rounded border font-bold text-center tracking-wide uppercase transition-all duration-200 ${
                apiMode === "live"
                  ? "bg-purple-950/40 border-purple-500 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                  : "bg-cyan-950/20 border-cyan-500/30 text-cyan-400/80 hover:border-cyan-400 hover:text-cyan-400"
              }`}
            >
              {apiMode === "live" ? "Gemini Live API" : "APL Simulator"}
            </button>
          </div>

          {/* Voice Mode Toggler */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/40 uppercase">AI Speech Alerts</span>
            <button
              onClick={handleToggleVoice}
              className={`py-2 px-2.5 rounded border font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                voiceAlertsEnabled
                  ? "bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                  : "bg-zinc-950 border-white/10 text-white/40 hover:text-white/80"
              }`}
            >
              {voiceAlertsEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" /> Voice ON
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" /> Voice OFF
                </>
              )}
            </button>
          </div>

        </div>

        {/* The 3-Act Pitch Selector Script */}
        <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
          <span className="text-[10px] text-white/40 uppercase mb-1">Select Pitch Act Scenario</span>
          
          {/* Act 1 */}
          <button
            onClick={handleAct1}
            disabled={isSimulating}
            className={`w-full py-2.5 px-3 rounded flex items-center gap-2.5 border text-left font-sans transition-all duration-200 ${
              activeIncident === "surge"
                ? "bg-cyan-950/40 border-cyan-400 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/10 disabled:opacity-50"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="font-bold text-xs">Act 1: Gate A Crowd Surge</span>
              <span className="text-[10px] text-white/40 font-mono">Bottlenecks & Dynamic Reroutes</span>
            </div>
          </button>

          {/* Act 2 */}
          <button
            onClick={handleAct2}
            disabled={isSimulating}
            className={`w-full py-2.5 px-3 rounded flex items-center gap-2.5 border text-left font-sans transition-all duration-200 ${
              activeIncident === "threat"
                ? "bg-rose-950/40 border-rose-400 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
                : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/10 disabled:opacity-50"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <div className="flex flex-col">
              <span className="font-bold text-xs">Act 2: Suspicious CCTV Item</span>
              <span className="text-[10px] text-white/40 font-mono">Multimodal Vision Anomaly & SOP</span>
            </div>
          </button>

          {/* Act 3 */}
          <button
            onClick={handleAct3}
            disabled={isSimulating}
            className={`w-full py-2.5 px-3 rounded flex items-center gap-2.5 border text-left font-sans transition-all duration-200 ${
              activeIncident === "storm"
                ? "bg-amber-950/40 border-amber-500 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/10 disabled:opacity-50"
            }`}
          >
            <CloudLightning className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col">
              <span className="font-bold text-xs">Act 3: Severe Weather Evac</span>
              <span className="text-[10px] text-white/40 font-mono">Orderly Sheltering & Multilingual Concierge</span>
            </div>
          </button>

        </div>

        {/* Manual Gate Flow Control */}
        <div className="flex flex-col gap-2 border-t border-white/5 pt-3 mt-2">
          <span className="text-[10px] text-white/40 uppercase mb-1">Manual Gate Flow (Simulation Override)</span>
          {Object.values(state.gates).map((gate) => (
            <div key={gate.id} className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className={gate.status === "CRITICAL" ? "text-rose-400 font-bold" : gate.status === "WARNING" ? "text-amber-400 font-bold" : "text-white/70"}>{gate.name}</span>
                <span className="text-white/50">{gate.flowRate} p/m</span>
              </div>
              <input
                type="range"
                min="0"
                max="250"
                value={gate.flowRate}
                onChange={(e) => AegisStore.setGateFlow(gate.id, parseInt(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          ))}
        </div>

      </div>

      {/* Human-in-the-Loop SOP Verification Board (For Act 2) */}
      {activeIncident === "threat" && (
        <div className="glass-panel border border-rose-500/20 bg-rose-950/15 p-4 neon-glow-rose flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold border-b border-rose-500/20 pb-2 mb-1">
            <ShieldCheck className="w-4.5 h-4.5" />
            <span>SOP OPERATOR APPROVAL PANEL</span>
          </div>
          <p className="font-sans text-white/80 leading-relaxed text-[11px] mb-1">
            Security Risk Agent has identified an anomaly with 89% confidence. Standard Operating Procedures (SOP Level 3) require operator authorization before shutting down turnstiles or locking gates.
          </p>
          <button
            disabled={operatorApproved}
            onClick={handleApproveSop}
            className={`w-full py-2 px-3 rounded text-center text-xs font-bold font-sans transition-all duration-200 ${
              operatorApproved
                ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400"
                : "bg-rose-500 hover:bg-rose-600 text-white font-extrabold shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse"
            }`}
          >
            {operatorApproved ? "SOP PROCEDURES DISPATCHED" : "AUTHORIZE AI SOP ACTIONS (MFA)"}
          </button>
        </div>
      )}

      {/* Sandbox Predictive Override panel */}
      <div className="glass-panel border border-white/5 bg-black/45 p-4 neon-glow-cyan">
        
        <div className="flex items-center gap-2 border-b border-white/10 pb-2.5 mb-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span className="font-bold tracking-wider text-cyan-400 uppercase">
            Predictive Override Sandbox
          </span>
        </div>
        
        <p className="font-sans text-white/50 text-[10px] leading-relaxed mb-3">
          Simulate human correction: type manual bypass vectors to override AI recommendations, prompting agent consensus loops.
        </p>

        {/* Human Feedback Override Form */}
        <form onSubmit={handleSubmitFeedback} className="flex gap-2">
          <input
            type="text"
            value={customFeedback}
            onChange={(e) => setCustomFeedback(e.target.value)}
            placeholder="Type routing correction (e.g. Evacuate via Gate D)"
            className="flex-1 px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-3 bg-cyan-950 border border-cyan-500 text-cyan-400 font-bold hover:bg-cyan-900 transition-colors flex items-center justify-center"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>

    </div>
  );
}
