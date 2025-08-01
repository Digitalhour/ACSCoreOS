import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import React, {useCallback, useEffect, useState} from 'react';

// Shadcn/ui Components
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';

// Icons from lucide-react
import {FilterX, Grid3X3, List, Loader2, Package, Search, ShoppingCart, XCircle} from 'lucide-react';

// Import components, types and utilities
import {Input} from '@/components/ui/input';
import DataTableFilterPopover from '@/pages/parts_pages/components/DataTableFilterPopover';
import PartDetailsModal from './components/PartDetailsModal';
import PartHoverCard from './components/PartHoverCard';
import {
    defaultFilterOptions,
    defaultPaginatedData,
    FilterOptions,
    PaginatedPartsResponse,
    Part,
    PartsCatalogPageProps
} from './components/types';
import {parseUrlFilterParam} from './components/utils';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Parts Catalog',
        href: '/parts-catalog',
    },
];

// Main Component
export default function PartsCatalog({ initialParts, initialFilterOptions, filters: initialFiltersFromUrl }: PartsCatalogPageProps) {
    const [partsData, setPartsData] = useState<PaginatedPartsResponse>(initialParts || defaultPaginatedData);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>(initialFilterOptions || defaultFilterOptions);
    const [searchTerm, setSearchTerm] = useState<string>(initialFiltersFromUrl?.search || '');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>(parseUrlFilterParam(initialFiltersFromUrl?.manufacturer));
    const [selectedCategories, setSelectedCategories] = useState<string[]>(parseUrlFilterParam(initialFiltersFromUrl?.category));
    const [selectedModels, setSelectedModels] = useState<string[]>(parseUrlFilterParam(initialFiltersFromUrl?.model));
    const [selectedPartTypes, setSelectedPartTypes] = useState<string[]>(parseUrlFilterParam(initialFiltersFromUrl?.part_type));

    const [selectedPart, setSelectedPart] = useState<Part | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialParts && initialParts.data && initialParts.links && initialParts.meta) {
            setPartsData(initialParts);
        } else if (initialParts) {
            setPartsData(defaultPaginatedData);
            setError('Error: Initial parts data is incomplete.');
        }
    }, [initialParts]);

    useEffect(() => {
        if (initialFilterOptions) {
            setFilterOptions(initialFilterOptions);
        }
    }, [initialFilterOptions]);

    // Function to load filter options if they weren't provided initially
    const loadFilterOptions = useCallback(() => {
        if (!filterOptions.manufacturers.length && !filterOptions.categories.length) {
            setIsLoading(true);
            router.get(
                '/parts-catalog',
                { load_filters: true },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: false,
                    only: ['initialFilterOptions'],
                    onError: (errors) => {
                        console.error('Filter options fetch error:', errors);
                    },
                    onFinish: () => setIsLoading(false),
                },
            );
        }
    }, [filterOptions]);

    // AJAX-based fetch function that only updates the table data
    const fetchParts = useCallback(
        (page: number = 1, newSearchTerm?: string) => {
            setIsLoading(true);
            setError(null);
            const queryParams: Record<string, string | number> = {};
            const currentSearch = newSearchTerm !== undefined ? newSearchTerm : searchTerm;

            // Only add page parameter if it's not page 1
            if (page > 1) queryParams.page = page;

            if (currentSearch) queryParams.search = currentSearch;
            if (selectedManufacturers.length > 0) queryParams.manufacturer = selectedManufacturers.join(',');
            if (selectedCategories.length > 0) queryParams.category = selectedCategories.join(',');
            if (selectedModels.length > 0) queryParams.model = selectedModels.join(',');
            if (selectedPartTypes.length > 0) queryParams.part_type = selectedPartTypes.join(',');

            router.get('/parts-catalog', queryParams, {
                preserveState: true,
                preserveScroll: true,
                replace: false,
                only: ['initialParts'],
                onError: (errors) => {
                    setError('Failed to load parts. Please try again.');
                    console.error('Parts fetch error:', errors);
                },
                onFinish: () => setIsLoading(false),
            });
        },
        [searchTerm, selectedManufacturers, selectedCategories, selectedModels, selectedPartTypes],
    );

    // Debounced search effect
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm !== (initialFiltersFromUrl?.search || '')) {
                fetchParts(1, searchTerm);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm, initialFiltersFromUrl?.search, fetchParts]);

    // Immediate filter change effect (no debounce for dropdown selections)
    useEffect(() => {
        // Skip initial render to avoid duplicate requests
        if (initialFiltersFromUrl) {
            fetchParts(1);
        }
    }, [selectedManufacturers, selectedCategories, selectedModels, selectedPartTypes]);

    const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handlePageChange = (pageUrl: string | null) => {
        if (pageUrl) {
            const url = new URL(pageUrl, window.location.origin);
            const page = url.searchParams.get('page');
            if (page) fetchParts(parseInt(page, 10));
        }
    };

    const handleShowDetails = (part: Part) => {
        setSelectedPart(part);
        setIsModalOpen(true);
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedManufacturers([]);
        setSelectedCategories([]);
        setSelectedModels([]);
        setSelectedPartTypes([]);

        // Use router.get with only to just update the data, not reload page
        router.get(
            '/parts-catalog',
            {}, // Empty query params to reset to clean URL
            {
                preserveState: true,
                preserveScroll: true,
                replace: false,
                only: ['initialParts'],
                onError: (errors) => {
                    console.error('Reset filters error:', errors);
                },
            },
        );
    };

    const hasActiveFilters =
        selectedManufacturers.length > 0 || selectedCategories.length > 0 || selectedModels.length > 0 || selectedPartTypes.length > 0 || searchTerm;

    const truncate = (str: string | undefined, max = 30) => {
        if (typeof str !== 'string') return 'N/A';
        return str.length > max ? str.slice(0, max) + '…' : str;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Parts Catalog" />

            <div className="flex h-full max-h-screen flex-1 flex-col space-y-6 p-3">
                {/* Header */}
                <div className="flex flex-col space-y-4">
                    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                        <div className="relative w-full max-w-sm">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                placeholder="Search parts, numbers, descriptions, models..."
                                value={searchTerm}
                                onChange={handleSearchInputChange}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {hasActiveFilters && (
                                <Button onClick={handleResetFilters} variant="destructive" size="sm">
                                    Reset
                                    <FilterX className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                            <DataTableFilterPopover
                                title="Manufacturer"
                                options={filterOptions.manufacturers}
                                selectedValues={selectedManufacturers}
                                setSelectedValues={setSelectedManufacturers}
                                filterKey="manufacturer"
                                onOpen={loadFilterOptions}
                                enableSearch={true}
                            />
                            <DataTableFilterPopover
                                title="Category"
                                options={filterOptions.categories}
                                selectedValues={selectedCategories}
                                setSelectedValues={setSelectedCategories}
                                filterKey="category"
                                onOpen={loadFilterOptions}
                                enableSearch={true}
                            />
                            <DataTableFilterPopover
                                title="Model"
                                options={filterOptions.models}
                                selectedValues={selectedModels}
                                setSelectedValues={setSelectedModels}
                                filterKey="model"
                                onOpen={loadFilterOptions}
                                enableSearch={true}
                            />
                            <DataTableFilterPopover
                                title="Part Type"
                                options={filterOptions.partTypes}
                                selectedValues={selectedPartTypes}
                                setSelectedValues={setSelectedPartTypes}
                                filterKey="part_type"
                                onOpen={loadFilterOptions}
                                enableSearch={true}
                            />

                            {/* View Toggle */}
                            <div className="flex items-center space-x-2 rounded-lg border p-1">
                                <Button
                                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('table')}
                                    className="h-8 px-3"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                    className="h-8 px-3"
                                >
                                    <Grid3X3 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Pagination */}
                    {partsData.meta.total > partsData.meta.per_page && (
                        <div className="flex items-center justify-between">
                            <div className="ml-4">
                                <p className="text-muted-foreground text-sm">
                                    Showing {partsData.meta.from} to {partsData.meta.to} of {partsData.meta.total} parts
                                </p>
                            </div>
                            <div className="mr-4">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href={partsData.links.prev || undefined}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (partsData.links.prev) handlePageChange(partsData.links.prev);
                                                }}
                                                className={!partsData.links.prev ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                        {partsData.meta.links.map((link, index) => {
                                            if (link.label.includes('Previous') || link.label.includes('Next')) return null;
                                            if (!link.url && link.label === '...')
                                                return (
                                                    <PaginationItem key={`ellipsis-${index}`}>
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                );
                                            return (
                                                <PaginationItem key={link.label + '-' + index}>
                                                    <PaginationLink
                                                        href={link.url || undefined}
                                                        isActive={link.active}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (link.url) handlePageChange(link.url);
                                                        }}
                                                    >
                                                        <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                                    </PaginationLink>
                                                </PaginationItem>
                                            );
                                        })}
                                        <PaginationItem>
                                            <PaginationNext
                                                href={partsData.links.next || undefined}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (partsData.links.next) handlePageChange(partsData.links.next);
                                                }}
                                                className={!partsData.links.next ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="bg-card flex-1 rounded-lg border">
                    {error && (
                        <div className="m-4 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
                            <p>{error}</p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex h-64 items-center justify-center">
                            <div className="flex items-center space-x-2">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span>Loading parts...</span>
                            </div>
                        </div>
                    )}

                    {!isLoading && partsData.data.length === 0 && (
                        <div className="flex h-64 flex-col items-center justify-center text-center">
                            <XCircle className="text-muted-foreground mb-4 h-12 w-12" />
                            <h3 className="text-lg font-semibold">No parts found</h3>
                            <p className="text-muted-foreground">Try adjusting your search or filters</p>
                        </div>
                    )}

                    {!isLoading && partsData.data.length > 0 && viewMode === 'table' && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-20">Images</TableHead>
                                    <TableHead>Manufacturer</TableHead>
                                    <TableHead>Part Number</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Models</TableHead>
                                    <TableHead className="w-16">Store</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {partsData.data.map((part) => (
                                    <PartHoverCard key={part.id} part={part}>
                                        <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => handleShowDetails(part)}>
                                            <TableCell>
                                                <div className="flex space-x-1">
                                                    {part.shopify_image ? (
                                                        <div className="relative">
                                                            <img
                                                                src={part.shopify_image}
                                                                alt=""
                                                                className="h-10 w-10 rounded border-2 object-cover"
                                                            />
                                                            <ShoppingCart className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white p-0.5 text-gray-500" />
                                                        </div>
                                                    ) : part.image_url ? (
                                                        <img src={part.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                                                    ) : (
                                                        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded">
                                                            <Package className="text-muted-foreground h-4 w-4" />
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{part.manufacture || 'N/A'}</TableCell>
                                            <TableCell className="font-medium">{part.part_number || 'N/A'}</TableCell>
                                            <TableCell>{part.part_type || 'N/A'}</TableCell>
                                            <TableCell>{truncate(part.part_category, 30)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {part.models && part.models.length > 0 ? (
                                                        <>
                                                            {part.models.slice(0, 5).map((model, index) => (
                                                                <Badge key={index} variant="secondary" className="text-xs">
                                                                    {model}
                                                                </Badge>
                                                            ))}
                                                            {part.models.length > 5 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    +{part.models.length - 5}
                                                                </Badge>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">N/A</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {part.has_shopify_match && (
                                                    <Badge variant="outline" className="text-xs text-green-600">
                                                        <ShoppingCart className="mr-1 h-3 w-3" />
                                                        Yes
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </PartHoverCard>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {/* Grid view placeholder */}
                    {!isLoading && partsData.data.length > 0 && viewMode === 'grid' && (
                        <div className="p-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                <p className="text-muted-foreground col-span-full text-center">Grid view - To be implemented</p>
                            </div>
                        </div>
                    )}

                    {/* Bottom Pagination */}
                    {partsData.meta.total > partsData.meta.per_page && (
                        <div className="flex items-center justify-between border-t p-4">
                            <div>
                                <p className="text-muted-foreground text-sm">
                                    Showing {partsData.meta.from} to {partsData.meta.to} of {partsData.meta.total} parts
                                </p>
                            </div>
                            <div>
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href={partsData.links.prev || undefined}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (partsData.links.prev) handlePageChange(partsData.links.prev);
                                                }}
                                                className={!partsData.links.prev ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                        {partsData.meta.links.map((link, index) => {
                                            if (link.label.includes('Previous') || link.label.includes('Next')) return null;
                                            if (!link.url && link.label === '...')
                                                return (
                                                    <PaginationItem key={`ellipsis-${index}`}>
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                );
                                            return (
                                                <PaginationItem key={link.label + '-' + index}>
                                                    <PaginationLink
                                                        href={link.url || undefined}
                                                        isActive={link.active}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (link.url) handlePageChange(link.url);
                                                        }}
                                                    >
                                                        <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                                    </PaginationLink>
                                                </PaginationItem>
                                            );
                                        })}
                                        <PaginationItem>
                                            <PaginationNext
                                                href={partsData.links.next || undefined}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (partsData.links.next) handlePageChange(partsData.links.next);
                                                }}
                                                className={!partsData.links.next ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Part Details Modal */}
            <PartDetailsModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} part={selectedPart} />
        </AppLayout>
    );
}
