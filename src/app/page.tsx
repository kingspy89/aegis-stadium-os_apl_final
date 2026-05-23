"use client";

import React, { useState, useEffect } from "react";
import { AegisStore, AegisState, GateState, StandState } from "../lib/store/stateStore";
import StadiumMap from "@/components/StadiumMap";
import AgentConsole from "@/components/AgentConsole";
import AgentNetwork from "@/components/AgentNetwork";
import DemoController from "@/components/DemoController";
import TelegramSync from "@/components/TelegramSync";
import { ShieldCheck, Download, Users, Radio } from "lucide-react";

export default function Home() {
  const [state, setState] = useState<AegisState | null>(null);
  const [selectedGate, setSelectedGate] = useState<GateState | null>(null);
  const [selectedStand, setSelectedStand] = useState<StandState | null>(null);

  useEffect(() => {
    // Set initial state
    setState(AegisStore.getState());

    // Subscribe to state store updates
    const unsubscribe = AegisStore.subscribe(() => {
      const updated = AegisStore.getState();
      setState({ ...updated });
      
      // Keep selection items synchronized
      if (selectedGate) {
        setSelectedGate(updated.gates[selectedGate.id]);
      }
      if (selectedStand) {
        setSelectedStand(updated.stands[selectedStand.id]);
      }
    });

    return unsubscribe;
  }, [selectedGate, selectedStand]);

  // Outbound Sync: Sync active incident from dashboard to server for fan companion
  useEffect(() => {
    if (!state) return;
    
    const syncIncident = async () => {
      try {
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_incident",
            incidentType: state.activeIncident
          })
        });
      } catch (err) {
        console.error("Failed to sync dashboard incident to server", err);
      }
    };
    
    syncIncident();
  }, [state?.activeIncident]);

  // Inbound Sync: Poll server-side sync queue for real-time ticket scanning events
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/sync?clear=true");
        const data = await res.json();
        
        if (data.success) {
          // 1. Process Turnstile Scanner Events
          if (data.events && data.events.length > 0) {
            data.events.forEach((event: any) => {
              AegisStore.updateState((s) => {
                const time = event.timestamp || new Date().toLocaleTimeString().split(" ")[0];
                const gateId = event.gate;
                const standId = event.stand;
                
                // 1. Process statistics updates based on scanning outcome
                if (event.type === "valid" || event.type === "vip" || event.type === "incident_reroute") {
                  if (s.gates[gateId]) {
                    s.gates[gateId].currentInflow += 1;
                    s.gates[gateId].flowRate = Math.min(95, s.gates[gateId].flowRate + 3);
                  }
                  if (s.stands[standId]) {
                    s.stands[standId].occupancy = Math.min(100, parseFloat((s.stands[standId].occupancy + 0.1).toFixed(1)));
                  }
                }

                // 2. Synthesize smart multi-agent logs based on scanner events
                if (event.type === "valid") {
                  s.thoughts.push({
                    id: Math.random().toString(),
                    agent: "Orchestrator",
                    type: "thought",
                    message: `Real-time ticket scan verified at Gate ${gateId} (North Portal). Attendee: ${event.name}. Seat Assignment: Stand ${standId} Bowl. Flow rate is normal.`,
                    timestamp: time
                  });
                  s.thoughts.push({
                    id: Math.random().toString(),
                    agent: "Crowd",
                    type: "action",
                    message: `Inflow incremented at Stand ${standId}. Adjusted local density telemetry to ${s.stands[standId].occupancy}%.`,
                    timestamp: time
                  });
                } else if (event.type === "vip") {
                  s.thoughts.push({
                    id: Math.random().toString(),
                    agent: "Orchestrator",
                    type: "thought",
                    message: `VIP ELITE ticket verified at Gate ${gateId} (VIP Club Gate). Guest: ${event.name}. Destination: Stand ${standId} Executive Suites.`,
                    timestamp: time
                  });
                  s.thoughts.push({
                    id: Math.random().toString(),
                    agent: "Security",
                    type: "action",
                    message: `VIP Guest ${event.name} entered Sector ${standId}. Dispatched host steward team for luxury lounge escort duty.`,
                    timestamp: time
                  });
                } else if (event.type === "duplicate") {
                  s.thoughts.push({
                    id: Math.random().toString(),
                    agent: "Security",
                    type: "thought",
                    message: `WARNING SCANNER ANOMALY: Ticket ID '${event.ticketId}' (Holder: ${event.name}) scanned at Gate ${gateId} is already checked in. Access Denied. Entry gate barriers held.`,
                    timestamp: time
                  });
                } else if (event.type === "wrong_gate") {
                  s.thoughts.push({
                    id: Math.random().toString(),
                    agent: "Routing",
                    type: "thought",
                    message: `ACCESS BLOCKED: Attendee ${event.name} arrived at Gate ${gateId} but ticket is registered for Gate B (East Stand). REDIRECTING... Route map pushed to device.`,
                    timestamp: time
                  });
                } else if (event.type === "counterfeit") {
                  if (s.gates[gateId]) {
                    s.gates[gateId].status = "CRITICAL";
                  }
                  s.thoughts.push({
                    id: Math.random().toString(),
                    agent: "Security",
                    type: "thought",
                    message: `!!! CRITICAL THREAT ALERT !!! Invalid cryptographic signature scanned at Gate ${gateId}. Ticket ID: ${event.ticketId}. Security barrier locked down. Stewards dispatched to intercept.`,
                    timestamp: time
                  });
                } else if (event.type === "incident_reroute") {
                  s.thoughts.push({
                    id: Math.random().toString(),
                    agent: "Routing",
                    type: "action",
                    message: `Reroute validation: Ticket for restricted Gate C accepted at open Gate ${gateId}. Diverted fan ${event.name} safely to Sector ${standId}.`,
                    timestamp: time
                  });
                  s.thoughts.push({
                    id: Math.random().toString(),
                    agent: "Fan",
                    type: "schema",
                    message: `Dynamic wayfinding vector sent to ${event.name}'s Fan Companion App for Sector ${standId} entry via East gate.`,
                    timestamp: time
                  });
                }
              });
            });
          }

          // 2. Process Telegram Bot Messages
          if (data.telegramMessages && data.telegramMessages.length > 0) {
            data.telegramMessages.forEach((msg: any) => {
              console.log("[Dashboard Sync] Received Telegram Message:", msg);
              if (typeof window !== "undefined") {
                (window as any).lastTelegramChatId = msg.chatId;
              }
              AegisStore.addVolunteerMessage(msg.text, msg.photoUrl, msg.voiceUrl);
            });
          }
        }
      } catch (err) {
        console.error("Error polling sync server queue", err);
      }
    }, 1500);
    
    return () => clearInterval(interval);
  }, []);


  if (!state) return null;

  const handleGateSelect = (gate: GateState) => {
    setSelectedStand(null);
    setSelectedGate(gate);
  };

  const handleStandSelect = (stand: StandState) => {
    setSelectedGate(null);
    setSelectedStand(stand);
  };

  // Automated SOP download helper
  const handleDownloadSop = () => {
    if (state.activeSop.length === 0) return;

    let doc = `AEGIS STADIUM OS - STANDARD OPERATING PROCEDURES (SOP)\n`;
    doc += `========================================================\n`;
    doc += `INCIDENT TYPE: ${state.activeIncident?.toUpperCase() || "NORMAL"}\n`;
    doc += `GENERATED TIME: ${new Date().toLocaleTimeString()}\n\n`;
    doc += `COMPILED ACTION CHECKLIST:\n`;
    state.activeSop.forEach((step, idx) => {
      doc += `[${step.status.toUpperCase()}] Step ${idx + 1}: ${step.text}\n`;
    });
    doc += `\n========================================================\n`;
    doc += `AUTHORIZATION: Central Command (Human MFA Override confirmed: ${state.operatorApproved ? "YES" : "NO"})\n`;

    const blob = new Blob([doc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AEGIS_SOP_${state.activeIncident || "NORMAL"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1 w-full min-h-screen flex flex-col p-4 bg-zinc-950 text-white select-none">
      <TelegramSync />
      
      {/* Premium Dashboard Global Glass Header */}
      <header className="glass-panel border border-white/5 bg-black/60 px-5 py-3 mb-4 flex items-center justify-between neon-glow-cyan">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-extrabold tracking-widest text-cyan-400 uppercase font-mono">
              AEGIS STADIUM OS
            </h1>
            <span className="text-[9px] text-white/40 tracking-wider font-mono uppercase">
              Autonomous Crowd Intelligence & Multi-Agent Operations
            </span>
          </div>
        </div>

        {/* Global Statistics Panel */}
        <div className="flex items-center gap-6 font-mono text-[10px] text-white/55">
          <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded border border-white/5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>TOTAL PERIMETER INFLOW:</span>
            <span className="text-white font-bold font-sans">
              {Object.values(state.gates).reduce((acc, g) => acc + g.currentInflow, 0)}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>INCIDENT STATUS:</span>
            <span className={`font-bold ${
              state.activeIncident ? "text-rose-400 animate-pulse" : "text-emerald-400"
            }`}>
              {state.activeIncident ? state.activeIncident.toUpperCase() : "SAFE"}
            </span>
          </div>

          {/* SOP Download Button */}
          {state.activeSop.length > 0 && (
            <button
              onClick={handleDownloadSop}
              className="flex items-center gap-1.5 bg-cyan-950 border border-cyan-500 hover:bg-cyan-900 text-cyan-400 px-2.5 py-1.5 rounded transition-all font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> DOWNLOAD SOP REPORT
            </button>
          )}
        </div>
      </header>

      {/* Main Responsive Grid Cockpit (Left, Middle, Right Column Layout) */}
      <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column (Width: ~33% or 4 Grid slots) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Demo Controls selector */}
          <div className="flex-1">
            <DemoController state={state} />
          </div>
          {/* Agent connection diagram graph */}
          <div className="h-60">
            <AgentNetwork state={state} />
          </div>
        </div>

        {/* Middle Column (Width: ~67% or 8 Grid slots) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Main 2D Vector Spatial Map canvas */}
          <div className="flex-1 min-h-[380px]">
            <StadiumMap 
              state={state} 
              onGateSelect={handleGateSelect}
              onStandSelect={handleStandSelect}
              selectedGate={selectedGate}
              selectedStand={selectedStand}
            />
          </div>
          {/* Real-time Agent scrolling thought logs terminal */}
          <div className="h-[280px]">
            <AgentConsole thoughts={state.thoughts} isSimulating={state.isSimulating} />
          </div>
        </div>

      </div>

    </main>
  );
}
