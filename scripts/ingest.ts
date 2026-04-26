/**
 * Import OLX listings from scraped JSON into MySQL via Prisma.
 *
 * Usage: npx tsx scripts/ingest.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { readFileSync } from "fs";
import { join } from "path";

const url = process.env.MARIADB_URL || process.env.DATABASE_URL!.replace(/^mysql:/, "mariadb:");
const adapter = new PrismaMariaDb(url);
const prisma = new PrismaClient({ adapter });

interface RawListing {
  externalId: string;
  sourceUrl: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  pricePerM2: number | null;
  areaM2: number | null;
  rooms: string | null;
  floor: string | null;
  buildingType: string | null;
  market: string | null;
  furnished: string | null;
  city: string | null;
  district: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  sellerName: string | null;
  sellerType: string | null;
  createdAt: string | null;
}

function normaliseRooms(raw: string | null): string | null {
  if (!raw) return null;
  const map: Record<string, string> = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
  };
  return map[raw] ?? raw;
}

function cleanDescription(raw: string | null): string | null {
  if (!raw) return null;
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function main() {
  const dataPath = join(__dirname, "../data/raw/olx-listings.json");
  const raw = JSON.parse(readFileSync(dataPath, "utf-8"));
  const listings: RawListing[] = raw.listings;

  console.log(`Loaded ${listings.length} listings from JSON`);

  let created = 0;
  let skipped = 0;

  for (const l of listings) {
    try {
      await prisma.listing.upsert({
        where: { externalId: l.externalId },
        update: {
          title: l.title,
          description: cleanDescription(l.description),
          price: l.price,
          currency: l.currency || "PLN",
          pricePerM2: l.pricePerM2,
          areaM2: l.areaM2,
          rooms: normaliseRooms(l.rooms),
          floor: l.floor,
          buildingType: l.buildingType,
          market: l.market,
          furnished: l.furnished,
          city: l.city || "Kraków",
          district: l.district,
          region: l.region,
          latitude: l.latitude,
          longitude: l.longitude,
          images: l.images || [],
          sellerName: l.sellerName,
          sellerType: l.sellerType,
          sourceDate: l.createdAt,
        },
        create: {
          externalId: l.externalId,
          sourceUrl: l.sourceUrl,
          title: l.title,
          description: cleanDescription(l.description),
          price: l.price,
          currency: l.currency || "PLN",
          pricePerM2: l.pricePerM2,
          areaM2: l.areaM2,
          rooms: normaliseRooms(l.rooms),
          floor: l.floor,
          buildingType: l.buildingType,
          market: l.market,
          furnished: l.furnished,
          city: l.city || "Kraków",
          district: l.district,
          region: l.region,
          latitude: l.latitude,
          longitude: l.longitude,
          images: l.images || [],
          sellerName: l.sellerName,
          sellerType: l.sellerType,
          sourceDate: l.createdAt,
        },
      });
      created++;
    } catch (e: unknown) {
      skipped++;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  Skip ${l.externalId}: ${msg.slice(0, 80)}`);
    }
  }

  console.log(`\nDone: ${created} upserted, ${skipped} skipped`);
  const total = await prisma.listing.count();
  console.log(`Total listings in DB: ${total}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
