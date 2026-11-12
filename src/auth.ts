import { Role } from "@prisma/client";
import { CredentialsSignin } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

class SellerApprovalPendingError extends CredentialsSignin {
  code = "seller_pending_approval";
}

class FrozenAccountError extends CredentialsSignin {
  code = "account_frozen";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        accountType: { label: "Account type", type: "text" },
      },
      async authorize(credentials) {
        if (
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string" ||
          typeof credentials.accountType !== "string"
        ) {
          return null;
        }

        const accountType = credentials.accountType;
        if (
          accountType !== "normal" &&
          accountType !== "ADMIN" &&
          accountType !== "SUPER_ADMIN"
        ) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            status: true,
            isApproved: true,
            createdBy: { select: { role: true } },
          },
        });

        if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
          return null;
        }

        if (user.status !== "ACTIVE") {
          throw new FrozenAccountError();
        }

        const isNormalAccount =
          accountType === "normal" &&
          (user.role === "BUYER" || user.role === "SELLER");
        const isSelectedAdminRole = user.role === accountType;

        if (!isNormalAccount && !isSelectedAdminRole) {
          return null;
        }

        if (
          accountType === "normal" &&
          user.role === "SELLER" &&
          !user.isApproved
        ) {
          throw new SellerApprovalPendingError();
        }

        if (
          user.role === "ADMIN" &&
          user.createdBy?.role !== "SUPER_ADMIN"
        ) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      const role = Object.values(Role).find(
        (candidate) => candidate === token.role
      );

      if (session.user && token.sub && role) {
        session.user.id = token.sub;
        session.user.role = role;
      }

      return session;
    },
  },
});
