"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { parseChatContent } from "@/lib/chat-content";
import { formatINR } from "../../lib/currency";

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

type SellerAssignment = {
  id: string;
  status: "PENDING" | "COMPLETE";
  isPaid: boolean;
  isApproved: boolean;
  priceSetByAdmin: number;
  profitAmount: number;
  order: {
    id: string;
    status: string;
    customerName: string | null;
    items: { id: string; productName: string; quantity: number }[];
  };
};

export default function SellerAssignments({
  assignments,
}: {
  assignments: SellerAssignment[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [chatAssignment, setChatAssignment] = useState<SellerAssignment | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [approvedAssignmentIds, setApprovedAssignmentIds] = useState<string[]>(
    []
  );

  function getErrorMessage(body: unknown, fallback: string) {
    return typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
      ? body.error
      : fallback;
  }

  async function loadMessages() {
    setIsLoadingMessages(true);
    setError("");

    try {
      const response = await fetch("/api/chat/get", { cache: "no-store" });
      const body: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(body, "Unable to load messages."));
      }

      if (
        typeof body !== "object" ||
        body === null ||
        !("messages" in body) ||
        !Array.isArray(body.messages)
      ) {
        throw new Error("The messages response was invalid.");
      }

      if (!body.messages.every(isChatMessage)) {
        throw new Error("The messages response was invalid.");
      }

      setMessages(body.messages);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load messages."
      );
    } finally {
      setIsLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (!chatAssignment) return;

    let active = true;
    let isPolling = false;
    const intervalId = window.setInterval(async () => {
      if (isPolling) return;
      isPolling = true;

      try {
        const response = await fetch("/api/chat/get", { cache: "no-store" });
        const body: unknown = await response.json();
        if (
          !response.ok ||
          typeof body !== "object" ||
          body === null ||
          !("messages" in body) ||
          !Array.isArray(body.messages) ||
          !body.messages.every(isChatMessage)
        ) {
          throw new Error("Unable to refresh chat messages.");
        }

        if (active) setMessages(body.messages);
      } catch (pollError) {
        console.error("Seller order chat polling error:", pollError);
      } finally {
        isPolling = false;
      }
    }, 10_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [chatAssignment]);

  useEffect(() => {
    let active = true;
    let isPolling = false;

    async function loadApprovals() {
      if (isPolling) return;
      isPolling = true;
      try {
        const response = await fetch("/api/seller/assignments/approval", {
          cache: "no-store",
        });
        const body: unknown = await response.json();
        if (
          !response.ok ||
          typeof body !== "object" ||
          body === null ||
          !("approvedAssignmentIds" in body) ||
          !Array.isArray(body.approvedAssignmentIds) ||
          !body.approvedAssignmentIds.every(
            (id): id is string => typeof id === "string"
          )
        ) {
          throw new Error("Unable to refresh assignment approvals.");
        }
        if (active) setApprovedAssignmentIds(body.approvedAssignmentIds);
      } catch (approvalError) {
        console.error("Seller assignment approval polling error:", approvalError);
      } finally {
        isPolling = false;
      }
    }

    void loadApprovals();
    const intervalId = window.setInterval(() => void loadApprovals(), 10_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  function openChat(assignment: SellerAssignment) {
    setChatAssignment(assignment);
    setMessageDraft("");
    setMessages([]);
    void loadMessages();
  }

  async function pickOrder(assignmentId: string) {
    setPendingId(assignmentId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/seller/pick-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });

      const body: unknown = await response.json();
      const message =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
          ? body.error
          : "Unable to pick this order.";

      if (!response.ok) {
        throw new Error(message);
      }

      setSuccess(
        "Payment confirmed. Your order will be delivered within 7 days."
      );
      router.refresh();
    } catch (pickError) {
      setError(
        pickError instanceof Error
          ? pickError.message
          : "Unable to pick this order. Please try again."
      );
    } finally {
      setPendingId(null);
    }
  }

  async function sendPaymentDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatAssignment || !messageDraft.trim()) return;

    setIsSendingMessage(true);
    setError("");

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: chatAssignment.id,
          message: `Payment details for order ${chatAssignment.order.id}: ${messageDraft.trim()}`,
        }),
      });

      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(body, "Unable to send payment details.")
        );
      }

      setMessageDraft("");
      setChatAssignment({ ...chatAssignment, isPaid: true });
      router.refresh();
      await loadMessages();
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Unable to send payment details. Please try again."
      );
    } finally {
      setIsSendingMessage(false);
    }
  }

  return (
    <section aria-label="Assigned orders">
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-400/30 bg-red-950/60 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200"
        >
          {success}
        </p>
      )}

      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-6 py-14 text-center shadow-xl backdrop-blur-md">
          <h2 className="text-lg font-semibold text-white">No orders yet</h2>
          <p className="mt-2 text-sm text-slate-300">
            Orders assigned to you will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => {
            const payAmount =
              Math.round((assignment.priceSetByAdmin * 0.8 + Number.EPSILON) * 100) /
              100;
            const profitAmount = assignment.profitAmount;
            const isApproved = assignment.order.status === "APPROVED";
            const canPay =
              assignment.status === "PENDING" &&
              !assignment.isPaid &&
              !isApproved;
            const canPick =
              assignment.status === "PENDING" &&
              assignment.isPaid &&
              !isApproved &&
              (assignment.isApproved ||
                approvedAssignmentIds.includes(assignment.id));
            const waitingForAdminApproval =
              assignment.status === "PENDING" &&
              assignment.isPaid &&
              !isApproved &&
              !assignment.isApproved &&
              !approvedAssignmentIds.includes(assignment.id);
            const displayStatus = isApproved
              ? "APPROVED"
              : assignment.status === "COMPLETE"
                ? "ORDER PROCESSING"
                : "PENDING";

            return (
              <article
                key={assignment.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/75 p-5 text-slate-100 shadow-[0_16px_40px_rgba(2,6,23,0.35)] backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-sky-300/30"
              >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Order ID
                  </p>
                  <h2 className="mt-1 break-all text-sm font-semibold text-white">
                    {assignment.order.id}
                  </h2>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    displayStatus === "PENDING"
                      ? "bg-amber-300/15 text-amber-200"
                      : displayStatus === "APPROVED"
                        ? "bg-emerald-300/15 text-emerald-200"
                        : displayStatus === "ORDER PROCESSING"
                          ? "bg-blue-300/15 text-blue-200"
                          : "bg-slate-700 text-slate-200"
                  }`}
                >
                  {displayStatus}
                </span>
              </div>

              <dl className="mt-5 grid gap-4 text-sm">
                <div className="border-t border-white/10 pt-3">
                  <dt className="font-medium text-slate-400">Customer</dt>
                  <dd className="mt-1 text-slate-100">
                    {assignment.order.customerName || "N/A"}
                  </dd>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <dt className="font-medium text-slate-400">Products</dt>
                  <dd className="mt-1 space-y-1 text-slate-100">
                    {assignment.order.items.length > 0 ? (
                      assignment.order.items.map((item) => (
                        <p className="flex justify-between gap-3" key={item.id}>
                          <span>{item.productName}</span>
                          <span className="shrink-0 text-slate-400">× {item.quantity}</span>
                        </p>
                      ))
                    ) : (
                      <p>N/A</p>
                    )}
                  </dd>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <div>
                    <dt className="font-medium text-slate-400">Price</dt>
                    <dd className="mt-1 font-semibold text-white">
                      {formatINR(assignment.priceSetByAdmin)}
                    </dd>
                  </div>
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <dt className="font-medium text-slate-400">Profit (20%)</dt>
                    <dd className="mt-1 font-semibold text-emerald-300">
                      {formatINR(profitAmount)}
                    </dd>
                  </div>
                </div>
              </dl>

              {canPay && (
                <button
                  type="button"
                  disabled={pendingId !== null || isSendingMessage}
                  onClick={() => openChat(assignment)}
                  className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Pay Amount ({formatINR(payAmount)})
                </button>
              )}
              {(canPick || waitingForAdminApproval) && (
                  <button
                    type="button"
                    disabled={pendingId !== null || waitingForAdminApproval}
                    onClick={() => void pickOrder(assignment.id)}
                    className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingId === assignment.id
                      ? "Picking..."
                      : waitingForAdminApproval
                        ? "Waiting for Customer Support approval"
                        : "Pick Order"}
                  </button>
                )}
              {assignment.isPaid && (
                <button
                  type="button"
                  onClick={() => openChat(assignment)}
                  className="mt-3 w-full rounded-xl border border-sky-300/30 bg-gradient-to-r from-slate-800 to-indigo-950 px-4 py-2.5 text-sm font-semibold text-sky-100 shadow-lg shadow-slate-950/30 transition hover:border-sky-200/60 hover:from-slate-700 hover:to-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                >
                  Customer Support
                </button>
              )}
              {assignment.status === "COMPLETE" && !isApproved && (
                <p className="mt-4 text-center text-xs font-medium text-slate-400">
                  Your order is being processed.
                </p>
              )}
              </article>
            );
          })}
        </div>
      )}

      {chatAssignment && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSendingMessage) {
              setChatAssignment(null);
            }
          }}
        >
          <section
            aria-labelledby="seller-chat-title"
            aria-modal="true"
            className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h2
                  className="text-lg font-bold text-slate-900"
                  id="seller-chat-title"
                >
                  Customer Support
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Order {chatAssignment.order.id} ·{" "}
                  {formatINR(chatAssignment.priceSetByAdmin)}
                </p>
              </div>
              <button
                aria-label="Close chat"
                className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100"
                disabled={isSendingMessage}
                onClick={() => setChatAssignment(null)}
                type="button"
              >
                ×
              </button>
            </header>

            <div
              aria-live="polite"
              className="min-h-36 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5"
            >
              {isLoadingMessages ? (
                <p className="text-sm text-slate-500">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Send the transaction ID or payment details to Customer Support.
                </p>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.sender.role === "SELLER";
                  const content = parseChatContent(message.message);
                  return (
                    <article
                      className={`max-w-[90%] rounded-xl px-4 py-3 text-sm shadow-sm ${
                        isOwnMessage
                          ? "ml-auto bg-indigo-600 text-white"
                          : "bg-white text-slate-800"
                      }`}
                      key={message.id}
                    >
                      <p className="mb-1 text-xs font-semibold opacity-75">
                        {isOwnMessage ? "You" : "Customer Support"}
                      </p>
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
                      <time className="mt-2 block text-[11px] opacity-70">
                        {new Date(message.createdAt).toLocaleString()}
                      </time>
                    </article>
                  );
                })
              )}
            </div>

            {error && (
              <p
                className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700"
                role="alert"
              >
                {error}
              </p>
            )}

            {!chatAssignment.isPaid && (
              <form
                className="grid gap-3 border-t border-slate-200 p-5"
                onSubmit={sendPaymentDetails}
              >
                <label
                  className="grid gap-1.5 text-sm font-medium text-slate-700"
                  htmlFor="payment-details"
                >
                  Transaction ID or payment details
                </label>
                <textarea
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  id="payment-details"
                  maxLength={3500}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  placeholder="Enter your transaction ID or payment details..."
                  required
                  rows={3}
                  value={messageDraft}
                />
                <button
                  className="justify-self-end rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                  disabled={isSendingMessage || !messageDraft.trim()}
                  type="submit"
                >
                  {isSendingMessage ? "Sending..." : "Send Details"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
