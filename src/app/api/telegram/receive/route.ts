import { NextResponse } from "next/server";
import {
  buildAuthRequiredMessage,
  buildTelegramMenu,
  getTelegramSession,
  handleTelegramInboundText,
  updateTelegramSession,
} from "@/lib/telegram/advanced";

interface TelegramUpdateMessage {
  chat: {
    id: number;
    username?: string;
    first_name?: string;
  };
  from: {
    username?: string;
    first_name?: string;
  };
  text?: string;
  date: number;
  voice?: { file_id: string };
  photo?: Array<{ file_id: string }>;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramUpdateMessage;
}

let lastUpdateId = 0;

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
  }).catch((err: unknown) => console.error("[Telegram Receive] Failed to send Telegram reply:", err));
}

export async function GET() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!token) {
      return NextResponse.json({ error: "Telegram Bot Token not configured" }, { status: 500 });
    }

    const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json({ error: "Failed to fetch from Telegram" }, { status: 500 });
    }

    const updates = (data.result || []) as TelegramUpdate[];
    const messages: Array<Record<string, unknown>> = [];

    for (const update of updates) {
      if (update.update_id > lastUpdateId) {
        lastUpdateId = update.update_id;
      }

      const message = update.message;
      if (!message) {
        continue;
      }

      const session = getTelegramSession(message.chat);
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
        await sendTelegramReply(token, message.chat.id, authPrompt.text);
        updateTelegramSession(message.chat.id, { authStage: "awaiting_id", lastCommand: "/start" });
        continue;
      }

      if (fileId && apiKey) {
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
              const geminiData = await geminiRes.json();
              const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
              text = resultText.trim();
              if (fileType === "voice") {
                voiceUrl = "true";
              } else {
                photoUrl = "/images/suspicious_bag.jpg";
              }
            }
          }
        } catch (error: unknown) {
          console.error("[Telegram Receive] Media processing failed:", error);
        }
      }

      const inbound = handleTelegramInboundText(session, text || message.text || "");
      if (inbound.sessionPatch) {
        updateTelegramSession(message.chat.id, inbound.sessionPatch);
      }

      const updatedSession = getTelegramSession(message.chat);

      if (!updatedSession.authenticated) {
        await sendTelegramReply(token, message.chat.id, inbound.replyText, inbound.replyMarkup);
        continue;
      }

      if (!inbound.shouldQueue) {
        await sendTelegramReply(token, message.chat.id, inbound.replyText, inbound.replyMarkup);
        continue;
      }

      messages.push({
        id: Math.random().toString(),
        chatId: message.chat.id,
        username: message.from.username || message.from.first_name || "Volunteer",
        text: inbound.queueText || text,
        date: message.date,
        voiceUrl,
        photoUrl,
        replyMarkup: inbound.replyMarkup,
      });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching Telegram updates:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}