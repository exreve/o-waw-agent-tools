"""
Example: Search Bangkok properties using O-WAW API (Python)
Run: python examples/search-properties.py

No SDK needed — just the requests library.
"""

import requests

API = "https://api.o-waw.com"


def search_properties(**params):
    """Search property listings."""
    resp = requests.get(f"{API}/llm/properties", params=params)
    resp.raise_for_status()
    return resp.json()


def get_property(property_id: str):
    """Get property detail by ID."""
    resp = requests.get(f"{API}/llm/properties/{property_id}")
    resp.raise_for_status()
    return resp.json()


def search_projects(**params):
    """Search real estate projects."""
    resp = requests.get(f"{API}/llm/projects", params=params)
    resp.raise_for_status()
    return resp.json()


def main():
    print("Searching condos for rent under 25,000 THB...\n")

    data = search_properties(
        status="rent",
        type="condo",
        maxPrice=25000,
        minBedrooms=1,
        limit=10,
    )

    print(f"Found {data['total']} properties (showing {len(data['properties'])}):\n")

    for p in data["properties"]:
        print(f"[{p['id']}]")
        print(f"  {p['address']}")
        print(f"  {p['price']:,} THB/mo · {p.get('area', '?')} sqm · {p.get('bedrooms', '?')}BR")
        if p.get("projectName"):
            print(f"  Project: {p['projectName']}")
        print(f"  Photos: {len(p.get('images', []))}")
        print()

    # Get detail for the first result
    if data["properties"]:
        first = data["properties"][0]
        print(f"\n--- Property Detail: {first['address']} ---\n")
        detail = get_property(first["id"])
        print(f"Floor: {detail.get('floorNumber', 'N/A')}")
        print(f"Market price: {detail.get('marketPrice', 'N/A')}")
        print(f"Pet friendly: {detail.get('petFriendly', 'N/A')}")
        if detail.get("description"):
            print(f"Description: {detail['description'][:200]}...")


if __name__ == "__main__":
    main()
