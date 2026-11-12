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

  if (session.user.role !== "SELLER") {
    return NextResponse.json(
      { error: "Seller access required." },
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
    !Array.isArray(body.productIds) ||
    !body.productIds.every(
      (id): id is string => typeof id === "string" && id.trim().length > 0
    )
  ) {
    return NextResponse.json(
      { error: "Provide a list of valid product IDs." },
      { status: 400 }
    );
  }

  const productIds = body.productIds.map((id) => id.trim());
  if (new Set(productIds).size !== productIds.length) {
    return NextResponse.json(
      { error: "Duplicate product IDs are not allowed." },
      { status: 400 }
    );
  }

  try {
    const seller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (seller?.role !== "SELLER") {
      return NextResponse.json(
        { error: "Seller access required." },
        { status: 403 }
      );
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, sellerId: true },
    });
    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more selected products were not found." },
        { status: 404 }
      );
    }

    const result = await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { sellerId: session.user.id },
    });
    if (result.count !== productIds.length) {
      return NextResponse.json(
        {
          error:
            "Some products were assigned concurrently. Refresh the list and try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Selected products assigned successfully.",
      count: result.count,
    });
  } catch (error) {
    console.error("Seller assign-products API error:", error);
    return NextResponse.json(
      { error: "Unable to assign selected products. Please try again." },
      { status: 500 }
    );
  }
}
