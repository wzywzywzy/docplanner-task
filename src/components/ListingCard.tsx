import Link from "next/link";

interface Props {
  listing: {
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
  };
}

function formatPrice(price: number | null, currency: string) {
  if (price == null) return "Price on request";
  return `${price.toLocaleString("pl-PL")} ${currency}`;
}

export default function ListingCard({ listing }: Props) {
  const images = Array.isArray(listing.images) ? listing.images : [];
  const thumb = images[0] as string | undefined;

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white"
    >
      <div className="aspect-[4/3] bg-gray-100 relative">
        {thumb ? (
          <img
            src={thumb}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No photo
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2">
          {listing.title}
        </h3>
        <p className="text-lg font-bold text-blue-700 mb-1">
          {formatPrice(listing.price, listing.currency)}
        </p>
        <div className="flex gap-3 text-xs text-gray-500">
          {listing.areaM2 && <span>{listing.areaM2} m&sup2;</span>}
          {listing.rooms && <span>{listing.rooms} rooms</span>}
          {listing.floor && <span>Floor {listing.floor}</span>}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {[listing.district, listing.city].filter(Boolean).join(", ")}
        </p>
      </div>
    </Link>
  );
}
