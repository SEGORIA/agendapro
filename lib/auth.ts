import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findFirst({
          where: { email, isActive: true },
          include: { tenant: true },
        });

        if (!user || !user.password) return null;

        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenant.slug,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.tenantSlug = (user as any).tenantSlug;
      }

      // Impersonación (solo SUPER_ADMIN)
      if (trigger === "update" && token.role === "SUPER_ADMIN") {
        if (session?.impersonateTenantId && !token.impersonating) {
          const target = await prisma.tenant.findUnique({
            where: { id: session.impersonateTenantId },
            select: { id: true, slug: true, isActive: true },
          });

          if (target?.isActive) {
            token.originalTenantId = token.tenantId as string;
            token.originalTenantSlug = token.tenantSlug as string;
            token.tenantId = target.id;
            token.tenantSlug = target.slug;
            token.impersonating = true;
          }
        } else if (session?.exitImpersonation && token.impersonating) {
          token.tenantId = token.originalTenantId as string;
          token.tenantSlug = token.originalTenantSlug as string;
          token.impersonating = false;
          delete token.originalTenantId;
          delete token.originalTenantSlug;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantSlug = token.tenantSlug as string;
        session.user.impersonating = Boolean(token.impersonating);
        if (token.originalTenantSlug) {
          session.user.originalTenantSlug = token.originalTenantSlug as string;
        }
      }
      return session;
    },
  },
});
