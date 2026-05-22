/**
 * Example: Market analytics — average prices by property type
 * Run: npx tsx examples/market-analytics.ts
 */

import { OWaw } from '../src';

async function main() {
  const client = new OWaw();

  const types = ['condo', 'house', 'townhouse'] as const;

  for (const type of types) {
    console.log(`\n=== ${type.toUpperCase()} — For Rent ===\n`);

    const results = await client.searchProperties({
      status: 'rent',
      type,
      limit: 100,
    });

    if (results.items.length === 0) {
      console.log('  No listings found.');
      continue;
    }

    const prices = results.items.map(p => p.price);
    const areas = results.items.map(p => p.area || 0).filter(a => a > 0);

    const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const min = (arr: number[]) => Math.min(...arr);
    const max = (arr: number[]) => Math.max(...arr);

    console.log(`  Total available: ${results.total}`);
    console.log(`  Sample analyzed: ${results.items.length}`);
    console.log(`  Price range: ${min(prices).toLocaleString()} – ${max(prices).toLocaleString()} THB/mo`);
    console.log(`  Average price: ${avg(prices).toLocaleString()} THB/mo`);
    if (areas.length > 0) {
      console.log(`  Average area: ${avg(areas)} sqm`);
      console.log(`  Area range: ${min(areas)} – ${max(areas)} sqm`);
    }

    // Top 3 cheapest
    const sorted = [...results.items].sort((a, b) => a.price - b.price);
    console.log(`\n  Cheapest:`);
    for (const p of sorted.slice(0, 3)) {
      console.log(`    ${p.price.toLocaleString()} THB/mo — ${p.area}sqm — ${p.address}`);
    }
  }
}

main().catch(console.error);
