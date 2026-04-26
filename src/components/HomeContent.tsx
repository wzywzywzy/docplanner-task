"use client";

import { useState } from "react";
import ListingsView from "./ListingsView";
import ChatSearch from "./ChatSearch";

export default function HomeContent() {
  const [mode, setMode] = useState<"filters" | "chat">("filters");

  return (
    <>
      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("filters")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "filters"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Filters Search
        </button>
        <button
          onClick={() => setMode("chat")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "chat"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          AI Chat Search
        </button>
      </div>

      {mode === "filters" ? <ListingsView /> : <ChatSearch />}
    </>
  );
}
