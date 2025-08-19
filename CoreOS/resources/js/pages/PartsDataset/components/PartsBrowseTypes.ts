// Type definitions for the Parts Browse page

/**
 * Part interface for the browse view (simplified from the new database schema)
 */
export interface BrowsePart {
    id: number;
    part_number?: string;
    description?: string;
    manufacture?: string;
    part_type?: string;
    part_category?: string;
    models?: string[];
    quantity?: string;
    part_location?: string;
    image_url?: string | null;
    shopify_image?: string | null;
    has_shopify_match?: boolean;
    online_store_url?: string | null;
    shopify_data?: {
        admin_url?: string;
        title?: string;
        vendor?: string;
        status?: string;
    };
    additional_fields?: Record<string, any>;
    upload_info?: {
        filename?: string;
        uploaded_at?: string;
    };
    is_active?: boolean;
    created_at?: string;
}

/**
 * Paginated response for parts browse
 */
export interface PaginatedBrowsePartsResponse {
    data: BrowsePart[];
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        from: number | null;
        last_page: number;
        path: string;
        per_page: number;
        to: number | null;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
}

/**
 * URL filters for the parts browse
 */
export interface BrowseFilters {
    search?: string;
}

/**
 * Props for the PartsBrowse component
 */
export interface PartsBrowsePageProps {
    initialParts?: PaginatedBrowsePartsResponse;
    filters?: BrowseFilters;
}

/**
 * Default paginated data for browse
 */
export const defaultBrowsePaginatedData: PaginatedBrowsePartsResponse = {
    data: [],
    links: {first: null, last: null, prev: null, next: null},
    meta: {current_page: 1, from: null, last_page: 1, path: '', per_page: 25, to: null, total: 0, links: []},
};
