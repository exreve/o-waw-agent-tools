/**
 * Example: Search condos for rent in Bangkok
 * Run: npx tsx examples/search-properties.ts
 */

import { OWaw } from '../src';

async function main() {
  const client = new OWaw();

  console.log('Searching condos for rent under 25,000 THB...\n');

  const results = await client.searchProperties({
    status: 'rent',
    type: 'condo',
    maxPrice: 25000,
    minBedrooms: 1,
    limit: 10,
  });

  console.log(`Found ${results.total} properties (showing ${results.items.length}):\n`);

  for (const p of results.items) {
    console.log(`[${p.id}]`);
    console.log(`  ${p.address}`);
    console.log(`  ${p.price.toLocaleString()} THB/mo · ${p.area} sqm · ${p.bedrooms}BR/${p.bathrooms}BA`);
    if (p.projectName) console.log(`  Project: ${p.projectName}`);
    if (p.images.length > 0) console.log(`  Photos: ${p.images.length}`);
    if (p.pricePerSqm) console.log(`  Price/sqm: ${p.pricePerSqm} THB`);
    console.log();
  }

  if (results.hasMore) {
    console.log('More results available. Use skip=10 to see the next page.');
  }
}

main().catch(console.error);
