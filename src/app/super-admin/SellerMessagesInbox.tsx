"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { parseChatContent } from "@/lib/chat-content";

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

type SellerThread = {
  sellerId: string;
  sellerName: string | null;
  sellerEmail: string;
  messages: ChatMessage[];
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

function getErrorMessage(body: unknown, fallback: string) {
  return isRecord(body) && typeof body.error === "string"
    ? body.error
    : fallback;
}

export default function SellerMessagesInbox() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const optimisticSequence = useRef(0);
  const selectedMessages = selectedSellerId
    ? conversationMessages[selectedSellerId] ?? []
    : [];
  const isConversationLoading =
    selectedSellerId !== null &&
    !Object.hasOwn(conversationMessages, selectedSellerId);

  async function fetchMessages(sellerId?: string) {
    const url = sellerId
      ? `/api/chat/get?sellerId=${encodeURIComponent(sellerId)}`
      : "/api/chat/get";
    const response = await fetch(url, { cache: "no-store" });
    const body: unknown = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(body, "Unable to load seller messages."));
    }

    if (
      !isRecord(body) ||
      !Array.isArray(body.messages) ||
      !body.messages.every(isChatMessage)
    ) {
      throw new Error("The seller messages response was invalid.");
    }

    return body.messages;
  }

  async function loadMessages(sellerId?: string) {
    setError("");
    if (!sellerId) setIsLoading(true);

    try {
      const loadedMessages = await fetchMessages(sellerId);
      if (sellerId) {
        setConversationMessages((current) => ({
          ...current,
          [sellerId]: loadedMessages,
        }));
      }
      else setMessages(loadedMessages);
    } catch (loadError) {
      console.error("Seller messages load error:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load seller messages."
      );
    } finally {
      if (!sellerId) setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    let isPolling = false;

    fetchMessages()
      .then((loadedMessages) => {
        if (active) setMessages(loadedMessages);
      })
      .catch((loadError: unknown) => {
        if (active) {
          console.error("Seller messages load error:", loadError);
          setMessages([]);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const intervalId = window.setInterval(async () => {
      if (isPolling) return;
      isPolling = true;

      try {
        const latestMessages = await fetchMessages();
        if (active) setMessages(latestMessages);
      } catch (pollError) {
        console.error("Seller messages polling error:", pollError);
      } finally {
        isPolling = false;
      }
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!selectedSellerId) return;

    let active = true;
    let isPolling = false;

    const pollConversation = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const latestMessages = await fetchMessages(selectedSellerId);
        if (active) {
          setConversationMessages((current) => ({
            ...current,
            [selectedSellerId]: latestMessages,
          }));
        }
      } catch (pollError) {
        if (active) console.error("Seller conversation polling error:", pollError);
      } finally {
        isPolling = false;
      }
    };

    void pollConversation();
    const intervalId = window.setInterval(() => {
      void pollConversation();
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [selectedSellerId]);

  async function sendReply(
    event: FormEvent<HTMLFormElement>,
    sellerId: string
  ) {
    event.preventDefault();
    const message = drafts[sellerId]?.trim();
    if (!message) return;

    optimisticSequence.current += 1;
    const optimisticId = `optimistic-admin-${optimisticSequence.current}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      senderId: "optimistic-super-admin",
      receiverId: sellerId,
      message,
      isRead: false,
      createdAt: "",
      sender: { name: null, email: "", role: "SUPER_ADMIN" },
      receiver: { name: null, email: "", role: "SELLER" },
    };
    setMessages((current) => [...current, optimisticMessage]);
    setConversationMessages((current) => ({
      ...current,
      [sellerId]: [...(current[sellerId] ?? []), optimisticMessage],
    }));
    setDrafts((current) => ({ ...current, [sellerId]: "" }));
    setSendingTo(sellerId);
    setError("");

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: sellerId, message }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(body, "Unable to send reply."));
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
      setConversationMessages((current) => ({
        ...current,
        [sellerId]: [
          ...(current[sellerId] ?? []).filter((item) => item.id !== optimisticId),
          sentMessage,
        ],
      }));
      await Promise.all([loadMessages(), loadMessages(sellerId)]);
    } catch (sendError) {
      setMessages((current) =>
        current.filter((item) => item.id !== optimisticId)
      );
      setConversationMessages((current) => ({
        ...current,
        [sellerId]: (current[sellerId] ?? []).filter(
          (item) => item.id !== optimisticId
        ),
      }));
      setDrafts((current) => ({ ...current, [sellerId]: message }));
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send reply. Please try again."
      );
    } finally {
      setSendingTo(null);
    }
  }

  const threadMap = new Map<string, SellerThread>();
  for (const message of messages) {
    const sellerIsSender = message.sender.role === "SELLER";
    const sellerId = sellerIsSender ? message.senderId : message.receiverId;
    const seller = sellerIsSender ? message.sender : message.receiver;
    const thread = threadMap.get(sellerId) ?? {
      sellerId,
      sellerName: seller.name,
      sellerEmail: seller.email,
      messages: [],
    };
    thread.messages.push(message);
    threadMap.set(sellerId, thread);
  }

  const threads = Array.from(threadMap.values()).sort((first, second) =>
    (second.messages.at(-1)?.createdAt ?? "").localeCompare(
      first.messages.at(-1)?.createdAt ?? ""
    )
  );

  return (
    <section
      aria-labelledby="seller-messages-title"
      className="flex h-[calc(100dvh-120px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-xl sm:p-5"
    >
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className="text-xl font-bold text-white"
            id="seller-messages-title"
          >
            Seller Messages
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Private conversations between sellers and Super Admin.
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          onClick={() => {
            void loadMessages();
            if (selectedSellerId) void loadMessages(selectedSellerId);
          }}
          type="button"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p
          className="mb-3 shrink-0 rounded-lg border border-red-400/30 bg-red-950/50 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.8fr)_2fr] overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60">
        <nav
          aria-label="Seller conversations"
          className="min-h-0 overflow-y-auto border-r border-slate-700"
        >
          {isLoading ? (
            <p className="p-4 text-sm text-slate-400">Loading sellers...</p>
          ) : threads.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No messages yet</p>
          ) : (
            threads.map((thread) => (
              <button
                aria-pressed={selectedSellerId === thread.sellerId}
                className={`block w-full border-b border-slate-800 px-4 py-4 text-left transition hover:bg-slate-800/80 ${
                  selectedSellerId === thread.sellerId ? "bg-slate-800" : ""
                }`}
                key={thread.sellerId}
                onClick={() => setSelectedSellerId(thread.sellerId)}
                type="button"
              >
                <span className="block truncate font-semibold text-white">
                  {thread.sellerName || "Seller"}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-400">
                  {thread.sellerEmail}
                </span>
              </button>
            ))
          )}
        </nav>

        {!selectedSellerId ? (
          <div className="flex min-h-0 items-center justify-center p-4 text-center text-sm text-slate-400">
            Select a conversation to start chatting
          </div>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-col">
            {(() => {
              const selectedThread = threads.find(
                (thread) => thread.sellerId === selectedSellerId
              );
              const selectedSeller = selectedThread ?? {
                sellerName: null,
                sellerEmail: "",
              };
              return (
                <>
                  <header className="shrink-0 border-b border-slate-700 px-4 py-3">
                    <p className="font-semibold text-white">
                      {selectedSeller.sellerName || "Seller"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {selectedSeller.sellerEmail}
                    </p>
                  </header>
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                    {isConversationLoading && selectedMessages.length === 0 ? (
                      <p className="text-sm text-slate-400">Loading conversation...</p>
                    ) : selectedMessages.length === 0 ? (
                      <p className="text-center text-sm text-slate-400">
                        No messages in this conversation yet.
                      </p>
                    ) : (
                      selectedMessages.map((message) => {
                        const isOwnMessage = message.sender.role === "SUPER_ADMIN";
                        const content = parseChatContent(message.message);
                        return (
                          <div
                            className={`max-w-[92%] rounded-xl px-3 py-2.5 text-sm ${
                              isOwnMessage
                                ? "ml-auto bg-indigo-600 text-white"
                                : "bg-slate-800 text-slate-100"
                            }`}
                            key={message.id}
                          >
                            <p className="mb-1 text-[11px] font-semibold opacity-70">
                              {isOwnMessage ? "You" : "Seller"}
                            </p>
                            {content.text && (
                              <p className="whitespace-pre-wrap break-words">
                                {content.text}
                              </p>
                            )}
                            {content.imageDataUrl && (
                              <Image
                                alt="Seller payment slip"
                                className="mt-2 h-auto max-h-60 w-full max-w-sm rounded-lg object-contain"
                                height={360}
                                src={content.imageDataUrl}
                                unoptimized
                                width={480}
                              />
                            )}
                            <time className="mt-2 block text-[10px] opacity-65">
                              {new Date(message.createdAt).toLocaleString()}
                            </time>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <form
                    className="grid shrink-0 gap-2 border-t border-slate-700 p-3"
                    onSubmit={(event) => void sendReply(event, selectedSellerId)}
                  >
                    <label className="sr-only" htmlFor={`reply-${selectedSellerId}`}>
                      Reply to {selectedSeller.sellerName || selectedSeller.sellerEmail}
                    </label>
                    <textarea
                      className="w-full resize-y rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400"
                      id={`reply-${selectedSellerId}`}
                      maxLength={4000}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [selectedSellerId]: event.target.value,
                        }))
                      }
                      placeholder="Write a reply..."
                      required
                      rows={2}
                      value={drafts[selectedSellerId] ?? ""}
                    />
                    <button
                      className="justify-self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
                      disabled={
                        sendingTo !== null || !drafts[selectedSellerId]?.trim()
                      }
                      type="submit"
                    >
                      {sendingTo === selectedSellerId ? "Sending..." : "Reply"}
                    </button>
                  </form>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </section>
  );
}
