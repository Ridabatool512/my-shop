import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ sellerId: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function authorizeSeller(sellerId: string) {
  return prisma.user.findFirst({
    where: { id: sellerId, role: "SELLER" },
    select: { id: true },
  });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Super Admin access required." },
      { status: 403 }
    );
  }

  const { sellerId } = await params;
  try {
    const seller = await authorizeSeller(sellerId);
    if (!seller) {
      return NextResponse.json({ error: "Seller not found." }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        stock: true,
        sellerId: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      products: products.map(({ sellerId: assignedSellerId, ...product }) => ({
        ...product,
        assigned: assignedSellerId === seller.id,
      })),
    });
  } catch (error) {
    console.error("Super Admin seller products API error:", error);
    return NextResponse.json(
      { error: "Unable to load products. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Super Admin access required." },
      { status: 403 }
    );
  }

  const { sellerId } = await params;
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
    body.productIds.length === 0 ||
    !body.productIds.every(
      (id): id is string => typeof id === "string" && id.trim().length > 0
    )
  ) {
    return NextResponse.json(
      { error: "Select at least one valid product." },
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
    const seller = await authorizeSeller(sellerId);
    if (!seller) {
      return NextResponse.json({ error: "Seller not found." }, { status: 404 });
    }

    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    if (existingProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more selected products were not found." },
        { status: 404 }
      );
    }

    const result = await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { sellerId: seller.id },
    });

    return NextResponse.json({
      message: "Products assigned successfully.",
      count: result.count,
    });
  } catch (error) {
    console.error("Super Admin assign seller products API error:", error);
    return NextResponse.json(
      { error: "Unable to assign products. Please try again." },
      { status: 500 }
    );
  }
}
