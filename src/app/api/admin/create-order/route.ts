import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Admin access required." },
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

  if (
    !isRecord(body) ||
    typeof body.customerName !== "string" ||
    typeof body.phone !== "string" ||
    typeof body.address !== "string" ||
    typeof body.productId !== "string" ||
    typeof body.sellerId !== "string" ||
    !body.customerName.trim() ||
    !body.phone.trim() ||
    !body.address.trim() ||
    !body.productId.trim() ||
    !body.sellerId.trim() ||
    body.customerName.trim().length > 100 ||
    body.phone.trim().length > 40 ||
    body.address.trim().length > 500
  ) {
    return NextResponse.json(
      { error: "Valid customer name, phone, address, and product are required." },
      { status: 400 }
    );
  }

  try {
    if (session.user.role === "ADMIN") {
      const managedAdmin = await prisma.user.findFirst({
        where: {
          id: session.user.id,
          role: "ADMIN",
          createdBy: { is: { role: "SUPER_ADMIN" } },
        },
        select: { id: true },
      });

      if (!managedAdmin) {
        return NextResponse.json(
          { error: "Only Super Admin-created accounts can create orders." },
          { status: 403 }
        );
      }
    }

    const productId = body.productId.trim();
    const sellerId = body.sellerId.trim();
    const seller = await prisma.user.findFirst({
      where: { id: sellerId, role: "SELLER", isApproved: true },
      select: { id: true },
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Select an approved seller account." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, price: true, stock: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Selected product was not found." },
        { status: 404 }
      );
    }

    const stockUpdate = await prisma.product.updateMany({
      where: { id: product.id, stock: { gte: 1 } },
      data: { stock: { decrement: 1 } },
    });

    if (stockUpdate.count !== 1) {
      return NextResponse.json(
        { error: "This product is out of stock." },
        { status: 409 }
      );
    }

    let order;
    try {
      order = await prisma.order.create({
        data: {
          customerName: body.customerName.trim(),
          phone: body.phone.trim(),
          address: body.address.trim(),
          total: product.price,
          status: "ASSIGNED",
          items: {
            create: {
              product: { connect: { id: product.id } },
              quantity: 1,
              price: product.price,
            },
          },
          assignments: {
            create: {
              seller: { connect: { id: seller.id } },
              assignedBy: { connect: { id: session.user.id } },
              priceSetByAdmin: product.price,
              profitAmount:
                Math.round((product.price * 0.2 + Number.EPSILON) * 100) /
                100,
            },
          },
        },
        select: {
          id: true,
          status: true,
          total: true,
          assignments: {
            select: {
              id: true,
              sellerId: true,
              assignedById: true,
              priceSetByAdmin: true,
              profitAmount: true,
              status: true,
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              product: { select: { name: true } },
            },
          },
        },
      });
    } catch (createError) {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: { stock: { increment: 1 } },
        });
      } catch (restoreError) {
        console.error(
          "Failed to restore product stock after manual order creation failed:",
          restoreError
        );
      }

      throw createError;
    }

    return NextResponse.json(
      { message: "Manual order created successfully.", order },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create-order API error:", error);
    return NextResponse.json(
      { error: "Unable to create the order. Please try again." },
      { status: 500 }
    );
  }
}
