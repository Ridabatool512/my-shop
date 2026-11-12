import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
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
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    (body.role !== "BUYER" && body.role !== "SELLER")
  ) {
    return NextResponse.json(
      { error: "Name, email, password, and a valid account type are required." },
      { status: 400 }
    );
  }

  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const password = body.password;
  const role = body.role;

  if (!name || name.length > 100) {
    return NextResponse.json(
      { error: "Name must be between 1 and 100 characters." },
      { status: 400 }
    );
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  if (
    password.length < 8 ||
    password.length > 72 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return NextResponse.json(
      { error: "Password must be 8 or more characters and at most 72 bytes." },
      { status: 400 }
    );
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        isApproved: role !== "SELLER",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(
      { message: "Account created successfully.", user },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    console.error("Signup API error:", error);
    return NextResponse.json(
      { error: "Unable to create the account. Please try again." },
      { status: 500 }
    );
  }
}
