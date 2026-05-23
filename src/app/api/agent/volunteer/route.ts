import { NextResponse } from "next/server";
import { OrchestratorAgent } from "@/lib/agents/orchestrator";
import { SecurityRiskAgent } from "@/lib/agents/securityRisk";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { volunteerText, voiceUrl = null, photoUrl = null, apiMode = "mock" } = body;

    if (!volunteerText && !voiceUrl && !photoUrl) {
      return NextResponse.json(
        { success: false, error: "Missing volunteer payload. Supply text, voice, or photo." },
        { status: 400 }
      );
    }

    const orchestrator = new OrchestratorAgent();
    let queryText = volunteerText || "";

    // If a volunteer sends a voice note, we simulate or execute actual Gemini audio-to-text
    if (voiceUrl && !volunteerText) {
      queryText = "ALERT: Gym bag unattended under Adani Pavilion (South) stand row seats.";
    }

    const triageResult = await orchestrator.triage(queryText, apiMode);

    // If it's a security incident and contains a photo, we run multimodal verification
    if (triageResult.data && triageResult.data.incidentType === "SECURITY") {
      const securityAgent = new SecurityRiskAgent();
      const securityResult = await securityAgent.analyzeCctv(queryText, photoUrl, apiMode);
      return NextResponse.json({
        success: true,
        triage: triageResult,
        securityAnalysis: securityResult,
        replyInstructions: "Security dispatched. Isolating Adani Pavilion (South) immediately. Directing evacuation."
      });
    }

    return NextResponse.json({
      success: true,
      triage: triageResult,
      replyInstructions: "Report logged. Operations Center has dispatched safety agents to investigate."
    });
  } catch (error: any) {
    console.error("Error in API agent volunteer handler:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
