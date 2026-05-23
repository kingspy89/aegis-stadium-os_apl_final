"use client";

import React, { useState, useEffect, useRef } from "react";
import { TelegramMessage } from "../lib/store/stateStore";
import { AegisStore } from "../lib/store/stateStore";
import { MessageSquare, Send, Mic, Image, Volume2, User, Cpu } from "lucide-react";

interface VolunteerBotSimProps {
  chat: TelegramMessage[];
  isSimulating: boolean;
}

export default function VolunteerBotSim({ chat, isSimulating }: VolunteerBotSimProps) {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    AegisStore.addVolunteerMessage(inputText);
    setInputText("");
  };

  // Simulate volunteer sending a voice note
  const handleVoiceRecord = () => {
    if (isRecording) return;
    setIsRecording(true);

    // Audio beep play
    if (typeof window !== "undefined") {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      }
    }

    setTimeout(() => {
      setIsRecording(false);
      AegisStore.addVolunteerMessage(
        "ALERT (Voice Note): Just spotted a large black backpack left under seat 14 in Stand 3. No one is around it.",
        undefined,
        "true" // voice URL flag
      );
    }, 2800);
  };

  // Simulate volunteer uploading a camera CCTV snapshot
  const handleAttachPhoto = () => {
    AegisStore.addVolunteerMessage(
      "ALERT (Camera Upload): CCTV check on suspicious object left under row portal in Stand 3.",
      "/images/suspicious_bag.jpg"
    );
  };

  return (
    <div className="flex flex-col h-full min-h-[300px] glass-panel border border-white/5 bg-black/45 p-4 neon-glow-cyan overflow-hidden font-mono">
      
      {/* Bot Chat Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-cyan-950 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="flex flex-col font-sans">
            <span className="text-xs font-bold text-cyan-400 leading-tight">AEGIS Telegram Bot</span>
            <span className="text-[9px] text-white/40 leading-none">Field Volunteer Simulator Channel</span>
          </div>
        </div>
        <div className="text-[10px] text-white/30 tracking-widest uppercase">
          Telegram UI
        </div>
      </div>

      {/* Telegram Chat Bubbles Window */}
      <div className="flex-1 overflow-y-auto p-2 bg-zinc-950/80 rounded border border-white/5 space-y-3 min-h-[160px] font-sans">
        {chat.map((msg) => {
          const isAi = msg.sender === "AI_Agent";
          
          return (
            <div 
              key={msg.id}
              className={`flex gap-2 max-w-[85%] ${isAi ? "mr-auto" : "ml-auto flex-row-reverse"}`}
            >
              {/* Profile Icon */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                isAi 
                  ? "bg-cyan-950 text-cyan-400 border border-cyan-500/30" 
                  : "bg-white/10 text-white/70"
              }`}>
                {isAi ? <Cpu className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>

              {/* Chat bubble */}
              <div className={`flex flex-col p-2.5 rounded-lg text-xs leading-normal relative ${
                isAi 
                  ? "bg-zinc-900 text-white/90 rounded-tl-none border border-white/5" 
                  : "bg-cyan-900/60 text-white rounded-tr-none border border-cyan-500/20"
              }`}>
                {/* Voice player UI mock */}
                {msg.voiceUrl && (
                  <div className="flex items-center gap-2 bg-black/40 py-1.5 px-2.5 rounded border border-white/5 mb-1.5 font-mono">
                    <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse flex-shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-white/40">VOICE NOTE REPORT</span>
                      {/* Fake waveform */}
                      <div className="flex items-center gap-0.5 h-3 w-28">
                        <div className="w-0.5 h-full bg-cyan-500/30 rounded" />
                        <div className="w-0.5 h-1/2 bg-cyan-500/30 rounded" />
                        <div className="w-0.5 h-3/4 bg-cyan-400 rounded animate-pulse" />
                        <div className="w-0.5 h-full bg-cyan-400 rounded animate-pulse" />
                        <div className="w-0.5 h-1/3 bg-cyan-500/30 rounded" />
                        <div className="w-0.5 h-3/4 bg-cyan-400 rounded animate-pulse" />
                        <div className="w-0.5 h-full bg-cyan-400 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Photo mock */}
                {msg.photoUrl && (
                  <div className="relative w-full max-w-[160px] aspect-[4/3] bg-zinc-950 rounded border border-white/5 overflow-hidden mb-1.5 flex items-center justify-center">
                    <div className="absolute inset-0 bg-red-500/5 animate-scan pointer-events-none" />
                    {/* Visual mockup of photo */}
                    <div className="flex flex-col items-center justify-center text-center text-white/20 p-2 font-mono text-[9px]">
                      <Image className="w-8 h-8 text-white/10 mb-1" />
                      <span className="text-[8px] text-rose-500 font-bold uppercase tracking-wider animate-pulse">SUSPICIOUS_BAG.JPG</span>
                      <span className="text-[7px]">South Stand 3 Portal</span>
                    </div>
                  </div>
                )}

                <p className="text-white/95">{msg.text}</p>
                <span className="text-[8px] text-white/20 self-end mt-1 font-mono">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}

        {isSimulating && (
          <div className="flex gap-2 max-w-[85%] mr-auto items-center">
            <div className="w-6 h-6 rounded-full bg-cyan-950 flex items-center justify-center border border-cyan-500/30 text-cyan-400 animate-pulse">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div className="bg-zinc-900 p-2 rounded-lg text-[10px] text-cyan-400 italic">
              AI agent is typing reply...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Telegram Input Controls */}
      <form onSubmit={handleSendMessage} className="mt-2.5 flex items-center gap-2">
        {/* Photo attach button */}
        <button
          type="button"
          onClick={handleAttachPhoto}
          className="p-2 rounded bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white/60 hover:text-white transition-colors"
          title="Upload simulated CCTV image"
        >
          <Image className="w-4 h-4" />
        </button>

        {/* Text Area input */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isRecording ? "Voice note recording..." : "Type volunteer report..."}
          disabled={isRecording}
          className="flex-1 px-3 py-2 rounded bg-zinc-900/60 border border-white/10 text-white placeholder-white/20 text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
        />

        {/* Voice Note Record button */}
        <button
          type="button"
          onClick={handleVoiceRecord}
          className={`p-2 rounded transition-colors ${
            isRecording 
              ? "bg-rose-950 border border-rose-500 text-rose-400 animate-pulse" 
              : "bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white/60 hover:text-white"
          }`}
          title="Simulate Volunteer Voice note"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Submit Send Button */}
        <button
          type="submit"
          className="p-2 rounded bg-cyan-950 border border-cyan-500 text-cyan-400 hover:bg-cyan-900 transition-colors flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
