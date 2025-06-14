import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface TableColumn {
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    sortable?: boolean; // Note: sorting UI is removed but prop is kept for potential future use
}

interface DataTableProps {
    title: string;
    data: any[];
    columns: TableColumn[];
    pageSize?: number;
    searchable?: boolean;
    exportable?: boolean;
    loading?: boolean;
    className?: string;
    onClick?: () => void;
    tableHeight?: number;
    // Props for server-side pagination
    totalRecords?: number;
    currentPage?: number;
    onPageChange?: (page: number) => void;
}

export function DataTable({
    title,
    data = [],
    columns = [],
    pageSize = 10,
    searchable = true,
    exportable = true,
    loading = false,
    className = '',
    onClick,
    tableHeight = 400,
    // Destructure new props for server-side pagination
    totalRecords = 0,
    currentPage = 1,
    onPageChange,
}: DataTableProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Memoized search on the current page's data.
    // For a full database search, this would need to be moved to the server.
    const filteredData = useMemo(() => {
        if (!searchQuery) return data;

        return data.filter((row) =>
            columns.some((column) => {
                const value = row[column.key];
                if (value == null) return false;
                return String(value).toLowerCase().includes(searchQuery.toLowerCase());
            }),
        );
    }, [data, searchQuery, columns]);

    // Client-side pagination and sorting have been removed.
    // The component now relies on props for pagination state.

    const totalPages = Math.ceil(totalRecords / pageSize);

    const formatCellValue = (value: any, type: string) => {
        if (value == null) return '-';

        switch (type) {
            case 'number':
                return typeof value === 'number' ? value.toLocaleString() : value;
            case 'date':
                try {
                    return new Date(value).toLocaleDateString();
                } catch (e) {
                    return String(value);
                }
            case 'boolean':
                return value ? 'Yes' : 'No';
            default:
                return String(value);
        }
    };

    // Note: This will only export the data on the current page.
    const handleExport = (e: React.MouseEvent) => {
        e.stopPropagation();
        const csvContent = [
            columns.map((col) => col.label).join(','),
            ...data.map(
                (
                    row, // Use `data` to export the current page's unfiltered data
                ) =>
                    columns
                        .map((col) => {
                            const value = row[col.key];
                            const formatted = formatCellValue(value, col.type);
                            return `"${String(formatted).replace(/"/g, '""')}"`;
                        })
                        .join(','),
            ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setSearchQuery(e.target.value);
        // Note: this only searches the current page. Full search requires an API call.
    };

    return (
        <Card className={`${className}`} onClick={onClick}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-medium">{title}</CardTitle>
                <div className="flex items-center space-x-2">
                    {searchable && (
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <Search className="absolute top-2.5 left-2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Search current page..." value={searchQuery} onChange={handleSearchChange} className="w-64 pl-8" />
                        </div>
                    )}
                    {exportable && (
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export Page
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {loading ? (
                    <div className="flex h-[400px] items-center justify-center" style={{ height: `${tableHeight}px` }}>
                        <div className="text-gray-500">Loading...</div>
                    </div>
                ) : (
                    <>
                        <div className="rounded-md border" style={{ height: `${tableHeight}px`, overflow: 'auto' }}>
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-white">
                                    <TableRow>
                                        {columns.map((column) => (
                                            <TableHead key={column.key}>
                                                <div className="flex items-center">{column.label}</div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="py-8 text-center text-gray-500">
                                                No data available
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredData.map((row, index) => (
                                            <TableRow key={index}>
                                                {columns.map((column) => (
                                                    <TableCell key={column.key}>{formatCellValue(row[column.key], column.type)}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4" onClick={(e) => e.stopPropagation()}>
                                <div className="text-sm text-gray-500">
                                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords}{' '}
                                    results
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPageChange?.(currentPage - 1);
                                        }}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <span className="text-sm">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPageChange?.(currentPage + 1);
                                        }}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
