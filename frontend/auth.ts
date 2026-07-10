import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { apiClient } from "@/lib/api-client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        try {
          const token = await apiClient.login({ email, password });
          const user = await apiClient.me(token.access_token);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            accessToken: token.access_token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.accessToken = user.accessToken;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
});
