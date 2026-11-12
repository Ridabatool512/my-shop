"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { formatINRAsUSD, formatUSD } from "../../lib/currency";

type AdminOrder = {
  id: string;
  total: number;
  status: string;
  assignmentId: string | null;
  assignmentComplete?: boolean;
  superAdminApproved?: boolean;
  customerName?: string | null;
  sellerName?: string | null;
  items: { id: string; name: string; quantity: number }[];
};

type SellerOption = {
  id: string;
  name: string | null;
  email: string;
};

type Props = {
  orders: AdminOrder[];
  sellers: SellerOption[];
  inrToUsdRate: number;
  superAdminMode?: boolean;
};

export default function AdminOrdersTable({
  orders,
  sellers,
  inrToUsdRate,
  superAdminMode = false,
}: Props) {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [sellerId, setSellerId] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const parsedPrice = Number(price);
  const profit =
    price.trim() && Number.isFinite(parsedPrice) && parsedPrice > 0
      ? Math.round((parsedPrice * 0.2 + Number.EPSILON) * 100) / 100
      : null;

  function openAssignment(order: AdminOrder) {
    setSelectedOrder(order);
    setSellerId("");
    setPrice("");
    setError("");
  }

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/orders/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          sellerId,
          price: Math.round((parsedPrice / inrToUsdRate) * 100) / 100,
        }),
      });

      if (!response.ok) {
        const body: unknown = await response.json();
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Unable to assign this order.";
        throw new Error(message);
      }

      setSelectedOrder(null);
      router.refresh();
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "Unable to assign this order."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove(order: AdminOrder) {
    setError("");
    setApprovingOrderId(order.id);

    try {
      const response = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!response.ok) {
        const body: unknown = await response.json();
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Unable to approve this order.";
        throw new Error(message);
      }

      router.refresh();
    } catch (approvalError) {
      setError(
        approvalError instanceof Error
          ? approvalError.message
          : "Unable to approve this order."
      );
    } finally {
      setApprovingOrderId(null);
    }
  }

  async function handleReview(order: AdminOrder, action: "approve" | "reject") {
    setError("");
    setApprovingOrderId(order.id);

    try {
      const response = await fetch("/api/super-admin/orders/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, action }),
      });

      if (!response.ok) {
        const body: unknown = await response.json();
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : `Unable to ${action} this order.`;
        throw new Error(message);
      }

      router.refresh();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : `Unable to ${action} this order.`
      );
    } finally {
      setApprovingOrderId(null);
    }
  }

  return (
    <>
      <div
        style={{
          background: "#ffffff",
          color: "#1e293b",
          borderRadius: "12px",
          padding: "20px",
          overflowX: "auto",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        {sellers.length === 0 && (
          <p role="status" style={{ color: "#92400e" }}>
            No seller accounts found. Add a user with the SELLER role before
            assigning orders.
          </p>
        )}

        {orders.length === 0 ? (
          <p style={{ color: "#334155" }}>No orders found.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              color: "#1e293b",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ background: "#cbd5e1", color: "#0f172a" }}>
                <th style={cellStyle}>Order ID</th>
                {superAdminMode && <th style={cellStyle}>Customer</th>}
                <th style={cellStyle}>Products</th>
                <th style={cellStyle}>Total</th>
                <th style={cellStyle}>Status</th>
                {superAdminMode && <th style={cellStyle}>Seller</th>}
                <th style={cellStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    color: "#1e293b",
                    background: "#ffffff",
                  }}
                >
                  <td style={{ ...cellStyle, color: "#334155", fontWeight: 500 }}>
                    {order.id}
                  </td>
                  {superAdminMode && (
                    <td style={cellStyle}>{order.customerName || "Guest customer"}</td>
                  )}
                  <td style={cellStyle}>
                    {order.items.map((item) => (
                      <div key={item.id} style={{ marginBottom: "4px" }}>
                        {item.name} × {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td style={{ ...cellStyle, fontWeight: 700, color: "#020617" }}>
                    {formatINRAsUSD(order.total, inrToUsdRate)}
                  </td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        background: "#fef3c7",
                        color: "#92400e",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        display: "inline-block",
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                  {superAdminMode && (
                    <td style={cellStyle}>{order.sellerName || "Unassigned"}</td>
                  )}
                  <td style={cellStyle}>
                    {order.status === "APPROVED" ? (
                      <span style={{ color: "#166534", fontWeight: 700 }}>
                        Approved
                      </span>
                    ) : superAdminMode &&
                      order.status === "ASSIGNED" &&
                      !order.assignmentId ? (
                      <button
                        type="button"
                        disabled={sellers.length === 0 || isSubmitting}
                        onClick={() => openAssignment(order)}
                        style={{
                          ...primaryButtonStyle,
                          opacity: sellers.length === 0 || isSubmitting ? 0.55 : 1,
                          cursor: sellers.length === 0 || isSubmitting ? "not-allowed" : "pointer",
                        }}
                      >
                        Assign to Seller
                      </button>
                    ) : superAdminMode && order.status === "ASSIGNED" ? (
                      (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          <button
                            type="button"
                            disabled={
                              isSubmitting ||
                              (order.assignmentComplete === true)
                            }
                            onClick={() => openAssignment(order)}
                            title={
                              order.assignmentComplete
                                ? "This seller has already picked the order, so it cannot be reassigned."
                                : undefined
                            }
                            style={{
                              ...primaryButtonStyle,
                              opacity:
                                isSubmitting || order.assignmentComplete ? 0.55 : 1,
                              cursor:
                                isSubmitting || order.assignmentComplete
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            Assign to Seller
                          </button>
                          <button
                            type="button"
                            disabled={approvingOrderId !== null}
                            onClick={() => void handleReview(order, "approve")}
                            style={{
                              ...approveButtonStyle,
                              opacity: approvingOrderId !== null ? 0.65 : 1,
                              cursor: approvingOrderId !== null ? "wait" : "pointer",
                            }}
                          >
                            {approvingOrderId === order.id
                              ? "Updating..."
                              : "Mark as Processing"}
                          </button>
                          <button
                            type="button"
                            disabled={approvingOrderId !== null}
                            onClick={() => void handleReview(order, "reject")}
                            style={{
                              ...primaryButtonStyle,
                              background: "#b91c1c",
                              opacity: approvingOrderId !== null ? 0.65 : 1,
                              cursor: approvingOrderId !== null ? "wait" : "pointer",
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )
                    ) : order.status === "PENDING" ? (
                      <button
                        type="button"
                        disabled={sellers.length === 0 || isSubmitting}
                        onClick={() => openAssignment(order)}
                        title={
                          sellers.length === 0
                            ? "Add an approved seller before assigning orders."
                            : undefined
                        }
                        style={{
                          ...primaryButtonStyle,
                          opacity: sellers.length === 0 || isSubmitting ? 0.55 : 1,
                          cursor:
                            sellers.length === 0 || isSubmitting
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        Assign to Seller
                      </button>
                    ) : order.status === "ORDER PROCESSING" && order.assignmentId && !superAdminMode ? (
                      <span style={{ color: "#64748b", fontWeight: 600 }}>
                        Awaiting Super Admin approval
                      </span>
                    ) : order.status === "ORDER PROCESSING" && order.assignmentId ? (
                      <button
                        type="button"
                        disabled={
                          approvingOrderId !== null ||
                          (superAdminMode && !order.assignmentComplete)
                        }
                        onClick={() => void handleApprove(order)}
                        title={
                          superAdminMode && !order.assignmentComplete
                            ? "The seller must pick this order before it can be approved."
                            : undefined
                        }
                        style={{
                          ...approveButtonStyle,
                          opacity: approvingOrderId !== null ? 0.65 : 1,
                          cursor: approvingOrderId !== null ? "wait" : "pointer",
                        }}
                      >
                        {approvingOrderId === order.id
                          ? "Approving..."
                          : "Approve Order"}
                      </button>
                    ) : order.status === "APPROVED" ? (
                      <span style={{ color: "#166534", fontWeight: 700 }}>
                        Approved
                      </span>
                    ) : null}
                    {error && (
                      <p role="alert" style={{ color: "#b91c1c", margin: "8px 0 0" }}>
                        {error}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedOrder && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setSelectedOrder(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "rgba(15, 23, 42, 0.55)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-order-title"
            style={{
              width: "100%",
              maxWidth: "460px",
              borderRadius: "12px",
              background: "#ffffff",
              padding: "24px",
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.25)",
            }}
          >
            <h2
              id="assign-order-title"
              style={{ marginTop: 0, color: "#0f172a" }}
            >
              Assign order to seller
            </h2>
            <p style={{ color: "#475569", overflowWrap: "anywhere" }}>
              Order: {selectedOrder.id}
            </p>

            <form onSubmit={handleAssign} style={{ display: "grid", gap: "16px" }}>
              <label style={labelStyle}>
                Seller
                <select
                  required
                  value={sellerId}
                  onChange={(event) => setSellerId(event.target.value)}
                  style={fieldStyle}
                >
                  <option value="" disabled>
                    Select a seller
                  </option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name || seller.email} ({seller.email})
                    </option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Price (USD)
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  style={fieldStyle}
                />
              </label>

              <p
                aria-live="polite"
                style={{
                  margin: 0,
                  borderRadius: "8px",
                  padding: "12px",
                  background: "#eff6ff",
                  color: "#1e3a8a",
                }}
              >
                20% profit:{" "}
                <strong>
                  {profit === null
                    ? "Enter a valid price"
                    : formatUSD(profit)}
                </strong>
              </p>

              {error && (
                <p role="alert" style={{ color: "#b91c1c", margin: 0 }}>
                  {error}
                </p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedOrder(null)}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !sellerId || profit === null}
                  style={{
                    ...primaryButtonStyle,
                    opacity:
                      isSubmitting || !sellerId || profit === null ? 0.6 : 1,
                  }}
                >
                  {isSubmitting ? "Assigning..." : "Assign"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

const cellStyle = { padding: "12px", verticalAlign: "top" as const };
const labelStyle = {
  display: "grid",
  gap: "6px",
  color: "#1e293b",
  fontWeight: 600,
};
const fieldStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  padding: "10px 12px",
  color: "#0f172a",
  background: "#ffffff",
};
const primaryButtonStyle = {
  border: 0,
  borderRadius: "7px",
  padding: "9px 12px",
  background: "#1d4ed8",
  color: "#ffffff",
  fontWeight: 700,
};
const approveButtonStyle = {
  border: 0,
  borderRadius: "7px",
  padding: "9px 12px",
  background: "#15803d",
  color: "#ffffff",
  fontWeight: 700,
};
const secondaryButtonStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  padding: "9px 12px",
  background: "#ffffff",
  color: "#1e293b",
  fontWeight: 600,
  cursor: "pointer",
};
