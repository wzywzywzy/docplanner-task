import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are a friendly, helpful real estate assistant for apartments in Kraków, Poland.
Your job is to understand what the user wants — whether it's a specific search, a vague idea, a question, or even small talk — and help them find apartments.

Return ONLY valid JSON with these fields (use null for anything not mentioned):
{
  "priceMin": number | null,
  "priceMax": number | null,
  "areaMin": number | null,
  "areaMax": number | null,
  "rooms": string | null,
  "district": string | null,
  "keywords": string[],
  "sortBy": "price" | "area" | "rooms" | null,
  "sortOrder": "asc" | "desc" | null,
  "reply": string
}

Rules for "reply":
- Write as a helpful assistant speaking directly to the user.
- If results will be found: "I found X apartments for you — [brief reason based on their query]. Here are the best matches:"
  (Use "X" as a placeholder — it will be replaced with the actual count.)
- If the query is vague or broad: still be helpful, e.g. "Sure! Here are apartments in Kraków sorted by price. Feel free to tell me more about what you're looking for!"
- If the user asks a question (e.g. "what's the average price?"): answer it briefly based on Kraków market knowledge, then say "Meanwhile, here are some listings that might interest you:"
- If the user says something casual like "hello" or "help": respond warmly and suggest what they can ask.
- Keep replies short (1-3 sentences), natural, and friendly. No bullet points in the reply.

Rules for "sortBy" / "sortOrder":
- "most expensive" / "najdroższe" → sortBy: "price", sortOrder: "desc"
- "cheapest" / "najtańsze" → sortBy: "price", sortOrder: "asc"
- "biggest" / "largest" / "największe" → sortBy: "area", sortOrder: "desc"
- "smallest" → sortBy: "area", sortOrder: "asc"
- Default: null (system will sort by price asc)

Context for Kraków real estate:
- Average apartment price: ~500,000-700,000 PLN for 2 rooms, ~300,000-450,000 for studios
- "cheap" or "tanie" typically means < 450,000 PLN for a studio, < 600,000 PLN for 2 rooms
- "expensive" / "premium" / "luksusowe" → high end, sortBy price desc, no priceMax
- "nice" or "ładne" → keywords like "remont", "nowe", "wykończone"
- "centrum" or "center" → district "Stare Miasto" or "Grzegórzki"
- Common districts: Stare Miasto, Podgórze, Nowa Huta, Bronowice, Krowodrza, Dębniki, Prądnik Biały, Ruczaj, Mistrzejowice, Grzegórzki, Czyżyny
- If user gives ONE approximate area number (e.g., "40m"), apply ±15% tolerance → areaMin: 34, areaMax: 46
- If user gives an EXPLICIT range (e.g., "30 to 40 m2", "between 50 and 70"), use the exact numbers → areaMin: 30, areaMax: 40
- Same rule applies to price: explicit ranges use exact numbers, single values get tolerance
- "kawalerka" or "studio" → rooms: "1"
- "2-pokojowe" or "2 rooms" → rooms: "2"`;

interface ParsedQuery {
  priceMin: number | null;
  priceMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  rooms: string | null;
  district: string | null;
  keywords: string[];
  sortBy: "price" | "area" | "rooms" | null;
  sortOrder: "asc" | "desc" | null;
  reply: string;
}

async function parseWithAI(query: string): Promise<ParsedQuery> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackParse(query);
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
    });

    const text = completion.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      return {
        priceMin: raw.priceMin ?? null,
        priceMax: raw.priceMax ?? null,
        areaMin: raw.areaMin ?? null,
        areaMax: raw.areaMax ?? null,
        rooms: raw.rooms ?? null,
        district: raw.district ?? null,
        keywords: raw.keywords ?? [],
        sortBy: raw.sortBy ?? null,
        sortOrder: raw.sortOrder ?? null,
        reply: raw.reply || "Here are some listings for you:",
      };
    }
  } catch (e) {
    console.warn("AI parse failed, using fallback:", e);
  }

  return fallbackParse(query);
}

function fallbackParse(query: string): ParsedQuery {
  const lower = query.toLowerCase();
  const parsed: ParsedQuery = {
    priceMin: null,
    priceMax: null,
    areaMin: null,
    areaMax: null,
    rooms: null,
    district: null,
    keywords: [],
    sortBy: null,
    sortOrder: null,
    reply: "Here are some listings based on your search:",
  };

  // Area
  const areaMatch = lower.match(/(\d+)\s*m/);
  if (areaMatch) {
    const area = parseInt(areaMatch[1]);
    parsed.areaMin = Math.round(area * 0.85);
    parsed.areaMax = Math.round(area * 1.15);
  }

  // Rooms
  if (/kawalerka|studio|1[\s-]?pok/i.test(lower)) parsed.rooms = "1";
  else if (/2[\s-]?pok|two[\s-]?room|2[\s-]?room/i.test(lower))
    parsed.rooms = "2";
  else if (/3[\s-]?pok|three[\s-]?room|3[\s-]?room/i.test(lower))
    parsed.rooms = "3";

  // Price
  if (/cheap|tani|niedrog/i.test(lower)) {
    parsed.priceMax = parsed.rooms === "1" ? 450000 : 600000;
  }

  // Sorting
  if (/most expensive|najdro|highest price/i.test(lower)) {
    parsed.sortBy = "price";
    parsed.sortOrder = "desc";
  } else if (/cheapest|najtań|lowest price/i.test(lower)) {
    parsed.sortBy = "price";
    parsed.sortOrder = "asc";
  } else if (/biggest|largest|najwi/i.test(lower)) {
    parsed.sortBy = "area";
    parsed.sortOrder = "desc";
  }

  // District keywords
  const districts = [
    "Stare Miasto", "Podgórze", "Nowa Huta", "Bronowice", "Krowodrza",
    "Dębniki", "Ruczaj", "Grzegórzki", "Mistrzejowice", "Czyżyny", "Prądnik Biały",
  ];
  for (const d of districts) {
    if (lower.includes(d.toLowerCase())) {
      parsed.district = d;
      break;
    }
  }
  if (/centr|center|śród/i.test(lower) && !parsed.district) {
    parsed.district = "Stare Miasto";
  }

  // Keywords
  const words = query.split(/\s+/).filter((w) => w.length > 2);
  parsed.keywords = words.filter(
    (w) =>
      !/cheap|tani|nice|ładn|want|szuk|mieszkan|flat|apartment|room|pok|krak|\d+m|balkon|expensive|most|biggest/i.test(w) &&
      !/^\d+$/.test(w)
  );

  return parsed;
}

const listingSelect = {
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
  description: true,
} as const;

function buildWhere(parsed: ParsedQuery, includeKeywords: boolean): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {};

  if (parsed.priceMin || parsed.priceMax) {
    where.price = {};
    if (parsed.priceMin) where.price.gte = parsed.priceMin;
    if (parsed.priceMax) where.price.lte = parsed.priceMax;
  }

  if (parsed.areaMin || parsed.areaMax) {
    where.areaM2 = {};
    if (parsed.areaMin) where.areaM2.gte = parsed.areaMin;
    if (parsed.areaMax) where.areaM2.lte = parsed.areaMax;
  }

  if (parsed.rooms) {
    where.rooms = parsed.rooms;
  }

  if (parsed.district) {
    where.district = { contains: parsed.district };
  }

  if (includeKeywords && parsed.keywords.length > 0) {
    where.OR = parsed.keywords.flatMap((kw) => [
      { title: { contains: kw } },
      { description: { contains: kw } },
    ]);
  }

  return where;
}

function buildOrderBy(parsed: ParsedQuery): Prisma.ListingOrderByWithRelationInput {
  const field = parsed.sortBy || "price";
  const dir = parsed.sortOrder || "asc";

  switch (field) {
    case "area":
      return { areaM2: dir };
    case "rooms":
      return { rooms: dir };
    default:
      return { price: dir };
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const query = body.query?.trim();

  if (!query) {
    return Response.json({ error: "Query is required" }, { status: 400 });
  }

  const parsed = await parseWithAI(query);
  const orderBy = buildOrderBy(parsed);

  // Try with keywords first (soft OR)
  const whereWithKw = buildWhere(parsed, true);
  let [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where: whereWithKw,
      take: 12,
      orderBy,
      select: listingSelect,
    }),
    prisma.listing.count({ where: whereWithKw }),
  ]);

  let relaxed = false;

  // If zero results and we had keywords, retry without keywords
  if (total === 0 && parsed.keywords.length > 0) {
    relaxed = true;
    const whereNoKw = buildWhere(parsed, false);
    [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: whereNoKw,
        take: 12,
        orderBy,
        select: listingSelect,
      }),
      prisma.listing.count({ where: whereNoKw }),
    ]);
  }

  // Replace "X" placeholder in reply with actual count
  const reply = parsed.reply.replace(/\bX\b/, String(total));

  return Response.json({
    query,
    parsed: { ...parsed, reply },
    listings,
    total,
    relaxed,
  });
}
