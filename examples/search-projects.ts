/**
 * Example: Search real estate projects
 * Run: npx tsx examples/search-projects.ts
 */

import { OWaw } from '../src';

async function main() {
  const client = new OWaw();

  console.log('Searching condo projects with "Sukhumvit" in the name...\n');

  const results = await client.searchProjects({
    type: 'condo',
    search: 'Sukhumvit',
    limit: 10,
  });

  console.log(`Found ${results.total} projects (showing ${results.items.length}):\n`);

  for (const p of results.items) {
    console.log(`[${p.id}] ${p.name}`);
    if (p.address) console.log(`  Address: ${p.address}`);
    if (p.district) console.log(`  District: ${p.district}`);
    if (p.developer) console.log(`  Developer: ${p.developer}`);
    if (p.yearBuilt) console.log(`  Built: ${p.yearBuilt}`);
    if (p.totalFloors) console.log(`  Floors: ${p.totalFloors}`);
    if (p.totalUnits) console.log(`  Units: ${p.totalUnits}`);
    if (p.images.length > 0) console.log(`  Photos: ${p.images.length}`);
    console.log();
  }

  // Get detail for first project
  if (results.items.length > 0) {
    const first = results.items[0];
    console.log(`--- Detail: ${first.name} ---\n`);
    const detail = await client.getProject(first.id);
    console.log(`Active listings: ${detail.activeListingCount}`);
    if (detail.description) console.log(`Description: ${detail.description.slice(0, 200)}...`);
  }
}

main().catch(console.error);
