# O-WAW Real Estate API — TypeScript SDK Reference

The `o-waw-agent-tools` package provides a fully typed TypeScript client for querying Bangkok's real estate market data. Zero configuration, zero authentication — install and query.

## Installation

```bash
npm install o-waw-agent-tools
```

Requires Node.js 18+ (uses native `fetch`).

## Client Initialization

```typescript
import { OWaw } from 'o-waw-agent-tools';

// Default: connects to production API
const client = new OWaw();

// Optional: custom base URL (e.g., for testing)
const staging = new OWaw({ baseURL: 'https://api-staging.o-waw.com' });
```

## Property Search

The `searchProperties` method maps directly to `GET /llm/properties`. It returns a paginated result with typed `Property` objects.

```typescript
const results = await client.searchProperties({
  status: 'rent',
  type: 'condo',
  minPrice: 10000,
  maxPrice: 30000,
  minBedrooms: 1,
  limit: 20,
  skip: 0,
});

// results.items — Property[]
// results.total — total matching count
// results.hasMore — whether more pages exist
```

### Property Type

Each property in the result array has this shape:

```typescript
interface Property {
  id: string;
  type: 'condo' | 'house' | 'townhouse' | 'commercial' | 'land' | 'other';
  status: 'rent' | 'sale';
  price: number;                // THB
  priceCurrency?: string;
  pricePerSqm: number | null;
  area?: number;                // square meters
  bedrooms?: number;
  bathrooms?: number;
  address: string;
  loc: [number, number] | null; // [longitude, latitude]
  images: string[];             // full CDN URLs
  projectName?: string;
  projectId?: string;
  description?: string;
  createdAt: number;            // ms since epoch
}
```

### Search Parameters

All parameters are optional. Combine any filters:

```typescript
// Geographic search: within 3km of Asok BTS
const nearby = await client.searchProperties({
  lat: 13.7242,
  lng: 100.5650,
  radius: 3,          // kilometers, max 100
  status: 'rent',
  type: 'condo',
  maxPrice: 50000,
  limit: 50,
});

// Text search: find by address or description keywords
const found = await client.searchProperties({
  search: 'sukhumvit pool',
  status: 'rent',
  limit: 10,
});

// Filter by project: all units in a specific building
const inProject = await client.searchProperties({
  projectId: 'HeYdXW8KK2GW42i8_ILzrg',
  status: 'rent',
  limit: 50,
});

// Multiple property types
const multiType = await client.searchProperties({
  type: ['condo', 'townhouse'],
  status: 'sale',
  minArea: 60,
  limit: 20,
});
```

### Auto-Pagination

The `allProperties` method automatically fetches all pages. Use `maxItems` to cap results:

```typescript
// Collect all condos for sale under 10M THB (up to 500)
const affordable = await client.allProperties({
  status: 'sale',
  type: 'condo',
  maxPrice: 10_000_000,
  maxItems: 500,
});

// Compute average price
const avgPrice = affordable.reduce((sum, p) => sum + p.price, 0) / affordable.length;
console.log(`Average: ${(avgPrice / 1_000_000).toFixed(1)}M THB`);
```

## Property Detail

```typescript
const property = await client.getProperty('WN7qXXtSCiHD0Lm_o-hPFQ');

// PropertyDetail extends Property with:
//   floorNumber: number | null
//   petFriendly: boolean | null
//   marketPrice: number | null   — estimated market value
//   updatedAt: number
```

The `marketPrice` field enables value assessment:

```typescript
if (property.marketPrice) {
  const diff = ((property.price - property.marketPrice) / property.marketPrice) * 100;
  if (diff < -10) {
    console.log(`Listed ${Math.abs(diff).toFixed(0)}% below market — good value`);
  }
}
```

## Project Search

```typescript
const projects = await client.searchProjects({
  type: 'condo',
  search: 'sukhumvit',
  minYearBuilt: 2018,
  limit: 20,
});

for (const project of projects.items) {
  console.log(`${project.name} (${project.yearBuilt})`);
  console.log(`  ${project.address}, ${project.district}`);
  console.log(`  Developer: ${project.developer || 'Unknown'}`);
  console.log(`  ${project.totalFloors} floors, ${project.totalUnits} units`);
}
```

### Project Type

```typescript
interface Project {
  id: string;
  name: string;
  type: 'condo' | 'house' | 'townhouse' | 'commercial' | 'land' | 'other';
  loc?: [number, number];
  address?: string;
  district?: string;
  city?: string;
  province?: string;
  images: string[];
  developer?: string;
  yearBuilt: number | null;
  totalUnits: number | null;
  totalFloors: number | null;
  description?: string;
  createdAt: number;
}
```

## Project Detail

```typescript
const project = await client.getProject('eNaAq7762Cd9mDwvFKZL6Q');

// ProjectDetail extends Project with:
//   activeListingCount: number

console.log(`${project.name} has ${project.activeListingCount} available units`);
```

## Health Check

```typescript
const health = await client.health();
// { status: "ok", uptime: 432000 }
```

## Error Handling

```typescript
import { OWaw, OWawError } from 'o-waw-agent-tools';

const client = new OWaw();

try {
  const property = await client.getProperty('nonexistent');
} catch (error) {
  if (error instanceof OWawError) {
    console.log(`API error ${error.status}: ${error.message}`);
    // 404: Property not found
    // 400: Validation error (bad query params)
    // 500: Server error
  }
}
```

## Full Application Example

```typescript
import { OWaw } from 'o-waw-agent-tools';

async function findBestValue(): Promise<void> {
  const client = new OWaw();

  // Find all 1BR condos for rent in Sukhumvit under 25k
  const results = await client.searchProperties({
    status: 'rent',
    type: 'condo',
    maxPrice: 25000,
    minBedrooms: 1,
    maxBedrooms: 1,
    search: 'sukhumvit',
    limit: 50,
  });

  // Enrich with market data and sort by value
  const enriched = await Promise.all(
    results.items.map(async (p) => {
      const detail = await client.getProperty(p.id);
      return {
        ...p,
        marketPrice: detail.marketPrice,
        floorNumber: detail.floorNumber,
        petFriendly: detail.petFriendly,
      };
    })
  );

  // Sort: best value first (largest negative difference from market)
  const sorted = enriched
    .filter(p => p.marketPrice !== null)
    .sort((a, b) => {
      const aDiff = a.price - (a.marketPrice ?? 0);
      const bDiff = b.price - (b.marketPrice ?? 0);
      return aDiff - bDiff;
    });

  console.log('Best value condos in Sukhumvit under 25k THB:\n');
  for (const p of sorted.slice(0, 5)) {
    const saving = ((p.marketPrice! - p.price) / p.marketPrice! * 100).toFixed(0);
    console.log(`${p.address}`);
    console.log(`  ${p.price.toLocaleString()} THB/mo (market: ${p.marketPrice!.toLocaleString()})`);
    console.log(`  ${p.area} sqm · Floor ${p.floorNumber ?? '?'}`);
    console.log(`  Saving: ${saving}% below market`);
    if (p.projectName) console.log(`  Project: ${p.projectName}`);
    console.log(`  ${p.images[0]}`);
    console.log();
  }
}

findBestValue();
```

## Related Resources

- **npm**: https://www.npmjs.com/package/o-waw-agent-tools
- **GitHub**: https://github.com/exreve/o-waw-agent-tools
- **API docs**: https://api.o-waw.com/api/docs
- **Plaintext guide**: https://api.o-waw.com/llms.txt
- **Website**: https://o-waw.com
