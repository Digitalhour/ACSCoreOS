import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { ExternalLink, Eye, FilterX, MoreHorizontal, PlusCircle, Search, ThumbsDown, ThumbsUp, Trash2, UserCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// Define the structure of a user associated with a conversation
interface ConversationUser {
    id: number;
    name: string;
    email: string;
}

// Updated structure of a conversation entry from the API
interface ConversationWithFeedback {
    id: number;
    title: string;
    user: ConversationUser;
    created_at: string;
    updated_at: string;
    last_feedback_at: string | null;
    feedback_count: number; // Total feedback count
    thumbs_up_count: number; // Added
    thumbs_down_count: number; // Added
    is_deleted: boolean;
}

// Define the structure of the paginated API response
interface PaginatedConversationsResponse {
    data: ConversationWithFeedback[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
    total: number;
    from: number;
    to: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Billy The AI', href: '/billy' },
    { title: 'Billy Conversation', href: '/billy/feedback' },
];

// Define options for filters to make it easier to map them
const feedbackStatusOptions = [
    { value: 'all', label: 'All Feedback' },
    { value: 'rated', label: 'Rated' },
    { value: 'unrated', label: 'Unrated' },
];

const ratingTypeOptions = [
    { value: 'all', label: 'All Ratings' },
    { value: 'up', label: 'Thumbs Up' },
    { value: 'down', label: 'Thumbs Down' },
];

const deletionStatusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'deleted', label: 'Deleted' },
    { value: 'all', label: 'All Statuses' },
];

export default function BillyFeedbackPage() {
    const [conversationsData, setConversationsData] = useState<PaginatedConversationsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [ratingFilter, setRatingFilter] = useState<'all' | 'up' | 'down'>('all');
    const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'all' | 'rated' | 'unrated'>('all');
    const [deletionStatusFilter, setDeletionStatusFilter] = useState<'active' | 'deleted' | 'all'>('active');

    // Debounce search term
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // 500ms delay

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    const fetchConversationsWithFeedback = useCallback(
        async (
            page: number,
            search: string,
            rating: 'all' | 'up' | 'down',
            feedbackStatus: 'all' | 'rated' | 'unrated',
            deletionStatus: 'active' | 'deleted' | 'all',
        ) => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams();
                params.append('page', page.toString());
                if (search) params.append('search', search);
                if ((feedbackStatus === 'rated' || feedbackStatus === 'all') && rating && rating !== 'all') {
                    params.append('rating', rating);
                }
                params.append('feedback_status', feedbackStatus);
                params.append('deletion_status', deletionStatus);

                const response = await axios.get<PaginatedConversationsResponse>(`/billy/feedback-data?${params.toString()}`);
                setConversationsData(response.data);
            } catch (err) {
                console.error('Failed to fetch conversations:', err);
                setError('Failed to load conversations. Please try again later.');
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    // Main useEffect for fetching data when page or any filter changes
    useEffect(() => {
        fetchConversationsWithFeedback(currentPage, debouncedSearchTerm, ratingFilter, feedbackStatusFilter, deletionStatusFilter);
    }, [currentPage, debouncedSearchTerm, ratingFilter, feedbackStatusFilter, deletionStatusFilter, fetchConversationsWithFeedback]);

    // Effect to reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, ratingFilter, feedbackStatusFilter, deletionStatusFilter]);

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= (conversationsData?.last_page || 1)) {
            setCurrentPage(page);
        }
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setRatingFilter('all');
        setFeedbackStatusFilter('all');
        setDeletionStatusFilter('active');
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    const getCurrentFilterLabel = (options: { value: string; label: string }[], currentValue: string) => {
        return options.find((opt) => opt.value === currentValue)?.label || 'Select...';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Billy AI - Conversation Tasks" />
            <div className="p-4">
                {/* Page Header Section */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Conversation Tasks</h1>
                    <p className="text-muted-foreground mt-1">Here's a list of conversations for your review and action.</p>
                </div>

                {/* Toolbar Section */}
                <div className="mb-6 flex flex-col items-center justify-between gap-x-4 gap-y-2 sm:flex-row">
                    <div className="relative w-full flex-grow sm:w-auto sm:max-w-xs sm:flex-grow-0 lg:max-w-sm">
                        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                        <Input
                            placeholder="Filter conversations..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="h-9 w-full pl-8"
                        />
                    </div>
                    <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                        {/* Feedback Status Filter Button Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Feedback: {getCurrentFilterLabel(feedbackStatusOptions, feedbackStatusFilter)}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Filter by Feedback Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {feedbackStatusOptions.map((option) => (
                                    <DropdownMenuCheckboxItem
                                        key={option.value}
                                        checked={feedbackStatusFilter === option.value}
                                        onCheckedChange={() => {
                                            setFeedbackStatusFilter(option.value as any);
                                            if (option.value === 'unrated') setRatingFilter('all');
                                        }}
                                    >
                                        {option.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Rating Type Filter Button Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9" disabled={feedbackStatusFilter === 'unrated'}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Rating: {getCurrentFilterLabel(ratingTypeOptions, ratingFilter)}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Filter by Rating Type</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {ratingTypeOptions.map((option) => (
                                    <DropdownMenuCheckboxItem
                                        key={option.value}
                                        checked={ratingFilter === option.value}
                                        onCheckedChange={() => {
                                            setRatingFilter(option.value as any);
                                        }}
                                        disabled={feedbackStatusFilter === 'unrated'}
                                    >
                                        {option.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Deletion Status Filter Button Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Status: {getCurrentFilterLabel(deletionStatusOptions, deletionStatusFilter)}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Filter by Deletion Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {deletionStatusOptions.map((option) => (
                                    <DropdownMenuCheckboxItem
                                        key={option.value}
                                        checked={deletionStatusFilter === option.value}
                                        onCheckedChange={() => {
                                            setDeletionStatusFilter(option.value as any);
                                        }}
                                    >
                                        {option.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {(searchTerm || ratingFilter !== 'all' || feedbackStatusFilter !== 'all' || deletionStatusFilter !== 'active') && (
                            <Button variant="ghost" onClick={clearAllFilters} size="sm" className="h-9">
                                <FilterX className="mr-2 h-4 w-4" /> Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Data Table Section */}
                <Card className="border shadow-md">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-4">Title</TableHead>
                                        <TableHead>Started By</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-center">Feedback Ratings</TableHead> {/* Updated Header */}
                                        <TableHead className="text-right">Last Feedback</TableHead>
                                        <TableHead className="w-[100px] pr-4 text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                Loading conversations...
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {!loading && error && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-red-500">
                                                {error}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {!loading && !error && conversationsData && conversationsData.data.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                No conversations found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {!loading &&
                                        !error &&
                                        conversationsData &&
                                        conversationsData.data.map((convo) => (
                                            <TableRow
                                                key={convo.id}
                                                className={cn(
                                                    'hover:bg-muted/50',
                                                    convo.is_deleted && 'opacity-60 focus-within:opacity-100 hover:opacity-80',
                                                )}
                                            >
                                                <TableCell className="py-2.5 pl-4">
                                                    <div
                                                        className={cn(
                                                            'max-w-xs truncate font-medium md:max-w-sm',
                                                            convo.is_deleted && 'line-through',
                                                        )}
                                                        title={convo.title}
                                                    >
                                                        {convo.title}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <div className="flex items-center text-sm">
                                                        <UserCircle className="text-muted-foreground mr-2 h-4 w-4" />
                                                        <span title={convo.user.email}>{convo.user.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5 text-center">
                                                    {convo.is_deleted ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-orange-400 text-orange-600 dark:border-orange-600 dark:text-orange-400"
                                                        >
                                                            <Trash2 className="mr-1 h-3 w-3" /> Deleted
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-green-500 text-green-600 dark:border-green-600 dark:text-green-400"
                                                        >
                                                            <Eye className="mr-1 h-3 w-3" /> Active
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2.5 text-center">
                                                    {/* Display Thumbs Up and Thumbs Down side-by-side */}
                                                    <div className="flex items-center justify-center space-x-2">
                                                        {convo.thumbs_up_count > 0 || convo.thumbs_down_count > 0 ? (
                                                            <>
                                                                <Badge className="bg-green-500 px-2 py-0.5 text-white hover:bg-green-600">
                                                                    <ThumbsUp className="mr-1 h-3 w-3" /> {convo.thumbs_up_count}
                                                                </Badge>
                                                                <Badge className="bg-red-500 px-2 py-0.5 text-white hover:bg-red-600">
                                                                    <ThumbsDown className="mr-1 h-3 w-3" /> {convo.thumbs_down_count}
                                                                </Badge>
                                                            </>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">-</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5 text-right text-sm">{formatDate(convo.last_feedback_at)}</TableCell>
                                                <TableCell className="py-2.5 pr-4 text-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="data-[state=open]:bg-muted h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Open menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-[160px]">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={route('billy.conversation.show.admin', { conversation: convo.id })}>
                                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                                    View Details
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    {conversationsData && conversationsData.total > 0 && (
                        <CardFooter className="flex flex-col items-center justify-between space-y-2 border-t px-4 py-3 sm:flex-row sm:space-y-0">
                            <div className="text-muted-foreground text-xs">
                                Showing {conversationsData.from} to {conversationsData.to} of {conversationsData.total} conversations.
                            </div>
                            <div className="flex items-center space-x-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => handlePageChange(1)}
                                    disabled={currentPage === 1 || loading}
                                >
                                    First
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
                                >
                                    Previous
                                </Button>
                                <span className="text-muted-foreground px-2 text-xs">
                                    Page {conversationsData.current_page} of {conversationsData.last_page}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === conversationsData.last_page || loading}
                                >
                                    Next
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => handlePageChange(conversationsData.last_page)}
                                    disabled={currentPage === conversationsData.last_page || loading}
                                >
                                    Last
                                </Button>
                            </div>
                        </CardFooter>
                    )}
                    {conversationsData && conversationsData.total === 0 && !loading && !error && (
                        <CardFooter className="border-t px-6 py-4">
                            <p className="text-muted-foreground text-sm">No conversations to display.</p>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
