/**
 * O-WAW Agent Tools — Official SDK for the O-WAW Bangkok Real Estate API
 *
 * Search hundreds of thousands of property listings and thousands of real estate projects
 * across Bangkok, Thailand. Unauthenticated, JSON-based, designed for
 * AI agents and programmatic access.
 *
 * @packageDocumentation
 */

const DEFAULT_BASE_URL = 'https://api.o-waw.com';

// ============================================================================
// Types
// ============================================================================

/** Geographic coordinates as [longitude, latitude] (GeoJSON order) */
export type Coordinates = [number, number];

/** Property type */
export type PropertyType = 'condo' | 'house' | 'townhouse' | 'commercial' | 'land' | 'other';

/** Listing status: rent or sale */
export type ListingStatus = 'rent' | 'sale';

/** Property item returned in search results */
export interface Property {
  id: string;
  type: PropertyType;
  status: ListingStatus;
  price: number;
  priceCurrency?: string;
  pricePerSqm: number | null;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  address: string;
  loc: Coordinates | null;
  /** Full CDN URLs to property images */
  images: string[];
  projectName?: string;
  projectId?: string;
  description?: string;
  createdAt: number;
}

/** Full property detail (extends Property with extra fields) */
export interface PropertyDetail extends Property {
  floorNumber: number | null;
  petFriendly: boolean | null;
  marketPrice: number | null;
  updatedAt: number;
}

/** Project item returned in search results */
export interface Project {
  id: string;
  name: string;
  type: PropertyType;
  loc?: Coordinates;
  address?: string;
  district?: string;
  city?: string;
  province?: string;
  /** Full CDN URLs to project images */
  images: string[];
  developer?: string;
  yearBuilt: number | null;
  totalUnits: number | null;
  totalFloors: number | null;
  description?: string;
  createdAt: number;
}

/** Full project detail (extends Project with listing count) */
export interface ProjectDetail extends Project {
  /** Number of active property listings in this project */
  activeListingCount: number;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

/** Property search parameters */
export interface PropertySearchParams {
  /** Latitude for geo search */
  lat?: number;
  /** Longitude for geo search */
  lng?: number;
  /** Search radius in km (max 100) */
  radius?: number;
  /** Property type(s) */
  type?: PropertyType | PropertyType[];
  /** "rent" or "sale" */
  status?: ListingStatus;
  /** Minimum price in THB */
  minPrice?: number;
  /** Maximum price in THB */
  maxPrice?: number;
  /** Minimum area in sqm */
  minArea?: number;
  /** Maximum area in sqm */
  maxArea?: number;
  /** Minimum bedrooms */
  minBedrooms?: number;
  /** Minimum bathrooms */
  minBathrooms?: number;
  /** Filter by project ID */
  projectId?: string;
  /** Full-text search */
  search?: string;
  /** Max results (1-100, default 20) */
  limit?: number;
  /** Pagination offset */
  skip?: number;
}

/** Project search parameters */
export interface ProjectSearchParams {
  /** Project type(s) */
  type?: PropertyType | PropertyType[];
  /** Full-text search */
  search?: string;
  /** Latitude for geo search */
  lat?: number;
  /** Longitude for geo search */
  lng?: number;
  /** Search radius in km */
  radius?: number;
  /** Minimum year built */
  minYearBuilt?: number;
  /** Maximum year built */
  maxYearBuilt?: number;
  /** Max results (1-100, default 20) */
  limit?: number;
  /** Pagination offset */
  skip?: number;
}

/** SDK configuration */
export interface OWawConfig {
  /** API base URL (default: https://api.o-waw.com) */
  baseURL?: string;
  /** Custom fetch function (for Node < 18 or testing) */
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

// ============================================================================
// Error class
// ============================================================================

export class OWawError extends Error {
  constructor(
    public status: number,
    public body: any,
  ) {
    super(body?.error || body?.message || `API error ${status}`);
    this.name = 'OWawError';
  }
}

// ============================================================================
// Main client
// ============================================================================

/**
 * O-WAW API client for searching Bangkok real estate.
 *
 * @example
 * ```typescript
 * import { OWaw } from 'o-waw-agent-tools';
 *
 * const client = new OWaw();
 *
 * // Search condos for rent under 30,000 THB
 * const results = await client.searchProperties({
 *   status: 'rent',
 *   type: 'condo',
 *   maxPrice: 30000,
 *   minBedrooms: 1,
 *   limit: 10,
 * });
 *
 * console.log(`Found ${results.total} properties`);
 * for (const p of results.items) {
 *   console.log(`${p.address} — ${p.price.toLocaleString()} THB/mo`);
 * }
 * ```
 */
export class OWaw {
  private baseURL: string;
  private fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

  constructor(config: OWawConfig = {}) {
    this.baseURL = (config.baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetch = config.fetch || globalThis.fetch;
  }

  // --------------------------------------------------------------------------
  // Properties
  // --------------------------------------------------------------------------

  /**
   * Search property listings with filters.
   * Returns active listings only (no pending/rejected).
   *
   * @example
   * ```typescript
   * // All condos for rent near Sukhumvit, under 25k THB
   * const results = await client.searchProperties({
   *   status: 'rent',
   *   type: 'condo',
   *   maxPrice: 25000,
   *   search: 'sukhumvit',
   *   limit: 20,
   * });
   * ```
   */
  async searchProperties(params: PropertySearchParams = {}): Promise<PaginatedResponse<Property>> {
    const qs = this.buildQueryString(params);
    const res = await this.fetch(`${this.baseURL}/llm/properties${qs}`);
    if (!res.ok) throw new OWawError(res.status, await res.json().catch(() => null));
    const data = await res.json() as any;
    return { items: data.properties, total: data.total, hasMore: data.hasMore };
  }

  /**
   * Get full details for a single property by ID.
   *
   * @example
   * ```typescript
   * const property = await client.getProperty('WN7qXXtSCiHD0Lm_o-hPFQ');
   * console.log(property.images); // full CDN URLs
   * console.log(property.marketPrice); // estimated market value
   * ```
   */
  async getProperty(id: string): Promise<PropertyDetail> {
    const res = await this.fetch(`${this.baseURL}/llm/properties/${encodeURIComponent(id)}`);
    if (!res.ok) throw new OWawError(res.status, await res.json().catch(() => null));
    return res.json();
  }

  // --------------------------------------------------------------------------
  // Projects
  // --------------------------------------------------------------------------

  /**
   * Search real estate projects (condominiums, housing developments).
   *
   * @example
   * ```typescript
   * // Find all condo projects built after 2020
   * const results = await client.searchProjects({
   *   type: 'condo',
   *   minYearBuilt: 2020,
   *   limit: 20,
   * });
   * ```
   */
  async searchProjects(params: ProjectSearchParams = {}): Promise<PaginatedResponse<Project>> {
    const qs = this.buildQueryString(params);
    const res = await this.fetch(`${this.baseURL}/llm/projects${qs}`);
    if (!res.ok) throw new OWawError(res.status, await res.json().catch(() => null));
    const data = await res.json() as any;
    return { items: data.projects, total: data.total, hasMore: data.hasMore };
  }

  /**
   * Get full details for a single project by ID.
   * Includes activeListingCount (number of available listings).
   *
   * @example
   * ```typescript
   * const project = await client.getProject('eNaAq7762Cd9mDwvFKZL6Q');
   * console.log(`${project.name}: ${project.activeListingCount} listings available`);
   * ```
   */
  async getProject(id: string): Promise<ProjectDetail> {
    const res = await this.fetch(`${this.baseURL}/llm/projects/${encodeURIComponent(id)}`);
    if (!res.ok) throw new OWawError(res.status, await res.json().catch(() => null));
    return res.json();
  }

  // --------------------------------------------------------------------------
  // Convenience: collect all pages
  // --------------------------------------------------------------------------

  /**
   * Fetch ALL matching properties across all pages.
   * Automatically paginates. Use `maxItems` to cap results.
   *
   * @example
   * ```typescript
   * // All houses for sale in Bangkok under 10M THB
   * const allHouses = await client.allProperties({
   *   status: 'sale',
   *   type: 'house',
   *   maxPrice: 10_000_000,
   *   maxItems: 500,
   * });
   * ```
   */
  async allProperties(
    params: Omit<PropertySearchParams, 'limit' | 'skip'> & { maxItems?: number } = {},
  ): Promise<Property[]> {
    const { maxItems, ...searchParams } = params;
    const all: Property[] = [];
    let skip = 0;
    const limit = 100;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await this.searchProperties({ ...searchParams, limit, skip });
      all.push(...page.items);
      if (!page.hasMore) break;
      if (maxItems && all.length >= maxItems) {
        all.length = maxItems;
        break;
      }
      skip += limit;
    }
    return all;
  }

  /**
   * Fetch ALL matching projects across all pages.
   * Automatically paginates. Use `maxItems` to cap results.
   */
  async allProjects(
    params: Omit<ProjectSearchParams, 'limit' | 'skip'> & { maxItems?: number } = {},
  ): Promise<Project[]> {
    const { maxItems, ...searchParams } = params;
    const all: Project[] = [];
    let skip = 0;
    const limit = 100;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await this.searchProjects({ ...searchParams, limit, skip });
      all.push(...page.items);
      if (!page.hasMore) break;
      if (maxItems && all.length >= maxItems) {
        all.length = maxItems;
        break;
      }
      skip += limit;
    }
    return all;
  }

  // --------------------------------------------------------------------------
  // Health
  // --------------------------------------------------------------------------

  /** Check API health status */
  async health(): Promise<{ status: string; uptime: number }> {
    const res = await this.fetch(`${this.baseURL}/health`);
    return res.json();
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private buildQueryString(params: Record<string, any>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const v of value) parts.push(`${key}=${encodeURIComponent(v)}`);
      } else {
        parts.push(`${key}=${encodeURIComponent(value)}`);
      }
    }
    return parts.length > 0 ? `?${parts.join('&')}` : '';
  }
}
