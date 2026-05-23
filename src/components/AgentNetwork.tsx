"use client";

import React from "react";
import { AegisState } from "../lib/store/stateStore";
import { Network, UserCheck, ShieldAlert, Navigation, Settings, Users, MessageSquare } from "lucide-react";

interface AgentNetworkProps {
  state: AegisState;
}

export default function AgentNetwork({ state }: AgentNetworkProps) {
  const { activeAgentNetwork } = state;

  // Node positions relative to SVG viewBox 0 0 260 200
  const nodes = {
    Orchestrator: { x: 130, y: 100, label: "Orchestrator", icon: Settings },
    Crowd: { x: 130, y: 28, label: "Crowd Intel", icon: Users },
    Routing: { x: 215, y: 65, label: "Dynamic Routing", icon: Navigation },
    Security: { x: 215, y: 135, label: "Security Risk", icon: ShieldAlert },
    Emergency: { x: 130, y: 172, label: "Emergency SOP", icon: UserCheck },
    Fan: { x: 45, y: 100, label: "Fan Exper", icon: MessageSquare }
  };

  return (
    <div className="flex flex-col h-full min-h-[220px] glass-panel border border-white/5 bg-black/40 p-4 neon-glow-cyan overflow-hidden">
      
      {/* Network Header */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2.5 mb-2 font-mono">
        <Network className="w-4.5 h-4.5 text-cyan-400" />
        <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">
          Multi-Agent Collaboration Graph
        </span>
      </div>

      {/* Interactive SVG Network Map */}
      <div className="flex-1 flex items-center justify-center min-h-[160px] relative">
        <svg viewBox="0 0 260 200" className="w-full h-auto max-w-[240px]">
          
          {/* Connection Lines (Pipes) */}
          <g className="stroke-white/10 stroke-[1.5] fill-none">
            {/* Orchestrator to Crowd */}
            <line x1={nodes.Orchestrator.x} y1={nodes.Orchestrator.y} x2={nodes.Crowd.x} y2={nodes.Crowd.y} />
            {/* Orchestrator to Routing */}
            <line x1={nodes.Orchestrator.x} y1={nodes.Orchestrator.y} x2={nodes.Routing.x} y2={nodes.Routing.y} />
            {/* Orchestrator to Security */}
            <line x1={nodes.Orchestrator.x} y1={nodes.Orchestrator.y} x2={nodes.Security.x} y2={nodes.Security.y} />
            {/* Orchestrator to Emergency */}
            <line x1={nodes.Orchestrator.x} y1={nodes.Orchestrator.y} x2={nodes.Emergency.x} y2={nodes.Emergency.y} />
            {/* Orchestrator to Fan */}
            <line x1={nodes.Orchestrator.x} y1={nodes.Orchestrator.y} x2={nodes.Fan.x} y2={nodes.Fan.y} />
            
            {/* Crowd to Routing */}
            <line x1={nodes.Crowd.x} y1={nodes.Crowd.y} x2={nodes.Routing.x} y2={nodes.Routing.y} />
            {/* Security to Emergency */}
            <line x1={nodes.Security.x} y1={nodes.Security.y} x2={nodes.Emergency.x} y2={nodes.Emergency.y} />
          </g>

          {/* Active Flow Surge Overlays */}
          {activeAgentNetwork.Orchestrator && (
            <g className="stroke-amber-400 stroke-[2] fill-none">
              {activeAgentNetwork.Crowd && <line x1={nodes.Orchestrator.x} y1={nodes.Orchestrator.y} x2={nodes.Crowd.x} y2={nodes.Crowd.y} className="animate-flow-cyan" />}
              {activeAgentNetwork.Routing && <line x1={nodes.Orchestrator.x} y1={nodes.Orchestrator.y} x2={nodes.Routing.x} y2={nodes.Routing.y} className="animate-flow-cyan" />}
              {activeAgentNetwork.Security && <line x1={nodes.Orchestrator.x} y1={nodes.Orchestrator.y} x2={nodes.Security.x} y2={nodes.Security.y} className="animate-flow-rose" />}
              {activeAgentNetwork.Emergency && <line x1={nodes.Orchestrator.x} y1={nodes.Orchestrator.y} x2={nodes.Emergency.x} y2={nodes.Emergency.y} className="animate-flow-rose" />}
              {activeAgentNetwork.Fan && <line x1={nodes.Orchestrator.x} y1={nodes.Orchestrator.y} x2={nodes.Fan.x} y2={nodes.Fan.y} className="animate-flow-cyan" />}
            </g>
          )}

          {/* Render glowing Nodes */}
          {Object.entries(nodes).map(([name, pos]) => {
            const isActive = activeAgentNetwork[name as keyof typeof activeAgentNetwork];
            const Icon = pos.icon;

            let circleStyle = "fill-zinc-950 stroke-white/20 stroke-[1.5] hover:stroke-cyan-400";
            let filterGlow = "";

            if (isActive) {
              if (name === "Orchestrator") {
                circleStyle = "fill-amber-950/80 stroke-amber-400 stroke-[2] cursor-default";
              } else if (name === "Security" || name === "Emergency") {
                circleStyle = "fill-rose-950/80 stroke-rose-400 stroke-[2] cursor-default";
              } else {
                circleStyle = "fill-cyan-950/80 stroke-cyan-400 stroke-[2] cursor-default";
              }
            }

            return (
              <g key={name} className="transition-all duration-300">
                {/* Glow ring */}
                {isActive && (
                  <circle 
                    cx={pos.x} 
                    cy={pos.y} 
                    r="16" 
                    className={`fill-none stroke-[2.5] animate-ping ${
                      name === "Orchestrator" ? "stroke-amber-400/30" : name === "Security" || name === "Emergency" ? "stroke-rose-400/30" : "stroke-cyan-400/30"
                    }`} 
                  />
                )}
                
                {/* Main Node */}
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r="13" 
                  className={circleStyle} 
                />
                
                {/* Node Label Text */}
                <text 
                  x={pos.x} 
                  y={pos.y + 22} 
                  textAnchor="middle" 
                  className={`text-[7px] font-mono select-none font-semibold ${
                    isActive ? name === "Orchestrator" ? "fill-amber-400" : name === "Security" || name === "Emergency" ? "fill-rose-400" : "fill-cyan-400" : "fill-white/30"
                  }`}
                >
                  {pos.label}
                </text>

                {/* React Icon Center Overlay */}
                <foreignObject 
                  x={pos.x - 7} 
                  y={pos.y - 7} 
                  width="14" 
                  height="14"
                  className="pointer-events-none"
                >
                  <div className={`flex items-center justify-center w-full h-full ${
                    isActive ? name === "Orchestrator" ? "text-amber-400" : name === "Security" || name === "Emergency" ? "text-rose-400" : "text-cyan-400" : "text-white/40"
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </foreignObject>
              </g>
            );
          })}

        </svg>
      </div>

    </div>
  );
}
