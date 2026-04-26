# Kraków Real Estate Portal

A simplified real estate listings platform for Kraków apartments, built for the Docplanner recruitment task.

## Tech Stack

- **Frontend/Backend:** Next.js 16 + TypeScript (App Router)
- **Database:** MySQL 8 via Docker + Prisma 7
- **Styling:** Tailwind CSS
- **AI:** OpenAI GPT-4o-mini (optional, for chat search)
- **Data source:** OLX.pl (107 Kraków apartment sale listings)

## Quick Start

```bash
# 1. Start MySQL
docker compose up -d mysql

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npm run db:generate

# 4. Push schema to database
npm run db:push

# 5. Import scraped data
npm run ingest

# 6. Start dev server
npm run dev
```

Open http://localhost:3000

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Required — Prisma CLI (migrations, db push)
DATABASE_URL="mysql://docplanner:docplanner@localhost:3306/docplanner"
# Required — runtime adapter (PrismaMariaDb needs mariadb:// scheme)
MARIADB_URL="mariadb://docplanner:docplanner@localhost:3306/docplanner"

# Optional — enables AI-powered natural language search
OPENAI_API_KEY="sk-..."
```

Without `OPENAI_API_KEY`, the chat search falls back to keyword-based parsing — it still works, just less intelligently.

## Project Structure

```
app/
├── docker-compose.yml       # MySQL container
├── prisma/schema.prisma     # Database schema
├── scripts/
│   ├── scrape-olx.mjs       # OLX.pl Kraków apartment scraper
│   └── ingest.ts            # Import scraped JSON → MySQL
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── listings/    # GET /api/listings (search + pagination)
│   │   │   ├── filters/     # GET /api/filters (available filter values)
│   │   │   └── chat-search/ # POST /api/chat-search (AI intent parsing)
│   │   ├── listing/[id]/    # Detail page (server component)
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   └── lib/prisma.ts        # Prisma client singleton
├── data/raw/
│   └── olx-listings.json    # 107 scraped OLX.pl listings (checked in)
└── docs/
    ├── reasoning.md         # Design decisions (1 pager)
    └── scenarios.md         # Example user journeys
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run scrape` | Re-scrape OLX.pl listings (requires internet + curl) |
| `npm run ingest` | Import scraped JSON into MySQL |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |

## Documentation

- **[Reasoning Document](docs/reasoning.md)** — field choices, data cleaning, AI usage, assumptions, metrics, limitations, future improvements
- **[Example Scenarios](docs/scenarios.md)** — two user journeys: filter-based search and AI chat search

## Known Limitations

- Data from a single crawl of OLX.pl (107 listings, April 2026)
- No scheduled re-crawling
- Chat search requires API key for best results; falls back to keyword matching without it
- Images are hotlinked from OLX CDN
