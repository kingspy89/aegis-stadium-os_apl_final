import { NextResponse } from 'next/server';

// Interfaces for our multi-agent response payloads
interface AgentLog {
  agentName: string;
  status: 'IDLE' | 'THINKING' | 'ACTION_TAKEN' | 'WARNING';
  thought: string;
  action: string;
  timestamp: string;
}

interface StadiumState {
  gates: {
    [key: string]: {
      status: 'NORMAL' | 'CONGESTED' | 'CLOSED';
      density: number; // percentage 0-100
      flowRate: number; // people per min
      waitTime: number; // minutes
    };
  };
  stands: {
    [key: string]: {
      status: 'NORMAL' | 'WARNING' | 'EVACUATING';
      occupancy: number;
    };
  };
  activeAlerts: Array<{
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    source: string;
    timestamp: string;
  }>;
  sopSteps: string[];
  fanNotification: string;
}

interface IncidentResponse {
  incidentType: string;
  stadiumState: StadiumState;
  agentLogs: AgentLog[];
  isSimulated: boolean;
}

// Highly detailed fallback configurations that represent the "Golden Demo Path"
// These are used when API key is missing or simulation mode is explicitly requested.
const GOLDEN_MOCKS: Record<string, IncidentResponse> = {
  RESET: {
    incidentType: 'RESET',
    isSimulated: true,
    stadiumState: {
      gates: {
        Gate_A: { status: 'NORMAL', density: 34, flowRate: 120, waitTime: 4 },
        Gate_B: { status: 'NORMAL', density: 28, flowRate: 98, waitTime: 2 },
        Gate_C: { status: 'NORMAL', density: 42, flowRate: 150, waitTime: 5 },
        Gate_D: { status: 'NORMAL', density: 15, flowRate: 50, waitTime: 1 },
      },
      stands: {
        Stand_1: { status: 'NORMAL', occupancy: 72 },
        Stand_2: { status: 'NORMAL', occupancy: 68 },
        Stand_3: { status: 'NORMAL', occupancy: 81 },
        Stand_4: { status: 'NORMAL', occupancy: 55 },
      },
      activeAlerts: [],
      sopSteps: [],
      fanNotification: 'Stadium Entry Normal. Welcome to the venue! Please proceed to your designated gate.'
    },
    agentLogs: [
      {
        agentName: 'Command Center Orchestrator',
        status: 'IDLE',
        thought: 'All systems nominal. Turnstile throughput matches predictions. Security scans report clean profiles.',
        action: 'Monitoring active streams.',
        timestamp: new Date().toLocaleTimeString()
      }
    ]
  },
  CROWD_SURGE: {
    incidentType: 'CROWD_SURGE',
    isSimulated: true,
    stadiumState: {
      gates: {
        Gate_A: { status: 'CONGESTED', density: 94, flowRate: 280, waitTime: 48 },
        Gate_B: { status: 'NORMAL', density: 40, flowRate: 180, waitTime: 6 },
        Gate_C: { status: 'NORMAL', density: 45, flowRate: 160, waitTime: 8 },
        Gate_D: { status: 'NORMAL', density: 15, flowRate: 50, waitTime: 1 },
      },
      stands: {
        Stand_1: { status: 'NORMAL', occupancy: 85 },
        Stand_2: { status: 'NORMAL', occupancy: 70 },
        Stand_3: { status: 'NORMAL', occupancy: 81 },
        Stand_4: { status: 'NORMAL', occupancy: 55 },
      },
      activeAlerts: [
        {
          id: 'alert_crowd_001',
          severity: 'HIGH',
          title: 'Gate A Severe Bottleneck',
          description: 'Ticketing queues at Gate A have exceeded designated corral areas. High safety hazard identified.',
          source: 'Crowd Intelligence Agent',
          timestamp: new Date().toLocaleTimeString()
        }
      ],
      sopSteps: [
        'Initialize crowd corral extension buffers at Gate A.',
        'Activate dynamic digital signage in Parking Area 1 pointing to Gate B.',
        'Deploy 8 perimeter volunteers to Stand A access bridge to divert new arrivals.',
        'Broadcast dynamic gate relocation vouchers to fans within 500m of Gate A.'
      ],
      fanNotification: 'ALERT: Gate A is highly congested. AEGIS has re-allocated your ticket access to Gate B for fast-track entry. Stand A is a 3-minute walk via the Cyan corridor. Tap here to navigate.'
    },
    agentLogs: [
      {
        agentName: 'Command Center Orchestrator',
        status: 'WARNING',
        thought: 'Gate A turnstile telemetry reveals 94% density. Inflow rates at 280 fans/min exceed the gate threshold. Routing and Crowd agents dispatched.',
        action: 'Initiated multi-agent flow adjustment cycle.',
        timestamp: new Date(Date.now() - 5000).toLocaleTimeString()
      },
      {
        agentName: 'Crowd Intelligence Agent',
        status: 'WARNING',
        thought: 'Queue length is now 140 meters. Bottleneck at ticketing validators. Predicting crush risk at Zone A perimeter within 12 minutes if unchecked.',
        action: 'Computed Gate A failure probability: 88%. Dispatched emergency relocation request.',
        timestamp: new Date(Date.now() - 4000).toLocaleTimeString()
      },
      {
        agentName: 'Dynamic Routing Agent',
        status: 'ACTION_TAKEN',
        thought: 'Gate B capacity is underutilized (40% density, wait time 6m). Recalculating dynamic routes. Relocating 40% of upcoming arrivals to Gate B will reduce Gate A wait times to 12 minutes.',
        action: 'Sent override coordinates to digital signs; updated dynamic ticket configurations.',
        timestamp: new Date(Date.now() - 2000).toLocaleTimeString()
      },
      {
        agentName: 'Fan Experience Agent',
        status: 'ACTION_TAKEN',
        thought: 'Formulating friendly redirection notification. Translating route instructions to simple local guidelines. Active navigation maps updated with Cyan Corridor overlay.',
        action: 'Pushed customized alerts to active Fan Mobile users within the Gate A geofence.',
        timestamp: new Date().toLocaleTimeString()
      }
    ]
  },
  SECURITY_THREAT: {
    incidentType: 'SECURITY_THREAT',
    isSimulated: true,
    stadiumState: {
      gates: {
        Gate_A: { status: 'NORMAL', density: 30, flowRate: 110, waitTime: 3 },
        Gate_B: { status: 'NORMAL', density: 35, flowRate: 120, waitTime: 4 },
        Gate_C: { status: 'NORMAL', density: 40, flowRate: 140, waitTime: 5 },
        Gate_D: { status: 'CLOSED', density: 0, flowRate: 0, waitTime: 0 },
      },
      stands: {
        Stand_1: { status: 'NORMAL', occupancy: 75 },
        Stand_2: { status: 'NORMAL', occupancy: 70 },
        Stand_3: { status: 'WARNING', occupancy: 85 },
        Stand_4: { status: 'NORMAL', occupancy: 55 },
      },
      activeAlerts: [
        {
          id: 'alert_sec_002',
          severity: 'CRITICAL',
          title: 'Unattended Bag Stand 3',
          description: 'CCTV Spotter ID #C34 detects a black tactical backpack left underneath Seat 14, Row L in Stand 3 for over 22 minutes.',
          source: 'Security Risk Agent',
          timestamp: new Date().toLocaleTimeString()
        }
      ],
      sopSteps: [
        'Dispatch Security Patrol Unit 4 to Stand 3, Row L immediate area.',
        'Quietly cordon off Stand 3, Rows K through M (15m radius containment).',
        'Analyze CCTV feed for last known possessor using Vertex Video AI history logs.',
        'Prepare emergency text push script for Stand 3 occupants (pre-drafted by AI).',
        'Notify City Emergency Dispatch Command of suspected risk assessment.'
      ],
      fanNotification: 'AEGIS ADVISORY: Stadium Stewards are conducting a standard technical inspection in Stand 3. Please follow volunteer instructions. No immediate action required.'
    },
    agentLogs: [
      {
        agentName: 'Command Center Orchestrator',
        status: 'WARNING',
        thought: 'High-risk security report received at Stand 3. Multimodal vision feed analyzed. Dispatching Security Risk and Emergency Response Agents.',
        action: 'Enforced human-in-the-loop validation request on the central dashboard.',
        timestamp: new Date(Date.now() - 5000).toLocaleTimeString()
      },
      {
        agentName: 'Security Risk Agent',
        status: 'WARNING',
        thought: 'CCTV frame analysis of Seat 14 shows a 45L nylon tactical pack. Static position maintained for 22 minutes. Object anomaly confidence: 91%. Risk level: CRITICAL.',
        action: 'Flagged threat status to Master Orchestrator. Dispatched thermal video trace.',
        timestamp: new Date(Date.now() - 3000).toLocaleTimeString()
      },
      {
        agentName: 'Emergency Response Agent',
        status: 'ACTION_TAKEN',
        thought: 'Deploying Standard Operating Protocol #SEC-BAG-09. Generating isolated evacuation sequence. Creating localized stand notification to avoid crowd panic.',
        action: 'Drafted Stand 3 PA script and notified local Police Dispatch.',
        timestamp: new Date(Date.now() - 1000).toLocaleTimeString()
      }
    ]
  },
  WEATHER_ALERT: {
    incidentType: 'WEATHER_ALERT',
    isSimulated: true,
    stadiumState: {
      gates: {
        Gate_A: { status: 'CLOSED', density: 0, flowRate: 0, waitTime: 0 },
        Gate_B: { status: 'CLOSED', density: 0, flowRate: 0, waitTime: 0 },
        Gate_C: { status: 'NORMAL', density: 85, flowRate: 350, waitTime: 12 },
        Gate_D: { status: 'NORMAL', density: 90, flowRate: 390, waitTime: 15 },
      },
      stands: {
        Stand_1: { status: 'EVACUATING', occupancy: 40 },
        Stand_2: { status: 'EVACUATING', occupancy: 35 },
        Stand_3: { status: 'EVACUATING', occupancy: 50 },
        Stand_4: { status: 'EVACUATING', occupancy: 20 },
      },
      activeAlerts: [
        {
          id: 'alert_weather_003',
          severity: 'CRITICAL',
          title: 'Severe Convective Thunderstorm Warning',
          description: 'Lightning strikes detected within 6km of the stadium. Severe weather front expected to hit Stand 1 and 2 in 18 minutes.',
          source: 'Meteorological Agent',
          timestamp: new Date().toLocaleTimeString()
        }
      ],
      sopSteps: [
        'Trigger Stage 2 Evacuation Protocol: Relocate Stand 1 and 2 (unroofed areas) first.',
        'Direct crowd streams to West Covered Egress Gates (Gates C and D) and Metro tunnels.',
        'Activate dynamic canopy deployment structures in stands.',
        'Update dynamic messaging on scoreboards with exit route map visual cards.',
        'Dispatch emergency standby medical teams to Gate C and D corridors.'
      ],
      fanNotification: 'CRITICAL EMERGENCY: Severe thunderstorm with high lightning risk approaching Stand 1 and 2. Aegis is evacuating unroofed stands. Please proceed immediately to the indoor lower mezzanine or Exit Gates C/D. Follow stewards.'
    },
    agentLogs: [
      {
        agentName: 'Command Center Orchestrator',
        status: 'WARNING',
        thought: 'Severe weather radar shows convective cells hitting stadium grid within 18 minutes. Massive lightning strike hazard. Evacuation protocols initialized.',
        action: 'Dispatched Emergency Response and Dynamic Routing agents to coordinate evacuation.',
        timestamp: new Date(Date.now() - 5000).toLocaleTimeString()
      },
      {
        agentName: 'Emergency Response Agent',
        status: 'ACTION_TAKEN',
        thought: 'SOP Storm-Stage-2 initiated. Unroofed stands (Stand 1 and 2) contain 35,000 spectators. Need prompt redirection to concrete shelter areas.',
        action: 'Drafted scoreboard evacuation graphics; triggered regional evacuation alarms.',
        timestamp: new Date(Date.now() - 3000).toLocaleTimeString()
      },
      {
        agentName: 'Dynamic Routing Agent',
        status: 'ACTION_TAKEN',
        thought: 'Computing dynamic evacuation corridors. Gates A & B are exposed to storm winds; closed immediately. Rerouting all egress traffic to covered Gates C & D and subterranean transit terminals.',
        action: 'Updated digital signage to highlight protected indoor transit paths.',
        timestamp: new Date(Date.now() - 1000).toLocaleTimeString()
      }
    ]
  }
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { incidentType, simulate = false, customText = '' } = body;

    console.log(`[API Incident Router] Received event: ${incidentType}, simulate=${simulate}`);

    // If simulate or no API key, return our highly detailed, pre-vetted response immediately
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (simulate || !apiKey) {
      console.log(`[API] Serving robust golden simulation mock for: ${incidentType}`);
      // Simulate typical AI thinking latency (800ms) for an incredibly high-end "live feel"
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const responsePayload = GOLDEN_MOCKS[incidentType] || GOLDEN_MOCKS.RESET;
      
      // If the operator entered custom text, we can dynamically weave it in!
      if (customText && responsePayload.stadiumState.activeAlerts.length > 0) {
        responsePayload.stadiumState.activeAlerts[0].description = customText;
      }
      
      return NextResponse.json(responsePayload);
    }

    // --- LIVE GEMINI INTEGRATION ---
    console.log('[API] Communicating with Live Gemini API...');
    
    // Construct the schema to force Gemini to return strict structured outputs
    const schema = {
      type: "OBJECT",
      properties: {
        incidentType: { type: "STRING" },
        stadiumState: {
          type: "OBJECT",
          properties: {
            gates: {
              type: "OBJECT",
              additionalProperties: {
                type: "OBJECT",
                properties: {
                  status: { type: "STRING", enum: ["NORMAL", "CONGESTED", "CLOSED"] },
                  density: { type: "INTEGER" },
                  flowRate: { type: "INTEGER" },
                  waitTime: { type: "INTEGER" }
                },
                required: ["status", "density", "flowRate", "waitTime"]
              }
            },
            stands: {
              type: "OBJECT",
              additionalProperties: {
                type: "OBJECT",
                properties: {
                  status: { type: "STRING", enum: ["NORMAL", "WARNING", "EVACUATING"] },
                  occupancy: { type: "INTEGER" }
                },
                required: ["status", "occupancy"]
              }
            },
            activeAlerts: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING" },
                  severity: { type: "STRING", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                  title: { type: "STRING" },
                  description: { type: "STRING" },
                  source: { type: "STRING" },
                  timestamp: { type: "STRING" }
                },
                required: ["id", "severity", "title", "description", "source", "timestamp"]
              }
            },
            sopSteps: { type: "ARRAY", items: { type: "STRING" } },
            fanNotification: { type: "STRING" }
          },
          required: ["gates", "stands", "activeAlerts", "sopSteps", "fanNotification"]
        },
        agentLogs: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              agentName: { type: "STRING" },
              status: { type: "STRING", enum: ["IDLE", "THINKING", "ACTION_TAKEN", "WARNING"] },
              thought: { type: "STRING" },
              action: { type: "STRING" },
              timestamp: { type: "STRING" }
            },
            required: ["agentName", "status", "thought", "action", "timestamp"]
          }
        }
      },
      required: ["incidentType", "stadiumState", "agentLogs"]
    };

    // Construct the prompt based on the triggered event
    let prompt = `You are Aegis Central Stadium OS, an autonomous multi-agent operating system.
    Evaluate the following stadium incident and compute the dynamic redistribution state:
    
    Trigger Event: ${incidentType}
    User Details: ${customText || "Standard operational alert"}
    
    You must coordinate between your 5 specialized agents:
    - Crowd Intelligence Agent (predicts density bottlenecks)
    - Dynamic Routing Agent (re-maps exit/entry gates)
    - Security Risk Agent (evaluates visual/text threat patterns)
    - Emergency Response Agent (creates emergency SOP scripts)
    - Fan Experience Agent (drafts friendly local-language notifications)
    
    Update the gates (Gate_A, Gate_B, Gate_C, Gate_D) and stands (Stand_1, Stand_2, Stand_3, Stand_4) densities, statuses, active alerts, tailored standard operating steps (SOP), and active Fan Mobile notifications.
    Provide realistic agent logs for the agents involved. Ensure thoughts contain technical, strategic reasoning.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[API] Gemini API call failed: ${response.status}. Falling back to simulation mode.`, errorText);
      throw new Error(`Gemini status code ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      throw new Error("Empty candidate payload from Gemini");
    }

    const result = JSON.parse(textContent);
    result.isSimulated = false; // Flagged as authentic live intelligence
    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[API Error Handler] Exception encountered: ${error.message}. Redirecting to Golden Mock.`);
    
    // Robust, zero-fail fallback: Return the mock data instead of crashing!
    const body = await req.json().catch(() => ({}));
    const type = body.incidentType || 'RESET';
    const fallbackResponse = GOLDEN_MOCKS[type] || GOLDEN_MOCKS.RESET;
    fallbackResponse.isSimulated = true;
    
    return NextResponse.json(fallbackResponse);
  }
}
