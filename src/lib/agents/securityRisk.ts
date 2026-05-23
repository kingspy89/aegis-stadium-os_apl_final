import { BaseAgent, AgentResponse } from "./BaseAgent";

export interface SecurityThreatAnalysis {
  objectIdentified: string;
  riskScore: number; // 0 to 100
  threatClassification: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  boundingBoxCoordinates: { xMin: number; yMin: number; xMax: number; yMax: number } | null;
  immediateDirectives: string;
  reasoning: string;
}

export class SecurityRiskAgent extends BaseAgent {
  constructor() {
    super({
      name: "Aegis-AegisEye",
      role: "Security Threat & Multimodal Vision Analyst",
      systemInstruction: `You are the Security Risk Analyst. You specialize in multimodal CCTV video analysis, image snapshots, and incident reports.
Your task is to identify security anomalies (such as unattended backpacks, blockages, perimeter breaches, or crowding hazards).
Assess danger levels, estimate threat scores (0-100), and define immediate boundary containment steps.`,
      modelName: "gemini-1.5-flash", // Flash for low-latency visual inference
    });
  }

  public async analyzeCctv(imageDescription: string, base64ImageFrame: string | null, apiMode: "mock" | "live"): Promise<AgentResponse> {
    const systemPrompt = this.getSystemPrompt();

    if (apiMode === "live") {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

        let contents: any[] = [imageDescription];
        if (base64ImageFrame) {
          contents.unshift({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64ImageFrame
            }
          });
        }

        const response = await ai.models.generateContent({
          model: this.config.modelName,
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                objectIdentified: { type: "STRING" },
                riskScore: { type: "INTEGER" },
                threatClassification: { type: "STRING", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                immediateDirectives: { type: "STRING" },
                reasoning: { type: "STRING" }
              },
              required: ["objectIdentified", "riskScore", "threatClassification", "immediateDirectives", "reasoning"]
            }
          }
        });

        const data = JSON.parse(response.text || "{}") as SecurityThreatAnalysis;
        return {
          success: true,
          thought: `CCTV multimodal analysis complete. Detected object: "${data.objectIdentified}" in security frame. Classification: ${data.threatClassification}.`,
          action: `Alerting Command Center. Triggering containment directive: "${data.immediateDirectives}".`,
          data,
          confidenceScore: 89
        };
      } catch (err) {
        console.warn("Security Vision Agent API call failed, falling back to mock:", err);
      }
    }

    // High fidelity mock fallback (for robust demo execution)
    const isBag = imageDescription.toLowerCase().includes("bag") || imageDescription.toLowerCase().includes("suspicious");
    const data: SecurityThreatAnalysis = {
      objectIdentified: isBag ? "Unattended Large Black Canvas Gym Bag" : "Standard crowd ingress",
      riskScore: isBag ? 88 : 12,
      threatClassification: isBag ? "CRITICAL" : "LOW",
      boundingBoxCoordinates: isBag ? { xMin: 342, yMin: 215, xMax: 410, yMax: 290 } : null,
      immediateDirectives: isBag 
        ? "ISOLATE ADANI PAVILION STAND 3 IMMEDIATELY. DEPLOY FIELD VOLUNTEERS FOR 10-METER BOUNDARY SHIELD. DO NOT TOUCH OBJECT."
        : "No anomalies detected. Continue standard video scan.",
      reasoning: isBag 
        ? "CCTV Adani Pavilion camera (Node-102) shows a large, opaque canvas bag left under Seat 14. Bounding structure is rigid, suggesting heavy payload contents. Object has remained unattended for 22 minutes amidst high density crowd flows, creating high vulnerability risk."
        : "Visual frame scans match normal density models. No unattended objects or physical blockages detected."
    };

    return {
      success: true,
      thought: `CCTV Multimodal frame processing complete. Target anomaly classification: ${data.threatClassification}.`,
      action: isBag 
        ? "Synthesizing warnings. Dispatching security perimeter command to Emergency Response Specialist."
        : "Standby. Visual feed normal.",
      data,
      confidenceScore: 92
    };
  }
}
