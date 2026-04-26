"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface FiltersData {
  districts: string[];
  rooms: string[];
  priceRange: { min: number | null; max: number | null };
  areaRange: { min: number | null; max: number | null };
}

export default function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FiltersData | null>(null);

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [priceMin, setPriceMin] = useState(searchParams.get("priceMin") || "");
  const [priceMax, setPriceMax] = useState(searchParams.get("priceMax") || "");
  const [areaMin, setAreaMin] = useState(searchParams.get("areaMin") || "");
  const [areaMax, setAreaMax] = useState(searchParams.get("areaMax") || "");
  const [rooms, setRooms] = useState(searchParams.get("rooms") || "");
  const [district, setDistrict] = useState(searchParams.get("district") || "");

  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then(setFilters);
  }, []);

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (priceMin) params.set("priceMin", priceMin);
    if (priceMax) params.set("priceMax", priceMax);
    if (areaMin) params.set("areaMin", areaMin);
    if (areaMax) params.set("areaMax", areaMax);
    if (rooms) params.set("rooms", rooms);
    if (district) params.set("district", district);
    params.set("page", "1");
    router.push(`/?${params.toString()}`);
  }, [q, priceMin, priceMax, areaMin, areaMax, rooms, district, router]);

  const handleReset = () => {
    setQ("");
    setPriceMin("");
    setPriceMax("");
    setAreaMin("");
    setAreaMax("");
    setRooms("");
    setDistrict("");
    router.push("/");
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      {/* Text search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search listings..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
        <input
          type="number"
          placeholder="Price min"
          value={priceMin}
          onChange={(e) => setPriceMin(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
        <input
          type="number"
          placeholder="Price max"
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
        <input
          type="number"
          placeholder="Area min m&sup2;"
          value={areaMin}
          onChange={(e) => setAreaMin(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
        <input
          type="number"
          placeholder="Area max m&sup2;"
          value={areaMax}
          onChange={(e) => setAreaMax(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
        <select
          value={rooms}
          onChange={(e) => setRooms(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
        >
          <option value="">Rooms</option>
          {filters?.rooms.map((r) => (
            <option key={r} value={r}>
              {r} {parseInt(r!) === 1 ? "room" : "rooms"}
            </option>
          ))}
        </select>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
        >
          <option value="">District</option>
          {filters?.districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700"
          >
            Search
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
