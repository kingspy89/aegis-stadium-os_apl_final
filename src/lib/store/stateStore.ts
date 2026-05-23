"use client";

import { deriveVolunteerSignal } from "@/lib/telegram/advanced";

export interface GateState {
  id: string;
  name: string;
  status: "OK" | "WARNING" | "CRITICAL";
  flowRate: number; // people/min
  currentInflow: number;
  maxCapacity: number;
  activeRoute: string;
  coordinates: { x: number; y: number };
}

export interface StandState {
  id: string;
  name: string;
  occupancy: number; // percentage
  status: "OK" | "WARNING" | "CRITICAL";
  incident: string | null;
  cameraFeed: string; // url or descriptor
  noise: number; // dB
  temperature: number; // C
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  color: string;
  active: boolean;
}

export interface AgentThought {
  id: string;
  agent: "Orchestrator" | "Crowd" | "Routing" | "Security" | "Emergency" | "Fan";
  type: "thought" | "action" | "tool" | "schema";
  message: string;
  timestamp: string;
}

export interface TelegramMessage {
  id: string;
  sender: "Volunteer" | "AI_Agent";
  text: string;
  voiceUrl?: string;
  photoUrl?: string;
  timestamp: string;
  replyMarkup?: unknown;
}

export interface FanNotification {
  id: string;
  title: string;
  text: string;
  type: "info" | "warning" | "alert";
  timestamp: string;
}

export interface SopStep {
  id: string;
  text: string;
  status: "pending" | "completed" | "active";
}

export interface DebateMessage {
  id: string;
  agent: "Crowd" | "Routing" | "Security" | "Emergency";
  message: string;
  timestamp: string;
}

export interface AegisState {
  gates: Record<string, GateState>;
  stands: Record<string, StandState>;
  thoughts: AgentThought[];
  volunteerChat: TelegramMessage[];
  fanNotifications: FanNotification[];
  activeSop: SopStep[];
  debate: DebateMessage[];
  activeIncident: "surge" | "threat" | "storm" | null;
  activeAgentNetwork: {
    Orchestrator: boolean;
    Crowd: boolean;
    Routing: boolean;
    Security: boolean;
    Emergency: boolean;
    Fan: boolean;
  };
  voiceAlertsEnabled: boolean;
  apiMode: "mock" | "live";
  sandboxTime: number; // 0 to 100
  isSimulating: boolean;
  operatorApproved: boolean;
  consensusScore: number; // 0 to 100
  feedbackLog: string[];
  // NEW HIGH-AUTHENTICITY METRICS
  canopyLedIntensity: number; // 0 to 100 %
  canopyLedMode: "STADIUM_LIGHT" | "ANTI_SHADOW" | "LED_SHOW" | "STANDBY";
  subsoilMoisture: number; // percentage
  subsoilDrainagePumpsActive: boolean;
  podiumPlazaDensity: number; // percentage
  groundTrafficDensity: number; // percentage
}

const initialGates: Record<string, GateState> = {
  "1": { id: "1", name: "Gate 1 (Main Road - Public)", status: "OK", flowRate: 40, currentInflow: 12500, maxCapacity: 45000, activeRoute: "East & West Bowl Ramps", coordinates: { x: 50, y: 12 } },
  "2": { id: "2", name: "Gate 2 (Metro Plaza - High Traffic)", status: "OK", flowRate: 28, currentInflow: 18400, maxCapacity: 55000, activeRoute: "Reliance End Reroute", coordinates: { x: 88, y: 50 } },
  "3": { id: "3", name: "Gate 3 (VIP & Staff Entry)", status: "OK", flowRate: 25, currentInflow: 6800, maxCapacity: 22000, activeRoute: "Adani Pavilion Suites", coordinates: { x: 50, y: 88 } },
  "4": { id: "4", name: "Gate 4 (Players & VVIPs)", status: "OK", flowRate: 15, currentInflow: 800, maxCapacity: 10000, activeRoute: "Restricted Tunnel Access", coordinates: { x: 12, y: 50 } },
};

const initialStands: Record<string, StandState> = {
  North: { id: "North", name: "Reliance End (Sec J-L)", occupancy: 65, status: "OK", incident: null, cameraFeed: "Normal crowd inflow", noise: 78, temperature: 24 },
  East: { id: "East", name: "East Bowl (Sec D-H)", occupancy: 55, status: "OK", incident: null, cameraFeed: "Normal crowd entry", noise: 74, temperature: 23 },
  South: { id: "South", name: "Adani Pavilion (Sec A-C)", occupancy: 70, status: "OK", incident: null, cameraFeed: "Normal crowd movement", noise: 82, temperature: 25 },
  West: { id: "West", name: "West Bowl (Sec M-R)", occupancy: 60, status: "OK", incident: null, cameraFeed: "Standard entry flow", noise: 76, temperature: 24 },
};

let globalState: AegisState = {
  gates: initialGates,
  stands: initialStands,
  thoughts: [
    { id: "init-1", agent: "Orchestrator", type: "thought", message: "AEGIS Command System loaded. Narendra Modi Stadium live telemetry running.", timestamp: getTimestamp() }
  ],
  volunteerChat: [
    { id: "vol-init-1", sender: "AI_Agent", text: "Aegis Volunteer Bot active. Use this channel to report safety/crowd issues. Press MIC to record voice alerts.", timestamp: getTimestamp() }
  ],
  fanNotifications: [
    { id: "fan-init-1", title: "Welcome to Narendra Modi Stadium", text: "Please have your ticket barcode ready. Recommended Gate 2 (Metro Plaza) for Fast Route.", type: "info", timestamp: getTimestamp() }
  ],
  activeSop: [],
  debate: [],
  activeIncident: null,
  activeAgentNetwork: { Orchestrator: false, Crowd: false, Routing: false, Security: false, Emergency: false, Fan: false },
  voiceAlertsEnabled: false,
  apiMode: "mock",
  sandboxTime: 0,
  isSimulating: false,
  operatorApproved: false,
  consensusScore: 100,
  feedbackLog: [],
  // NEW HIGH-AUTHENTICITY METRICS
  canopyLedIntensity: 100,
  canopyLedMode: "ANTI_SHADOW",
  subsoilMoisture: 18,
  subsoilDrainagePumpsActive: false,
  podiumPlazaDensity: 42,
  groundTrafficDensity: 28,
};

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(" ")[0];
}

// Speak aloud helper
function speakAlert(text: string) {
  if (typeof window !== "undefined" && globalState.voiceAlertsEnabled) {
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel(); // cancel any active speaking
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      
      // Try to find a nice premium sounding english voice
      const voices = synth.getVoices();
      const premiumVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural"));
      if (premiumVoice) utterance.voice = premiumVoice;

      synth.speak(utterance);
    }
  }
}

// Timeout helper for step simulations
const timers: NodeJS.Timeout[] = [];
function clearAllSimulationTimers() {
  timers.forEach(t => clearTimeout(t));
  timers.length = 0;
}

export const AegisStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getState() {
    return globalState;
  },

  updateState(updater: (state: AegisState) => void) {
    updater(globalState);
    emitChange();
  },

  toggleVoiceAlerts() {
    this.updateState((s) => {
      s.voiceAlertsEnabled = !s.voiceAlertsEnabled;
      if (s.voiceAlertsEnabled) {
        // speak immediately to test
        setTimeout(() => speakAlert("Aegis Spatial Audio emergency warning system activated."), 100);
      }
    });
  },

  toggleApiMode() {
    this.updateState((s) => {
      s.apiMode = s.apiMode === "mock" ? "live" : "mock";
      s.thoughts.push({
        id: Math.random().toString(),
        agent: "Orchestrator",
        type: "action",
        message: `Switched AI Orchestration core to: ${s.apiMode.toUpperCase()} Gemini API Mode`,
        timestamp: getTimestamp(),
      });
    });
  },

  setCanopyLedMode(mode: AegisState["canopyLedMode"]) {
    this.updateState((s) => {
      s.canopyLedMode = mode;
      s.canopyLedIntensity = mode === "STANDBY" ? 15 : mode === "LED_SHOW" ? 85 : 100;
      s.thoughts.push({
        id: Math.random().toString(),
        agent: "Orchestrator",
        type: "action",
        message: `Roof canopy lighting updated to mode: ${mode} (${s.canopyLedIntensity}% Intensity)`,
        timestamp: getTimestamp()
      });
    });
  },

  toggleDrainagePumps() {
    this.updateState((s) => {
      s.subsoilDrainagePumpsActive = !s.subsoilDrainagePumpsActive;
      s.subsoilMoisture = s.subsoilDrainagePumpsActive ? Math.max(12, s.subsoilMoisture - 5) : 18;
      s.thoughts.push({
        id: s.subsoilDrainagePumpsActive ? "drainage-on" : "drainage-off",
        agent: "Emergency",
        type: "action",
        message: `Subsoil drainage system pumps toggled: ${s.subsoilDrainagePumpsActive ? "ACTIVE (Rain recovery mode)" : "IDLE (Moisture levels normal)"}`,
        timestamp: getTimestamp()
      });
    });
  },

  resetState() {
    clearAllSimulationTimers();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    globalState = {
      gates: JSON.parse(JSON.stringify(initialGates)),
      stands: JSON.parse(JSON.stringify(initialStands)),
      thoughts: [
        { id: "reset-1", agent: "Orchestrator", type: "thought", message: "AEGIS State successfully reset to Narendra Modi Stadium Pre-Match normal levels.", timestamp: getTimestamp() }
      ],
      volunteerChat: [
        { id: "vol-init-1", sender: "AI_Agent", text: "Aegis Volunteer Bot active. Use this channel to report safety/crowd issues. Press MIC to record voice alerts.", timestamp: getTimestamp() }
      ],
      fanNotifications: [
        { id: "fan-init-1", title: "Welcome to Narendra Modi Stadium", text: "Please have your ticket barcode ready. Recommended Gate 2 (Metro Plaza) for Fast Route.", type: "info", timestamp: getTimestamp() }
      ],
      activeSop: [],
      debate: [],
      activeIncident: null,
      activeAgentNetwork: { Orchestrator: false, Crowd: false, Routing: false, Security: false, Emergency: false, Fan: false },
      voiceAlertsEnabled: globalState.voiceAlertsEnabled,
      apiMode: globalState.apiMode,
      sandboxTime: 0,
      isSimulating: false,
      operatorApproved: false,
      consensusScore: 100,
      feedbackLog: [],
      // NEW HIGH-AUTHENTICITY METRICS
      canopyLedIntensity: globalState.canopyLedIntensity || 100,
      canopyLedMode: globalState.canopyLedMode || "ANTI_SHADOW",
      subsoilMoisture: 18,
      subsoilDrainagePumpsActive: false,
      podiumPlazaDensity: 42,
      groundTrafficDensity: 28,
    };
    emitChange();
  },

  addFeedback(feedback: string) {
    this.updateState((s) => {
      s.feedbackLog.push(feedback);
      s.thoughts.push({
        id: Math.random().toString(),
        agent: "Orchestrator",
        type: "action",
        message: `Operator Override Feedback logged: "${feedback}". Recalculating route vectors...`,
        timestamp: getTimestamp()
      });
    });
  },

  setGateFlow(gateId: string, flowRate: number) {
    this.updateState((s) => {
      const gate = s.gates[gateId];
      if (gate) {
        gate.flowRate = flowRate;
        gate.currentInflow = flowRate * 100; // Mock current inflow based on flow rate
        
        // Map gate to a stand for visual 3D updates
        let standKey = "";
        if (gateId === "1") standKey = "East";
        if (gateId === "2") standKey = "North";
        if (gateId === "3") standKey = "South";
        if (gateId === "4") standKey = "West";

        if (standKey && s.stands[standKey]) {
           // Base occupancy on flow rate (mock logic)
           s.stands[standKey].occupancy = Math.min(100, Math.floor(40 + (flowRate / 250) * 60));
           if (s.stands[standKey].occupancy > 90) {
               s.stands[standKey].status = "CRITICAL";
           } else if (s.stands[standKey].occupancy > 70) {
               s.stands[standKey].status = "WARNING";
           } else {
               s.stands[standKey].status = "OK";
           }
        }

        // Dynamically update status based on flowRate
        if (flowRate > 150) {
          gate.status = "CRITICAL";
          if (s.activeIncident !== "surge") {
            s.activeIncident = "surge";
            s.activeAgentNetwork.Orchestrator = true;
            s.thoughts.push({
              id: Math.random().toString(),
              agent: "Orchestrator",
              type: "thought",
              message: `CRITICAL density telemetry spike at ${gate.name}. Flow: ${flowRate} p/m. Dispatched Crowd Intelligence Agent.`,
              timestamp: getTimestamp()
            });
            speakAlert(`Warning: Crowd surge detected at ${gate.name}. Dispatched Crowd Intelligence Agent.`);
          }
        } else if (flowRate > 100) {
          gate.status = "WARNING";
          if (s.activeIncident === "surge" && flowRate < 150) {
            s.activeIncident = null;
          }
        } else {
          gate.status = "OK";
          if (s.activeIncident === "surge") {
            s.activeIncident = null;
          }
        }
      }
    });
  },

  addVolunteerMessage(text: string, photoUrl?: string, voiceUrl?: string) {
    this.updateState((s) => {
      s.volunteerChat.push({
        id: Math.random().toString(),
        sender: "Volunteer",
        text,
        photoUrl,
        voiceUrl,
        timestamp: getTimestamp()
      });
    });

    const signal = deriveVolunteerSignal(text);

    if (signal.kind === "gate_density" || signal.kind === "threat_detected") {
      if (signal.kind === "gate_density") {
        this.setGateFlow(signal.gateId, signal.flowRate);
      } else if (signal.kind === "threat_detected") {
        this.updateState((s) => {
          s.activeIncident = "threat";
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Security",
            type: "thought",
            message: `CRITICAL ALERT: Threat detected at ${signal.location}. ${signal.summary}`,
            timestamp: getTimestamp()
          });
        });
      }

      const volunteerName = text.match(/Volunteer:\s*([^|]+)/i)?.[1]?.trim() || "Volunteer";
      const locationLabel = signal.kind === "gate_density" ? `Gate ${signal.gateId}` : signal.location;
      const replyText = `Volunteer: ${volunteerName} | Location: ${locationLabel} | Problem: ${signal.summary} | Solution: ${signal.suggestion}`;
      console.log(`[Telegram Report Sync] ${replyText}`);
      speakAlert(replyText);

      const tid = setTimeout(() => {
        this.updateState((s) => {
          s.volunteerChat.push({
            id: Math.random().toString(),
            sender: "AI_Agent",
            text: replyText,
            timestamp: getTimestamp()
          });
        });

        if (typeof window !== "undefined") {
          const telegramWindow = window as Window & { lastTelegramChatId?: number };
          if (telegramWindow.lastTelegramChatId) {
            fetch("/api/telegram/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatId: telegramWindow.lastTelegramChatId,
                text: replyText
              })
            }).catch(err => console.error("Failed to sync AI response to Telegram:", err));
          }
        }
      }, 1200);
      timers.push(tid);
      return;
    }

    const replyText = "Gate flow update logged. Send an explicit Gate 1-4 status like 'Gate 1 is full' to update the simulation.";
    const tid = setTimeout(() => {
      this.updateState((s) => {
        s.volunteerChat.push({
          id: Math.random().toString(),
          sender: "AI_Agent",
          text: replyText,
          timestamp: getTimestamp()
        });
      });

      if (typeof window !== "undefined") {
        const telegramWindow = window as Window & { lastTelegramChatId?: number };
        if (telegramWindow.lastTelegramChatId) {
          fetch("/api/telegram/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId: telegramWindow.lastTelegramChatId,
              text: replyText
            })
          }).catch(err => console.error("Failed to sync AI response to Telegram:", err));
        }
      }
    }, 1500);
    timers.push(tid);
  },

  // ----------------------------------------------------
  // ACT 1 SIMULATION: Pre-Match Crowd Surge
  // ----------------------------------------------------
  triggerAct1() {
    this.resetState();
    this.updateState((s) => {
      s.activeIncident = "surge";
      s.isSimulating = true;
      s.sandboxTime = 15;
    });

    const steps = [
      // Step 1: turnstiles surge at Gate 2
      () => {
        this.updateState((s) => {
          s.gates["2"].status = "WARNING";
          s.gates["2"].flowRate = 185;
          s.gates["2"].currentInflow = 18400;
          s.stands.North.occupancy = 94;
          s.stands.North.status = "WARNING";
          s.stands.North.noise = 96;
          s.activeAgentNetwork.Orchestrator = true;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Orchestrator",
            type: "thought",
            message: "Bottleneck threshold exceeded at Reliance End. Gate 2 is unsafe for additional massive inflow.",
            timestamp: getTimestamp()
          });
        });
      },
      // Step 4: Routing Agent consensus dialogue
      () => {
        this.updateState((s) => {
          s.debate.push({
            id: Math.random().toString(),
            agent: "Routing",
            message: "Understood. Re-routing vectors updated. Open Gate 1 bypass ramps; change dynamic digital display signs.",
            timestamp: getTimestamp()
          });
          s.consensusScore = 95;
        });
      },
      // Step 5: Update Map paths & push notifications
      () => {
        this.updateState((s) => {
          s.gates["2"].activeRoute = "Redirect to Gate 1";
          s.gates["1"].flowRate = 125;
          s.gates["1"].currentInflow = 22500;
          s.gates["2"].status = "CRITICAL";
          s.activeAgentNetwork.Routing = false;
          s.activeAgentNetwork.Fan = true;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Fan",
            type: "action",
            message: "Broadcasting push-alert tickets rerouting maps to 8,500 perimeter devices: 'Gate 2 heavily congested. Access Gate 1 (Main Road) via FAST-TRACK RAMPS.'",
            timestamp: getTimestamp()
          });
          s.fanNotifications.unshift({
            id: Math.random().toString(),
            title: "FAST-TRACK DETOUR",
            text: "Gate 2 (Metro Plaza) is congested. Swiped routes re-assigned to Gate 1 (Main Road). Fast Ramps active.",
            type: "warning",
            timestamp: getTimestamp()
          });
        });
        speakAlert("Crowd diverted. Dynamic routing active. Dynamic notifications pushed to fan mobile companion apps.");
      },
      // Step 6: End simulation flow
      () => {
        this.updateState((s) => {
          s.activeAgentNetwork.Fan = false;
          s.isSimulating = false;
          s.sandboxTime = 30;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Orchestrator",
            type: "schema",
            message: "Structured JSON response successfully generated. Dynamic bypass complete. Sector safe.",
            timestamp: getTimestamp()
          });
        });
      }
    ];

    steps.forEach((step, index) => {
      const tid = setTimeout(step, (index + 1) * 3500);
      timers.push(tid);
    });
  },

  // ----------------------------------------------------
  // ACT 2 SIMULATION: Unattended Baggage Threat
  // ----------------------------------------------------
  triggerAct2() {
    this.resetState();
    this.updateState((s) => {
      s.activeIncident = "threat";
      s.isSimulating = true;
      s.sandboxTime = 50;
    });

    const steps = [
      // Step 1: Volunteer reports threat via voice alert
      () => {
        this.updateState((s) => {
          s.volunteerChat.push({
            id: Math.random().toString(),
            sender: "Volunteer",
            text: "ALERT: Just found a large black gym bag unattended under a row of seats in Adani Pavilion (South / Sec A-C). Seems suspicious.",
            photoUrl: "/images/suspicious_bag.jpg",
            timestamp: getTimestamp()
          });
          s.activeAgentNetwork.Orchestrator = true;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Orchestrator",
            type: "thought",
            message: "Volunteer voice threat report ingested from Adani Pavilion. Accessing local CCTV feeds and calling Multimodal Security Risk Agent.",
            timestamp: getTimestamp()
          });
        });
        speakAlert("Critical warning: Volunteer has submitted an unattended package alert in Adani Pavilion. Invoking Security Risk Agent.");
      },
      // Step 2: Security Agent analysis with Multimodal Vision
      () => {
        this.updateState((s) => {
          s.activeAgentNetwork.Orchestrator = false;
          s.activeAgentNetwork.Security = true;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Security",
            type: "tool",
            message: "Calling tool: analyze_cctv_multimodal(frame_id: 'CCTV-Adani-102'). Analyzing image structure...",
            timestamp: getTimestamp()
          });
        });
      },
      // Step 3: Security Agent vision results
      () => {
        this.updateState((s) => {
          s.stands.South.incident = "Suspicious Bag";
          s.stands.South.status = "CRITICAL";
          s.stands.South.cameraFeed = "ALERT: Gym bag verified under Seat 14 in Sec A-C.";
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Security",
            type: "schema",
            message: "CCTV Bounding Boxes compiled. Object: Gym bag (Confidence: 89%). Target Sector: Adani Pavilion. Action: Level 3 Isolation recommended.",
            timestamp: getTimestamp()
          });
        });
        speakAlert("Object analyzed. Security Risk Agent has evaluated baggage hazard. Threat verified with 89% confidence.");
      },
      // Step 4: Emergency Response Agent triggers SOP checklist
      () => {
        this.updateState((s) => {
          s.activeAgentNetwork.Security = false;
          s.activeAgentNetwork.Emergency = true;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Emergency",
            type: "thought",
            message: "Triggering SOP Level 3 Checklist for bomb threat / unattended hazard alert.",
            timestamp: getTimestamp()
          });
          s.activeSop = [
            { id: "sop-1", text: "Deploy Adani Pavilion Security volunteers to isolate Stand 3 and block entry portals", status: "active" },
            { id: "sop-2", text: "Redirect incoming fans away from Gate 3 (VIP & Staff) turnstiles immediately", status: "pending" },
            { id: "sop-3", text: "Initiate localized Public Address (PA) announcement in South sectors", status: "pending" },
            { id: "sop-4", text: "Notify local emergency municipal dispatch and bomb squad services", status: "pending" }
          ];
        });
      },
      // Step 5: Awaiting operator approval
      () => {
        this.updateState((s) => {
          s.activeAgentNetwork.Emergency = false;
          s.isSimulating = false;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Orchestrator",
            type: "action",
            message: "Awaiting Operator Authorization (Human-In-The-Loop) to activate SOP security procedures.",
            timestamp: getTimestamp()
          });
        });
        speakAlert("SOP generated. Awaiting human operator authentication to execute security procedures.");
      }
    ];

    steps.forEach((step, index) => {
      const tid = setTimeout(step, (index + 1) * 3500);
      timers.push(tid);
    });
  },

  approveSop() {
    if (globalState.activeIncident !== "threat" || globalState.operatorApproved) return;

    this.updateState((s) => {
      s.operatorApproved = true;
      s.isSimulating = true;
      s.activeSop[0].status = "completed";
      s.activeSop[1].status = "active";
      s.thoughts.push({
        id: Math.random().toString(),
        agent: "Orchestrator",
        type: "action",
        message: "Operator MFA Authorization Received. Initiating dynamic evacuation and field alerts.",
        timestamp: getTimestamp()
      });
      s.volunteerChat.push({
        id: Math.random().toString(),
        sender: "AI_Agent",
        text: "ALERT CONFIRMED: Stand 3 isolated. Volunteers deploy immediately to form a perimeter. Prevent any fans from entering Sec A-C (Adani Pavilion).",
        timestamp: getTimestamp()
      });
    });
    speakAlert("Operator authorization confirmed. Deploying perimeter team. Signage and Fan updates pushed.");

    const steps = [
      () => {
        this.updateState((s) => {
          s.activeSop[1].status = "completed";
          s.activeSop[2].status = "active";
          s.gates["3"].status = "CRITICAL";
          s.gates["3"].activeRoute = "CLOSED - EVACUATE";
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Routing",
            type: "action",
            message: "Closed Gate 3 immediately. Rerouting all VIPs/fans to Gate 2 & Gate 4.",
            timestamp: getTimestamp()
          });
          s.fanNotifications.unshift({
            id: Math.random().toString(),
            title: "SECURITY DETOUR",
            text: "Adani Pavilion is restricted. Evacuate or detour via Reliance End immediately.",
            type: "alert",
            timestamp: getTimestamp()
          });
        });
      },
      () => {
        this.updateState((s) => {
          s.activeSop[2].status = "completed";
          s.activeSop[3].status = "active";
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Emergency",
            type: "action",
            message: "Alerted local municipal fire and bomb squads via Cloud Pub/Sub callback. ETA: 8 minutes.",
            timestamp: getTimestamp()
          });
        });
      },
      () => {
        this.updateState((s) => {
          s.activeSop[3].status = "completed";
          s.isSimulating = false;
          s.sandboxTime = 70;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Orchestrator",
            type: "thought",
            message: "SOP successfully executed. Threat contained. Local emergency teams arriving shortly.",
            timestamp: getTimestamp()
          });
        });
        speakAlert("SOP evacuation complete. Security threat fully isolated. Emergency dispatch successfully notified.");
      }
    ];

    steps.forEach((step, index) => {
      const tid = setTimeout(step, (index + 1) * 3500);
      timers.push(tid);
    });
  },

  // ----------------------------------------------------
  // ACT 3 SIMULATION: Severe Weather Evacuation
  // ----------------------------------------------------
  triggerAct3() {
    this.resetState();
    this.updateState((s) => {
      s.activeIncident = "storm";
      s.isSimulating = true;
      s.sandboxTime = 80;
    });

    const steps = [
      // Step 1: Meteorologist alert parsed
      () => {
        this.updateState((s) => {
          s.activeAgentNetwork.Orchestrator = true;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Orchestrator",
            type: "thought",
            message: "SEVERE WEATHER WARNING: High probability convective cloud lightning strike within 10km. Ingesting live Doppler radar telemetry.",
            timestamp: getTimestamp()
          });
        });
        speakAlert("Critical weather warning: Lightning cell detected approaching the stadium. Activating Emergency response procedures.");
      },
      // Step 2: Emergency Response Agent coordinates Evacuation
      () => {
        this.updateState((s) => {
          s.activeAgentNetwork.Orchestrator = false;
          s.activeAgentNetwork.Emergency = true;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Emergency",
            type: "thought",
            message: "Compiling total stadium egress evacuation plan. Dynamic exit lines active. Open ALL exit gates.",
            timestamp: getTimestamp()
          });
          s.activeSop = [
            { id: "e-sop-1", text: "Commence orderly match suspension PA announcements", status: "active" },
            { id: "e-sop-2", text: "Open exit turnstile barriers at all 4 gates (1, 2, 3, 4)", status: "pending" },
            { id: "e-sop-3", text: "Direct crowd flows toward subway transport lines", status: "pending" }
          ];
        });
      },
      // Step 3: Open Exit Turnstiles
      () => {
        this.updateState((s) => {
          s.activeSop[0].status = "completed";
          s.activeSop[1].status = "active";
          s.gates["1"].status = "WARNING";
          s.gates["2"].status = "WARNING";
          s.gates["3"].status = "WARNING";
          s.gates["4"].status = "WARNING";
          s.gates["1"].activeRoute = "EGRESS - MAIN ROAD";
          s.gates["2"].activeRoute = "EGRESS - METRO PLAZA";
          s.gates["3"].activeRoute = "EGRESS - VIP PLAZA";
          s.gates["4"].activeRoute = "EGRESS - PLAYER SUBWAY";
          
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Routing",
            type: "action",
            message: "Turnstiles gates unlocked. Crowd flow rates spiked to exit vectors (90 people/min per gate).",
            timestamp: getTimestamp()
          });
        });
        speakAlert("Mass exit active. Turnstile barriers unlocked. Directing crowd flows toward metro hubs.");
      },
      // Step 4: Direct to Subway & translation Concierge support
      () => {
        this.updateState((s) => {
          s.activeSop[1].status = "completed";
          s.activeSop[2].status = "active";
          s.activeAgentNetwork.Emergency = false;
          s.activeAgentNetwork.Fan = true;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Fan",
            type: "thought",
            message: "Ingested fan conversational queries. Multilingual support chatbot active. Answering in Spanish, Hindi, French, and local dialects.",
            timestamp: getTimestamp()
          });
          s.fanNotifications.unshift({
            id: Math.random().toString(),
            title: "ORDERLY EVACUATION",
            text: "Lightning alert. Match suspended. Exit via your closest designated Gate (1, 2, 3, or 4) immediately.",
            type: "alert",
            timestamp: getTimestamp()
          });
        });
      },
      // Step 5: Completed Evac
      () => {
        this.updateState((s) => {
          s.activeSop[2].status = "completed";
          s.activeAgentNetwork.Fan = false;
          s.isSimulating = false;
          s.sandboxTime = 100;
          s.thoughts.push({
            id: Math.random().toString(),
            agent: "Orchestrator",
            type: "schema",
            message: "Orderly emergency egress complete. 132,000 fans evacuated in 12.8 minutes. Safety metrics secure.",
            timestamp: getTimestamp()
          });
        });
        speakAlert("Evacuation successfully completed. All fans successfully routed to shelter. Aegis OS standing down.");
      }
    ];

    steps.forEach((step, index) => {
      const tid = setTimeout(step, (index + 1) * 3500);
      timers.push(tid);
    });
  }
};
