import { NextResponse } from "next/server";
import { EmergencyResponseAgent } from "@/lib/agents/emergencyResponse";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { incidentDetails, apiMode = "mock" } = body;

    if (!incidentDetails) {
      return NextResponse.json(
        { success: false, error: "Missing required 'incidentDetails' parameter." },
        { status: 400 }
      );
    }

    const emergencyAgent = new EmergencyResponseAgent();
    const result = await emergencyAgent.generateSop(incidentDetails, apiMode);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in API agent emergency endpoint:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
