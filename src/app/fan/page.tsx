"use client";

import React, { useState, useEffect } from "react";
import { AegisStore, AegisState } from "../../lib/store/stateStore";
import FanAppWidget from "@/components/FanAppWidget";
import { Radio } from "lucide-react";

export default function FanMobilePage() {
  const [state, setState] = useState<AegisState | null>(null);

  useEffect(() => {
    setState(AegisStore.getState());
    const unsubscribe = AegisStore.subscribe(() => {
      setState({ ...AegisStore.getState() });
    });
    return unsubscribe;
  }, []);

  if (!state) return null;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white items-center justify-center p-4">
      {/* Mobile Branding Header */}
      <div className="flex items-center gap-2 mb-4 font-mono">
        <Radio className="w-5.5 h-5.5 text-cyan-400 animate-pulse" />
        <span className="text-sm font-bold tracking-widest text-cyan-400 uppercase">
          AEGIS STADIUM PORTAL
        </span>
      </div>

      {/* Main Fan Widget Card */}
      <div className="w-full max-w-[280px]">
        <FanAppWidget
          notifications={state.fanNotifications}
          activeIncident={state.activeIncident}
          apiMode={state.apiMode}
        />
      </div>

      {/* Small Instruction caption */}
      <span className="text-[10px] text-white/20 mt-4 font-mono text-center max-w-[240px]">
        Mobile Companion View. Pushed gate alerts and in-app concierge chats synchronize with the Central Operations OS.
      </span>
    </div>
  );
}
