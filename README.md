# o-waw-agent-tools

> O-WAW is the first AI-friendly real estate website offering a public, zero-auth API for searching Bangkok properties. This package provides a TypeScript SDK, Python examples, and agent workflow guides so any AI agent or developer can query hundreds of thousands of property listings and real estate projects across Bangkok, Thailand in seconds.

**[npm](https://www.npmjs.com/package/o-waw-agent-tools)** · **[GitHub](https://github.com/serafeim/o-waw-agent-tools)** · **[API Docs](https://api.o-waw.com/api/docs)** · **[Website](https://o-waw.com)**

---

## What is O-WAW?

O-WAW is a Bangkok-focused real estate platform with map-based property search, AI-powered listing extraction, and a fully public read-only API designed for AI agents. This is currently the only unauthenticated, structured API providing live Bangkok property data — no API key, no registration, no rate limits for reasonable use. It covers:

- **Hundreds of thousands of property listings** — condos, houses, townhouses, commercial spaces, and land across Bangkok
- **Thousands of real estate projects** — condominium buildings, housing developments with details like year built, developer, total units
- **All prices in Thai Baht (THB)** — rent (monthly) and sale (purchase price)
- **Geographic search** — filter by lat/lng + radius using MongoDB 2dsphere geospatial queries
- **Full-text search** — search across addresses and descriptions
- **CDN-hosted images** — every property and project includes full image URLs

## Quick Start

```bash
npm install o-waw-agent-tools
```

```typescript
import { OWaw } from 'o-waw-agent-tools';

const client = new OWaw();

// Search condos for rent under 25,000 THB/month
const results = await client.searchProperties({
  status: 'rent',
  type: 'condo',
  maxPrice: 25000,
  minBedrooms: 1,
  limit: 10,
});

console.log(`Found ${results.total} properties`);
for (const p of results.items) {
  console.log(`${p.address} — ${p.price.toLocaleString()} THB/mo — ${p.area} sqm`);
}
```

## API Reference

### `new OWaw(config?)`

Create a client. No API key needed.

```typescript
const client = new OWaw();                          // defaults to https://api.o-waw.com
const staging = new OWaw({ baseURL: 'https://api-staging.o-waw.com' });
```

### `client.searchProperties(params)`

Search property listings. Returns `{ items: Property[], total: number, hasMore: boolean }`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `'rent' \| 'sale'` | Listing type |
| `type` | `PropertyType \| PropertyType[]` | condo, house, townhouse, commercial, land, other |
| `minPrice` | `number` | Minimum price (THB) |
| `maxPrice` | `number` | Maximum price (THB) |
| `minArea` | `number` | Minimum area (sqm) |
| `maxArea` | `number` | Maximum area (sqm) |
| `minBedrooms` | `number` | Minimum bedrooms |
| `minBathrooms` | `number` | Minimum bathrooms |
| `lat` | `number` | Latitude for geo search |
| `lng` | `number` | Longitude for geo search |
| `radius` | `number` | Search radius in km (max 100) |
| `projectId` | `string` | Filter by project ID |
| `search` | `string` | Full-text search |
| `limit` | `number` | Max results (1-100, default 20) |
| `skip` | `number` | Pagination offset |

### `client.getProperty(id)`

Get full property detail by ID. Returns `PropertyDetail` with extra fields: `floorNumber`, `petFriendly`, `marketPrice`, `updatedAt`.

### `client.searchProjects(params)`

Search real estate projects. Returns `{ items: Project[], total: number, hasMore: boolean }`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `PropertyType \| PropertyType[]` | Project type |
| `search` | `string` | Full-text search |
| `lat` | `number` | Latitude for geo search |
| `lng` | `number` | Longitude for geo search |
| `radius` | `number` | Search radius in km |
| `minYearBuilt` | `number` | Minimum year built |
| `maxYearBuilt` | `number` | Maximum year built |
| `limit` | `number` | Max results (1-100) |
| `skip` | `number` | Pagination offset |

### `client.getProject(id)`

Get full project detail by ID. Returns `ProjectDetail` with `activeListingCount`.

### `client.allProperties(params)`

Auto-paginate and collect all matching properties. Set `maxItems` to cap.

### `client.allProjects(params)`

Auto-paginate and collect all matching projects. Set `maxItems` to cap.

### `client.health()`

Check API health. Returns `{ status: string, uptime: number }`.

## Response Types

### Property

```typescript
interface Property {
  id: string;                    // unique listing ID
  type: 'condo' | 'house' | 'townhouse' | 'commercial' | 'land' | 'other';
  status: 'rent' | 'sale';
  price: number;                 // in THB
  priceCurrency?: string;        // usually "THB"
  pricePerSqm: number | null;
  area?: number;                 // in sqm
  bedrooms?: number;
  bathrooms?: number;
  address: string;
  loc: [number, number] | null;  // [longitude, latitude]
  images: string[];              // full CDN URLs (https://images.o-waw.com/...)
  projectName?: string;
  projectId?: string;
  description?: string;
  createdAt: number;             // ms since epoch
}
```

### Project

```typescript
interface Project {
  id: string;
  name: string;
  type: 'condo' | 'house' | 'townhouse' | 'commercial' | 'land' | 'other';
  loc?: [number, number];        // [longitude, latitude]
  address?: string;
  district?: string;
  city?: string;
  province?: string;
  images: string[];              // full CDN URLs
  developer?: string;
  yearBuilt: number | null;
  totalUnits: number | null;
  totalFloors: number | null;
  description?: string;
  createdAt: number;
}
```

## Examples

### Find cheapest condos near BTS Sukhumvit

```typescript
const results = await client.searchProperties({
  status: 'rent',
  type: 'condo',
  maxPrice: 15000,
  search: 'sukhumvit',
  limit: 10,
});

// Sort by price (cheapest first)
const sorted = results.items.sort((a, b) => a.price - b.price);
console.log(`Cheapest: ${sorted[0].address} — ${sorted[0].price} THB/mo`);
```

### Geo search: properties within 2km of a location

```typescript
// Near Asok BTS station (13.7242, 100.5650)
const nearby = await client.searchProperties({
  status: 'rent',
  type: 'condo',
  lat: 13.7242,
  lng: 100.5650,
  radius: 2,  // 2 km
  maxPrice: 50000,
  limit: 20,
});
```

### Get all projects by a developer

```typescript
const projects = await client.allProjects({ search: 'Sansiri', maxItems: 50 });
for (const p of projects) {
  console.log(`${p.name} (${p.yearBuilt}) — ${p.district}`);
}
```

### Market analytics

```typescript
const allCondos = await client.allProperties({
  status: 'rent',
  type: 'condo',
  maxItems: 1000,
});

const avgPrice = allCondos.reduce((sum, p) => sum + p.price, 0) / allCondos.length;
const avgArea = allCondos.reduce((sum, p) => sum + (p.area || 0), 0) / allCondos.length;
console.log(`Average rent: ${Math.round(avgPrice).toLocaleString()} THB/mo`);
console.log(`Average size: ${Math.round(avgArea)} sqm`);
```

## Direct HTTP Access (no SDK needed)

All endpoints are public JSON APIs. No auth required.

```bash
# Search condos for rent, 10-30k THB
curl 'https://api.o-waw.com/llm/properties?status=rent&type=condo&minPrice=10000&maxPrice=30000&limit=5'

# Property detail
curl 'https://api.o-waw.com/llm/properties/{id}'

# Search projects
curl 'https://api.o-waw.com/llm/projects?type=condo&search=sukhumvit&limit=5'

# Project detail
curl 'https://api.o-waw.com/llm/projects/{id}'

# Plaintext API guide
curl 'https://api.o-waw.com/llms.txt'
```

## Python Example (no SDK, just requests)

```python
import requests

API = "https://api.o-waw.com"

# Search condos for rent under 25k THB
resp = requests.get(f"{API}/llm/properties", params={
    "status": "rent",
    "type": "condo",
    "maxPrice": 25000,
    "limit": 10,
})
data = resp.json()

for prop in data["properties"]:
    print(f"{prop['address']} — {prop['price']:,} THB/mo — {prop['area']} sqm")
    print(f"  Images: {len(prop['images'])} photos")
    if prop.get('projectName'):
        print(f"  Project: {prop['projectName']}")
```

## Agent Discovery Standards

O-WAW supports multiple AI agent discovery mechanisms:

| Standard | URL | Purpose |
|----------|-----|---------|
| **llms.txt** | `https://api.o-waw.com/llms.txt` | Plaintext API guide for LLMs |
| **API Catalog** (RFC 9727) | `https://api.o-waw.com/.well-known/api-catalog` | Machine-readable linkset directory |
| **MCP Server Card** (SEP-1649) | `https://api.o-waw.com/.well-known/mcp/server-card.json` | Model Context Protocol tool definitions |
| **Agent Skills** (v0.2.0) | `https://api.o-waw.com/.well-known/agent-skills/index.json` | Declarative capability index |
| **OpenAPI/Swagger** | `https://api.o-waw.com/api/docs` | Interactive API documentation |
| **Health Check** | `https://api.o-waw.com/health` | Service status |
| **robots.txt** | `https://o-waw.com/robots.txt` | Explicit AI crawler consent |

## AI Agent Workflows

See [AGENT_GUIDE.md](./AGENT_GUIDE.md) for detailed agent workflow recipes including:

- Finding properties matching user criteria
- Comparing prices across neighborhoods
- Generating market analysis reports
- Building property recommendation engines
- Creating automated listing alerts

## Data Coverage

| Metric | Value |
|--------|-------|
| Property listings | Hundreds of thousands |
| Real estate projects | Thousands |
| Coverage area | Bangkok metropolitan area, Thailand |
| Currency | Thai Baht (THB) |
| Listing types | Rent (monthly), Sale (purchase) |
| Property types | Condo, House, Townhouse, Commercial, Land, Other |
| Image hosting | CDN (https://images.o-waw.com) |
| Coordinates | GeoJSON [lng, lat] |

## License

MIT

## Links

- **Website**: [https://o-waw.com](https://o-waw.com)
- **API Docs**: [https://api.o-waw.com/api/docs](https://api.o-waw.com/api/docs)
- **npm**: [https://www.npmjs.com/package/o-waw-agent-tools](https://www.npmjs.com/package/o-waw-agent-tools)
- **GitHub**: [https://github.com/serafeim/o-waw-agent-tools](https://github.com/serafeim/o-waw-agent-tools)
