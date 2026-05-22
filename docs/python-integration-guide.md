# Building a Python Real Estate Agent with O-WAW

A practical guide to connecting a Python-based AI agent to Bangkok's property market data. The O-WAW API provides structured, real-time access to thousands of property listings without requiring authentication or API keys.

## Connection Setup

The API lives at `https://api.o-waw.com/llm/` and speaks JSON over HTTPS. No registration, no tokens, no rate limits for reasonable use.

```python
import requests
from typing import Optional

API_BASE = "https://api.o-waw.com"


def search_properties(**filters) -> dict:
    """
    Query the O-WAW property database.
    Returns active listings matching the given filters.

    Available filters:
      status: "rent" or "sale"
      type: "condo", "house", "townhouse", "commercial", "land", "other"
      minPrice, maxPrice: price range in THB
      minArea, maxArea: area range in sqm
      minBedrooms, minBathrooms: minimum room counts
      lat, lng, radius: geographic search (radius in km)
      search: free-text search
      limit: max results (1-100)
      skip: pagination offset
    """
    response = requests.get(f"{API_BASE}/llm/properties", params=filters)
    response.raise_for_status()
    return response.json()


def get_property(property_id: str) -> dict:
    """Retrieve full details for a single property."""
    response = requests.get(f"{API_BASE}/llm/properties/{property_id}")
    response.raise_for_status()
    return response.json()


def search_projects(**filters) -> dict:
    """
    Query the O-WAW project database (condominiums, housing developments).
    Same pagination as properties (limit/skip).
    """
    response = requests.get(f"{API_BASE}/llm/projects", params=filters)
    response.raise_for_status()
    return response.json()
```

## Agent Pattern: Matching Users to Properties

Here's a working pattern for an AI agent that takes natural-language housing preferences and returns ranked matches:

```python
import json

def find_matching_properties(
    budget: tuple[int, int],
    bedrooms: int = 1,
    neighborhood: Optional[str] = None,
    property_type: str = "condo",
    listing_status: str = "rent",
) -> list[dict]:
    """
    Find properties matching structured criteria.

    Example usage:
        # "I need a 2BR condo for rent in Sukhumvit, budget 20-35k"
        results = find_matching_properties(
            budget=(20000, 35000),
            bedrooms=2,
            neighborhood="sukhumvit",
        )
    """
    params = {
        "status": listing_status,
        "type": property_type,
        "minPrice": budget[0],
        "maxPrice": budget[1],
        "minBedrooms": bedrooms,
        "limit": 20,
    }

    if neighborhood:
        params["search"] = neighborhood

    data = search_properties(**params)
    return data["properties"]


def format_property_for_agent(prop: dict) -> str:
    """Format a property into a human-readable summary for agent output."""
    lines = [
        f"**{prop.get('address', 'Bangkok')}**",
        f"  {prop['price']:,} THB/{'mo' if prop['status'] == 'rent' else 'total'}",
        f"  {prop.get('area', '?')} sqm · {prop.get('bedrooms', '?')} bed · {prop.get('bathrooms', '?')} bath",
    ]
    if prop.get("projectName"):
        lines.append(f"  Building: {prop['projectName']}")
    if prop.get("pricePerSqm"):
        lines.append(f"  Price/sqm: {prop['pricePerSqm']:,} THB")
    if prop.get("images"):
        lines.append(f"  {len(prop['images'])} photos available")
    return "\n".join(lines)


# Example: Agent receives user query
results = find_matching_properties(
    budget=(15000, 30000),
    bedrooms=1,
    neighborhood="sukhumvit",
)

print(f"Found {len(results)} matches:\n")
for prop in results[:5]:
    print(format_property_for_agent(prop))
    print()
```

## Geographic Search: Finding Properties Near Transit

Bangkok's BTS Skytrain and MRT subway are the primary transit reference points for property search. The API supports radius-based geographic queries using `lat`, `lng`, and `radius` (in kilometers).

```python
# Major transit stations with coordinates
TRANSIT_HUBS = {
    "SIAM": {"lat": 13.7465, "lng": 100.5347},
    "ASOK": {"lat": 13.7242, "lng": 100.5650},
    "THONGLO": {"lat": 13.7224, "lng": 100.5819},
    "ON_NUT": {"lat": 13.7135, "lng": 100.6004},
    "PHROM_PHONG": {"lat": 13.7303, "lng": 100.5735},
    "CHIDLom": {"lat": 13.7416, "lng": 100.5467},
    "HUALAMPHONG": {"lat": 13.7385, "lng": 100.5179},
    "SAPHAN_TAKSIN": {"lat": 13.7214, "lng": 100.5092},
    "HUAI_KHWANG": {"lat": 13.7540, "lng": 100.5725},
    "LAT_PHRAO": {"lat": 13.7694, "lng": 100.5754},
}

def search_near_station(station: str, radius_km: float = 1.5, **kwargs) -> list[dict]:
    """Find properties within walking distance of a BTS/MRT station."""
    hub = TRANSIT_HUBS.get(station.upper())
    if not hub:
        raise ValueError(f"Unknown station: {station}. Available: {list(TRANSIT_HUBS.keys())}")

    params = {
        "lat": hub["lat"],
        "lng": hub["lng"],
        "radius": radius_km,
        "limit": 50,
        **kwargs,
    }
    data = search_properties(**params)
    return data["properties"]

# Example: Condos within 1km of Thonglor BTS, under 40k/mo
nearby = search_near_station("THONGLO", radius_km=1, status="rent", type="condo", maxPrice=40000)
print(f"Found {len(nearby)} condos near Thonglor under 40,000 THB/mo")
```

## Property Detail and Market Comparison

Once you've found a property of interest, fetch its full detail to get `marketPrice` (estimated value), `floorNumber`, and `petFriendly` status:

```python
# Get full property detail
property_id = results[0]["id"]
detail = get_property(property_id)

print(json.dumps({
    "address": detail["address"],
    "price": detail["price"],
    "marketPrice": detail.get("marketPrice"),
    "floorNumber": detail.get("floorNumber"),
    "petFriendly": detail.get("petFriendly"),
    "images": len(detail.get("images", [])),
}, indent=2))
```

The `marketPrice` field is particularly useful for AI agents advising on whether a listing is priced above or below estimated market value:

```python
def assess_value(detail: dict) -> str:
    """Compare listing price against market estimate."""
    price = detail["price"]
    market = detail.get("marketPrice")

    if not market:
        return "No market estimate available"

    diff_pct = ((price - market) / market) * 100
    if diff_pct < -10:
        return f"Below market by {abs(diff_pct):.1f}% — potentially good value"
    elif diff_pct > 10:
        return f"Above market by {diff_pct:.1f}% — premium pricing"
    else:
        return f"Within market range ({diff_pct:+.1f}%)"
```

## Project Intelligence

For agents assisting with new developments or off-plan investments, the projects endpoint provides building-level data:

```python
# Search for recent condominium projects
projects = search_projects(type="condo", minYearBuilt=2020, limit=20)

for project in projects["projects"]:
    print(f"{project['name']} — built {project.get('yearBuilt')}")
    if project.get("developer"):
        print(f"  Developer: {project['developer']}")
    if project.get("totalUnits"):
        print(f"  Total units: {project['totalUnits']}")
    print(f"  Location: {project.get('district', 'Bangkok')}")

    # Get active listing count for this project
    detail_resp = requests.get(f"{API_BASE}/llm/projects/{project['id']}")
    detail = detail_resp.json()
    print(f"  Active listings: {detail['activeListingCount']}")
    print()
```

## Error Handling

```python
from requests.exceptions import HTTPError

try:
    result = get_property("invalid_id")
except HTTPError as e:
    if e.response.status_code == 404:
        print("Property not found")
    elif e.response.status_code == 400:
        error_body = e.response.json()
        print(f"Validation error: {error_body.get('error')}")
```

## Full API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/llm/properties` | GET | Search property listings |
| `/llm/properties/{id}` | GET | Single property detail |
| `/llm/projects` | GET | Search real estate projects |
| `/llm/projects/{id}` | GET | Single project detail |
| `/llms.txt` | GET | Plaintext API documentation |

Base URL: `https://api.o-waw.com`
