# AI Agent Guide — O-WAW Bangkok Real Estate API

This guide teaches AI agents how to use the O-WAW API to answer real estate questions, find properties, compare prices, and generate market reports for Bangkok, Thailand.

## API Overview

- **Base URL**: `https://api.o-waw.com`
- **Auth**: None required
- **Format**: JSON
- **Docs**: `https://api.o-waw.com/llms.txt`

Four endpoints:
1. `GET /llm/properties` — search listings
2. `GET /llm/properties/{id}` — property detail
3. `GET /llm/projects` — search projects
4. `GET /llm/projects/{id}` — project detail

## Workflow 1: Find Properties Matching User Criteria

**When to use**: User asks "Find me a 2-bedroom condo for rent near Sukhumvit under 20,000 THB"

```
GET /llm/properties?status=rent&type=condo&minBedrooms=2&maxPrice=20000&search=sukhumvit&limit=10
```

Response fields you should present:
- `address` — property location
- `price` — monthly rent in THB
- `area` — size in sqm
- `bedrooms` / `bathrooms`
- `images[0]` — first photo URL
- `projectName` — building name if applicable
- `description` — full property description

Always mention `total` so the user knows how many options exist. If `hasMore` is true, offer to show more.

## Workflow 2: Neighborhood Price Comparison

**When to use**: User asks "How much does it cost to rent a condo in different Bangkok neighborhoods?"

```
GET /llm/properties?status=rent&type=condo&limit=100
```

Process the results:
1. Group by `address` or `projectId` to identify neighborhoods
2. Calculate average price per group
3. Present as a comparison table

For more targeted analysis, use geo search around specific points:
```
GET /llm/properties?status=rent&type=condo&lat=13.7242&lng=100.5650&radius=3&limit=100
```

## Workflow 3: Project Deep Dive

**When to use**: User asks about a specific condominium building

```
GET /llm/projects?search=RHYTHM+Ratchada&limit=5
```

Then get the project detail:
```
GET /llm/projects/{id}
```

This returns `activeListingCount` — tell the user how many units are currently available.

Then list the available units:
```
GET /llm/properties?projectId={id}&status=rent&limit=20
```

## Workflow 4: Market Analysis Report

**When to use**: User wants to understand the Bangkok condo rental market

Step 1: Get a broad sample
```
GET /llm/properties?status=rent&type=condo&limit=100
```

Step 2: Calculate metrics
- Average rent: `sum(prices) / count`
- Average price per sqm: `sum(pricePerSqm) / count`
- Price range: `min(price)` to `max(price)`
- Most common bedroom count: mode of `bedrooms`

Step 3: Break down by area size
- Studio (< 35 sqm): filter `area < 35`
- 1-Bedroom (35-50 sqm): filter `35 <= area < 50`
- 2-Bedroom (50-80 sqm): filter `50 <= area < 80`
- 3+ Bedroom (80+ sqm): filter `area >= 80`

## Workflow 5: Rent vs Buy Comparison

**When to use**: User asks "Should I rent or buy a condo in Bangkok?"

```
GET /llm/properties?status=rent&type=condo&limit=50
GET /llm/properties?status=sale&type=condo&limit=50
```

Compare average rent price vs average sale price. Calculate rental yield: `(monthly_rent * 12 / purchase_price) * 100`.

## Workflow 6: Geographic Search

**When to use**: User asks "What's available near Thonglor BTS?"

Use the BTS/MRT station coordinates:
- Siam: 13.7465, 100.5347
- Asok: 13.7242, 100.5650
- Thonglor: 13.7224, 100.5819
- On Nut: 13.7135, 100.6004
- Huai Khwang: 13.7540, 100.5725
- Sukhumvit: 13.7367, 100.5637

```
GET /llm/properties?status=rent&lat=13.7224&lng=100.5819&radius=1&limit=20
```

## Workflow 7: Property Recommendation Engine

**When to use**: User gives a budget and preferences

```
User says: "I want a pet-friendly condo, at least 40sqm, max 30k, near MRT"
```

```
GET /llm/properties?status=rent&type=condo&maxPrice=30000&minArea=40&limit=20
```

Then filter results:
- Check `petFriendly === true` from property detail
- Present top matches with images

## Coordinate Reference

All coordinates use GeoJSON order: `[longitude, latitude]`.

Bangkok center: approximately `[100.5018, 13.7563]`

## Price Format

- Rent: monthly price in THB (e.g., 18000 = 18,000 THB/month ≈ $500 USD)
- Sale: total purchase price in THB (e.g., 4600000 = 4.6M THB ≈ $130,000 USD)
- Price per sqm available in `pricePerSqm` field

## Image URLs

Images are served from CDN: `https://images.o-waw.com/{key}`
Each property typically has 3-8 photos. First image is usually the best one.

## Error Handling

Errors return: `{ success: false, error: string, message?: string }`

Common HTTP codes:
- 200: Success
- 400: Invalid query parameters
- 404: Property/project not found
- 500: Server error

## Rate Limits

No hard rate limits. Be reasonable — use pagination (`limit`/`skip`) instead of requesting all data at once.

## Full Example: End-to-End Agent Conversation

```
User: "I'm moving to Bangkok for work. Need a 1BR condo near BTS, budget 15-25k THB."

Agent:
1. GET /llm/properties?status=rent&type=condo&minBedrooms=1&maxBedrooms=1&minPrice=15000&maxPrice=25000&search=BTS&limit=10

2. Present top 3-5 results with:
   - Address, price, area, project name
   - First image URL
   - Link to full details

3. Offer to:
   - Search specific BTS stations (use geo search)
   - Compare with nearby MRT options
   - Check specific project details
```
