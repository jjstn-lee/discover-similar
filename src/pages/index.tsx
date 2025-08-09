import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import axios from "axios";

export default function Home() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  // temp; remove later
  const interpret = async () => {
    if (!session?.accessToken) return;

    try {
      const res = await fetch("/api/get-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userInput: "Arctic Monkey's AM album but with more danceability",
        }),
      });

      const data = await res.json();
      console.log(data);

    } catch (error) {
      console.error("Error fetching top tracks", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-100">
      {!session ? (
        <button
          type="button"
          onClick={() => signIn("spotify")}
          className="px-6 py-3 text-white bg-green-600 rounded-lg"
        >
          Login with Spotify
        </button>
      ) : (
        <>
          <div className="w-full max-w-xl">
            <input
              type="text"
              className="w-full p-4 text-xl border border-gray-300 rounded-lg"
              placeholder="search for songs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              onClick={interpret}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg"
            >
              Search
            </button>
          </div>
          {/* <ul className="mt-6 w-full max-w-xl">
            {results.map((track) => (
              <li key={track.id} className="p-2 border-b">
                {track.name} – {track.artists[0]?.name}
              </li>
            ))}
          </ul> */}
          <button onClick={() => signOut({ callbackUrl: '/' })} className="mt-6 text-red-600">
            Logout
          </button>
        </>
      )}
    </div>
  );
}
