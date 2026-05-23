import { NextResponse } from "next/server";
import { TelegramReplyMarkup } from "@/lib/telegram/advanced";

export async function POST(req: Request) {
  try {
    const { chatId, text, replyMarkup } = await req.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.warn("[Telegram Send API] Bot Token is not configured in environment variables.");
      return NextResponse.json({ success: false, error: "Telegram Bot Token is not configured." }, { status: 500 });
    }

    if (!chatId || !text) {
      return NextResponse.json({ success: false, error: "Missing chatId or text." }, { status: 400 });
    }

    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(replyMarkup ? { reply_markup: replyMarkup as TelegramReplyMarkup } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Telegram Send API] Failed to send message to Telegram:", errText);
      return NextResponse.json({ success: false, error: errText }, { status: res.status });
    }

    console.log(`[Telegram Send API] Successfully pushed AI reply back to Telegram Chat ID ${chatId}`);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Telegram Send API] Exception occurred:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
