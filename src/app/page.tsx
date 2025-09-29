// app/home/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SearchInterface from "@/components/SearchInterface";
import { authOptions } from "@/auth";

export default async function HomePage() {
  // Server-side session check
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-accent bg-secondary/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Discover Similar</h1>
          </div>

          {/* Logout button uses plain link to NextAuth signout route */}
          <a
            href="/api/auth/signout?callbackUrl=/login"
            className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Logout
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-8">
        <SearchInterface />
      </main>
    </div>
  );
}
