import { auth } from "@/auth";
import { formatChatContent } from "@/lib/chat-content";
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

  if (
    session.user.role !== "SELLER" &&
    session.user.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json(
      { error: "Only sellers and Super Admins can use chat." },
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

  const message =
    isRecord(body) && typeof body.message === "string" ? body.message.trim() : "";
  const imageDataUrl =
    isRecord(body) && typeof body.imageDataUrl === "string"
      ? body.imageDataUrl
      : "";
  const isValidImage =
    imageDataUrl.length <= 2_800_000 &&
    /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(
      imageDataUrl
    );

  if (
    !isRecord(body) ||
    (message.length === 0 && !imageDataUrl) ||
    message.length > 4000 ||
    (imageDataUrl !== "" && !isValidImage)
  ) {
    return NextResponse.json(
      { error: "Provide text (up to 4000 characters) or a valid image under 2 MB." },
      { status: 400 }
    );
  }
  const storedMessage = formatChatContent(message, imageDataUrl || undefined);

  try {
    let senderId = session.user.id;
    let receiverId: string;
    let assignmentId: string | null = null;
    let sendWelcomeReply = false;

    if (session.user.role === "SELLER") {
      const seller = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, isApproved: true },
      });

      if (seller?.role !== "SELLER" || !seller.isApproved) {
        return NextResponse.json(
          { error: "An approved seller account is required." },
          { status: 403 }
        );
      }

      senderId = seller.id;

      if (body.assignmentId !== undefined) {
        if (
          typeof body.assignmentId !== "string" ||
          !body.assignmentId.trim()
        ) {
          return NextResponse.json(
            { error: "A valid assignmentId is required." },
            { status: 400 }
          );
        }

        const assignment = await prisma.orderAssignment.findFirst({
          where: {
            id: body.assignmentId.trim(),
            sellerId: session.user.id,
            status: "PENDING",
            isPaid: false,
          },
          select: { id: true },
        });

        if (!assignment) {
          return NextResponse.json(
            { error: "This assignment is not awaiting payment." },
            { status: 409 }
          );
        }

        assignmentId = assignment.id;
      }

      const superAdmins = await prisma.user.findMany({
        where: { role: "SUPER_ADMIN" },
        select: { id: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      });

      if (superAdmins.length === 0) {
        return NextResponse.json(
          { error: "No Super Admin account is available to receive messages." },
          { status: 503 }
        );
      }

      receiverId = superAdmins[0].id;
      const existingMessageCount = await prisma.chatMessage.count({
        where: {
          OR: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId },
          ],
        },
      });
      sendWelcomeReply = existingMessageCount === 0;
    } else {
      if (typeof body.receiverId !== "string" || !body.receiverId.trim()) {
        return NextResponse.json(
          { error: "A seller recipient is required." },
          { status: 400 }
        );
      }

      const seller = await prisma.user.findFirst({
        where: { id: body.receiverId.trim(), role: "SELLER" },
        select: { id: true },
      });

      if (!seller) {
        return NextResponse.json(
          { error: "Seller recipient not found." },
          { status: 404 }
        );
      }

      receiverId = seller.id;
    }

    if (assignmentId) {
      const paymentRecorded = await prisma.orderAssignment.updateMany({
        where: {
          id: assignmentId,
          sellerId: session.user.id,
          status: "PENDING",
          isPaid: false,
        },
        data: { isPaid: true },
      });

      if (paymentRecorded.count !== 1) {
        return NextResponse.json(
          { error: "This assignment is no longer awaiting payment." },
          { status: 409 }
        );
      }
    }

    const createdMessageIds: string[] = [];
    try {
      const timestamp = new Date();
      const chatMessage = await prisma.chatMessage.create({
        data: {
          senderId,
          receiverId,
          message: storedMessage,
          createdAt: timestamp,
        },
        select: {
          id: true,
          senderId: true,
          receiverId: true,
          message: true,
          isRead: true,
          createdAt: true,
          sender: { select: { name: true, email: true, role: true } },
          receiver: { select: { name: true, email: true, role: true } },
        },
      });
      createdMessageIds.push(chatMessage.id);

      if (sendWelcomeReply) {
        const welcomeReply = await prisma.chatMessage.create({
          data: {
            senderId: receiverId,
            receiverId: senderId,
            message: "Welcome to customer support. How can I help you?",
            createdAt: new Date(timestamp.getTime() + 1),
          },
          select: { id: true },
        });
        createdMessageIds.push(welcomeReply.id);
      }

      return NextResponse.json(
        {
          message: "Message sent successfully.",
          chatMessage: {
            ...chatMessage,
            createdAt: chatMessage.createdAt.toISOString(),
          },
        },
        { status: 201 }
      );
    } catch (createError) {
      if (createdMessageIds.length > 0) {
        try {
          await prisma.chatMessage.deleteMany({
            where: { id: { in: createdMessageIds } },
          });
        } catch (cleanupError) {
          console.error(
            "Failed to clean up partial chat messages after a send error.",
            cleanupError
          );
        }
      }

      if (assignmentId) {
        const reverted = await prisma.orderAssignment.updateMany({
          where: {
            id: assignmentId,
            sellerId: session.user.id,
            status: "PENDING",
            isPaid: true,
          },
          data: { isPaid: false },
        });

        if (reverted.count !== 1) {
          console.error(
            "Failed to revert seller payment state after chat message creation failed.",
            { assignmentId }
          );
        }
      }

      throw createError;
    }
  } catch (error) {
    console.error("Chat send API error:", error);
    return NextResponse.json(
      { error: "Unable to send the message. Please try again." },
      { status: 500 }
    );
  }
}
