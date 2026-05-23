import { findVolunteerRecord } from "./volunteerDatabase";

export interface TelegramReplyMarkup {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
}

export interface TelegramSession {
  chatId: number;
  username: string;
  firstName: string;
  volunteerId: string | null;
  volunteerName: string | null;
  role: string;
  zone: string | null;
  onboarded: boolean;
  authenticated: boolean;
  authStage: "idle" | "awaiting_id" | "awaiting_pass" | "authenticated";
  pendingVolunteerId: string | null;
  failedAuthAttempts: number;
  lastCommand: string | null;
  lastSeen: string;
}

export interface TelegramInboundResult {
  sessionPatch?: Partial<TelegramSession>;
  replyText: string;
  replyMarkup?: TelegramReplyMarkup;
  shouldQueue: boolean;
  queueText?: string;
  simulationSignal?: VolunteerSignal;
}

export type VolunteerSignal =
  | {
      kind: "gate_density";
      gateId: string;
      severity: "warning" | "critical";
      flowRate: number;
      summary: string;
      suggestion: string;
    }
  | {
      kind: "security_threat";
      severity: "warning" | "critical";
      summary: string;
      suggestion: string;
    }
  | {
      kind: "routine";
      summary: string;
      suggestion: string;
    };

declare global {
  var telegramSessions: Map<number, TelegramSession> | undefined;
}

const defaultRole = "volunteer";

function getTimestamp() {
  return new Date().toLocaleTimeString().split(" ")[0];
}

function getName(chat: { username?: string; first_name?: string }, fallback: string) {
  return chat.username || chat.first_name || fallback;
}

export function getTelegramSession(chat: { id: number; username?: string; first_name?: string }) {
  globalThis.telegramSessions = globalThis.telegramSessions || new Map<number, TelegramSession>();

  const existing = globalThis.telegramSessions.get(chat.id);
  if (existing) {
    existing.username = getName(chat, existing.username);
    existing.firstName = chat.first_name || existing.firstName;
    existing.lastSeen = getTimestamp();
    return existing;
  }

  const session: TelegramSession = {
    chatId: chat.id,
    username: getName(chat, "volunteer"),
    firstName: chat.first_name || "Volunteer",
    volunteerId: null,
    volunteerName: null,
    role: defaultRole,
    zone: null,
    onboarded: false,
    authenticated: false,
    authStage: "idle",
    pendingVolunteerId: null,
    failedAuthAttempts: 0,
    lastCommand: null,
    lastSeen: getTimestamp(),
  };

  globalThis.telegramSessions.set(chat.id, session);
  return session;
}

export function updateTelegramSession(chatId: number, patch: Partial<TelegramSession>) {
  globalThis.telegramSessions = globalThis.telegramSessions || new Map<number, TelegramSession>();
  const existing = globalThis.telegramSessions.get(chatId);
  if (!existing) return null;

  const updated = { ...existing, ...patch, lastSeen: getTimestamp() };
  globalThis.telegramSessions.set(chatId, updated);
  return updated;
}

export function buildTelegramMenu(session: TelegramSession): TelegramReplyMarkup {
  const zoneLabel = session.zone ? `Zone ${session.zone}` : "Assign Zone";

  return {
    inline_keyboard: [
      [
        { text: "Send Report", callback_data: "menu:report" },
        { text: "Live Status", callback_data: "menu:status" },
      ],
      [
        { text: zoneLabel, callback_data: "menu:zone" },
        { text: "Emergency Alert", callback_data: "menu:emergency" },
      ],
      [
        { text: "Shift Handover", callback_data: "menu:handover" },
        { text: "Help", callback_data: "menu:help" },
      ],
    ],
  };
}

export function buildWelcomeMessage(session: TelegramSession) {
  const zoneText = session.zone ? `Zone ${session.zone}` : "not assigned yet";

  return {
    text: [
      `Welcome ${session.firstName}. AEGIS Telegram control channel is online.`,
      "Send your volunteer ID to continue authentication.",
      "After ID validation, you will be asked for your passcode.",
      `Zone: ${zoneText}.`,
    ].join("\n"),
  };
}

export function buildAuthIdPrompt() {
  return {
    text: [
      "Enter your volunteer ID.",
      "Example: VOL-1001",
    ].join("\n"),
  };
}

export function buildAuthPassPrompt(volunteerId: string) {
  return {
    text: [
      `Volunteer ID ${volunteerId} accepted.`,
      "Now enter your passcode.",
    ].join("\n"),
  };
}

export function buildAuthSuccessMessage(session: TelegramSession) {
  return {
    text: [
      `Authorization successful for ${session.volunteerName || session.firstName}.`,
      `Role: ${session.role}. Zone: ${session.zone || "unassigned"}.`,
      "You can now submit live reports. Try: 'Gate 1 is full' or 'Suspicious bag at South stand'.",
    ].join("\n"),
    replyMarkup: buildTelegramMenu(session),
  };
}

export function buildAuthFailureMessage() {
  return {
    text: [
      "Invalid ID or passcode.",
      "Send /start to try authentication again.",
    ].join("\n"),
  };
}

export function buildAuthRequiredMessage() {
  return {
    text: [
      "Volunteer authentication is required before you can talk to the system.",
      "Send /start to begin the ID and passcode check.",
    ].join("\n"),
  };
}

export function buildHelpMessage(session: TelegramSession) {
  return {
    text: [
      "Telegram command set:",
      "/start - register or refresh your volunteer session",
      "/report <details> - submit a field update for triage",
      "/status - show your current session state",
      "/zone <A|B|C|D> - assign your active sector",
      "/handover <notes> - send a shift handover summary",
      "/emergency <details> - escalate a critical situation",
      `Current zone: ${session.zone || "unassigned"}`,
    ].join("\n"),
    replyMarkup: buildTelegramMenu(session),
  };
}

export function buildStatusMessage(session: TelegramSession) {
  return {
    text: [
      `Session active for ${session.firstName} (@${session.username}).`,
      `Role: ${session.role}.`,
      `Zone: ${session.zone || "unassigned"}.`,
      `Last command: ${session.lastCommand || "none"}.`,
      `Last seen: ${session.lastSeen}.`,
    ].join("\n"),
    replyMarkup: buildTelegramMenu(session),
  };
}

export function buildZoneAssignmentMessage(session: TelegramSession, zone: string) {
  return {
    text: `Zone assignment updated. You are now attached to sector ${zone}. Use /report or the quick actions to submit updates from this area.`,
    replyMarkup: buildTelegramMenu(session),
  };
}

export function buildShiftHandoverMessage(session: TelegramSession, notes: string) {
  return {
    text: [
      "Shift handover received.",
      `Zone: ${session.zone || "unassigned"}.`,
      `Notes: ${notes || "No notes supplied."}`,
    ].join("\n"),
    replyMarkup: buildTelegramMenu(session),
  };
}

export function parseCommandValue(text: string, command: string) {
  const raw = text.replace(command, "").trim();
  return raw.replace(/^[:\-\s]+/, "");
}

export function classifyReport(text: string) {
  const lower = text.toLowerCase();
  const critical = /(fire|injury|collapse|panic|stampede|weapon|fight|smoke|explosion|unattended baggage|bag)/i.test(lower);
  const warning = /(crowd|queue|delay|dense|congestion|blocked|slow|heat|noise|water)/i.test(lower);

  const emergency = critical ? "critical" : warning ? "warning" : "normal";
  const summary = critical
    ? "Critical field report detected. Escalating to security and emergency response."
    : warning
      ? "Operational concern detected. Crowd and routing agents should inspect this sector."
      : "Routine volunteer update logged.";
  const suggestion = critical
    ? "Trigger emergency broadcast, lock down the affected access path, and dispatch nearest response team."
    : warning
      ? "Monitor the zone closely and consider dynamic rerouting or steward support."
      : "No immediate intervention required. Keep logging periodic updates.";

  return { emergency, summary, suggestion };
}

export function buildReportMessage(session: TelegramSession, text: string) {
  const classified = classifyReport(text);

  return {
    text: [
      `Report captured from ${session.firstName}.`,
      `Zone: ${session.zone || "unassigned"}.`,
      `Severity: ${classified.emergency}.`,
      classified.summary,
      classified.suggestion,
    ].join("\n"),
    replyMarkup: buildTelegramMenu(session),
  };
}

export function deriveVolunteerSignal(text: string): VolunteerSignal {
  const lower = text.toLowerCase();
  const gateMatch = lower.match(/gate\s*([1-4])/i);
  const crowdIndicators = /(full|crowded|congested|congestion|packed|jammed|queue|line|overflow|bottleneck|rush)/i.test(lower);
  const threatIndicators = /(bag|backpack|weapon|fire|smoke|panic|fight|injury|explosion|attack|bomb|suspicious)/i.test(lower);

  if (gateMatch && crowdIndicators) {
    const gateId = gateMatch[1];
    const severe = /(full|packed|jammed|overflow|bottleneck|rush)/i.test(lower);

    return {
      kind: "gate_density",
      gateId,
      severity: severe ? "critical" : "warning",
      flowRate: severe ? 165 : 118,
      summary: severe
        ? `Gate ${gateId} reported as full. Crowd density marked critical and routing must be recalculated.`
        : `Gate ${gateId} crowd pressure is rising. Flow marked warning for closer monitoring.`,
      suggestion: severe
        ? "Trigger the crowd agent, reduce inflow, and divert incoming volunteers to the fallback gate."
        : "Keep monitoring the queue and prepare dynamic rerouting if density increases.",
    };
  }

  if (threatIndicators) {
    const severe = /(weapon|fire|smoke|panic|explosion|attack|bomb)/i.test(lower);
    return {
      kind: "security_threat",
      severity: severe ? "critical" : "warning",
      summary: severe
        ? "Security threat language detected. Escalate immediately to security and emergency agents."
        : "Potential security concern detected. Security agent should review the report.",
      suggestion: severe
        ? "Activate emergency response, isolate the area, and notify the security team."
        : "Ask the security agent to inspect the sector and confirm whether intervention is needed.",
    };
  }

  return {
    kind: "routine",
    summary: "Routine volunteer update logged.",
    suggestion: "Agents will review the report and continue monitoring the sector.",
  };
}

export function handleTelegramInboundText(session: TelegramSession, incomingText: string): TelegramInboundResult {
  const text = incomingText.trim();
  const command = text.toLowerCase().split(/\s+/)[0];

  if (command === "/start") {
    return {
      sessionPatch: {
        onboarded: false,
        authenticated: false,
        authStage: "awaiting_id",
        pendingVolunteerId: null,
        volunteerId: null,
        volunteerName: null,
        role: "volunteer",
        zone: null,
        lastCommand: "/start",
      },
      replyText: buildAuthIdPrompt().text,
      shouldQueue: false,
    };
  }

  if (!session.authenticated) {
    if (session.authStage === "awaiting_id") {
      return {
        sessionPatch: {
          pendingVolunteerId: text.toUpperCase(),
          authStage: "awaiting_pass",
          lastCommand: "volunteer_id",
        },
        replyText: buildAuthPassPrompt(text.toUpperCase()).text,
        shouldQueue: false,
      };
    }

    if (session.authStage === "awaiting_pass") {
      const volunteerId = session.pendingVolunteerId || "";
      const record = findVolunteerRecord(volunteerId, text);

      if (!record) {
        return {
          sessionPatch: {
            authStage: "awaiting_id",
            pendingVolunteerId: null,
            failedAuthAttempts: session.failedAuthAttempts + 1,
            lastCommand: "/start",
          },
          replyText: buildAuthFailureMessage().text,
          shouldQueue: false,
        };
      }

      const updatedSession = {
        ...session,
        volunteerId: record.volunteerId,
        volunteerName: record.displayName,
        role: record.role,
        zone: record.zone,
        onboarded: true,
        authenticated: true,
        authStage: "authenticated" as const,
        pendingVolunteerId: null,
        lastCommand: "/start",
      };

      return {
        sessionPatch: updatedSession,
        replyText: buildAuthSuccessMessage(updatedSession).text,
        replyMarkup: buildTelegramMenu(updatedSession),
        shouldQueue: false,
      };
    }

    return {
      sessionPatch: {
        authStage: "awaiting_id",
        lastCommand: null,
      },
      replyText: buildAuthRequiredMessage().text,
      shouldQueue: false,
    };
  }

  if (command === "/help") {
    return {
      sessionPatch: { lastCommand: "/help" },
      replyText: buildHelpMessage(session).text,
      replyMarkup: buildTelegramMenu(session),
      shouldQueue: false,
    };
  }

  if (command === "/status") {
    return {
      sessionPatch: { lastCommand: "/status" },
      replyText: buildStatusMessage(session).text,
      replyMarkup: buildTelegramMenu(session),
      shouldQueue: false,
    };
  }

  if (command === "/zone") {
    const zone = text.replace(/^\/zone/i, "").trim() || "A";
    const normalizedZone = zone.toUpperCase();
    const updatedSession = { ...session, zone: normalizedZone, lastCommand: "/zone" };
    return {
      sessionPatch: updatedSession,
      replyText: buildZoneAssignmentMessage(updatedSession, normalizedZone).text,
      replyMarkup: buildTelegramMenu(updatedSession),
      shouldQueue: false,
    };
  }

  if (command === "/handover") {
    const notes = text.replace(/^\/handover/i, "").trim() || "No notes supplied.";
    const updatedSession = { ...session, lastCommand: "/handover" };
    return {
      sessionPatch: updatedSession,
      replyText: buildShiftHandoverMessage(updatedSession, notes).text,
      replyMarkup: buildTelegramMenu(updatedSession),
      shouldQueue: false,
    };
  }

  const report = buildReportMessage(session, text);
  return {
    sessionPatch: { lastCommand: "report" },
    replyText: report.text,
    replyMarkup: report.replyMarkup,
    shouldQueue: true,
    queueText: text,
    simulationSignal: deriveVolunteerSignal(text),
  };
}