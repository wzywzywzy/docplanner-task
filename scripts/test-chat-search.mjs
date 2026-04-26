#!/usr/bin/env node
/**
 * Test suite for /api/chat-search AI intent parsing.
 *
 * Run with dev server up:  node scripts/test-chat-search.mjs
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

const testCases = [
  // ── Core demo queries from README/Scenarios ──
  {
    query: "I want a nice, cheap flat, 40m in Kraków",
    expect: {
      minResults: 1,
      parsedContains: { areaMin: [30, 38], areaMax: [42, 50] },
      note: "Core demo query. 'nice' should not zero-out results.",
    },
  },
  {
    query: "2 pokoje balkon Podgórze",
    expect: {
      minResults: 0, // may be 0 if no balkon in Podgórze data
      parsedRooms: "2",
      parsedDistrict: "Podgórze",
      note: "Polish query with district + rooms + keyword",
    },
  },
  {
    query: "cheap 2 room flat in Podgórze",
    expect: {
      minResults: 1,
      parsedRooms: "2",
      note: "English query, should find 2-room flats",
    },
  },

  // ── Price understanding ──
  {
    query: "mieszkanie do 500 tysięcy",
    expect: {
      minResults: 1,
      parsedContains: { priceMax: [450000, 550000] },
      note: "Polish price expression '500 tysięcy' = 500k PLN",
    },
  },
  {
    query: "flat under 400000 PLN",
    expect: {
      minResults: 1,
      parsedContains: { priceMax: [350000, 450000] },
      note: "Explicit price ceiling",
    },
  },

  // ── Room types ──
  {
    query: "kawalerka",
    expect: {
      minResults: 1,
      parsedRooms: "1",
      note: "'kawalerka' = studio/1 room",
    },
  },
  {
    query: "3 pokoje z balkonem",
    expect: {
      parsedRooms: "3",
      note: "3 rooms with balcony keyword",
    },
  },

  // ── Area understanding ──
  {
    query: "60m2 apartment",
    expect: {
      minResults: 1,
      parsedContains: { areaMin: [48, 55], areaMax: [65, 72] },
      note: "Area with ±15% tolerance",
    },
  },

  // ── District understanding ──
  {
    query: "something in Nowa Huta",
    expect: {
      minResults: 1,
      parsedDistrict: "Nowa Huta",
      note: "District name extraction",
    },
  },
  {
    query: "flat in the center",
    expect: {
      parsedDistrictOneOf: ["Stare Miasto", "Grzegórzki", "Krowodrza", "Śródmieście"],
      note: "'center' should map to central district",
    },
  },

  // ── Combined complex queries ──
  {
    query: "szukam 2-pokojowego mieszkania na Ruczaju, do 600 tys, minimum 40m",
    expect: {
      minResults: 0,
      parsedRooms: "2",
      parsedContains: { priceMax: [550000, 650000], areaMin: [34, 42] },
      note: "Complex Polish query with all filters",
    },
  },
  {
    query: "big family apartment, 4 rooms, good area",
    expect: {
      parsedRooms: "4",
      note: "Vague 'good area' should not crash or zero results aggressively",
    },
  },

  // ── Edge cases ──
  {
    query: "coś taniego",
    expect: {
      minResults: 1,
      note: "'something cheap' in Polish — should set a price cap",
    },
  },
  {
    query: "investment property with parking",
    expect: {
      minResults: 0,
      note: "Niche query — may return 0 but should not error",
    },
  },
];

// ── Runner ──

async function runTest(tc, index) {
  const res = await fetch(`${BASE}/api/chat-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: tc.query }),
  });

  if (!res.ok) {
    return { index, query: tc.query, status: "FAIL", reason: `HTTP ${res.status}` };
  }

  const data = await res.json();
  const { parsed, total, relaxed } = data;
  const issues = [];

  // Check minimum results
  if (tc.expect.minResults !== undefined && total < tc.expect.minResults) {
    issues.push(`expected >= ${tc.expect.minResults} results, got ${total}`);
  }

  // Check parsed rooms
  if (tc.expect.parsedRooms && parsed.rooms !== tc.expect.parsedRooms) {
    issues.push(`expected rooms=${tc.expect.parsedRooms}, got ${parsed.rooms}`);
  }

  // Check parsed district
  if (tc.expect.parsedDistrict && parsed.district !== tc.expect.parsedDistrict) {
    issues.push(`expected district="${tc.expect.parsedDistrict}", got "${parsed.district}"`);
  }

  // Check district is one of
  if (tc.expect.parsedDistrictOneOf && !tc.expect.parsedDistrictOneOf.includes(parsed.district)) {
    issues.push(`expected district in [${tc.expect.parsedDistrictOneOf}], got "${parsed.district}"`);
  }

  // Check numeric ranges
  if (tc.expect.parsedContains) {
    for (const [field, [min, max]] of Object.entries(tc.expect.parsedContains)) {
      const val = parsed[field];
      if (val === null || val === undefined) {
        issues.push(`expected ${field} in [${min}-${max}], got null`);
      } else if (val < min || val > max) {
        issues.push(`expected ${field} in [${min}-${max}], got ${val}`);
      }
    }
  }

  return {
    index,
    query: tc.query,
    status: issues.length === 0 ? "PASS" : "WARN",
    total,
    relaxed: relaxed || false,
    explanation: parsed.explanation,
    rooms: parsed.rooms,
    district: parsed.district,
    priceMax: parsed.priceMax,
    areaMin: parsed.areaMin,
    areaMax: parsed.areaMax,
    keywords: parsed.keywords,
    issues,
    note: tc.expect.note,
  };
}

async function main() {
  console.log(`\n=== Chat Search Test Suite ===`);
  console.log(`Base: ${BASE}`);
  console.log(`Tests: ${testCases.length}\n`);

  const results = [];
  for (let i = 0; i < testCases.length; i++) {
    try {
      const r = await runTest(testCases[i], i + 1);
      results.push(r);

      const icon = r.status === "PASS" ? "✓" : r.status === "WARN" ? "⚠" : "✗";
      const relaxedTag = r.relaxed ? " [relaxed]" : "";
      console.log(`${icon} [${r.index}/${testCases.length}] "${r.query}"`);
      console.log(`  → ${r.total} results${relaxedTag} | ${r.explanation}`);
      if (r.issues.length > 0) {
        for (const issue of r.issues) console.log(`  ⚠ ${issue}`);
      }
      console.log();
    } catch (e) {
      console.log(`✗ [${i + 1}] "${testCases[i].query}" — ERROR: ${e.message}\n`);
      results.push({ index: i + 1, query: testCases[i].query, status: "FAIL", reason: e.message });
    }
  }

  // Summary
  const pass = results.filter((r) => r.status === "PASS").length;
  const warn = results.filter((r) => r.status === "WARN").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  console.log(`=== Summary: ${pass} pass, ${warn} warn, ${fail} fail / ${results.length} total ===\n`);
}

main().catch(console.error);
