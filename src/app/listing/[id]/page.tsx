import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

function formatPrice(price: number | null, currency: string) {
  if (price == null) return "Price on request";
  return `${price.toLocaleString("pl-PL")} ${currency}`;
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) notFound();

  const listing = await prisma.listing.findUnique({ where: { id: numId } });
  if (!listing) notFound();

  const images = Array.isArray(listing.images) ? (listing.images as string[]) : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; Back to listings
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Image gallery */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 bg-gray-100">
            {images.slice(0, 6).map((url, i) => (
              <div
                key={i}
                className={`aspect-[4/3] ${i === 0 ? "col-span-2 row-span-2" : ""}`}
              >
                <img
                  src={url}
                  alt={`${listing.title} - photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{listing.title}</h1>
              <p className="text-gray-500">
                {[listing.district, listing.city, listing.region]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-700">
                {formatPrice(listing.price, listing.currency)}
              </p>
              {listing.pricePerM2 && (
                <p className="text-sm text-gray-500">
                  {listing.pricePerM2.toLocaleString("pl-PL")} {listing.currency}
                  /m&sup2;
                </p>
              )}
            </div>
          </div>

          {/* Key facts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            {listing.areaM2 && (
              <div>
                <p className="text-xs text-gray-400 uppercase">Area</p>
                <p className="font-semibold">{listing.areaM2} m&sup2;</p>
              </div>
            )}
            {listing.rooms && (
              <div>
                <p className="text-xs text-gray-400 uppercase">Rooms</p>
                <p className="font-semibold">{listing.rooms}</p>
              </div>
            )}
            {listing.floor && (
              <div>
                <p className="text-xs text-gray-400 uppercase">Floor</p>
                <p className="font-semibold">{listing.floor}</p>
              </div>
            )}
            {listing.buildingType && (
              <div>
                <p className="text-xs text-gray-400 uppercase">Building</p>
                <p className="font-semibold">{listing.buildingType}</p>
              </div>
            )}
            {listing.market && (
              <div>
                <p className="text-xs text-gray-400 uppercase">Market</p>
                <p className="font-semibold">{listing.market}</p>
              </div>
            )}
            {listing.furnished && (
              <div>
                <p className="text-xs text-gray-400 uppercase">Furnished</p>
                <p className="font-semibold">{listing.furnished}</p>
              </div>
            )}
            {listing.sellerType && (
              <div>
                <p className="text-xs text-gray-400 uppercase">Seller</p>
                <p className="font-semibold">
                  {listing.sellerName || listing.sellerType}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <div className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">
                {listing.description}
              </div>
            </div>
          )}

          {/* Source link */}
          <div className="border-t pt-4 flex items-center justify-between text-sm text-gray-400">
            <span>
              Listed: {listing.sourceDate ? new Date(listing.sourceDate).toLocaleDateString() : "N/A"}
            </span>
            <a
              href={listing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View original on OLX.pl &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
