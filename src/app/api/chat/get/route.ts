import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function emptyMessages() {
  return NextResponse.json({ messages: [] });
}

export async function GET(request: Request) {
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

  try {
    let where: Prisma.ChatMessageWhereInput;
    if (session.user.role === "SELLER") {
      const seller = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, isApproved: true },
      });

      if (seller?.role !== "SELLER" || !seller.isApproved) {
        return NextResponse.json(
          { error: "An approved seller account is required." },
          { status: 403 }
        );
      }

      const superAdmins = await prisma.user.findMany({
        where: { role: "SUPER_ADMIN" },
        select: { id: true },
      });

      if (superAdmins.length === 0) {
        return emptyMessages();
      }

      const superAdminIds = superAdmins.map(({ id }) => id);
      where = {
        OR: [
          {
            senderId: session.user.id,
            receiverId: { in: superAdminIds },
          },
          {
            senderId: { in: superAdminIds },
            receiverId: session.user.id,
          },
        ],
      };
    } else {
      const sellerId = new URL(request.url).searchParams.get("sellerId");
      const superAdmins = await prisma.user.findMany({
        where: { role: "SUPER_ADMIN" },
        select: { id: true },
      });
      if (superAdmins.length === 0) return emptyMessages();
      const superAdminIds = superAdmins.map(({ id }) => id);

      if (sellerId) {
        const seller = await prisma.user.findFirst({
          where: { id: sellerId, role: "SELLER" },
          select: { id: true },
        });
        if (!seller) {
          return NextResponse.json({ error: "Seller not found." }, { status: 404 });
        }

        where = {
          OR: [
            { senderId: seller.id, receiverId: { in: superAdminIds } },
            { senderId: { in: superAdminIds }, receiverId: seller.id },
          ],
        };
      } else {
        const sellers = await prisma.user.findMany({
          where: { role: "SELLER" },
          select: { id: true },
        });
        if (sellers.length === 0) return emptyMessages();
        const sellerIds = sellers.map(({ id }) => id);
        where = {
          OR: [
            { senderId: { in: sellerIds }, receiverId: { in: superAdminIds } },
            { senderId: { in: superAdminIds }, receiverId: { in: sellerIds } },
          ],
        };
      }
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
    });

    if (messages.length === 0) {
      return emptyMessages();
    }

    const participants = await prisma.user.findMany({
      where: {
        id: {
          in: Array.from(
            new Set(
              messages.flatMap(({ senderId, receiverId }) => [
                senderId,
                receiverId,
              ])
            )
          ),
        },
      },
      select: { id: true, name: true, email: true, role: true },
    });
    const participantsById = new Map(
      participants.map((participant) => [participant.id, participant])
    );
    const messageViews = messages.map((message) => {
      const sender = participantsById.get(message.senderId);
      const receiver = participantsById.get(message.receiverId);

      if (!sender || !receiver) {
        throw new Error(`Chat message ${message.id} has a missing participant.`);
      }

      return { ...message, sender, receiver };
    });

    const unreadIds = messages
      .filter(
        (message) =>
          message.receiverId === session.user.id && !message.isRead
      )
      .map((message) => message.id);

    if (unreadIds.length > 0) {
      await prisma.chatMessage.updateMany({
        where: { id: { in: unreadIds }, receiverId: session.user.id },
        data: { isRead: true },
      });
    }

    return NextResponse.json({
      messages: messageViews.reverse().map((message) => ({
        ...message,
        isRead:
          message.receiverId === session.user.id ? true : message.isRead,
        createdAt: message.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Chat get API error:", error);
    return NextResponse.json(
      { error: "Unable to load messages. Please try again." },
      { status: 500 }
    );
  }
}
