// types/next-auth.d.ts
import { NextAuth, Account } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    error?: string;
    user?: unknown;
  }
}

export interface SpotifyJwt extends JWT {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
  [key: string]: unknown;
}

export interface SpotifyAccount extends Account {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}
