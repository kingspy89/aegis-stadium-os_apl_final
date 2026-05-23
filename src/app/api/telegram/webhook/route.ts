import { NextResponse } from "next/server";
import { getTelegramSession, updateTelegramSession, buildAuthRequiredMessage, buildTelegramMenu } from "@/lib/telegram/advanced";
import { handleTelegramInboundText } from "@/lib/telegram/inbound";

function getTelegramSendUrl(token: string) {
  return `https://api.telegram.org/bot${token}/sendMessage`;
}

async function sendTelegramReply(token: string, chatId: number, text: string, replyMarkup?: ReturnType<typeof buildTelegramMenu>) {
  await fetch(getTelegramSendUrl(token), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  }).catch((err: unknown) => console.error("[Telegram Webhook] Failed to send Telegram reply:", err));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!token) {
      console.warn("[Telegram Webhook] Bot Token not configured in environment.");
      return NextResponse.json({ success: true, warning: "Telegram token missing" });
    }

    const message = body.message;
    if (!message) {
      return NextResponse.json({ success: true });
    }

    const chatId = message.chat.id;
    const session = getTelegramSession(message.chat);
    console.log(`[Telegram Webhook] Received message from ${session.username} (Chat: ${chatId})`);

    let text = message.text?.trim() || "";
    let voiceUrl: string | undefined;
    let photoUrl: string | undefined;
    let fileId: string | undefined;
    let fileType: "voice" | "photo" | "text" = "text";

    if (message.voice) {
      fileId = message.voice.file_id;
      fileType = "voice";
    } else if (message.photo && message.photo.length > 0) {
      fileId = message.photo[message.photo.length - 1].file_id;
      fileType = "photo";
    }

    if (!session.authenticated && fileId) {
      const authPrompt = buildAuthRequiredMessage();
      await sendTelegramReply(token, chatId, authPrompt.text);
      updateTelegramSession(chatId, { authStage: "awaiting_id", lastCommand: "/start" });
      return NextResponse.json({ success: true, authRequired: true });
    }

    if (fileId) {
      if (apiKey) {
        try {
          const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
          const fileData = await fileRes.json();
          const filePath = fileData.result?.file_path;

          if (filePath) {
            const mediaRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
            const arrayBuffer = await mediaRes.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString("base64");
            const prompt = fileType === "voice"
              ? "You are the Aegis central voice command transcription system. Transcribe this audio message sent by a stadium field volunteer. Output ONLY the clean, word-for-word text transcript of their spoken words. Do not add external explanations, brackets, or notes. If there is background noise, ignore it."
              : "You are the Aegis Multimodal Security vision agent. Analyze this image sent by a field volunteer at the Narendra Modi Stadium. Highlight any crowd surges, congestion bottleneck risks, emergencies, or suspicious/unattended baggage. Explain what you see in 1 or 2 concise sentences for stadium security dashboard.";
            const mimeType = fileType === "voice" ? "audio/ogg" : "image/jpeg";
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const geminiRes = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { inlineData: { mimeType, data: base64Data } },
                    { text: prompt },
                  ],
                }],
              }),
            });

            if (geminiRes.ok) {
              const data = await geminiRes.json();
              const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (fileType === "voice") {
                text = resultText.trim();
                voiceUrl = "true";
              } else {
                text = resultText.trim();
                photoUrl = "/images/suspicious_bag.jpg";
              }
            } else {
              text = fileType === "voice"
                ? "Voice note received but transcription failed."
                : "Photo received but image analysis failed.";
            }
          }
        } catch (error: unknown) {
          console.error("[Telegram Webhook] Failed to process media attachment:", error);
          text = fileType === "voice" ? "Voice note processing error." : "Photo processing error.";
        }
      } else {
        text = fileType === "voice"
          ? "Voice note received. Transcription is unavailable because GEMINI_API_KEY is missing."
          : "Photo received. Analysis is unavailable because GEMINI_API_KEY is missing.";
      }
    }

    const inbound = await handleTelegramInboundText(session, text || message.text || "");
    if (inbound.sessionPatch) {
      updateTelegramSession(chatId, inbound.sessionPatch);
    }

    const updatedSession = getTelegramSession(message.chat);

    console.log(`[Telegram Webhook] Session state for chat ${chatId}: auth=${updatedSession.authenticated ? "yes" : "no"}, stage=${updatedSession.authStage}, user=${updatedSession.volunteerName || updatedSession.firstName}, zone=${updatedSession.zone || "unassigned"}`);

    if (!updatedSession.authenticated) {
      await sendTelegramReply(token, chatId, inbound.replyText, inbound.replyMarkup);
      return NextResponse.json({ success: true, authFlow: true });
    }

    if (!inbound.shouldQueue) {
      await sendTelegramReply(token, chatId, inbound.replyText, inbound.replyMarkup);
      return NextResponse.json({ success: true, sent: true });
    }

    if (inbound.simulationSignal?.kind === "gate_density") {
      console.log(`[Telegram Webhook] Structured gate report queued: ${inbound.queueText}`);
    }

    globalThis.telegramQueue = globalThis.telegramQueue || [];
    const messagePayload = {
      id: Math.random().toString(),
      sender: "Volunteer" as const,
      text: inbound.queueText || text || "Nominal status report check.",
      voiceUrl,
      photoUrl,
      timestamp: new Date().toTimeString().split(" ")[0],
      chatId,
      replyMarkup: inbound.replyMarkup,
    };
    globalThis.telegramQueue.push(messagePayload);
    console.log(`[Telegram Webhook] Queued authenticated volunteer report from Chat ${chatId}: ${messagePayload.text}`);

    return NextResponse.json({ success: true, queued: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Telegram Webhook] Route handler error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
