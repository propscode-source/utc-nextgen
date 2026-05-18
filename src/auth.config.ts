import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config (no DB / Node-only imports).
 * Used by middleware. The full config in `./auth.ts` extends this.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [], // populated in `./auth.ts`
  callbacks: {
    authorized({ auth, request }) {
      const isAuthed = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isPublic =
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/verify-email" ||
        pathname.startsWith("/verify/") ||
        pathname.startsWith("/cert/") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/register");

      if (isPublic) return true;
      return isAuthed;
    },
  },
} satisfies NextAuthConfig;
