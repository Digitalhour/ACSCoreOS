// Type definitions for the Parts Catalog

/**
 * Part interface representing a part in the catalog
 */
export interface Part {
    id: number;
    file_name?: string;
    import_timestamp?: string;
    part_number?: string;
    description?: string;
    ccn_number?: string;
    manufacture?: string;
    models?: string[];
    manufacture_serial?: string;
    part_type?: string;
    part_category?: string;
    pdf_id?: string;
    pdf_url?: string | null;
    manual_number?: string;
    manual_date?: string;
    manual_date_parsed?: string;
    revision?: string;
    quantity?: string;
    part_location?: string;
    additional_notes?: string;
    img_page_number?: string;
    img_page_path?: string;
    custom_fields?: Record<string, any>;
    image_url?: string | null;
    batch_id?: string;
    is_active?: boolean;
    // Shopify-related fields
    shopify_image?: string | null;
    has_shopify_match?: boolean;
    nsproduct_match?: any;
    shopify_data?: any;

    [key: string]: any;
}

/**
 * Paginated response for parts
 */
export interface PaginatedPartsResponse {
    data: Part[];
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
 * Filter options for the parts catalog
 */
export interface FilterOptions {
    manufacturers: string[];
    categories: string[];
    models: string[];
    serials: string[];
    partTypes: string[];
}

/**
 * URL filters for the parts catalog
 */
export interface UrlFilters {
    search?: string;
    manufacturer?: string;
    category?: string;
    model?: string;
    serial_number?: string;
    part_type?: string;
}

/**
 * Props for the PartsCatalog component
 */
export interface PartsCatalogPageProps {
    initialParts?: PaginatedPartsResponse;
    initialFilterOptions?: FilterOptions;
    filters?: UrlFilters;
}

/**
 * Default paginated data
 */
export const defaultPaginatedData: PaginatedPartsResponse = {
    data: [],
    links: {first: null, last: null, prev: null, next: null},
    meta: {current_page: 1, from: null, last_page: 1, path: '', per_page: 25, to: null, total: 0, links: []},
};

/**
 * Default filter options
 */
export const defaultFilterOptions: FilterOptions = {
    manufacturers: [],
    categories: [],
    models: [],
    serials: [],
    partTypes: [],
};
