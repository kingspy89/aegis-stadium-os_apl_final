"use client";

import React, { useState, useEffect, useRef } from "react";
import { FanNotification } from "../lib/store/stateStore";
import { FanExperienceAgent } from "../lib/agents/fanExperience";
import { MessageSquare, Send, Globe, QrCode, ShieldAlert, Cpu, User } from "lucide-react";

interface FanAppWidgetProps {
  notifications: FanNotification[];
  activeIncident: "surge" | "threat" | "storm" | null;
  apiMode: "mock" | "live";
}

interface ChatHistory {
  id: string;
  sender: "Fan" | "AI_Concierge";
  text: string;
}

export default function FanAppWidget({ notifications, activeIncident, apiMode }: FanAppWidgetProps) {
  const [chatInput, setChatInput] = useState("");
  const [lang, setLang] = useState<"English" | "Hindi" | "Spanish">("English");
  const [chatLog, setChatLog] = useState<ChatHistory[]>([
    { id: "1", sender: "AI_Concierge", text: "Hello! I am your Aegis Arena Concierge. Ask me anything about ticketing, seat routes, or stadium safety. Select language above." }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatLog, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatLog((prev) => [...prev, { id: Math.random().toString(), sender: "Fan", text: userMsg }]);
    setChatInput("");
    setIsTyping(true);

    const fanAgent = new FanExperienceAgent();
    
    // Ingest active incident context for the agent
    let stateContext = "Stadium operations normal.";
    if (activeIncident === "surge") stateContext = "Turnstiles Gate 2 (Metro Plaza) heavily congested. Gate 1 (Main Road) open.";
    else if (activeIncident === "threat") stateContext = "Stand 3 in Adani Pavilion (South) isolated due to a safety check. Gate 3 closed. Re-routing all VIPs/fans to Gate 2 (Metro Plaza) and Gate 4 (West).";
    else if (activeIncident === "storm") stateContext = "Lightning storm approaching. Match suspended. Evacuating orderly via closest metro and road exits (Gates 1, 2, 3, 4).";

    setTimeout(async () => {
      try {
        const result = await fanAgent.converse(userMsg, stateContext, apiMode);
        setIsTyping(false);
        setChatLog((prev) => [
          ...prev, 
          { 
            id: Math.random().toString(), 
            sender: "AI_Concierge", 
            text: result.data ? result.data.replyText : "Unable to reach Aegis core."
          }
        ]);
      } catch (err) {
        setIsTyping(false);
        setChatLog((prev) => [...prev, { id: Math.random().toString(), sender: "AI_Concierge", text: "Offline." }]);
      }
    }, 1800);
  };

  const handleLanguageChange = (selected: "English" | "Hindi" | "Spanish") => {
    setLang(selected);
    let greet = "Hello! I am your Aegis Arena Concierge. Ask me anything about ticketing, seat routes, or stadium safety.";
    if (selected === "Hindi") greet = "नमस्ते! मैं आपका एजीस एरेना कंसीयर्ज हूँ। टिकट, सीट रूट या स्टेडियम सुरक्षा के बारे में कुछ भी पूछें।";
    else if (selected === "Spanish") greet = "¡Hola! Soy tu asistente de Aegis Arena. Pregúntame lo que quieras sobre boletos, rutas o seguridad.";

    setChatLog([
      { id: "greet-lang", sender: "AI_Concierge", text: greet }
    ]);
  };

  return (
    <div className="relative w-full max-w-[280px] h-[520px] rounded-[36px] border-[8px] border-zinc-800 bg-zinc-950 shadow-[0_0_25px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col font-sans">
      
      {/* Mobile Top Notch & Frosted status bar */}
      <div className="absolute top-0 inset-x-0 h-6 bg-black flex justify-between items-center px-6 z-30 text-[9px] text-white/40 font-mono">
        <span>11:06</span>
        {/* Notch */}
        <div className="w-20 h-4 bg-zinc-800 rounded-b-xl absolute left-1/2 -translate-x-1/2 top-0" />
        <div className="flex items-center gap-1">
          <span>5G</span>
          <div className="w-4 h-2 bg-white/30 rounded-sm" />
        </div>
      </div>

      {/* Screen Frame Container */}
      <div className="flex-1 pt-6 flex flex-col overflow-hidden relative">
        
        {/* Mobile App Bar */}
        <div className="bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-white/5 z-10">
          <span className="text-[11px] font-bold text-cyan-400 tracking-wide uppercase font-mono">
            Aegis Fan Companion
          </span>
          
          {/* Language selector toggle */}
          <div className="flex items-center gap-1.5 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 text-[9px] text-white/60">
            <Globe className="w-2.5 h-2.5 text-cyan-400" />
            <button 
              onClick={() => handleLanguageChange("English")}
              className={`hover:text-cyan-400 ${lang === "English" ? "text-cyan-400 font-bold" : ""}`}
            >
              EN
            </button>
            <span>|</span>
            <button 
              onClick={() => handleLanguageChange("Hindi")}
              className={`hover:text-cyan-400 ${lang === "Hindi" ? "text-cyan-400 font-bold" : ""}`}
            >
              HI
            </button>
            <span>|</span>
            <button 
              onClick={() => handleLanguageChange("Spanish")}
              className={`hover:text-cyan-400 ${lang === "Spanish" ? "text-cyan-400 font-bold" : ""}`}
            >
              ES
            </button>
          </div>
        </div>

        {/* Dynamic App Content Body */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 p-3 space-y-3 flex flex-col pb-4">
          
          {/* Live Dynamic Push notification Alerts */}
          {notifications.slice(0, 1).map((notif) => {
            const isAlert = notif.type === "alert" || notif.type === "warning";
            return (
              <div 
                key={notif.id}
                className={`p-2.5 rounded-xl border flex gap-2 animate-bounce shadow-lg ${
                  isAlert 
                    ? "bg-rose-950/80 border-rose-500 text-rose-200" 
                    : "bg-cyan-950/60 border-cyan-500/30 text-cyan-200"
                }`}
              >
                <ShieldAlert className={`w-5 h-5 flex-shrink-0 ${isAlert ? "text-rose-400" : "text-cyan-400"}`} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">{notif.title}</span>
                  <span className="text-[9px] text-white/70 leading-normal">{notif.text}</span>
                </div>
              </div>
            );
          })}

          {/* Core Ticket Code Card */}
          <div className="bg-zinc-900 border border-white/5 rounded-xl p-3 flex flex-col items-center shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-8 h-8 bg-cyan-500/10 rounded-bl-full flex items-center justify-center">
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
            </div>

            <span className="text-[8px] text-white/30 tracking-widest font-mono uppercase">Ticket Pass</span>
            <span className="text-xs font-bold text-white/80 mt-0.5">APL FINALS 2026</span>

            {/* Custom SVG Barcode */}
            <div className="bg-white p-2 rounded-lg my-2 aspect-square flex items-center justify-center">
              {/* Clean abstract barcode visual */}
              <div className="grid grid-cols-5 gap-1.5 w-12 h-12 bg-zinc-950 rounded" />
            </div>

            <div className="w-full grid grid-cols-2 gap-2 text-center border-t border-white/5 pt-2 mt-1.5 font-mono text-[9px]">
              <div className="flex flex-col">
                <span className="text-white/30 uppercase text-[7px]">STAND</span>
                <span className="text-white font-bold">RELIANCE END</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/30 uppercase text-[7px]">GATE PORTAL</span>
                <span className={`font-bold ${
                  activeIncident === "surge" ? "text-amber-400 animate-pulse" : "text-emerald-400"
                }`}>
                  {activeIncident === "surge" ? "GATE 1 PORTAL" : "GATE 2 PORTAL"}
                </span>
              </div>
            </div>
          </div>

          {/* Multi-lingual AI Concierge Chat portal */}
          <div className="flex-1 flex flex-col bg-zinc-900 rounded-xl border border-white/5 overflow-hidden min-h-[160px]">
            {/* Box Header */}
            <div className="bg-zinc-800/80 px-3 py-1.5 flex items-center justify-between border-b border-white/5">
              <span className="text-[9px] font-bold text-white/40 uppercase font-mono flex items-center gap-1">
                <MessageSquare className="w-2.5 h-2.5 text-cyan-400" /> Concierge AI Chat
              </span>
            </div>

            {/* Chat list */}
            <div className="flex-1 p-2 overflow-y-auto space-y-2 text-[10px] min-h-[100px]">
              {chatLog.map((chat) => {
                const isUser = chat.sender === "Fan";
                return (
                  <div 
                    key={chat.id} 
                    className={`flex gap-1.5 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] ${
                      isUser ? "bg-white/10 text-white/60" : "bg-cyan-950 text-cyan-400"
                    }`}>
                      {isUser ? <User className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                    </div>
                    <div className={`p-2 rounded-lg leading-relaxed ${
                      isUser ? "bg-cyan-600/70 text-white" : "bg-zinc-800 text-white/80"
                    }`}>
                      {chat.text}
                    </div>
                  </div>
                );
              })}
              
              {isTyping && (
                <div className="flex gap-1.5 max-w-[85%] mr-auto items-center">
                  <div className="w-4.5 h-4.5 rounded-full bg-cyan-950 flex items-center justify-center animate-pulse text-cyan-400">
                    <Cpu className="w-3 h-3" />
                  </div>
                  <div className="text-[8px] text-cyan-400 italic">Typing reply...</div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-1.5 bg-zinc-950 border-t border-white/5 flex gap-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Aegis Concierge..."
                className="flex-1 px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white placeholder-white/20 text-[10px] focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="p-1 rounded bg-cyan-950 border border-cyan-500 text-cyan-400 flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
