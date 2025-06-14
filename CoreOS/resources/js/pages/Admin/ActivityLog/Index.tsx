import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Clock,
    Database,
    Download,
    Edit,
    Eye,
    FileText,
    Filter,
    LogIn,
    LogOut,
    MoreHorizontal,
    Plus,
    Search,
    Settings,
    Shield,
    Trash2,
    User,
    X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface Activity {
    id: number;
    log_name: string;
    description: string;
    event: string | null;
    subject_type: string | null;
    subject_id: number | null;
    causer_type: string | null;
    causer_id: number | null;
    created_at: string;
    causer?: {
        name: string;
        email: string;
    };
    subject?: any;
}

interface PaginatedActivities {
    data: Activity[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
    per_page: number;
}

interface Props {
    activities: PaginatedActivities;
    logNames: string[];
    events: string[];
    filters: {
        search?: string;
        log_name?: string;
        date_from?: string;
        date_to?: string;
        event?: string;
        per_page?: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dev-Ops Dashboard',
        href: '/admin',
    },
    {
        title: 'Activity Log',
        href: '/activity-log',
    },
];

export default function Index({ activities, logNames, events, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [logName, setLogName] = useState(filters.log_name || 'all');
    const [event, setEvent] = useState(filters.event || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [perPage, setPerPage] = useState(filters.per_page || 20);
    const [isExporting, setIsExporting] = useState(false);

    const handleFilter = useCallback(() => {
        router.get(
            route('activity-log.index'),
            {
                search: search || undefined,
                log_name: logName === 'all' ? undefined : logName || undefined,
                event: event === 'all' ? undefined : event || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                per_page: perPage !== 20 ? perPage : undefined,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    }, [search, logName, event, dateFrom, dateTo, perPage]);

    const clearFilters = useCallback(() => {
        setSearch('');
        setLogName('all');
        setEvent('all');
        setDateFrom('');
        setDateTo('');
        setPerPage(20);
        router.get(route('activity-log.index'));
    }, []);

    const handleExport = useCallback(async () => {
        setIsExporting(true);
        try {
            const response = await fetch(route('activity-log.export'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    search,
                    log_name: logName === 'all' ? undefined : logName,
                    event: event === 'all' ? undefined : event,
                    date_from: dateFrom,
                    date_to: dateTo,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const csv = convertToCSV(data.activities);
                downloadCSV(csv, 'activity-log.csv');
            }
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    }, [search, logName, event, dateFrom, dateTo]);

    const convertToCSV = (data: any[]) => {
        if (!data.length) return '';

        const headers = Object.keys(data[0]);
        const csvContent = [headers.join(','), ...data.map((row) => headers.map((header) => `"${row[header]}"`).join(','))].join('\n');

        return csvContent;
    };

    const downloadCSV = (csv: string, filename: string) => {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getEventBadgeColor = useCallback((eventType: string) => {
        const colors: Record<string, string> = {
            created: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
            updated: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
            deleted: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
            login: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
            logout: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
        };
        return colors[eventType] || 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
    }, []);

    const getEventIcon = useCallback((eventType: string) => {
        const icons: Record<string, any> = {
            created: Plus,
            updated: Edit,
            deleted: Trash2,
            login: LogIn,
            logout: LogOut,
        };
        const IconComponent = icons[eventType] || AlertCircle;
        return <IconComponent className="h-3 w-3" />;
    }, []);

    const getLogTypeIcon = useCallback((logNameType: string) => {
        const icons: Record<string, any> = {
            default: Database,
            user: User,
            auth: Shield,
            system: Settings,
            content: FileText,
        };
        const IconComponent = icons[logNameType] || Database;
        return <IconComponent className="h-4 w-4 text-gray-400" />;
    }, []);

    const formatDate = useCallback((date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }, []);

    const getRelativeTime = useCallback(
        (date: string) => {
            const now = new Date();
            const activityDate = new Date(date);
            const diffMs = now.getTime() - activityDate.getTime();

            const diffSec = Math.floor(diffMs / 1000);
            if (diffSec < 60) {
                return `${diffSec}s ago`;
            }

            const diffMin = Math.floor(diffMs / (1000 * 60));
            if (diffMin < 60) {
                return `${diffMin}m ago`;
            }

            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHrs < 24) {
                return `${diffHrs}h ago`;
            }

            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays < 7) {
                return `${diffDays}d ago`;
            }

            return formatDate(date);
        },
        [formatDate],
    );

    const currentPage = activities.current_page;
    const lastPage = activities.last_page;
    const from = activities.from;
    const to = activities.to;
    const total = activities.total;

    const handlePageChange = useCallback(
        (page: number) => {
            router.get(
                route('activity-log.index'),
                {
                    ...filters,
                    page: page,
                },
                {
                    preserveState: true,
                    replace: true,
                },
            );
        },
        [filters],
    );

    const paginationNumbers = useMemo(() => {
        const numbers = [];
        const maxVisible = 5;

        if (lastPage <= maxVisible) {
            for (let i = 1; i <= lastPage; i++) {
                numbers.push(i);
            }
        } else if (currentPage <= 3) {
            for (let i = 1; i <= maxVisible; i++) {
                numbers.push(i);
            }
        } else if (currentPage >= lastPage - 2) {
            for (let i = lastPage - maxVisible + 1; i <= lastPage; i++) {
                numbers.push(i);
            }
        } else {
            for (let i = currentPage - 2; i <= currentPage + 2; i++) {
                numbers.push(i);
            }
        }

        return numbers;
    }, [currentPage, lastPage]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Log" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header Section */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                                <Activity className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
                                <p className="text-gray-600">Monitor system activities and track all changes in real-time</p>
                            </div>
                        </div>
                        <Button onClick={handleExport} disabled={isExporting} variant="outline" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            {isExporting ? 'Exporting...' : 'Export CSV'}
                        </Button>
                    </div>
                </div>

                {/* Enhanced Filters */}
                <Card className="border-0 bg-gradient-to-r from-gray-50 to-white shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Filter className="h-5 w-5 text-blue-600" />
                            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Filter Activities</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
                            <div className="relative">
                                <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search activities, users..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="border-gray-200 pl-9 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            <Select value={logName} onValueChange={(value) => setLogName(value)}>
                                <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                                    <SelectValue placeholder="Select log type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All types</SelectItem>
                                    {logNames.map((name) => (
                                        <SelectItem key={name} value={name}>
                                            <div className="flex items-center gap-2">
                                                {getLogTypeIcon(name)}
                                                {name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={event} onValueChange={(value) => setEvent(value)}>
                                <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                                    <SelectValue placeholder="Select event" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All events</SelectItem>
                                    {events.map((eventType) => (
                                        <SelectItem key={eventType} value={eventType}>
                                            <div className="flex items-center gap-2">
                                                {getEventIcon(eventType)}
                                                {eventType}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="relative">
                                <Calendar className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                <Input
                                    type="date"
                                    placeholder="From date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="border-gray-200 pl-9 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            <div className="relative">
                                <Calendar className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                <Input
                                    type="date"
                                    placeholder="To date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="border-gray-200 pl-9 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleFilter}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700"
                                >
                                    Apply Filters
                                </Button>
                                <Button variant="outline" onClick={clearFilters} className="border-gray-200 hover:bg-gray-50">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing {from} to {to} of {total} activities
                            </div>
                            <Select value={perPage.toString()} onValueChange={(value) => setPerPage(Number(value))}>
                                <SelectTrigger className="w-auto">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 per page</SelectItem>
                                    <SelectItem value="20">20 per page</SelectItem>
                                    <SelectItem value="50">50 per page</SelectItem>
                                    <SelectItem value="100">100 per page</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* DataTable */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-0">
                        <div className="rounded-lg border border-gray-200">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="w-[100px] font-semibold text-gray-700">ID</TableHead>
                                        <TableHead className="font-semibold text-gray-700">Event</TableHead>
                                        <TableHead className="font-semibold text-gray-700">Description</TableHead>
                                        <TableHead className="font-semibold text-gray-700">Log Type</TableHead>
                                        <TableHead className="font-semibold text-gray-700">User</TableHead>
                                        <TableHead className="font-semibold text-gray-700">Subject</TableHead>
                                        <TableHead className="font-semibold text-gray-700">Date</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activities.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-3">
                                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                                                        <Activity className="h-8 w-8 text-gray-400" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="font-semibold text-gray-900">No activities found</h3>
                                                        <p className="text-sm text-gray-500">Try adjusting your filters to see more results.</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        activities.data.map((activity) => (
                                            <TableRow key={activity.id} className="transition-colors hover:bg-gray-50/50">
                                                <TableCell className="font-mono text-sm text-gray-600">#{activity.id}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={`${getEventBadgeColor(activity.event || '')} flex w-fit items-center gap-1.5 border font-medium transition-colors`}
                                                    >
                                                        {getEventIcon(activity.event || '')}
                                                        {activity.event || 'N/A'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-xs">
                                                    <div className="truncate font-medium text-gray-900" title={activity.description}>
                                                        {activity.description}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        {getLogTypeIcon(activity.log_name)}
                                                        <span className="font-medium text-gray-700">{activity.log_name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {activity.causer ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                                                                <User className="h-3 w-3 text-blue-600" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="truncate text-sm font-medium text-gray-900">
                                                                    {activity.causer.name || activity.causer.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">System</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {activity.subject_type ? (
                                                        <div className="flex items-center gap-2">
                                                            <Database className="h-3 w-3 text-purple-600" />
                                                            <span className="text-sm font-medium text-purple-700">
                                                                {activity.subject_type.split('\\').pop()}
                                                                {activity.subject_id && ` #${activity.subject_id}`}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Clock className="h-3 w-3" />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{getRelativeTime(activity.created_at)}</span>
                                                            <span className="text-xs text-gray-500">{formatDate(activity.created_at)}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem asChild>
                                                                <Link
                                                                    href={route('activity-log.show', activity.id)}
                                                                    className="flex items-center gap-2"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                    View Details
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    navigator.clipboard.writeText(`Activity #${activity.id}: ${activity.description}`)
                                                                }
                                                            >
                                                                Copy Summary
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Enhanced Pagination */}
                {lastPage > 1 && (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>Showing</span>
                                    <span className="font-medium">{from}</span>
                                    <span>to</span>
                                    <span className="font-medium">{to}</span>
                                    <span>of</span>
                                    <span className="font-medium">{total}</span>
                                    <span>results</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(1)}
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    <div className="flex items-center space-x-1">
                                        {paginationNumbers.map((pageNumber) => (
                                            <Button
                                                key={pageNumber}
                                                variant={currentPage === pageNumber ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handlePageChange(pageNumber)}
                                                className={`h-8 w-8 p-0 ${
                                                    currentPage === pageNumber ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : ''
                                                }`}
                                            >
                                                {pageNumber}
                                            </Button>
                                        ))}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === lastPage}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(lastPage)}
                                        disabled={currentPage === lastPage}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
