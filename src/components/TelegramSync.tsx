"use client";

import { useEffect, useRef } from "react";
import { AegisStore } from "@/lib/store/stateStore";

export default function TelegramSync() {
  const isPolling = useRef(false);

  useEffect(() => {
    // Only run polling on the client side
    if (typeof window === "undefined") return;

    const pollTelegram = async () => {
      if (isPolling.current) return;
      isPolling.current = true;

      try {
        const res = await fetch("/api/telegram/receive");
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            // Push new messages into the store
            for (const msg of data.messages) {
              // Add to store with a flag or just as a normal text message
              AegisStore.addVolunteerMessage(
                `[Telegram - ${msg.username}]: ${msg.text}`
              );

              // We also want to store the chatId so our AI can reply back to this exact chat
              // We'll store it globally on the window object for simplicity in this demo
              // so `stateStore` can access it later.
              const telegramWindow = window as Window & { lastTelegramChatId?: number };
              telegramWindow.lastTelegramChatId = msg.chatId;
            }
          }
        }
      } catch (err) {
        console.error("Telegram polling error:", err);
      } finally {
        isPolling.current = false;
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(pollTelegram, 3000);
    return () => clearInterval(interval);
  }, []);

  return null; // This is a headless component
}
