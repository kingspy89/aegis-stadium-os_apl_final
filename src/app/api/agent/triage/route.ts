import { NextResponse } from "next/server";
import { OrchestratorAgent } from "@/lib/agents/orchestrator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventText, apiMode = "mock" } = body;

    if (!eventText) {
      return NextResponse.json(
        { success: false, error: "Missing required 'eventText' parameter." },
        { status: 400 }
      );
    }

    const orchestrator = new OrchestratorAgent();
    const result = await orchestrator.triage(eventText, apiMode);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in API agent triage endpoint:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
