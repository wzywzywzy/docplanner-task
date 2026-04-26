#!/usr/bin/env node
/**
 * OLX.pl Kraków apartment-for-sale scraper.
 *
 * Strategy:
 *   1. Fetch list pages to collect ~100 detail-page URLs.
 *   2. Fetch each detail page and extract __PRERENDERED_STATE__ JSON.
 *   3. Normalise into a clean schema and write to data/raw/olx-listings.json.
 *
 * Usage:  node scripts/scrape-olx.mjs
 */

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data", "raw");
const OUT_FILE = join(OUT_DIR, "olx-listings.json");

const BASE = "https://www.olx.pl";
const LIST_URL = `${BASE}/nieruchomosci/mieszkania/sprzedaz/krakow/`;
const PAGES_TO_CRAWL = 10; // ~20 per page → ~200 candidates
const DETAIL_LIMIT = 130;
const DELAY_MS = 1500; // polite delay between requests

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch a URL via curl (more reliable than Node fetch for anti-bot pages). */
function curlGet(url) {
  try {
    const out = execSync(
      `curl -s -L --max-time 30 ` +
        `-H "User-Agent: ${UA}" ` +
        `-H "Accept-Language: pl-PL,pl;q=0.9,en-US;q=0.8" ` +
        `-H "Accept: text/html,application/xhtml+xml" ` +
        `"${url}"`,
      { maxBuffer: 20 * 1024 * 1024, encoding: "utf-8" }
    );
    return out;
  } catch {
    return null;
  }
}

// ── step 1: collect listing URLs from list pages ─────────────────────────────

async function collectListingUrls() {
  const urls = new Set();

  for (let page = 1; page <= PAGES_TO_CRAWL; page++) {
    const listUrl = `${LIST_URL}?page=${page}`;
    console.log(`[list] Fetching page ${page}: ${listUrl}`);
    const html = curlGet(listUrl);
    if (!html) {
      console.warn(`  ⚠ Failed to fetch page ${page}`);
      continue;
    }

    // Extract /d/oferta/... links, strip query params to deduplicate
    const re = /\/d\/oferta\/[^"'\s?]+/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const path = m[0].split('"')[0].split("'")[0];
      if (path.includes("CID3")) {
        urls.add(BASE + path);
      }
    }

    console.log(`  → cumulative unique URLs: ${urls.size}`);
    if (urls.size >= DETAIL_LIMIT) break;
    await sleep(DELAY_MS);
  }

  return [...urls].slice(0, DETAIL_LIMIT);
}

// ── step 2: fetch detail page & extract structured data ──────────────────────

function extractPrerenderedState(html) {
  const match = html.match(/__PRERENDERED_STATE__\s*=\s*"([\s\S]*?)";/);
  if (!match) return null;
  try {
    // The value is a JS string literal (double-quoted) whose content is JSON.
    // Inside that string: \" → ", \\\\ → \\, \\n → newline, \\uXXXX → unicode char.
    // We evaluate it as a JS string literal by wrapping in quotes and using JSON.parse
    // on the string itself (JSON strings share the same escape rules).
    const jsonStr = JSON.parse('"' + match[1] + '"');
    return JSON.parse(jsonStr);
  } catch {
    // Fallback: manual unescape
    try {
      let s = match[1];
      s = s.replace(/\\\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
      s = s.replace(/\\\\n/g, "\n");
      s = s.replace(/\\\\t/g, "\t");
      s = s.replace(/\\"/g, '"');
      s = s.replace(/\\\\/g, "\\");
      return JSON.parse(s);
    } catch (e2) {
      console.warn("  ⚠ JSON parse error:", e2.message?.slice(0, 100));
      return null;
    }
  }
}

function normaliseAd(state) {
  const ad = state?.ad?.ad;
  if (!ad) return null;

  // Build param map
  const params = {};
  for (const p of ad.params || []) {
    params[p.key] = {
      value: p.value,
      normalized: p.normalizedValue,
    };
  }

  const loc = ad.location || {};
  const price = ad.price?.regularPrice || {};

  return {
    externalId: String(ad.id),
    sourceUrl: ad.url,
    title: ad.title,
    description: ad.description?.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""),
    price: price.value ?? null,
    currency: price.currencyCode || "PLN",
    pricePerM2: parseFloat(params.price_per_m?.normalized) || null,
    areaM2: parseFloat(params.m?.normalized) || null,
    rooms: params.rooms?.normalized || params.rooms?.value || null,
    floor: params.floor_select?.value || null,
    buildingType: params.builttype?.normalized || params.builttype?.value || null,
    market: params.market?.normalized || params.market?.value || null,
    furnished: params.furniture?.normalized || null,
    city: loc.cityName || null,
    district: loc.districtName || null,
    region: loc.regionName || null,
    locationPath: loc.pathName || null,
    latitude: ad.map?.lat ?? null,
    longitude: ad.map?.lon ?? null,
    images: (ad.photos || []).map((url) =>
      typeof url === "string" ? url.split(";")[0] : url
    ),
    sellerName: ad.contact?.name || null,
    sellerType: ad.user?.sellerType || (ad.isBusiness ? "business" : "private"),
    createdAt: ad.createdTime || null,
    lastRefreshed: ad.lastRefreshTime || null,
    rawParams: params,
  };
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== OLX Kraków Apartment Scraper ===\n");

  // Step 1
  const urls = await collectListingUrls();
  console.log(`\n[detail] Will fetch ${urls.length} detail pages\n`);

  // Step 2
  const listings = [];
  const errors = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] ${url.split("/").pop()}`);

    const html = curlGet(url);
    if (!html) {
      errors.push({ url, error: "fetch failed" });
      console.warn("  ⚠ fetch failed");
      continue;
    }

    const state = extractPrerenderedState(html);
    if (!state) {
      errors.push({ url, error: "no __PRERENDERED_STATE__" });
      console.warn("  ⚠ no prerendered state");
      continue;
    }

    const listing = normaliseAd(state);
    if (!listing) {
      errors.push({ url, error: "normalisation failed" });
      console.warn("  ⚠ normalisation failed");
      continue;
    }

    // Deduplicate by externalId
    if (listings.some((l) => l.externalId === listing.externalId)) {
      console.log(`  ⏭ duplicate (${listing.externalId})`);
      continue;
    }

    listings.push(listing);
    console.log(`  ✓ ${listing.title?.slice(0, 60)} | ${listing.price} PLN | ${listing.areaM2} m²`);

    await sleep(DELAY_MS);
  }

  // Step 3: write output
  mkdirSync(OUT_DIR, { recursive: true });

  const output = {
    source: "olx.pl",
    sourceCategory: "nieruchomości/mieszkania/sprzedaż/kraków",
    generatedAt: new Date().toISOString(),
    totalFetched: urls.length,
    totalParsed: listings.length,
    errors,
    listings,
  };

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n=== Done ===`);
  console.log(`Listings: ${listings.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Output: ${OUT_FILE}`);

  // Field coverage report
  const fields = [
    "title", "price", "areaM2", "rooms", "floor", "district",
    "description", "images", "latitude",
  ];
  console.log("\nField coverage:");
  for (const f of fields) {
    const count = listings.filter((l) => {
      const v = l[f];
      if (Array.isArray(v)) return v.length > 0;
      return v != null && v !== "";
    }).length;
    console.log(`  ${f}: ${count}/${listings.length}`);
  }
}

main().catch(console.error);
