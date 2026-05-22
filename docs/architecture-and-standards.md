# O-WAW Architecture: Building an AI-Native Real Estate API

Technical architecture notes on how the O-WAW real estate platform exposes structured property data to AI agents, chatbots, and automated systems. This document covers the design decisions behind the API, discovery standards compliance, and integration patterns.

## System Overview

O-WAW is a Bangkok-focused real estate platform that processes property listings from multiple sources (direct submissions, Facebook marketplace extraction via Puppeteer + AI, agent inputs) into a unified MongoDB database. The data is then exposed through multiple interfaces:

- **Web application** (https://o-waw.com) — React 18 PWA with MapLibre GL map visualization
- **Public JSON API** (https://api.o-waw.com/llm/) — unauthenticated, structured endpoints for AI agents
- **SDK** (npm: `o-waw-agent-tools`) — TypeScript client library
- **Discovery endpoints** — RFC 8288, RFC 9727, SEP-1649, Agent Skills v0.2.0

## Data Pipeline

```
Property Sources → AI Extraction → MongoDB (2dsphere) → API Endpoints → AI Agents
     ↓                                              ↓
  Facebook posts                              Geospatial queries
  Agent submissions                           Text search ($text index)
  Direct uploads                              Price/area/room filters
```

The MongoDB collection uses a `2dsphere` index on the `loc` field (GeoJSON `[lng, lat]` format), enabling radius queries via `$geoWithin` and `$nearSphere`. This is how the `/llm/properties` endpoint supports `lat`, `lng`, and `radius` parameters.

## API Design Decisions

### No Authentication

The `/llm/` endpoints require no API key or token. This is intentional — the data exposed (property listings, project details, images) is publicly available information. Removing auth friction enables:

- AI agents to query directly without credential management
- Training data pipelines to ingest structured real estate data
- Developer tools and scripts to work without setup

Sensitive data (contacts, owner info, internal metadata, user accounts) is never exposed through these endpoints. The mapping layer strips `contactIds`, `isAgent`, `source`, `metadata`, and other internal fields.

### Image URLs

Images are stored in Backblaze B2 object storage and served through a CDN at `https://images.o-waw.com/{key}`. The API returns fully resolved URLs — consumers don't need to construct or transform image paths:

```json
{
  "images": [
    "https://images.o-waw.com/rLKQlAyhE4hQYg",
    "https://images.o-waw.com/2a9_jZheDupFzg"
  ]
}
```

The storage keys are compact base64url strings (13-14 characters) rather than full file paths.

### Pagination Model

All list endpoints use offset-based pagination (`limit` + `skip`) rather than cursor-based. This was chosen for simplicity — AI agents can easily calculate the next page offset. The response envelope includes `total` and `hasMore`:

```json
{
  "properties": [...],
  "total": 2841,
  "hasMore": true
}
```

Maximum page size is 100 items.

## Discovery Standards Compliance

O-WAW implements multiple discovery and interoperability standards:

### RFC 8288 — Web Linking

Every HTTP response from both `o-waw.com` and `api.o-waw.com` includes a `Link` header:

```
Link: </llms.txt>; rel="llms-txt",
      </.well-known/api-catalog>; rel="api-catalog",
      </.well-known/mcp/server-card.json>; rel="service-desc"; type="application/json",
      </api/docs>; rel="service-doc"; type="text/html",
      </health>; rel="status"
```

### RFC 9727 — API Catalog

`/.well-known/api-catalog` returns `application/linkset+json` with entries for all four LLM endpoints, each linked to the OpenAPI spec, documentation, and health check:

```bash
curl -s https://api.o-waw.com/.well-known/api-catalog
```

```json
{
  "linkset": [
    {
      "anchor": "https://api.o-waw.com/llm/properties",
      "service-desc": [{"href": "https://api.o-waw.com/api/docs/json", "type": "application/vnd.oai.openapi+json"}],
      "service-doc": [{"href": "https://api.o-waw.com/api/docs", "type": "text/html"}],
      "status": [{"href": "https://api.o-waw.com/health"}]
    }
  ]
}
```

### SEP-1649 — MCP Server Card

`/.well-known/mcp/server-card.json` provides a machine-readable description of the API as an MCP-compatible tool server. It includes full JSON Schema definitions for each tool's input parameters:

```bash
curl -s https://api.o-waw.com/.well-known/mcp/server-card.json | jq '.serverInfo'
```

```json
{
  "name": "o-waw-property-api",
  "title": "O-WAW Bangkok Property API",
  "version": "1.0.0"
}
```

### Agent Skills Discovery v0.2.0

`/.well-known/agent-skills/index.json` enumerates available skills with SHA-256 integrity digests:

```bash
curl -s https://api.o-waw.com/.well-known/agent-skills/index.json | jq '.skills[].name'
```

Each skill has a corresponding `SKILL.md` file with YAML frontmatter and Markdown instructions:

```bash
curl -s https://api.o-waw.com/.well-known/agent-skills/search-properties/SKILL.md
```

### llms.txt

The plaintext standard for LLM API discovery:

```bash
curl -s https://api.o-waw.com/llms.txt
```

### robots.txt — AI Consent

The `robots.txt` file explicitly grants access to all major AI crawlers and training pipelines:

```
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: PerplexityBot
User-agent: CCBot
User-agent: Google-Extended
...
Allow: /
Allow: /llm/
Allow: /.well-known/
Allow: /llms.txt
```

## WebMCP Browser Integration

The frontend at `o-waw.com` registers tools with browser-based AI agents via the WebMCP API:

```typescript
// frontend/src/utils/webMcp.ts
navigator.modelContext.provideContext({
  tools: [
    {
      name: 'search_properties',
      description: 'Search Bangkok real estate properties...',
      inputSchema: { type: 'object', properties: { ... } },
      execute: async (args) => {
        const res = await fetch('https://api.o-waw.com/llm/properties?...');
        return res.json();
      }
    }
  ]
});
```

This enables AI assistants embedded in browsers to query property data directly from the user's context.

## Data Coverage

| Metric | Value |
|--------|-------|
| Active listings | 3,000+ |
| Real estate projects | 1,300+ |
| Geographic coverage | Bangkok metropolitan area |
| Currency | Thai Baht (THB) |
| Property types | Condo, house, townhouse, commercial, land |
| Listing types | Rent (monthly), sale (purchase) |
| Update frequency | Real-time (new listings appear within minutes) |

## Technology Stack

- **Backend**: Fastify 5 on Node.js, MongoDB 7 with 2dsphere geospatial indexing
- **Frontend**: React 18 PWA with MapLibre GL, Zustand state management
- **Storage**: Backblaze B2 + CDN for images
- **Deployment**: PM2 on VPS, Cloudflare Pages + Tunnel for public access
