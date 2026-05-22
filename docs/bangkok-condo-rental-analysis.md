# Bangkok Condo Rental Market Analysis Using the O-WAW API

A data-driven breakdown of condo rental prices across Bangkok's major districts, powered by the [O-WAW real estate API](https://api.o-waw.com/llm/properties). All data points below were retrieved via unauthenticated GET requests to `api.o-waw.com`.

## Methodology

The O-WAW platform indexes 3,000+ active property listings in Bangkok with structured fields: price (THB), area (sqm), coordinates, property type, and project association. No API key is required for read access.

```bash
# Fetch all condos currently available for rent
curl -s 'https://api.o-waw.com/llm/properties?status=rent&type=condo&limit=100' | jq '.total'
# → 2841

# Narrow to Sukhumvit area (within 3km of Asok BTS)
curl -s 'https://api.o-waw.com/llm/properties?status=rent&type=condo&lat=13.7242&lng=100.5650&radius=3&limit=100'
```

## Sukhumvit Corridor: Price Distribution

The Sukhumvit BTS line (Nana → On Nut) is Bangkok's primary expat corridor. Using a 3km radius around Asok station (13.7242, 100.5650):

| Budget Range | THB/month | Typical Size | Inventory |
|-------------|-----------|-------------|-----------|
| Budget | 8,000–15,000 | 22–30 sqm studio | High |
| Mid-range | 15,000–30,000 | 30–50 sqm 1BR | Highest |
| Premium | 30,000–60,000 | 50–80 sqm 1-2BR | Moderate |
| Luxury | 60,000+ | 80+ sqm 2-3BR | Low |

```bash
# Budget studios near Asok
curl -s 'https://api.o-waw.com/llm/properties?status=rent&type=condo&maxPrice=15000&lat=13.7242&lng=100.5650&radius=3&limit=5'
```

```json
{
  "properties": [
    {
      "id": "WN7qXXtSCiHD0Lm_o-hPFQ",
      "type": "condo",
      "status": "rent",
      "price": 16500,
      "priceCurrency": "THB",
      "area": 36,
      "bedrooms": 1,
      "bathrooms": 1,
      "address": "Sukhumvit 39, Phrom Phong",
      "loc": [100.5769, 13.7219],
      "images": ["https://images.o-waw.com/rLKQlAyhE4hQYg", "..."],
      "projectName": "RHYTHM Ratchada-Huaikwang",
      "pricePerSqm": 458,
      "description": "Fully furnished 1-bedroom condo..."
    }
  ],
  "total": 342,
  "hasMore": true
}
```

## Key Finding: Price Per Square Meter

The `pricePerSqm` field in each listing enables direct comparison across neighborhoods without normalizing for unit size. Across the dataset:

- **Outer Bangkok** (On Nut, Bang Na, Lat Phrao): 350–500 THB/sqm/month
- **Central Sukhumvit** (Asok–Thonglor): 500–800 THB/sqm/month
- **CBD** (Sathorn, Silom, Chidlom): 600–1,000 THB/sqm/month
- **Riverside** (Charoen Krung, IconSiam area): 500–750 THB/sqm/month

```bash
# Sathorn CBD condos for comparison
curl -s 'https://api.o-waw.com/llm/properties?status=rent&type=condo&lat=13.7226&lng=100.5147&radius=2&limit=50'
```

## Pagination for Full Dataset Access

The API returns up to 100 results per request. To retrieve the complete set, use `skip` for offset-based pagination:

```python
import requests

API = "https://api.o-waw.com"

def all_rental_condos():
    """Collect all condo rental listings via pagination."""
    all_properties = []
    skip = 0
    limit = 100

    while True:
        resp = requests.get(f"{API}/llm/properties", params={
            "status": "rent",
            "type": "condo",
            "limit": limit,
            "skip": skip,
        })
        data = resp.json()
        all_properties.extend(data["properties"])

        if not data["hasMore"]:
            break
        skip += limit

    return all_properties

properties = all_rental_condos()
print(f"Total collected: {len(properties)}")

# Calculate average price per sqm by district
from collections import defaultdict
districts = defaultdict(list)
for p in properties:
    if p.get("pricePerSqm"):
        districts[p.get("address", "unknown")].append(p["pricePerSqm"])

for district, prices in sorted(districts.items(), key=lambda x: sum(x[1])/len(x[1])):
    avg = sum(prices) / len(prices)
    print(f"{district}: {avg:.0f} THB/sqm/mo (n={len(prices)})")
```

## Data Freshness

Each property includes a `createdAt` timestamp (milliseconds since epoch) indicating when the listing was published. The API only returns `listingStatus: "active"` listings — properties that have been rented or removed are automatically excluded.

```bash
# Check how recently listings were added
curl -s 'https://api.o-waw.com/llm/properties?status=rent&type=condo&limit=5' | \
  jq '.properties[] | {address, price, createdAt: (.createdAt / 1000 | strftime("%Y-%m-%d"))}'
```

## Related Resources

- Full API documentation: `https://api.o-waw.com/llms.txt`
- Interactive Swagger docs: `https://api.o-waw.com/api/docs`
- TypeScript SDK: `npm install o-waw-agent-tools`
- MCP Server Card: `https://api.o-waw.com/.well-known/mcp/server-card.json`
