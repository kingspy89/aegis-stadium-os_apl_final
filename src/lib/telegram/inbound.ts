import {
  buildAuthFailureMessage,
  buildAuthIdPrompt,
  buildAuthPassPrompt,
  buildAuthRequiredMessage,
  buildAuthSuccessMessage,
  buildHelpMessage,
  buildLogoutMessage,
  buildReportMessage,
  buildShiftHandoverMessage,
  buildStatusMessage,
  buildTelegramMenu,
  buildZoneAssignmentMessage,
  deriveVolunteerSignal,
  resetTelegramSession,
  type TelegramInboundResult,
  type TelegramSession,
} from "./advanced";
import { findVolunteerRecord, syncVolunteerFirebaseAuth } from "./volunteerDatabase";

export async function handleTelegramInboundText(session: TelegramSession, incomingText: string): Promise<TelegramInboundResult> {
  const text = incomingText.trim();
  const command = text.toLowerCase().split(/\s+/)[0];

  if (command === "/start") {
    console.log(`[Telegram Auth] Chat ${session.chatId}: starting volunteer auth for ${session.username}.`);
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
      const record = await findVolunteerRecord(volunteerId, text);

      if (!record) {
        console.log(`[Telegram Auth] Chat ${session.chatId}: failed login for volunteer ID ${volunteerId}.`);
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

      console.log(`[Telegram Auth] Chat ${session.chatId}: authenticated ${record.displayName} (${record.volunteerId}) in zone ${record.zone || "unassigned"}.`);
      void syncVolunteerFirebaseAuth(record);

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

  if (command === "/logout" || command === "/signout") {
    const resetSession = resetTelegramSession(session);
    console.log(`[Telegram Auth] Chat ${session.chatId}: ${session.volunteerName || session.firstName} logged out.`);
    return {
      sessionPatch: resetSession,
      replyText: buildLogoutMessage(resetSession).text,
      replyMarkup: buildTelegramMenu(resetSession),
      shouldQueue: false,
    };
  }

  const threatKeywords = /(bag|baggage|weapon|gun|knife|bomb|explosive|unattended|suspicious|fight|riot)/i;
  if (!text.toLowerCase().includes("gate") && !threatKeywords.test(text.toLowerCase())) {
    return {
      sessionPatch: { lastCommand: "report" },
      replyText: "Please send a valid location report, such as 'Gate 2 is full' or 'Suspicious bag at Gate A'.",
      replyMarkup: buildTelegramMenu(session),
      shouldQueue: false,
    };
  }

  const signal = deriveVolunteerSignal(text);
  let structuredText = "";

  if (signal.kind === "gate_density") {
    structuredText = [
        `Volunteer: ${session.volunteerName || session.firstName}`,
        `Location: Gate ${signal.gateId}`,
        `Problem: ${signal.summary}`,
        `Solution: ${signal.suggestion}`,
    ].join(" | ");
    console.log(`[Telegram Gate Report] ${session.volunteerName || session.firstName} | Gate ${signal.gateId} | ${signal.summary} | ${signal.suggestion}`);
  } else if (signal.kind === "threat_detected") {
    structuredText = [
        `Volunteer: ${session.volunteerName || session.firstName}`,
        `Location: ${signal.location}`,
        `Problem: ${signal.summary}`,
        `Solution: ${signal.suggestion}`,
    ].join(" | ");
    console.log(`[Telegram Threat Alert] ${session.volunteerName || session.firstName} | ${signal.location} | ${signal.summary} | ${signal.suggestion}`);
  } else {
    structuredText = buildReportMessage(session, text).text;
    console.log(`[Telegram Report] ${session.volunteerName || session.firstName} | ${text}`);
  }

  const report = buildReportMessage(session, text);

  return {
    sessionPatch: { lastCommand: "report" },
    replyText: structuredText,
    replyMarkup: report.replyMarkup,
    shouldQueue: true,
    queueText: structuredText,
    simulationSignal: signal,
  };
}