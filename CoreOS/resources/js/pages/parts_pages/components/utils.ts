// Utility functions for the Parts Catalog

/**
 * Parse URL filter parameters into an array of strings
 */
export const parseUrlFilterParam = (param?: string): string[] => {
    return param ? param.split(',').filter((s) => s.trim() !== '') : [];
};

/**
 * Convert a string to a URL-friendly slug
 */
export const slugify = (str: string | undefined) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-') // turn spaces/special chars into hyphens
        .replace(/(^-|-$)/g, '');
};
