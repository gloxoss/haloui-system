import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: number;
      username: string;
      role: "superadmin" | "admin" | "user";
    };
  }

  interface User {
    username: string;
    role: "superadmin" | "admin" | "user";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    role?: "superadmin" | "admin" | "user";
  }
}
