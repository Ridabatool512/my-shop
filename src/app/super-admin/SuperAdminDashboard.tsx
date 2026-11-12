"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Children, type ReactNode } from "react";
import AdminOrdersTable from "@/app/admin/AdminOrdersTable";
import ManualOrderForm from "@/app/admin/ManualOrderForm";
import { formatINR } from "@/lib/currency";

type DirectoryUser = {
  id: string;
  name: string | null;
  email: string;
  status: "ACTIVE" | "FROZEN" | "INACTIVE";
  createdAt: string;
};

type SellerRecord = DirectoryUser & {
  isApproved: boolean;
  balance: number;
  approvedOrderCount: number;
  approvedTotal: number;
  assignments: {
    id: string;
    orderId: string;
    status: string;
    assignedAt: string;
  }[];
};

type AdminRecord = DirectoryUser & {
  createdByName: string | null;
  assignments: {
    id: string;
    orderId: string;
    sellerName: string | null;
    status: string;
    assignedAt: string;
  }[];
};

type Props = {
  section: "dashboard" | "orders" | "buyers" | "sellers" | "admins";
  buyers: DirectoryUser[];
  sellers: SellerRecord[];
  admins: AdminRecord[];
  orders: {
    id: string;
    total: number;
    status: string;
    assignmentId: string | null;
    customerName: string | null;
    sellerName: string | null;
    items: { id: string; name: string; quantity: number }[];
  }[];
  availableProducts: { id: string; name: string; stock: number }[];
  inrToUsdRate: number;
};

export default function SuperAdminDashboard({
  section,
  buyers,
  sellers,
  admins,
  orders,
  availableProducts,
  inrToUsdRate,
}: Props) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    try {
      const response = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      const body: unknown = await response.json();
      const message =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
          ? body.error
          : "Unable to create admin.";

      if (!response.ok) {
        throw new Error(message);
      }

      form.reset();
      setSuccess("Admin account created successfully.");
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create admin. Please try again."
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      {section === "dashboard" && (
        <section>
          <h1 className="mb-5 text-2xl font-bold text-white">Dashboard</h1>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Buyers" value={buyers.length} tone="blue" />
            <SummaryCard label="Sellers" value={sellers.length} tone="emerald" />
            <SummaryCard label="Managed admins" value={admins.length} tone="violet" />
          </div>
        </section>
      )}

      {section === "orders" && (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
              <p className="mt-1 text-sm text-slate-500">
                Assign and track customer orders.
              </p>
            </div>
            <ManualOrderForm
              products={availableProducts}
              sellers={sellers
                .filter((seller) => seller.status === "ACTIVE" && seller.isApproved)
                .map(({ id, name, email }) => ({ id, name, email }))}
            />
          </div>
          <AdminOrdersTable
            orders={orders}
            sellers={sellers
              .filter((seller) => seller.status === "ACTIVE" && seller.isApproved)
              .map(({ id, name, email }) => ({ id, name, email }))}
            inrToUsdRate={inrToUsdRate}
            superAdminMode
          />
        </section>
      )}

      {section === "buyers" && (
        <UserTable
          title="Buyer directory"
          users={buyers}
          emptyMessage="No buyers have registered yet."
        />
      )}

      {section === "sellers" && (
        <SellerTable
          sellers={sellers}
          orders={orders.filter((order) => order.status === "PENDING")}
          inrToUsdRate={inrToUsdRate}
        />
      )}

      {section === "admins" && (
        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <AdminTable admins={admins} />
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/10">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                Access management
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Create new admin
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Admin accounts can only be created by a Super Admin.
              </p>
            </div>
            <form onSubmit={createAdmin} className="space-y-4">
              <Field label="Name">
                <input name="name" type="text" required maxLength={100} autoComplete="name" className={inputClass} />
              </Field>
              <Field label="Email">
                <input name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} />
              </Field>
              <Field label="Temporary password">
                <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
              </Field>
              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              {success && (
                <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {success}
                </p>
              )}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isCreating ? "Creating admin..." : "Create Admin"}
              </button>
            </form>
          </aside>
        </section>
      )}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function UserTable({
  title,
  users,
  emptyMessage,
}: {
  title: string;
  users: DirectoryUser[];
  emptyMessage: string;
}) {
  return (
    <DirectoryTable
      title={title}
      emptyMessage={emptyMessage}
    headers={["Name", "Email", "Joined", "Status", "Action"]}
    >
      {users.map((user) => (
        <tr key={user.id}>
          <td className={cellClass}>{user.name || "Unnamed user"}</td>
          <td className={cellClass}>{user.email}</td>
          <td className={cellClass}>{formatDate(user.createdAt)}</td>
        <td className={cellClass}>
          <AccountStatus status={user.status} />
        </td>
        <td className={cellClass}>
          <FreezeAccountAction userId={user.id} status={user.status} />
        </td>
      </tr>
    ))}
    </DirectoryTable>
  );
}

function SellerTable({
  sellers,
  orders,
  inrToUsdRate,
}: {
  sellers: SellerRecord[];
  orders: Props["orders"];
  inrToUsdRate: number;
}) {
  const router = useRouter();
  const [productSeller, setProductSeller] = useState<SellerRecord | null>(null);
  const [orderSeller, setOrderSeller] = useState<SellerRecord | null>(null);
  const [balanceSeller, setBalanceSeller] = useState<SellerRecord | null>(null);
  const [approvingSellerId, setApprovingSellerId] = useState<string | null>(
    null
  );
  const [approvalError, setApprovalError] = useState("");

  async function approveSeller(sellerId: string) {
    setApprovalError("");
    setApprovingSellerId(sellerId);

    try {
      const response = await fetch("/api/super-admin/sellers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId }),
      });

      if (!response.ok) {
        const body: unknown = await response.json();
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Unable to approve this seller.";
        throw new Error(message);
      }

      router.refresh();
    } catch (error) {
      setApprovalError(
        error instanceof Error
          ? error.message
          : "Unable to approve this seller."
      );
    } finally {
      setApprovingSellerId(null);
    }
  }

  return (
    <>
      {approvalError && (
        <p
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {approvalError}
        </p>
      )}
      <DirectoryTable
        title="Seller directory and workload"
        emptyMessage="No sellers have registered yet."
        headers={["Seller", "Active order", "Approved Orders / Total", "Balance", "Status", "Action"]}
      >
        {sellers.map((seller) => {
          const activeAssignment = seller.assignments[0];
          return (
            <tr key={seller.id}>
              <td className={cellClass}>
                <p>{seller.name || "Unnamed seller"}</p>
                <p className="mt-1 text-xs font-normal text-slate-500">{seller.email}</p>
              </td>
              <td className={cellClass}>
                {activeAssignment ? activeAssignment.orderId : "No active order"}
              </td>
              <td className={cellClass}>
                <p className="font-semibold text-slate-900">
                  {seller.approvedOrderCount} order(s)
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatINR(seller.approvedTotal)}
                </p>
              </td>
              <td className={`${cellClass} font-semibold`}>
                {formatINR(seller.balance)}
              </td>
              <td className={cellClass}>
                {seller.status === "FROZEN" ? (
                  <AccountStatus status={seller.status} />
                ) : !seller.isApproved ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Pending approval
                  </span>
                ) : activeAssignment ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Active · {activeAssignment.status === "COMPLETE" ? "ORDER PROCESSING" : activeAssignment.status}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Available
                  </span>
                )}
                {seller.assignments.length > 1 && (
                  <p className="mt-1 text-xs font-normal text-slate-500">
                    {seller.assignments.length} total assignments
                  </p>
                )}
              </td>
              <td className={cellClass}>
                <button
                  className="mb-2 mr-2 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  onClick={() => setBalanceSeller(seller)}
                  type="button"
                >
                  Add Balance
                </button>
                <button
                  className="mb-2 mr-2 whitespace-nowrap rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    !seller.isApproved ||
                    seller.status !== "ACTIVE" ||
                    orders.length === 0
                  }
                  onClick={() => setOrderSeller(seller)}
                  title={
                    orders.length === 0
                      ? "There are no pending orders to assign."
                      : !seller.isApproved || seller.status !== "ACTIVE"
                        ? "Seller must be approved and active."
                        : undefined
                  }
                  type="button"
                >
                  Assign Order
                </button>
                <button
                  className="mb-2 whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                  onClick={() => setProductSeller(seller)}
                  type="button"
                >
                  Assign Products
                </button>
                {!seller.isApproved && seller.status !== "FROZEN" && (
                  <button
                    className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                    disabled={approvingSellerId !== null}
                    onClick={() => void approveSeller(seller.id)}
                    type="button"
                  >
                    {approvingSellerId === seller.id
                      ? "Approving..."
                      : "Approve Seller"}
                  </button>
                )}
                <FreezeAccountAction
                  userId={seller.id}
                  status={seller.status}
                />
              </td>
            </tr>
          );
        })}
      </DirectoryTable>
      {productSeller && (
        <SellerProductAssignmentModal
          seller={productSeller}
          onClose={() => setProductSeller(null)}
          onAssigned={() => {
            setProductSeller(null);
            router.refresh();
          }}
        />
      )}
      {orderSeller && (
        <SellerOrderAssignmentModal
          seller={orderSeller}
          orders={orders}
          inrToUsdRate={inrToUsdRate}
          onClose={() => setOrderSeller(null)}
          onAssigned={() => {
            setOrderSeller(null);
            router.refresh();
          }}
        />
      )}
      {balanceSeller && (
        <AddSellerBalanceModal
          seller={balanceSeller}
          onClose={() => setBalanceSeller(null)}
          onAdded={() => {
            setBalanceSeller(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function AddSellerBalanceModal({
  seller,
  onClose,
  onAdded,
}: {
  seller: SellerRecord;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [amount, setAmount] = useState(seller.approvedTotal.toFixed(2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function addBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/super-admin/add-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId: seller.id, amount: Number(amount) }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Unable to add seller balance.";
        throw new Error(message);
      }
      onAdded();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to add seller balance."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
      onClick={onClose}
    >
      <section
        aria-labelledby="add-balance-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 className="text-xl font-bold text-slate-900" id="add-balance-title">
          Add Balance
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {seller.name || seller.email} · Current: {formatINR(seller.balance)}
        </p>
        <form className="mt-5 space-y-4" onSubmit={(event) => void addBalance(event)}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Amount (INR)
            <input
              autoFocus
              className={inputClass}
              min="0.01"
              onChange={(event) => setAmount(event.target.value)}
              required
              step="0.01"
              type="number"
              value={amount}
            />
          </label>
          {error && (
            <p className="text-sm text-red-700" role="alert">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Adding..." : "Add Balance"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SellerOrderAssignmentModal({
  seller,
  orders,
  inrToUsdRate,
  onClose,
  onAssigned,
}: {
  seller: SellerRecord;
  orders: Props["orders"];
  inrToUsdRate: number;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selectedOrder = orders.find((order) => order.id === selectedOrderId);

  function chooseOrder(order: Props["orders"][number]) {
    setSelectedOrderId(order.id);
    setPrice((order.total * inrToUsdRate).toFixed(2));
    setError("");
  }

  async function assignOrder() {
    if (!selectedOrder || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      setError("Select an order and enter a valid price.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          sellerId: seller.id,
          price: Math.round((Number(price) / inrToUsdRate) * 100) / 100,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          isRecord(body) && typeof body.error === "string"
            ? body.error
            : "Unable to assign this order."
        );
      }
      onAssigned();
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : "Unable to assign this order."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <section
        aria-labelledby="seller-order-assignment-title"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2
              className="text-lg font-bold text-slate-900"
              id="seller-order-assignment-title"
            >
              Assign Order
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose a pending order for {seller.name || seller.email}.
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        {error && (
          <p
            className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto p-5">
          {orders.length === 0 ? (
            <p className="text-sm text-slate-500">No pending orders available.</p>
          ) : (
            orders.map((order) => (
              <button
                aria-pressed={selectedOrderId === order.id}
                className={`block w-full rounded-xl border p-4 text-left transition ${
                  selectedOrderId === order.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-indigo-300"
                }`}
                key={order.id}
                onClick={() => chooseOrder(order)}
                type="button"
              >
                <span className="block font-semibold text-slate-900">
                  {order.customerName || "Guest customer"} · {order.id}
                </span>
                <span className="mt-1 block text-sm text-slate-600">
                  {order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Total: {formatINR(order.total)}
                </span>
              </button>
            ))
          )}
        </div>

        {selectedOrder && (
          <div className="border-t border-slate-200 px-5 pt-4">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Assignment price (USD)
              <input
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900"
                min="0.01"
                onChange={(event) => setPrice(event.target.value)}
                required
                step="0.01"
                type="number"
                value={price}
              />
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Seller profit: {formatINR((Number(price) / inrToUsdRate) * 0.2)}
            </p>
          </div>
        )}

        <footer className="flex justify-end border-t border-slate-200 p-5">
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedOrder || isSubmitting}
            onClick={() => void assignOrder()}
            type="button"
          >
            {isSubmitting ? "Assigning..." : "Assign to Seller"}
          </button>
        </footer>
      </section>
    </div>
  );
}

type SellerProduct = {
  id: string;
  name: string;
  category: string;
  stock: number;
  assigned: boolean;
};

function SellerProductAssignmentModal({
  seller,
  onClose,
  onAssigned,
}: {
  seller: SellerRecord;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch(
          `/api/super-admin/sellers/${encodeURIComponent(seller.id)}/products`,
          { cache: "no-store" }
        );
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            isRecord(body) && typeof body.error === "string"
              ? body.error
              : "Unable to load products."
          );
        }
        if (
          !isRecord(body) ||
          !Array.isArray(body.products) ||
          !body.products.every(isSellerProduct)
        ) {
          throw new Error("The product list response was invalid.");
        }
        if (active) {
          setProducts(body.products);
          setSelectedIds(
            new Set(
              body.products
                .filter((product) => product.assigned)
                .map((product) => product.id)
            )
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load products."
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadProducts();
    return () => {
      active = false;
    };
  }, [seller.id]);

  function toggleProduct(productId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function assignProducts() {
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/super-admin/sellers/${encodeURIComponent(seller.id)}/products`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: Array.from(selectedIds) }),
        }
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          isRecord(body) && typeof body.error === "string"
            ? body.error
            : "Unable to assign products."
        );
      }
      onAssigned();
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : "Unable to assign products."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section
        aria-labelledby="seller-products-title"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id="seller-products-title">
              Assign Products
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Select products for {seller.name || seller.email}
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>
        {error && <p className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <div className="min-h-40 flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-slate-500">No products found.</p>
          ) : (
            <ul className="space-y-2">
              {products.map((product) => (
                <li key={product.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-indigo-300">
                    <input
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      type="checkbox"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900">{product.name}</span>
                      <span className="text-xs text-slate-500">
                        {product.category.replaceAll("_", " ")} · Stock: {product.stock}
                      </span>
                    </span>
                    {product.assigned && (
                      <span className="text-xs font-medium text-emerald-700">Assigned</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="flex items-center justify-between border-t border-slate-200 p-5">
          <span className="text-sm text-slate-600">{selectedIds.size} selected</span>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading || isSaving || selectedIds.size === 0}
            onClick={() => void assignProducts()}
            type="button"
          >
            {isSaving ? "Assigning..." : "Assign Selected"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function isSellerProduct(value: unknown): value is SellerProduct {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    typeof value.stock === "number" &&
    typeof value.assigned === "boolean"
  );
}

function AdminTable({ admins }: { admins: AdminRecord[] }) {
  return (
    <DirectoryTable
      title="Admins created by Super Admins"
      emptyMessage="No managed admin accounts yet. Create one using the form."
      headers={["Admin", "Created by", "Recent activity", "Status", "Action"]}
    >
      {admins.map((admin) => {
        const latestAssignment = admin.assignments[0];
        return (
          <tr key={admin.id}>
            <td className={cellClass}>
              <p>{admin.name || "Unnamed admin"}</p>
              <p className="mt-1 text-xs font-normal text-slate-500">{admin.email}</p>
              <p className="mt-1 text-xs font-normal text-slate-500">
                {admin.assignments.length} order assignment(s)
              </p>
            </td>
            <td className={cellClass}>{admin.createdByName || "Super Admin"}</td>
            <td className={cellClass}>
              {latestAssignment ? (
                <>
                  <p>Assigned order {latestAssignment.orderId}</p>
                  <p className="mt-1 text-xs font-normal text-slate-500">
                    Seller: {latestAssignment.sellerName || "Unknown"} ·{" "}
                    {latestAssignment.status} · {formatDate(latestAssignment.assignedAt)}
                  </p>
                </>
              ) : (
                "No recorded assignments"
              )}
            </td>
            <td className={cellClass}>
              <AccountStatus status={admin.status} />
            </td>
            <td className={cellClass}>
              <FreezeAccountAction userId={admin.id} status={admin.status} />
            </td>
          </tr>
        );
      })}
    </DirectoryTable>
  );
}

function AccountStatus({ status }: { status: DirectoryUser["status"] }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        status === "FROZEN"
          ? "bg-red-50 text-red-700"
          : status === "INACTIVE"
            ? "bg-amber-50 text-amber-700"
            : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {status === "FROZEN"
        ? "Frozen"
        : status === "INACTIVE"
          ? "Inactive"
          : "Active"}
    </span>
  );
}

function FreezeAccountAction({
  userId,
  status,
}: {
  userId: string;
  status: DirectoryUser["status"];
}) {
  const router = useRouter();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: "ACTIVE" | "FROZEN" | "INACTIVE") {
    setError("");
    setUpdatingStatus(true);

    try {
      const response = await fetch("/api/super-admin/users/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Unable to update this account status.";
        throw new Error(message);
      }

      router.refresh();
    } catch (freezeError) {
      setError(
        freezeError instanceof Error
          ? freezeError.message
          : "Unable to update this account status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "ACTIVE" ? (
        <>
          <button
            className="whitespace-nowrap rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
            disabled={updatingStatus}
            onClick={() => void updateStatus("FROZEN")}
            type="button"
          >
            {updatingStatus ? "Updating..." : "Freeze"}
          </button>
          <button
            className="whitespace-nowrap rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
            disabled={updatingStatus}
            onClick={() => void updateStatus("INACTIVE")}
            type="button"
          >
            {updatingStatus ? "Updating..." : "Deactivate"}
          </button>
        </>
      ) : (
        <button
          className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
          disabled={updatingStatus}
          onClick={() => void updateStatus("ACTIVE")}
          type="button"
        >
          {updatingStatus
            ? "Updating..."
            : status === "FROZEN"
              ? "Unfreeze"
              : "Activate"}
        </button>
      )}
      {error && (
        <p className="basis-full text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function DirectoryTable({
  title,
  headers,
  emptyMessage,
  children,
}: {
  title: string;
  headers: string[];
  emptyMessage: string;
  children: ReactNode;
}) {
  return (
    <>
      <h2 className="mb-4 text-lg font-bold text-slate-900">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {children}
            {Children.count(children) === 0 && (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "emerald" | "violet";
}) {
  const classes = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
  };

  return (
    <article className={`rounded-2xl border p-5 ${classes[tone]}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";
const cellClass = "px-4 py-4 align-top text-slate-700";
