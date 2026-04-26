import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "12")));
  const skip = (page - 1) * limit;

  const q = sp.get("q")?.trim() || "";
  const priceMin = sp.get("priceMin") ? parseInt(sp.get("priceMin")!) : undefined;
  const priceMax = sp.get("priceMax") ? parseInt(sp.get("priceMax")!) : undefined;
  const areaMin = sp.get("areaMin") ? parseFloat(sp.get("areaMin")!) : undefined;
  const areaMax = sp.get("areaMax") ? parseFloat(sp.get("areaMax")!) : undefined;
  const rooms = sp.get("rooms") || undefined;
  const district = sp.get("district") || undefined;

  const where: Prisma.ListingWhereInput = {};

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { district: { contains: q } },
    ];
  }

  if (priceMin !== undefined || priceMax !== undefined) {
    where.price = {};
    if (priceMin !== undefined) where.price.gte = priceMin;
    if (priceMax !== undefined) where.price.lte = priceMax;
  }

  if (areaMin !== undefined || areaMax !== undefined) {
    where.areaM2 = {};
    if (areaMin !== undefined) where.areaM2.gte = areaMin;
    if (areaMax !== undefined) where.areaM2.lte = areaMax;
  }

  if (rooms) {
    where.rooms = rooms;
  }

  if (district) {
    where.district = { contains: district };
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      skip,
      take: limit,
      orderBy: { price: "asc" },
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        areaM2: true,
        rooms: true,
        district: true,
        city: true,
        images: true,
        floor: true,
        buildingType: true,
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return Response.json({
    listings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
