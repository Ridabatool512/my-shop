
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "../../../lib/prisma";

type ValidatedOrderItem = {
  productId: string;
  quantity: number;
};

class OrderCreationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "OrderCreationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOrderItem(value: unknown): value is ValidatedOrderItem {
  return (
    isRecord(value) &&
    typeof value.productId === "string" &&
    value.productId.trim().length > 0 &&
    typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0
  );
}

export async function POST(request: Request) {
  const session = await auth();

  if (session?.user.role === "SELLER") {
    return NextResponse.json(
      { error: "Seller accounts cannot place customer orders." },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  try {
    // Validate customer details
    if (
      !isRecord(body) ||
      typeof body.customerName !== "string" ||
      typeof body.customerEmail !== "string" ||
      typeof body.phone !== "string" ||
      typeof body.address !== "string" ||
      !body.customerName.trim() ||
      !body.customerEmail.trim() ||
      !body.phone.trim() ||
      !body.address.trim()
    ) {
      return NextResponse.json(
        { error: "All customer details are required." },
        { status: 400 }
      );
    }

    const { customerName, customerEmail, phone, address } = body;
    const items = body.items;

    // Validate cart items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Your cart is empty." },
        { status: 400 }
      );
    }

    const validatedItems: ValidatedOrderItem[] = [];
    const untrustedItems: unknown[] = items;

    for (const item of untrustedItems) {
      if (!isOrderItem(item)) {
        return NextResponse.json(
          { error: "Invalid product or quantity." },
          { status: 400 }
        );
      }

      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    // Prevent duplicate products
    const productIds = validatedItems.map(
      (item) => item.productId
    );

    if (new Set(productIds).size !== productIds.length) {
      return NextResponse.json(
        { error: "Duplicate products are not allowed." },
        { status: 400 }
      );
    }

    // Create order using transaction
    const order = await prisma.$transaction(async (tx) => {
      let total = 0;

      const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

      for (const item of validatedItems) {
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
        });

        if (!product) {
          throw new OrderCreationError("One of the products was not found.", 404);
        }

        if (product.stock < item.quantity) {
          throw new OrderCreationError(
            `Insufficient stock for ${product.name}. Available stock: ${product.stock}`,
            409
          );
        }

        const itemTotal = product.price * item.quantity;

        total += itemTotal;

        // Safely decrement stock
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: product.id,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new OrderCreationError(
            `Stock changed for ${product.name}. Please try again.`,
            409
          );
        }

        orderItems.push({
          product: {
            connect: {
              id: product.id,
            },
          },
          quantity: item.quantity,
          price: product.price,
        });
      }

      // Create order and order items
      const newOrder = await tx.order.create({
        data: {
          buyerId: session?.user.role === "BUYER" ? session.user.id : null,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          phone: phone.trim(),
          address: address.trim(),
          total,
          status: "PENDING",

          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return newOrder;
    });

    return NextResponse.json(
      {
        message: "Order placed successfully!",
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof OrderCreationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Order API Error:", error);

    return NextResponse.json(
      { error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  }
}
