"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatChatContent, parseChatContent } from "@/lib/chat-content";

type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender: { name: string | null; email: string; role: string };
  receiver: { name: string | null; email: string; role: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.senderId === "string" &&
    typeof value.receiverId === "string" &&
    typeof value.message === "string" &&
    typeof value.isRead === "boolean" &&
    typeof value.createdAt === "string" &&
    isRecord(value.sender) &&
    (typeof value.sender.name === "string" || value.sender.name === null) &&
    typeof value.sender.email === "string" &&
    typeof value.sender.role === "string" &&
    isRecord(value.receiver) &&
    (typeof value.receiver.name === "string" || value.receiver.name === null) &&
    typeof value.receiver.email === "string" &&
    typeof value.receiver.role === "string"
  );
}

function errorFrom(body: unknown, fallback: string) {
  return isRecord(body) && typeof body.error === "string"
    ? body.error
    : fallback;
}

export default function SellerCustomerSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const optimisticSequence = useRef(0);
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  async function loadMessages() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat/get", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        throw new Error(errorFrom(body, "Unable to load messages."));
      }

      if (
        !isRecord(body) ||
        !Array.isArray(body.messages) ||
        !body.messages.every(isChatMessage)
      ) {
        throw new Error("The messages response was invalid.");
      }

      setMessages(body.messages);
    } catch (loadError) {
      console.error("Customer Support message load error:", loadError);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    let isPolling = false;
    const intervalId = window.setInterval(async () => {
      if (isPolling) return;
      isPolling = true;

      try {
        const response = await fetch("/api/chat/get", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const body: unknown = await response.json();

        if (!response.ok || !isRecord(body) || !Array.isArray(body.messages)) {
          throw new Error("Unable to refresh Customer Support messages.");
        }

        const latestMessages = body.messages.filter(isChatMessage);
        if (latestMessages.length !== body.messages.length) {
          throw new Error("Customer Support returned invalid messages.");
        }

        if (active) setMessages(latestMessages);
      } catch (pollError) {
        console.error("Customer Support polling error:", pollError);
      } finally {
        isPolling = false;
      }
    }, 10_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isOpen]);

  async function openSupport() {
    setIsOpen(true);
    await loadMessages();
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() && !imageDataUrl) return;

    const message = draft.trim();
    const attachedImage = imageDataUrl;
    const messageContent = formatChatContent(message, attachedImage ?? undefined);
    optimisticSequence.current += 1;
    const optimisticId = `optimistic-seller-${optimisticSequence.current}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      senderId: "optimistic-seller",
      receiverId: "optimistic-super-admin",
      message: messageContent,
      isRead: false,
      createdAt: "",
      sender: { name: null, email: "", role: "SELLER" },
      receiver: { name: null, email: "", role: "SUPER_ADMIN" },
    };
    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");
    setImageDataUrl(null);
    setIsSending(true);
    setError("");

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          ...(attachedImage ? { imageDataUrl: attachedImage } : {}),
        }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        throw new Error(errorFrom(body, "Unable to send message."));
      }

      if (!isRecord(body)) {
        throw new Error("The sent message response was invalid.");
      }
      const sentMessage = body.chatMessage;
      if (!isChatMessage(sentMessage)) {
        throw new Error("The sent message response was invalid.");
      }

      setMessages((current) => [
        ...current.filter((item) => item.id !== optimisticId),
        sentMessage,
      ]);
      await loadMessages();
    } catch (sendError) {
      setMessages((current) =>
        current.filter((item) => item.id !== optimisticId)
      );
      setDraft(message);
      setImageDataUrl(attachedImage);
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send message. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {isOpen && (
        <section
          aria-label="Customer Support chat"
          className="mb-3 flex h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-indigo-700 px-4 py-3 text-white">
            <div>
              <h2 className="font-bold">Customer Support</h2>
              <p className="text-xs text-indigo-100">We’re here to help</p>
            </div>
            <button
              aria-label="Close Customer Support"
              className="grid size-9 place-items-center rounded-lg text-xl transition hover:bg-white/15"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>

          <div
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4"
          >
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="rounded-xl bg-white p-3 text-sm text-slate-600 shadow-sm">
                No messages yet. Start a conversation.
              </p>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender.role === "SELLER";
                const content = parseChatContent(message.message);
                return (
                  <article
                    className={`max-w-[90%] rounded-xl px-3 py-2.5 text-sm shadow-sm ${
                      isOwnMessage
                        ? "ml-auto bg-indigo-600 text-white"
                        : "bg-white text-slate-800"
                    }`}
                    key={message.id}
                  >
                    {content.text && (
                      <p className="whitespace-pre-wrap break-words">
                        {content.text}
                      </p>
                    )}
                    {content.imageDataUrl && (
                      <Image
                        alt="Payment slip attachment"
                        className="mt-2 h-auto max-h-60 w-full max-w-sm rounded-lg object-contain"
                        height={360}
                        src={content.imageDataUrl}
                        unoptimized
                        width={480}
                      />
                    )}
                    <time className="mt-1.5 block text-[10px] opacity-70">
                      {new Date(message.createdAt).toLocaleString()}
                    </time>
                  </article>
                );
              })
            )}
          </div>

          {error && (
            <p
              className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <form
            className="grid gap-2 border-t border-slate-200 p-3"
            onSubmit={sendMessage}
          >
            <label className="sr-only" htmlFor="support-message">
              Message Customer Support
            </label>
            <div className="flex items-end gap-2">
              <textarea
                className="min-w-0 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                id="support-message"
                maxLength={4000}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type your message..."
                rows={2}
                value={draft}
              />
              <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    setError("Choose an image smaller than 2 MB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") {
                      setImageDataUrl(reader.result);
                      setError("");
                    } else {
                      setError("Unable to read this image.");
                    }
                  };
                  reader.onerror = () => setError("Unable to read this image.");
                  reader.readAsDataURL(file);
                }}
                ref={imageInput}
                type="file"
              />
              <button
                aria-label="Attach payment slip image"
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-300 text-xl text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                disabled={isSending}
                onClick={() => imageInput.current?.click()}
                title="Attach/upload image"
                type="button"
              >
                📎
              </button>
              <button
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                disabled={isSending || (!draft.trim() && !imageDataUrl)}
                type="submit"
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
            {imageDataUrl && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 p-2 text-xs text-slate-600">
                <span>Payment slip image attached</span>
                <button
                  className="font-semibold text-red-600 hover:text-red-700"
                  onClick={() => setImageDataUrl(null)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            )}
          </form>
        </section>
      )}

      <button
        className="ml-auto flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            void openSupport();
          }
        }}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            d="M7 9h10M7 13h6m-1 7-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Customer Support
      </button>
    </div>
  );
}
