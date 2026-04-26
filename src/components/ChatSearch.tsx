"use client";

import { useState } from "react";
import ListingCard from "./ListingCard";

interface ListingItem {
  id: number;
  title: string;
  price: number | null;
  currency: string;
  areaM2: number | null;
  rooms: string | null;
  district: string | null;
  city: string;
  images: unknown;
  floor: string | null;
  buildingType: string | null;
}

interface ChatResult {
  query: string;
  parsed: {
    reply: string;
    priceMin: number | null;
    priceMax: number | null;
    areaMin: number | null;
    areaMax: number | null;
    rooms: string | null;
    district: string | null;
    keywords: string[];
    sortBy: string | null;
    sortOrder: string | null;
  };
  listings: ListingItem[];
  total: number;
  relaxed: boolean;
}

export default function ChatSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const filters = result?.parsed;
  const hasFilters =
    filters &&
    (filters.priceMin || filters.priceMax || filters.areaMin || filters.rooms || filters.district || filters.sortBy);

  return (
    <div className="mb-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder='Try: "I want the most expensive flat" or "cheap 2-room in Podgórze" or "hello!"'
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? "Thinking..." : "Ask AI"}
          </button>
        </div>

        {result && (
          <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-6-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-2 4a5 5 0 0 0-4.546 2.916A5.986 5.986 0 0 0 10 16a5.986 5.986 0 0 0 4.546-2.084A5 5 0 0 0 10 12Z" clipRule="evenodd" />
                </svg>
              </span>
              <p>{result.parsed.reply}</p>
            </div>
            {hasFilters && (
              <div className="mt-2 ml-6 flex flex-wrap gap-1.5 text-xs">
                {(filters.priceMin || filters.priceMax) && (
                  <span className="bg-blue-100 px-2 py-0.5 rounded">
                    Price: {filters.priceMin ? `${filters.priceMin.toLocaleString()}–` : "up to "}
                    {filters.priceMax ? `${filters.priceMax.toLocaleString()} PLN` : "no limit"}
                  </span>
                )}
                {filters.areaMin && (
                  <span className="bg-blue-100 px-2 py-0.5 rounded">
                    Area: {filters.areaMin}–{filters.areaMax} m²
                  </span>
                )}
                {filters.rooms && (
                  <span className="bg-blue-100 px-2 py-0.5 rounded">
                    Rooms: {filters.rooms}
                  </span>
                )}
                {filters.district && (
                  <span className="bg-blue-100 px-2 py-0.5 rounded">
                    District: {filters.district}
                  </span>
                )}
                {filters.sortBy && (
                  <span className="bg-blue-100 px-2 py-0.5 rounded">
                    Sort: {filters.sortBy} {filters.sortOrder === "desc" ? "high→low" : "low→high"}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {result && (
        <div className="mt-4">
          {result.listings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No listings found. Try a broader search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {result.listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
