import { BaseAgent, AgentResponse } from "./BaseAgent";

export interface FanChatResponse {
  replyText: string;
  detectedLanguage: string;
  translatedReply: string; // English translation of reply for operator dashboard
  actionPushed: string;
}

export class FanExperienceAgent extends BaseAgent {
  constructor() {
    super({
      name: "Aegis-FanBot",
      role: "Fan Experience & Multilingual Concierge Specialist",
      systemInstruction: `You are the Fan Experience Concierge Agent. You live inside the 'Fan Companion Mobile App' of AEGIS Stadium OS.
Your task is to answer fan questions (such as 'Where is my seat?', 'Is Gate A safe?', 'How do I evacuate?') in their native language (e.g. English, Hindi, Spanish, French).
You have access to the current stadium operation state:
1. Turnstile congestion bottlenecks (e.g., Gate A is congested, Gate B is open).
2. Emergency alerts (e.g., severe weather evacuated, South stands restricted).
Provide highly reassuring, helpful, and concise guidelines. Avoid causing panic, but enforce official evacuations/detours.`,
      modelName: "gemini-1.5-flash",
    });
  }

  public async converse(fanQuery: string, currentStateDescription: string, apiMode: "mock" | "live"): Promise<AgentResponse> {
    const systemPrompt = this.getSystemPrompt();

    if (apiMode === "live") {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

        const response = await ai.models.generateContent({
          model: this.config.modelName,
          contents: `Current Stadium Event State: ${currentStateDescription}\nFan Query: ${fanQuery}`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                replyText: { type: "STRING" },
                detectedLanguage: { type: "STRING" },
                translatedReply: { type: "STRING" },
                actionPushed: { type: "STRING" }
              },
              required: ["replyText", "detectedLanguage", "translatedReply", "actionPushed"]
            }
          }
        });

        const data = JSON.parse(response.text || "{}") as FanChatResponse;
        return {
          success: true,
          thought: `Fan query processed in language: ${data.detectedLanguage}. Query: "${fanQuery}". Response drafted: "${data.translatedReply.substring(0, 40)}..."`,
          action: `Transmitting push action to Fan App: "${data.actionPushed}".`,
          data,
          confidenceScore: 92
        };
      } catch (err) {
        console.warn("Fan Agent API call failed, falling back to mock:", err);
      }
    }

    // High fidelity mock fallback (supporting English, Hindi, Spanish)
    return this.getSimulatedResponse(fanQuery, currentStateDescription);
  }

  private getSimulatedResponse(query: string, state: string): AgentResponse {
    const q = query.toLowerCase();
    const isSurge = state.includes("surge") || state.includes("congested");
    const isThreat = state.includes("threat") || state.includes("bag") || state.includes("isolated");
    const isStorm = state.includes("storm") || state.includes("weather") || state.includes("lightning");

    let replyText = "Welcome to Narendra Modi Stadium! Your ticket is valid at Gate 2 (Metro Plaza). Fast Route is open.";
    let lang = "English";
    let trans = "Welcome to Narendra Modi Stadium! Your ticket is valid at Gate 2 (Metro Plaza). Fast Route is open.";
    let action = "DISPLAY_NORMAL_ROUTE";

    // Hindi Handler
    if (q.includes("कहाँ") || q.includes("गेट") || q.includes("निकास") || q.includes("सुरक्षित")) {
      lang = "Hindi";
      if (isStorm) {
        replyText = "नमस्ते! मौसम खराब होने के कारण मैच स्थगित कर दिया गया है। कृपया अपने नजदीकी गेट (मेट्रो निकास या रोड निकास) की ओर धीरे-धीरे बढ़ें। वालंटियर्स आपकी मदद के लिए खड़े हैं।";
        trans = "Hello! The match is suspended due to bad weather. Please walk slowly toward your nearest Gate (Metro or Road Exit). Volunteers are ready to assist you.";
        action = "SHOW_METRO_EVAC_MAP";
      } else if (isThreat) {
        replyText = "सुरक्षा कारणों से अदानी पवेलियन (Adani Pavilion) अभी बंद है। कृपया गेट 3 (Gate 3) के बजाय गेट 2 (Gate 2) या 4 (Gate 4) का उपयोग करें।";
        trans = "Adani Pavilion (South) is currently closed for security reasons. Please use Gate 2 or 4 instead of Gate 3.";
        action = "DETOUR_GATE_C";
      } else if (isSurge) {
        replyText = "गेट 2 (Gate 2) पर बहुत भीड़ है। हमारा एआई सिस्टम आपको गेट 1 (Gate 1 - मेन रोड) से प्रवेश करने की सलाह देता है। यहाँ रैंप पर भीड़ बहुत कम है।";
        trans = "Gate 2 is highly congested. Our AI recommends entering via Gate 1 (Main Road) where inflow queues are short.";
        action = "REDIRECT_TO_GATE_B";
      } else {
        replyText = "नमस्ते! आपका टिकट गेट 2 (Gate 2) के लिए मान्य है। अभी वहाँ भीड़ कम है और प्रवेश सुरक्षित है।";
        trans = "Hello! Your ticket is valid at Gate 2. Currently inflow is nominal and entry is safe.";
        action = "DISPLAY_NORMAL_ROUTE";
      }
    }
    // Spanish Handler
    else if (q.includes("donde") || q.includes("puerta") || q.includes("seguro") || q.includes("salida")) {
      lang = "Spanish";
      if (isStorm) {
        replyText = "¡Hola! El partido se suspende por tormenta eléctrica. Por favor evacúe con calma hacia la salida del Metro o la Carretera. Los voluntarios de Aegis le guiarán.";
        trans = "Hello! The match is suspended due to lightning storm. Please evacuate calmly toward the Metro or Road exits. Aegis volunteers are here to guide you.";
        action = "SHOW_METRO_EVAC_MAP";
      } else if (isThreat) {
        replyText = "El Pabellón Adani está restringido por seguridad. Por favor, desvíese y use las Puertas 2 o 4 en lugar de la Puerta 3.";
        trans = "Adani Pavilion is restricted for security. Please detour and use Gates 2 or 4 instead of Gate 3.";
        action = "DETOUR_GATE_C";
      } else if (isSurge) {
        replyText = "La Puerta 2 está muy congestionada. Aegis recomienda ingresar por la Puerta 1 (Main Road). Hay acceso rápido habilitado.";
        trans = "Gate 2 is heavily congested. Aegis recommends entering via Gate 1 (Main Road) where fast entry is enabled.";
        action = "REDIRECT_TO_GATE_B";
      } else {
        replyText = "¡Hola! Su boleto es válido para la Puerta 2. La entrada está funcionando con normalidad.";
        trans = "Hello! Your ticket is valid for Gate 2. Entry is running normally.";
        action = "DISPLAY_NORMAL_ROUTE";
      }
    }
    // English default
    else {
      if (isStorm) {
        replyText = "Important: The match has been suspended due to an approaching lightning storm. Please exit the seating bowl and proceed calmly to the Metro or road exits.";
        trans = replyText;
        action = "SHOW_METRO_EVAC_MAP";
      } else if (isThreat) {
        replyText = "Notice: Adani Pavilion (South) is currently closed. If your ticket is for Gate 3, please detour and enter via Gate 2 (Metro Plaza) or Gate 4 (West).";
        trans = replyText;
        action = "DETOUR_GATE_C";
      } else if (isSurge) {
        replyText = "Alert: Gate 2 (Metro Plaza) turnstiles are highly congested. To avoid delays, please follow the illuminated paths to Gate 1 (Main Road) for fast-track entry.";
        trans = replyText;
        action = "REDIRECT_TO_GATE_B";
      } else {
        replyText = "Hello! Your ticket is verified for Gate 2 (Metro Plaza Entrance). Access paths are fully clear. Enjoy the match!";
        trans = replyText;
        action = "DISPLAY_NORMAL_ROUTE";
      }
    }

    return {
      success: true,
      thought: `Fan chatbot processed query. Language detected: ${lang}. State Context: ${isStorm ? "Storm Evacuation" : isThreat ? "Security Threat" : isSurge ? "Gate Congestion" : "Standard Operations"}.`,
      action: `Pushed UI action: ${action} to client companion container.`,
      data: {
        replyText,
        detectedLanguage: lang,
        translatedReply: trans,
        actionPushed: action
      },
      confidenceScore: 95
    };
  }
}
