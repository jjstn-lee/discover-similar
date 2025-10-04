// app/auth/error/page.tsx
import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 bg-secondary rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-red-400 mb-4">Authentication Error</h1>
        <p className="text-foreground mb-6">
          {error === "Configuration" && "There is a problem with the server configuration."}
          {error === "AccessDenied" && "You denied access to your Spotify account."}
          {error === "Verification" && "The verification token has expired or has already been used."}
          {!error && "An unknown error occurred during authentication."}
        </p>
        <Link 
          href="/login"
          className="block w-full text-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}