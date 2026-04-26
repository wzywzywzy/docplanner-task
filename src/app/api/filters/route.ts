import { prisma } from "@/lib/prisma";

export async function GET() {
  const [districts, roomCounts, priceRange, areaRange] = await Promise.all([
    prisma.listing.findMany({
      where: { district: { not: null } },
      select: { district: true },
      distinct: ["district"],
      orderBy: { district: "asc" },
    }),
    prisma.listing.findMany({
      where: { rooms: { not: null } },
      select: { rooms: true },
      distinct: ["rooms"],
      orderBy: { rooms: "asc" },
    }),
    prisma.listing.aggregate({
      _min: { price: true },
      _max: { price: true },
    }),
    prisma.listing.aggregate({
      _min: { areaM2: true },
      _max: { areaM2: true },
    }),
  ]);

  return Response.json({
    districts: districts.map((d: { district: string | null }) => d.district).filter(Boolean),
    rooms: roomCounts
      .map((r: { rooms: string | null }) => r.rooms)
      .filter(Boolean)
      .sort((a: string | null, b: string | null) => parseInt(a!) - parseInt(b!)),
    priceRange: {
      min: priceRange._min.price,
      max: priceRange._max.price,
    },
    areaRange: {
      min: areaRange._min.areaM2,
      max: areaRange._max.areaM2,
    },
  });
}
