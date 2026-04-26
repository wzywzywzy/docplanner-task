"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ListingCard from "./ListingCard";
import Pagination from "./Pagination";
import SearchFilters from "./SearchFilters";

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

interface ListingsResponse {
  listings: ListingItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function ListingsView() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- client-only fetch, not a cascading render

    const params = new URLSearchParams(searchParams.toString());
    if (!params.has("page")) params.set("page", "1");

    fetch(`/api/listings?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (id === reqId.current) {
          setData(d);
          setLoading(false);
        }
      });
  }, [searchParams]);

  return (
    <>
      <SearchFilters />

      {loading && (
        <div className="text-center py-12 text-gray-400">Loading listings...</div>
      )}

      {!loading && data && (
        <>
          {data.listings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No listings found. Try adjusting your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
          />
        </>
      )}
    </>
  );
}
