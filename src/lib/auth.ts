import NextAuth from "next-auth";
import type { EmailConfig } from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { sendEmail } from "./email/send";
import { magicLinkEmail } from "./email/templates";

/** Passwordless email sign-in (magic link) using our own email transport. */
const emailProvider: EmailConfig = {
  id: "email",
  type: "email",
  name: "Email",
  from: process.env.EMAIL_FROM || "no-reply@example.com",
  maxAge: 24 * 60 * 60,
  options: {},
  async sendVerificationRequest({ identifier, url }) {
    await sendEmail(magicLinkEmail(identifier, url));
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [emailProvider],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
    error: "/login/error",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user && user) session.user.id = user.id;
      return session;
    },
  },
});
