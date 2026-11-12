const CART_STORAGE_KEY = "myshop-cart";
const CART_RESET_KEY = "myshop-cart-reset-2026-11";

export function loadCart(): Record<string, number> {
  if (localStorage.getItem(CART_RESET_KEY) !== "done") {
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.setItem(CART_RESET_KEY, "done");
  }

  const savedCart = localStorage.getItem(CART_STORAGE_KEY);
  if (!savedCart) return {};

  const parsed: unknown = JSON.parse(savedCart);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const validCart: Record<string, number> = {};
  for (const [productId, quantity] of Object.entries(parsed)) {
    if (
      typeof quantity === "number" &&
      Number.isInteger(quantity) &&
      quantity > 0
    ) {
      validCart[productId] = quantity;
    }
  }
  return validCart;
}

export function saveCart(cart: Record<string, number>): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function clearCart(): void {
  localStorage.removeItem(CART_STORAGE_KEY);
}
