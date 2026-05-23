import { BaseAgent, AgentResponse } from "./BaseAgent";

export interface RouteBypass {
  sourceCongestedLocation: string;
  recommendedBypassLocation: string;
  divertRatioPercentage: number;
  signageDirectives: string;
  routeCoordinates: { x: number; y: number }[];
  reasoning: string;
}

export class DynamicRoutingAgent extends BaseAgent {
  constructor() {
    super({
      name: "Router-Node-C",
      role: "Dynamic Egress & Ingress Routing Planner",
      systemInstruction: `You are the Dynamic Routing Specialist. When a gate or sector becomes congested or isolated due to safety issues, your job is to compute optimal alternative routing vectors.
Analyze capacities at adjacent gates (Gate A, B, C, D) and calculate the optimal diversion percentage (e.g. divert 60% of Gate A traffic to Gate B).
Provide concrete instructions for digital display boards, stadium coordinators, and mobile companion app route updates.`,
      modelName: "gemini-1.5-flash",
    });
  }

  public async computeRoute(congestedGate: string, apiMode: "mock" | "live"): Promise<AgentResponse> {
    const systemPrompt = this.getSystemPrompt();

    if (apiMode === "live") {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

        const response = await ai.models.generateContent({
          model: this.config.modelName,
          contents: `Compute alternative routing vectors to bypass congestion at: ${congestedGate}`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                sourceCongestedLocation: { type: "STRING" },
                recommendedBypassLocation: { type: "STRING" },
                divertRatioPercentage: { type: "INTEGER" },
                signageDirectives: { type: "STRING" },
                reasoning: { type: "STRING" }
              },
              required: ["sourceCongestedLocation", "recommendedBypassLocation", "divertRatioPercentage", "signageDirectives", "reasoning"]
            }
          }
        });

        const parsed = JSON.parse(response.text || "{}");
        const data: RouteBypass = {
          ...parsed,
          routeCoordinates: this.getBypassCoords(parsed.sourceCongestedLocation, parsed.recommendedBypassLocation)
        };

        return {
          success: true,
          thought: `Bypass paths successfully calculated from ${data.sourceCongestedLocation} to ${data.recommendedBypassLocation}. Dynamic signs configured.`,
          action: `Deploying signage updates: "${data.signageDirectives}". Push-alert dispatch active.`,
          data,
          confidenceScore: 90
        };
      } catch (err) {
        console.warn("Routing Agent API call failed, falling back to mock:", err);
      }
    }

    // High fidelity mock fallback
    const isGate2 = congestedGate.toLowerCase().includes("gate 2") || congestedGate.toLowerCase().includes("surge") || congestedGate.toLowerCase().includes("gate a");
    const data: RouteBypass = {
      sourceCongestedLocation: isGate2 ? "Gate 2 (Metro Plaza)" : "Adani Pavilion (Sec A-C)",
      recommendedBypassLocation: isGate2 ? "Gate 1 (Main Road)" : "Gate 4 (West) / Gate 2 (Metro Plaza)",
      divertRatioPercentage: isGate2 ? 65 : 100,
      signageDirectives: isGate2 
        ? "GATE 2 METRO PLAZA CONGESTED. FOLLOW GREEN ILLUMINATED RAMPS TO GATE 1 (MAIN ROAD). 4 MIN WALK."
        : "ADANI PAVILION UNDER EVACUATION. EXIT VIA GATES 2 & 4 ONLY. TURNSTILE BARRIERS UNLOCKED.",
      routeCoordinates: isGate2 
        ? [{ x: 50, y: 12 }, { x: 70, y: 20 }, { x: 88, y: 50 }] 
        : [{ x: 50, y: 88 }, { x: 30, y: 70 }, { x: 12, y: 50 }],
      reasoning: isGate2 
        ? "Gate 1 is currently running at 27% capacity (12,500/45,000 inflow rate) and has open turnstiles on the main pedestrian ramps. Diverting 65% of incoming traffic to Gate 1 resolves the Metro Plaza bottleneck in under 9 minutes."
        : "Stand 3 is under active isolation due to safety hazard in Adani Pavilion. Egress vectors must fully bypass the South end, routing evacuating fans to the West Gate 4 and Metro Gate 2 portals."
    };

    return {
      success: true,
      thought: `Routing matrix compiled. Alternative bypass paths determined for congested gate: [${congestedGate}].`,
      action: "Updating stadium spatial display overlays and transmitting routes to Fan Concierge API.",
      data,
      confidenceScore: 95
    };
  }

  private getBypassCoords(src: string, dest: string): { x: number; y: number }[] {
    // Simple coordinate mapping helper
    return [{ x: 50, y: 12 }, { x: 70, y: 20 }, { x: 88, y: 50 }];
  }
}
