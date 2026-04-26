# Reasoning Document

## Data Acquisition

**Source:** OLX.pl — Kraków apartment sales. I tried Otodom (403) and Sprzedajemy (connection refused) first. OLX worked because it embeds a `__PRERENDERED_STATE__` JSON blob in every page — structured data from a single `curl` call, no headless browser needed.

**Fields:** title, price, area, rooms, floor, building type, market, furnished, district, lat/lng, images, seller info, description. These cover the three filters users use most (price/area/rooms) plus location, visuals, and text for search.

## Data Cleaning & Storage

- **Room count:** OLX stores as English words ("one", "two") — normalised to integers at ingest.
- **Descriptions:** HTML stripped to plain text; full content preserved for search and AI.
- **Missing values:** 4/107 lack floor, 1 lacks district — fields are optional, listings still appear.
- **Deduplication:** Two layers — scraper dedupes by `externalId` during crawl, `UPSERT` prevents DB duplicates.

**Schema:** MySQL 8 + Prisma 7. One practical challenge: Prisma's `@prisma/adapter-mariadb` requires `mariadb://` at runtime while CLI requires `mysql://` — solved with two env vars and an auto-rewrite fallback.

## Architecture

**Next.js 16 App Router** — API routes and React in one project, no CORS, server-rendered detail pages. Three endpoints: `GET /api/listings` (filtered search + pagination), `GET /api/filters` (dropdown values), `POST /api/chat-search` (AI intent parsing).

## AI: Intent-Based Search

**Problem:** Users search with vague intent ("cheap nice flat 40m") — they don't know Kraków price ranges or district names.

**Solution:** Natural language → OpenAI GPT-4o-mini → structured JSON (`{priceMin, priceMax, areaMin, areaMax, rooms, district, keywords, sortBy, sortOrder, reply}`) → Prisma WHERE + ORDER BY → same listing response as filter search.

**Key prompt decisions:**
- **Assistant persona** — AI responds conversationally ("I found 3 apartments for you..."), handles greetings, market questions, and superlatives ("most expensive" → sort price desc).
- **Market context injection** — "cheap" = <450K PLN for studios, <600K for 2-room. Without this, the AI guesses generic numbers.
- **Smart area tolerance** — "40m" gets ±15% (34–46 m²), but explicit "30 to 40 m2" uses exact numbers.
- **Soft keywords + auto-retry** — keywords match via OR (not AND). If still 0 results, system retries without keywords and flags `relaxed: true`.
- **Fallback** — no API key → regex-based parsing. Same response shape, same UI — app works without external APIs.

Validated with 14 test cases covering English/Polish, price/area/room/district, sorting, and edge cases.

## Key Assumption

107 listings from one OLX.pl crawl (April 2026). Prices in PLN, areas in m². Assumes stable `__PRERENDERED_STATE__` format. Production would need per-source parsers and a normalisation pipeline.

## Success Metric

**Search-to-click rate** — % of searches where users click into a detail page. Target: >70% on first attempt. Measures both filter accuracy and AI intent quality.

## Failure Modes

1. **Scraper breakage** — OLX format change → 0 listings silently. Mitigation: field coverage logging.
2. **AI hallucination** — invalid JSON or unreasonable values. Mitigation: fallback parser + transparent UI showing AI interpretation.
3. **Small dataset** — some districts have 1-2 listings; combined filters easily return 0. Mitigation: auto-relaxed retry.

## What I Would Improve

1. Scheduled re-crawling with incremental updates
2. Map view (lat/lng already in DB)
3. MySQL FULLTEXT index for better relevance ranking
4. Multi-source support (Otodom via alternate method)
5. Price history and trend detection
