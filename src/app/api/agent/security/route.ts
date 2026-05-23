import { NextResponse } from "next/server";
import { SecurityRiskAgent } from "@/lib/agents/securityRisk";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageDescription, base64ImageFrame = null, apiMode = "mock" } = body;

    if (!imageDescription) {
      return NextResponse.json(
        { success: false, error: "Missing required 'imageDescription' parameter." },
        { status: 400 }
      );
    }

    const securityAgent = new SecurityRiskAgent();
    const result = await securityAgent.analyzeCctv(imageDescription, base64ImageFrame, apiMode);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in API agent security endpoint:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
