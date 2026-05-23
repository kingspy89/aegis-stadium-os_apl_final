import { NextResponse } from "next/server";

// Structure for scan events pushed from the scanner
interface ScanEvent {
  id: string;
  ticketId: string;
  name: string;
  gate: string;
  stand: string;
  type: "valid" | "vip" | "duplicate" | "wrong_gate" | "counterfeit" | "incident_reroute";
  timestamp: string;
}

// Structure for Telegram messages pushed from the webhook
interface TelegramQueueMessage {
  id: string;
  sender: "Volunteer" | "AI_Agent";
  text: string;
  voiceUrl?: string;
  photoUrl?: string;
  timestamp: string;
  chatId: number;
  replyMarkup?: unknown;
}

// Global declaration to prevent TypeScript errors when attaching variables to globalThis
declare global {
  var syncEvents: ScanEvent[];
  var activeDashboardIncident: string | null;
  var telegramQueue: TelegramQueueMessage[];
}

// Initialize in-memory stores
globalThis.syncEvents = globalThis.syncEvents || [];
globalThis.activeDashboardIncident = globalThis.activeDashboardIncident || null;
globalThis.telegramQueue = globalThis.telegramQueue || [];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const clear = url.searchParams.get("clear") === "true";

    // Copy current events and messages
    const events = [...globalThis.syncEvents];
    const telegramMessages = [...globalThis.telegramQueue];

    // If clear is requested, empty the queues (usually done by the dashboard after consuming)
    if (clear) {
      globalThis.syncEvents = [];
      globalThis.telegramQueue = [];
    }

    return NextResponse.json({
      success: true,
      events,
      telegramMessages,
      activeIncident: globalThis.activeDashboardIncident,
      timestamp: new Date().toLocaleTimeString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, event, incidentType, message } = body;

    // Route 1: Syncing an active incident from the dashboard to the fan app
    if (action === "set_incident") {
      globalThis.activeDashboardIncident = incidentType || null;
      console.log(`[Sync server] Incident set to: ${incidentType}`);
      return NextResponse.json({ success: true, activeIncident: globalThis.activeDashboardIncident });
    }

    // Route 2: Pushing a turnstile scanning event from the scanner app
    if (action === "scan") {
      if (!event) {
        return NextResponse.json({ success: false, error: "Missing event payload" }, { status: 400 });
      }

      const scanEvent: ScanEvent = {
        id: event.id || Math.random().toString(),
        ticketId: event.ticketId,
        name: event.name || "Unknown Attendee",
        gate: event.gate || "A",
        stand: event.stand || "North",
        type: event.type || "valid",
        timestamp: event.timestamp || new Date().toLocaleTimeString(),
      };

      globalThis.syncEvents.push(scanEvent);
      console.log(`[Sync server] Logged ticket scan: ${scanEvent.name} [${scanEvent.type}] at Gate ${scanEvent.gate}`);

      return NextResponse.json({
        success: true,
        logged: scanEvent,
        totalPending: globalThis.syncEvents.length,
      });
    }

    // Route 3: Pushing a Telegram message from the bot webhook
    if (action === "telegram_msg") {
      if (!message) {
        return NextResponse.json({ success: false, error: "Missing message payload" }, { status: 400 });
      }

      const telegramMsg: TelegramQueueMessage = {
        id: message.id || Math.random().toString(),
        sender: message.sender || "Volunteer",
        text: message.text,
        voiceUrl: message.voiceUrl,
        photoUrl: message.photoUrl,
        timestamp: message.timestamp || new Date().toLocaleTimeString().split(" ")[0],
        chatId: message.chatId,
        replyMarkup: message.replyMarkup,
      };

      globalThis.telegramQueue.push(telegramMsg);
      console.log(`[Sync server] Logged Telegram msg from Chat ${telegramMsg.chatId}: ${telegramMsg.text}`);

      return NextResponse.json({
        success: true,
        logged: telegramMsg,
        totalPending: globalThis.telegramQueue.length,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

