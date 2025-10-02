"use client"

import { useState } from "react"

// type for search results (matching what your API returns)
type SearchResult = {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
};

// Helper functions to safely access metadata properties
const getMetadataString = (metadata: Record<string, unknown>, key: string): string | undefined => {
  const value = metadata[key];
  return typeof value === 'string' ? value : undefined;
};

const getMetadataNumber = (metadata: Record<string, unknown>, key: string): number | undefined => {
  const value = metadata[key];
  return typeof value === 'number' ? value : undefined;
};

const getMetadataStringArray = (metadata: Record<string, unknown>, key: string): string[] | undefined => {
  const value = metadata[key];
  return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : undefined;
};

export default function SearchInterface() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

    const handleSearch = async () => {
    if (!query.trim()) {
      setError("Please enter a search query");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setSearchPerformed(true);

    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          limit: 10,
        }),
      });

      const result = await response.json();
      
      if (result.success && result.tracks) {
        setResults(result.tracks);
      } else {
        setError(result.error || "Search failed");
      }
    } catch (err) {
      console.error("Error during search:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <>
      {/* Search Section */}
      <div className="mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 text-center">
            <h2 className="text-3xl font-semibold text-foreground mb-2">
              Find Similar Music
            </h2>
            <p className="text-accent">
              Describe the type of music you&apos;re looking for and we&apos;ll find similar songs from your library
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              className="w-full p-4 text-xl bg-secondary text-foreground border border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Search for songs... (e.g., 'upbeat pop songs' or 'relaxing acoustic music')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className={`w-full py-3 rounded-lg text-background font-medium transition-colors flex items-center justify-center gap-2 ${
                loading || !query.trim()
                  ? "bg-accent cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              {loading ? "Searching..." : "Search Similar Music"}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent border-t-primary mb-6"></div>
          <h3 className="text-xl font-medium text-foreground mb-2">Searching for similar songs...</h3>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-2xl mx-auto mb-8">
          <div className="p-4 bg-red-900/20 border border-red-500 text-red-400 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <strong>Error</strong>
            </div>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              Found {results.length} Similar Songs
            </h3>
            <p className="text-accent">Ranked by similarity to your search</p>
          </div>
          
          <div className="grid gap-4">
            {results.map((result, index) => (
              <div 
                key={result.id} 
                className="p-6 bg-secondary rounded-xl shadow-sm border border-accent hover:bg-secondary/80 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-primary text-background rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-lg">
                          {getMetadataString(result.metadata, 'name') || 
                           getMetadataString(result.metadata, 'title') || 
                           "Unknown Title"}
                        </div>
                        <div className="text-accent">
                          {getMetadataString(result.metadata, 'artist') || 
                           (getMetadataStringArray(result.metadata, 'artists')?.[0]) || 
                           "Unknown Artist"}
                        </div>
                      </div>
                    </div>
                    
                    {getMetadataString(result.metadata, 'album') && (
                      <div className="text-accent/70 text-sm mb-3 ml-11">
                        Album: {getMetadataString(result.metadata, 'album')}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">
                      {Math.round((1 - result.score) * 100)}% match
                    </div>
                  </div>
                </div>
                
                {/* Audio Features */}
                {(getMetadataNumber(result.metadata, 'danceability') || 
                  getMetadataNumber(result.metadata, 'energy') || 
                  getMetadataNumber(result.metadata, 'valence')) && (
                  <div className="mt-4 pt-4 border-t border-accent/30 ml-11">
                    <div className="flex flex-wrap gap-4 text-sm">
                      {getMetadataNumber(result.metadata, 'danceability') && (
                        <div className="flex items-center gap-2">
                          <span className="text-accent">Danceability:</span>
                          <div className="bg-accent/20 px-2 py-1 rounded text-foreground">
                            {Math.round(getMetadataNumber(result.metadata, 'danceability')! * 100)}%
                          </div>
                        </div>
                      )}
                      {getMetadataNumber(result.metadata, 'energy') && (
                        <div className="flex items-center gap-2">
                          <span className="text-accent">Energy:</span>
                          <div className="bg-accent/20 px-2 py-1 rounded text-foreground">
                            {Math.round(getMetadataNumber(result.metadata, 'energy')! * 100)}%
                          </div>
                        </div>
                      )}
                      {getMetadataNumber(result.metadata, 'valence') && (
                        <div className="flex items-center gap-2">
                          <span className="text-accent">Mood:</span>
                          <div className="bg-accent/20 px-2 py-1 rounded text-foreground">
                            {Math.round(getMetadataNumber(result.metadata, 'valence')! * 100)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results - Only show after a search has been performed */}
      {!loading && !error && results.length === 0 && query && searchPerformed && (
        <div className="max-w-2xl mx-auto text-center p-12">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-xl font-medium text-foreground mb-2">No Similar Songs Found</h3>
          <p className="text-accent mb-6">
            Try a different search query.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setSearchPerformed(false);
              setResults([]);
              setError(null);
            }}
            className="px-6 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80 transition-colors"
          >
            Clear Search
          </button>
        </div>
      )}
    </>
  )
}