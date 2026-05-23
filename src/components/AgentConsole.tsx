"use client";

import React, { useEffect, useRef } from "react";
import { AgentThought } from "../lib/store/stateStore";
import { Terminal, Cpu, CheckCircle, Clock } from "lucide-react";

interface AgentConsoleProps {
  thoughts: AgentThought[];
  isSimulating: boolean;
}

export default function AgentConsole({ thoughts, isSimulating }: AgentConsoleProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to the bottom of the console whenever new thoughts arrive
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [thoughts]);

  return (
    <div className="flex flex-col h-full min-h-[300px] glass-panel border border-white/5 bg-black/50 p-4 neon-glow-cyan overflow-hidden">
      
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5 font-mono">
        <div className="flex items-center gap-2">
          <Terminal className="w-4.5 h-4.5 text-cyan-400" />
          <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">
            Aegis Multi-Agent Thought Terminal
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${
            isSimulating ? "bg-emerald-500 animate-ping" : "bg-cyan-500/50"
          }`} />
          <span className="text-[10px] text-white/40 uppercase">
            {isSimulating ? "Active Processing" : "System Standby"}
          </span>
        </div>
      </div>

      {/* Live AI Statistics panel */}
      <div className="grid grid-cols-3 gap-2.5 mb-3 font-mono text-[10px] border-b border-white/5 pb-2.5">
        <div className="bg-white/5 p-1.5 rounded flex items-center justify-between">
          <span className="text-white/40 flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" /> LATENCY:
          </span>
          <span className="text-cyan-400 font-semibold">{isSimulating ? "1.4s" : "0.0s"}</span>
        </div>
        <div className="bg-white/5 p-1.5 rounded flex items-center justify-between">
          <span className="text-white/40 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-emerald-400" /> THROUGHPUT:
          </span>
          <span className="text-emerald-400 font-semibold">{isSimulating ? "850 t/s" : "0 t/s"}</span>
        </div>
        <div className="bg-white/5 p-1.5 rounded flex items-center justify-between">
          <span className="text-white/40 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-amber-400" /> JSON SCHEMA:
          </span>
          <span className="text-amber-400 font-semibold">100% VALID</span>
        </div>
      </div>

      {/* Scrolling Thought Stream */}
      <div className="flex-1 overflow-y-auto font-mono text-xs text-white/80 p-2.5 bg-black/60 rounded border border-white/5 space-y-3">
        {thoughts.map((log) => {
          let agentColor = "text-cyan-400";
          let agentBorder = "border-cyan-500/20";
          let labelText = `[${log.agent.toUpperCase()} AGENT]`;

          if (log.agent === "Orchestrator") {
            agentColor = "text-amber-400";
            agentBorder = "border-amber-500/20";
          } else if (log.agent === "Security") {
            agentColor = "text-rose-400";
            agentBorder = "border-rose-500/20";
          } else if (log.agent === "Emergency") {
            agentColor = "text-rose-500";
            agentBorder = "border-rose-500/30";
          } else if (log.agent === "Routing") {
            agentColor = "text-emerald-400";
            agentBorder = "border-emerald-500/20";
          } else if (log.agent === "Fan") {
            agentColor = "text-cyan-300";
            agentBorder = "border-cyan-300/20";
          }

          let typeLabel = "THOUGHT";
          let typeColor = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";

          if (log.type === "action") {
            typeLabel = "ACTION";
            typeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
          } else if (log.type === "tool") {
            typeLabel = "TOOL EXEC";
            typeColor = "bg-amber-500/10 text-amber-400 border-amber-500/30";
          } else if (log.type === "schema") {
            typeLabel = "JSON SCHEMA";
            typeColor = "bg-purple-500/10 text-purple-400 border-purple-500/30";
          }

          return (
            <div key={log.id} className={`flex flex-col gap-1 pl-2 border-l-2 ${agentBorder}`}>
              <div className="flex items-center gap-2 text-[10px]">
                <span className={`font-bold ${agentColor}`}>{labelText}</span>
                <span className={`px-1 rounded border text-[8px] font-semibold ${typeColor}`}>
                  {typeLabel}
                </span>
                <span className="text-white/20 text-[9px] ml-auto">{log.timestamp}</span>
              </div>
              <p className="text-white/90 leading-relaxed font-sans mt-0.5">{log.message}</p>
            </div>
          );
        })}

        {isSimulating && (
          <div className="flex items-center gap-1.5 pl-2 text-cyan-400/50">
            <span className="w-1.5 h-3 bg-cyan-400 animate-pulse" />
            <span className="text-[10px] italic terminal-caret">Agent pipeline executing reasoning chains...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

    </div>
  );
}
