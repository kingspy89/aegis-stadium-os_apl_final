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
      kind: "threat_detected";
      location: string;
      severity: "critical";
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
      [
        { text: "Logout", callback_data: "menu:logout" },
      ],
    ],
  };
}

export function resetTelegramSession(session: TelegramSession) {
  const resetSession: TelegramSession = {
    ...session,
    volunteerId: null,
    volunteerName: null,
    role: defaultRole,
    zone: null,
    onboarded: false,
    authenticated: false,
    authStage: "idle",
    pendingVolunteerId: null,
    failedAuthAttempts: 0,
    lastCommand: "/logout",
    lastSeen: getTimestamp(),
  };

  globalThis.telegramSessions = globalThis.telegramSessions || new Map<number, TelegramSession>();
  globalThis.telegramSessions.set(session.chatId, resetSession);
  return resetSession;
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
      "You can now submit live gate reports. Try: 'Gate 1 is full' or 'Gate 2 congestion rising'.",
      "Send /logout any time to sign out.",
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
      "/report <details> - submit a gate flow update",
      "/status - show your current session state",
      "/zone <A|B|C|D> - assign your active sector",
      "/handover <notes> - send a shift handover summary",
      `Current zone: ${session.zone || "unassigned"}`,
      "Gate reports are limited to Gate 1, Gate 2, Gate 3, and Gate 4.",
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

export function buildLogoutMessage(session: TelegramSession) {
  return {
    text: [
      `You have been signed out, ${session.volunteerName || session.firstName}.`,
      "Send /start to authenticate again.",
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
  
  const gateMatch = lower.match(/gate\s*([1-4a-d])/i);
  const rawGate = gateMatch ? gateMatch[1].toUpperCase() : "Unknown";
  const gateId = rawGate === "A" ? "1" : rawGate === "B" ? "2" : rawGate === "C" ? "3" : rawGate === "D" ? "4" : rawGate;
  const gateLabel = gateId !== "Unknown" ? `Gate ${gateId}` : "Unknown location";

  const threatIndicators = /(bag|baggage|weapon|gun|knife|bomb|explosive|unattended|suspicious|fight|riot)/i.test(lower);
  if (threatIndicators) {
    return {
      kind: "threat_detected",
      location: gateLabel,
      severity: "critical",
      summary: `Potential threat reported at ${gateLabel}.`,
      suggestion: "Trigger Security Agent immediately. Lock down the affected zone, broadcast alerts, and dispatch security teams.",
    };
  }

  const crowdIndicators = /(full|crowded|congested|congestion|packed|jammed|queue|line|overflow|bottleneck|rush)/i.test(lower);

  if (gateMatch && crowdIndicators) {
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

  return {
    kind: "routine",
    summary: "Update logged. No gate pressure change detected.",
    suggestion: "Use explicit gate flow language like 'Gate 3 is full' to update the simulation.",
  };
}
