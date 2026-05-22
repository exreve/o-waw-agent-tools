# Agent Workflows and MCP Integration with O-WAW

How to connect AI agents, chatbots, and MCP-compatible tools to Bangkok's real estate data through the O-WAW API. This guide covers the Model Context Protocol (MCP) server card, direct HTTP integration, and practical agent workflow patterns.

## MCP Server Card

O-WAW publishes a [MCP Server Card](https://api.o-waw.com/.well-known/mcp/server-card.json) compliant with SEP-1649. This machine-readable document describes the available tools, their input schemas, and how to connect:

```bash
curl -s https://api.o-waw.com/.well-known/mcp/server-card.json | jq '.serverInfo, .tools[].name'
```

```json
{
  "name": "o-waw-property-api",
  "title": "O-WAW Bangkok Property API",
  "version": "1.0.0"
}
```

The server card lists four tools:
- `search_properties` — search with filters (location, price, type, area)
- `get_property` — retrieve a single listing by ID
- `search_projects` — search condominium and development projects
- `get_project` — retrieve a single project with active listing count

Each tool includes a full JSON Schema `inputSchema` for parameter validation.

## Direct HTTP Tool Calls

AI agents can call O-WAW endpoints directly without any SDK. The response format is consistent and designed for machine consumption.

### Tool: search_properties

```
GET https://api.o-waw.com/llm/properties?status=rent&type=condo&minPrice=10000&maxPrice=30000&minBedrooms=1&limit=10
```

```json
{
  "properties": [
    {
      "id": "tjk8kqylzIinboNUtawPeA",
      "type": "condo",
      "status": "rent",
      "price": 18000,
      "priceCurrency": "THB",
      "pricePerSqm": 500,
      "area": 36,
      "bedrooms": 1,
      "bathrooms": 1,
      "address": "Bangkok, Thailand",
      "loc": [100.5739, 13.7780],
      "images": [
        "https://images.o-waw.com/rLKQlAyhE4hQYg",
        "https://images.o-waw.com/2a9_jZheDupFzg"
      ],
      "projectName": "RHYTHM Ratchada-Huaikwang",
      "projectId": "HeYdXW8KK2GW42i8_ILzrg",
      "description": "Experience modern city living in this fully furnished 1-bedroom condo...",
      "createdAt": 1779477552428
    }
  ],
  "total": 867,
  "hasMore": true
}
```

### Tool: get_property

```
GET https://api.o-waw.com/llm/properties/tjk8kqylzIinboNUtawPeA
```

Returns the same fields as the list item, plus:
- `floorNumber` — which floor the unit is on
- `petFriendly` — whether pets are allowed
- `marketPrice` — estimated market value for the unit
- `updatedAt` — last update timestamp

### Tool: search_projects

```
GET https://api.o-waw.com/llm/projects?type=condo&search=sukhumvit&minYearBuilt=2018&limit=10
```

### Tool: get_project

```
GET https://api.o-waw.com/llm/projects/eNaAq7762Cd9mDwvFKZL6Q
```

Returns project detail with `activeListingCount` — how many units are currently available for rent or purchase.

## Workflow: Property Search Agent

A complete agent flow for handling natural-language property queries:

```
User: "Find me a 2-bedroom condo for rent near BTS, under 30k, with a pool"

Agent steps:
1. Call search_properties with:
   - status: "rent"
   - type: "condo"
   - minBedrooms: 2
   - maxPrice: 30000
   - limit: 10

2. For each result, check if projectName exists.

3. For promising results, call get_property(id) to get:
   - floorNumber, petFriendly, marketPrice
   - full description (check for "pool" in description text)

4. Present top 3 matches with images, price, and project name.
   If marketPrice is available, note whether the listing is above/below market.

5. Offer to: narrow search to a specific BTS station (use geo search),
   check project details, or adjust budget.
```

## Workflow: Project Comparison Agent

For users evaluating buildings or developments:

```
User: "Compare Rhythm Ratchada and Noble Revolve Sukhumvit"

Agent steps:
1. Call search_projects with search="Rhythm Ratchada"
2. Call search_projects with search="Noble Revolve"
3. Call get_project for each to get activeListingCount
4. Call search_properties with projectId for each to get available units
5. Present side-by-side: location, year built, developer, available units,
   price range, and average price/sqm for each building
```

## Workflow: Market Intelligence Agent

For generating market reports or answering pricing questions:

```
User: "What's the average rent for a 1BR condo in Thonglor?"

Agent steps:
1. Geo search: search_properties with lat=13.7224, lng=100.5819,
   radius=2, status="rent", type="condo", minBedrooms=1, maxBedrooms=1, limit=100
2. Calculate: average(price), average(pricePerSqm), price range
3. Optionally compare with nearby areas (Phrom Phong, Ekkamai)
4. Present as a mini market report with numbers
```

## Discovery Mechanisms

O-WAW supports multiple standards for automated agent discovery:

```
# RFC 8288 Link headers on every response
curl -sI https://api.o-waw.com/health | grep -i link
# Link: </llms.txt>; rel="llms-txt", </.well-known/api-catalog>; rel="api-catalog", ...

# RFC 9727 API catalog
curl -s https://api.o-waw.com/.well-known/api-catalog
# Returns application/linkset+json with service-desc, service-doc, status links

# Plaintext guide
curl -s https://api.o-waw.com/llms.txt

# HTML link tags on the website
curl -s https://o-waw.com/ | grep 'rel="api-catalog"'
```

## TypeScript Integration

For agents running in Node.js or browser environments:

```typescript
import { OWaw } from 'o-waw-agent-tools';

const client = new OWaw();

// The SDK handles pagination, type safety, and error handling
const condos = await client.searchProperties({
  status: 'rent',
  type: 'condo',
  maxPrice: 30000,
  minBedrooms: 1,
  lat: 13.7224,
  lng: 100.5819,
  radius: 2,
  limit: 20,
});

for (const c of condos.items) {
  const detail = await client.getProperty(c.id);
  console.log(`${c.address}: ${c.price} THB/mo, market: ${detail.marketPrice}`);
}
```

## Response Format Reference

### Coordinates

All `loc` fields use GeoJSON order: `[longitude, latitude]`. Bangkok's approximate center is `[100.5018, 13.7563]`.

```json
{
  "loc": [100.5819, 13.7224]
}
```

### Images

Images are served from CDN as full URLs. No additional URL construction needed:

```json
{
  "images": [
    "https://images.o-waw.com/rLKQlAyhE4hQYg",
    "https://images.o-waw.com/2a9_jZheDupFzg"
  ]
}
```

### Timestamps

All timestamps are milliseconds since Unix epoch (Date.now() format):

```json
{
  "createdAt": 1779477552428,
  "updatedAt": 1779477588013
}
```

### Pagination

Every list response includes `total` and `hasMore`. Use `limit` (1-100) and `skip` for pagination:

```json
{
  "properties": [...],
  "total": 2841,
  "hasMore": true
}
```
