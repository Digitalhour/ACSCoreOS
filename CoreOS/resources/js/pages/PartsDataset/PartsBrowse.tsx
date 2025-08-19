import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import React, {useCallback, useEffect, useRef, useState} from 'react';

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
import {Grid3X3, List, Loader2, Package, Search, ShoppingCart, XCircle} from 'lucide-react';

// Import components and utilities
import {Input} from '@/components/ui/input';
import PartDetailsModal from './components/PartsDetailsModal';
import BrowsePartHoverCard from './components/PartHoverCard';
import {
    BrowsePart,
    defaultBrowsePaginatedData,
    PaginatedBrowsePartsResponse,
    PartsBrowsePageProps,
} from './components/PartsBrowseTypes';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Parts Browse',
        href: '/parts-dataset/parts-browse',
    },
];

// Main Component
export default function PartsBrowse({ initialParts, filters: initialFiltersFromUrl }: PartsBrowsePageProps) {
    const [partsData, setPartsData] = useState<PaginatedBrowsePartsResponse>(initialParts || defaultBrowsePaginatedData);
    const [searchTerm, setSearchTerm] = useState<string>(initialFiltersFromUrl?.search || '');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [selectedPart, setSelectedPart] = useState<BrowsePart | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Refs for preventing duplicate requests
    const currentRequestRef = useRef<string | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialMount = useRef<boolean>(true);

    // Initialize data on mount
    useEffect(() => {
        if (initialParts?.data && initialParts?.links && initialParts?.meta) {
            setPartsData(initialParts);
        } else {
            console.log('Initial parts data:', initialParts);
            if (!initialParts) {
                setError('No initial parts data received from server.');
            } else {
                setError('Initial parts data structure is incomplete.');
            }
            setPartsData(defaultBrowsePaginatedData);
        }
        isInitialMount.current = false;
    }, [initialParts]);

    // Single consolidated fetch function with request deduplication
    const fetchParts = useCallback(
        (page: number = 1, newSearchTerm?: string, immediate: boolean = false) => {
            // Build query params
            const queryParams: Record<string, string | number> = {};
            const currentSearch = newSearchTerm !== undefined ? newSearchTerm : searchTerm;

            if (page > 1) queryParams.page = page;
            if (currentSearch) queryParams.search = currentSearch;

            // Create request signature for deduplication
            const requestSignature = JSON.stringify(queryParams);

            // Prevent duplicate requests
            if (currentRequestRef.current === requestSignature) {
                return;
            }

            const executeRequest = () => {
                currentRequestRef.current = requestSignature;
                setIsLoading(true);
                setError(null);

                router.get('/parts-dataset/parts-browse', queryParams, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: false,
                    only: ['initialParts'],
                    onSuccess: () => {
                        currentRequestRef.current = null;
                    },
                    onError: (errors) => {
                        setError('Failed to load parts. Please try again.');
                        console.error('Parts fetch error:', errors);
                        currentRequestRef.current = null;
                    },
                    onFinish: () => {
                        setIsLoading(false);
                    },
                });
            };

            if (immediate) {
                executeRequest();
            } else {
                // Clear any existing timeout
                if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                }

                // Set new timeout for search debouncing
                searchTimeoutRef.current = setTimeout(executeRequest, 500);
            }
        },
        [searchTerm],
    );

    // Handle search input changes (debounced)
    const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = event.target.value;
        setSearchTerm(newSearchTerm);

        // Skip on initial mount
        if (!isInitialMount.current) {
            fetchParts(1, newSearchTerm, false); // false = use debounce
        }
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const handlePageChange = (pageUrl: string | null) => {
        if (pageUrl) {
            const url = new URL(pageUrl, window.location.origin);
            const page = url.searchParams.get('page');
            if (page) {
                fetchParts(parseInt(page, 10), undefined, true); // true = immediate
            }
        }
    };

    const handleShowDetails = (part: BrowsePart) => {
        setSelectedPart(part);
        setIsModalOpen(true);
    };

    const handleResetSearch = () => {
        setSearchTerm('');

        // Use router.get to reset to clean URL
        currentRequestRef.current = 'reset';
        setIsLoading(true);

        router.get(
            '/parts-dataset/parts-browse',
            {}, // Empty query params to reset to clean URL
            {
                preserveState: true,
                preserveScroll: true,
                replace: false,
                only: ['initialParts'],
                onSuccess: () => {
                    currentRequestRef.current = null;
                },
                onError: (errors) => {
                    console.error('Reset search error:', errors);
                    currentRequestRef.current = null;
                },
                onFinish: () => {
                    setIsLoading(false);
                },
            },
        );
    };

    const truncate = (str: string | undefined, max = 30) => {
        if (typeof str !== 'string') return 'N/A';
        return str.length > max ? str.slice(0, max) + '…' : str;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Parts Browse" />

            <div className="flex h-full max-h-screen flex-1 flex-col space-y-6 p-3">
                {/* Header */}
                <div className="flex flex-col space-y-4">
                    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                        <div className="relative w-full max-w-sm">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                placeholder="Search parts, numbers, descriptions..."
                                value={searchTerm}
                                onChange={handleSearchInputChange}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {searchTerm && (
                                <Button onClick={handleResetSearch} variant="destructive" size="sm">
                                    Clear Search
                                </Button>
                            )}

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
                    {partsData.meta && partsData.meta.total > partsData.meta.per_page && (
                        <div className="flex items-center justify-between">
                            <div className="ml-4">
                                <p className="text-muted-foreground text-sm">
                                    Showing {partsData.meta?.from || 0} to {partsData.meta?.to || 0} of {partsData.meta?.total || 0} parts
                                </p>
                            </div>
                            <div className="mr-4">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href={undefined}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (partsData.links?.prev) handlePageChange(partsData.links.prev);
                                                }}
                                                className={!partsData.links?.prev ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                        {(partsData.meta?.links || []).map((link, index) => {
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
                                                        href={undefined}
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
                                                href={undefined}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (partsData.links?.next) handlePageChange(partsData.links.next);
                                                }}
                                                className={!partsData.links?.next ? 'pointer-events-none opacity-50' : ''}
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
                            <p className="text-muted-foreground">Try adjusting your search</p>
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
                                    <BrowsePartHoverCard key={part.id} part={part}>
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
                                    </BrowsePartHoverCard>
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
                    {partsData.meta && partsData.meta.total > partsData.meta.per_page && (
                        <div className="flex items-center justify-between border-t p-4">
                            <div>
                                <p className="text-muted-foreground text-sm">
                                    Showing {partsData.meta?.from || 0} to {partsData.meta?.to || 0} of {partsData.meta?.total || 0} parts
                                </p>
                            </div>
                            <div>
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href={undefined}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (partsData.links?.prev) handlePageChange(partsData.links.prev);
                                                }}
                                                className={!partsData.links?.prev ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                        {(partsData.meta?.links || []).map((link, index) => {
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
                                                        href={undefined}
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
                                                href={undefined}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (partsData.links?.next) handlePageChange(partsData.links.next);
                                                }}
                                                className={!partsData.links?.next ? 'pointer-events-none opacity-50' : ''}
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
