// pages/login.tsx
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Login() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // redirect to home if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-primary mb-4"></div>
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  // don't render login if already authenticated (prevents flash)
  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
      <div className="max-w-md w-full text-center">
        {/* App Logo/Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Music Search</h1>
          <p className="text-accent text-lg">Discover similar songs with AI</p>
        </div>

        {/* Login Card */}
        <div className="bg-secondary p-8 rounded-xl shadow-lg border border-accent">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome</h2>
            <p className="text-accent">Connect your Spotify account to get started</p>
          </div>

          <button
            type="button"
            onClick={() => signIn("spotify", { callbackUrl: "/" })}
            className="w-full px-6 py-3 text-lg font-medium text-background bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Login with Spotify
          </button>

          <div className="mt-6 text-sm text-accent">
            <p className="mb-2">By continuing, you agree to:</p>
            <ul className="text-xs space-y-1">
              <li>• Allow access to your Spotify library</li>
              <li>• Read your top tracks and recent plays</li>
              <li>• Create and modify playlists</li>
            </ul>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-secondary/50 p-4 rounded-lg border border-accent/50">
            <div className="text-primary mb-2">🎵</div>
            <h3 className="font-medium text-foreground">Smart Search</h3>
            <p className="text-accent">Find songs similar to your favorites</p>
          </div>
          <div className="bg-secondary/50 p-4 rounded-lg border border-accent/50">
            <div className="text-primary mb-2">🤖</div>
            <h3 className="font-medium text-foreground">AI Powered</h3>
            <p className="text-accent">Advanced music recommendation engine</p>
          </div>
          <div className="bg-secondary/50 p-4 rounded-lg border border-accent/50">
            <div className="text-primary mb-2">🎧</div>
            <h3 className="font-medium text-foreground">Your Music</h3>
            <p className="text-accent">Personalized based on your library</p>
          </div>
        </div>
      </div>
    </div>
  );
}