# Example User Scenarios

## Scenario A: Filter-Based Search

**Goal:** Find a 2-room flat in Kraków, 40–80 m², within budget.

1. User opens the homepage and sees the **Filters Search** tab active by default.
2. All 107 listings are displayed in a paginated grid (12 per page), sorted by price ascending.
3. User sets the filters:
   - Area min: `40`
   - Area max: `80`
   - Rooms: `2`
   - Price max: `700000`
4. User clicks **Search**.
5. The listing grid updates to show ~15 matching apartments, all 2-room flats between 40–80 m² under 700,000 PLN.
6. The results show listings like *"Kliny Bartla | 2 pok | niski czynsz"* (43.2 m², 550,000 PLN).
7. User clicks on this card and is taken to the **detail page**.
8. The detail page shows:
   - Full photo gallery (6 images)
   - Price: 550,000 PLN (12,731 PLN/m²)
   - Key facts: 43.2 m², 2 rooms, Floor 1, Building type: blok
   - Full description in Polish
   - Link to original listing on OLX.pl
9. User clicks "Back to listings" to continue browsing.

## Scenario B: AI Chat Search (Intent-Based)

**Goal:** User has a vague idea — wants something nice and affordable around 40m² in Kraków.

1. User clicks the **AI Chat Search** tab.
2. User types: *"I want a nice, cheap flat, 40m in Kraków"*
3. User clicks **Ask AI** (or presses Enter).
4. The system sends the query to OpenAI GPT-4o-mini (or keyword fallback if no API key).
5. A blue assistant message appears:
   - *"I found 3 apartments for you — affordable flats around 40m² in Kraków. Here are the best matches:"*
   - Filter tags: `Price: up to 500,000 PLN` | `Area: 34–46 m²`
6. Below, 3 matching listings appear — all under 500K PLN, between 34–46 m².
7. User refines: *"give me some good room in Debniki around 30 to 40 m2"*
8. AI responds: *"Sure! Here are apartments in Dębniki around 30 to 40 m²."*
   - Filter tags: `Area: 30–40 m²` | `District: Dębniki`
   - The explicit range "30 to 40" is used exactly — no ±15% tolerance applied.
9. Results show apartments in Dębniki between 30–40 m², sorted by price.
10. User clicks into a result to see the full detail page.

**Key difference from Scenario A:** The user never touched a dropdown or number input. The AI translated intent ("cheap", "nice") into concrete filter values based on Kraków market context, making the search accessible to users who don't know exact price ranges or district names.

## Scenario C: Conversational & Sorting Queries

**Goal:** User explores the market with casual questions and superlative requests.

1. User types: *"hello"*
2. AI responds warmly: *"Hello! How can I assist you with your apartment search in Kraków today?"*
   - All 107 listings shown below as a starting point.
3. User types: *"I want the most expensive flat"*
4. AI responds: *"Sure! Here are the most expensive apartments in Kraków."*
   - Filter tags: `Sort: price high→low`
   - Listings appear sorted by price descending — the first card shows 2,200,000 PLN.
5. User types: *"biggest flat near center"*
6. AI responds: *"I found 2 apartments for you — the biggest flats near the center of Kraków."*
   - Filter tags: `District: Stare Miasto` | `Sort: area high→low`
   - Results sorted by area descending, filtered to Stare Miasto.
7. User types: *"what is the average price in Kraków?"*
8. AI answers the question and shows listings: *"The average apartment price in Kraków is around 500,000–700,000 PLN for a 2-room flat. Meanwhile, here are some listings that might interest you:"*

**Key difference from Scenario B:** The user interacts conversationally — greetings, questions about the market, superlative requests ("most expensive", "biggest"). The AI handles all of these naturally, adjusting both the reply tone and the sorting/filtering logic accordingly.
