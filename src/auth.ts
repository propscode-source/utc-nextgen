import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/zod-schemas";
import { awardPoints } from "@/lib/points";
import { PointEvent } from "@prisma/client";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // daily login points (idempotent per UTC date)
        const today = new Date();
        const sameDay =
          user.lastLoginAt &&
          user.lastLoginAt.getUTCFullYear() === today.getUTCFullYear() &&
          user.lastLoginAt.getUTCMonth() === today.getUTCMonth() &&
          user.lastLoginAt.getUTCDate() === today.getUTCDate();

        if (!sameDay) {
          await awardPoints({
            userId: user.id,
            event: PointEvent.DAILY_LOGIN,
            reason: "Login harian",
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: today },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          nim: user.nim,
          points: user.points + (sameDay ? 0 : 5),
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.nim = user.nim ?? null;
        token.points = user.points ?? 0;
        token.emailVerified = user.emailVerified ?? null;
      }
      if (trigger === "update" && token.id) {
        // If caller passed a partial session.update({ points: 123 }), apply it directly —
        // this lets clients reflect a known new value without an extra DB roundtrip.
        const sessionPatch = session as { points?: number; name?: string; image?: string | null } | undefined;
        if (sessionPatch && typeof sessionPatch.points === "number") {
          token.points = sessionPatch.points;
        } else {
          // Fallback: re-read everything from DB.
          const fresh = await prisma.user.findUnique({
            where: { id: token.id },
            select: { role: true, nim: true, points: true, name: true, image: true, emailVerified: true },
          });
          if (fresh) {
            token.role = fresh.role;
            token.nim = fresh.nim;
            token.points = fresh.points;
            token.name = fresh.name;
            token.picture = fresh.image ?? token.picture;
            token.emailVerified = fresh.emailVerified;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.nim = token.nim ?? null;
        session.user.points = token.points;
        session.user.emailVerified = token.emailVerified ?? null;
      }
      return session as typeof session & DefaultSession;
    },
  },
});
