export interface AgentConfig {
  name: string;
  role: string;
  systemInstruction: string;
  modelName: string;
  temperature?: number;
}

export interface AgentResponse {
  success: boolean;
  thought: string;
  action: string;
  data: any;
  confidenceScore: number; // 0 to 100
}

export class BaseAgent {
  public config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = {
      temperature: 0.2,
      ...config,
    };
  }

  protected getSystemPrompt(): string {
    return `You are the ${this.config.role} of the AEGIS Stadium OS (Autonomous Stadium Operations Platform).
Your designated Agent Name is: ${this.config.name}.

Core Objective:
${this.config.systemInstruction}

Rules of Engagement:
1. Always analyze raw inputs in relation to crowd safety, transit throughput, and operational efficiency.
2. Structure your internal reasoning step-by-step before invoking any tool or compiling decisions.
3. Your output must strictly conform to the requested JSON response schema. No conversational wrappers.
`;
  }
}
