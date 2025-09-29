// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import type { NextAuthOptions } from "next-auth";
import { SpotifyAccount, SpotifyJwt } from "@/types/next-auth";
import type { JWT } from "next-auth/jwt";

// Define scopes in one place to avoid mismatches
const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-top-read", 
  "user-library-read",
  "user-read-recently-played",
  "playlist-modify-public",
  "playlist-modify-private"
].join(" ");

// Type guard to check if token is a SpotifyJwt
function isSpotifyJwt(token: JWT): token is SpotifyJwt {
  return (
    typeof token.accessToken === 'string' &&
    typeof token.refreshToken === 'string' &&
    typeof token.accessTokenExpires === 'number'
  );
}

async function refreshAccessToken(token: SpotifyJwt): Promise<JWT> {
  try {
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await res.json();

    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing Spotify access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
          prompt: "consent",
          show_dialog: "true",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, account }): Promise<JWT> {
      if (account && account.provider === "spotify") {
        const spotifyAccount = account as SpotifyAccount;
        return {
          accessToken: spotifyAccount.access_token,
          accessTokenExpires: Date.now() + spotifyAccount.expires_in * 1000,
          refreshToken: spotifyAccount.refresh_token,
          user: token.user,
        };
      }

      if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      if (isSpotifyJwt(token)) {
        return await refreshAccessToken(token);
      }

      return { ...token, error: "RefreshAccessTokenError" };
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

// Export handlers for App Router
export { handler as GET, handler as POST };