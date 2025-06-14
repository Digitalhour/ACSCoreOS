import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnhancedVisualization } from '@/types'; // Re-using the central type
import { AlertCircle, FileSpreadsheet, Loader2, MoreVertical, Table2, Trash2 } from 'lucide-react';

interface DataTableCardProps {
    // The visualization prop now uses the shared type
    visualization: EnhancedVisualization;
    isActive: boolean;
    onClick: () => void;
    onDelete?: () => void;
    canEdit?: boolean;
}

export const DataTableCard = ({ visualization, isActive, onClick, onDelete, canEdit = true }: DataTableCardProps) => {
    if (!visualization) {
        return (
            <Card className="flex h-80 items-center justify-center">
                <div className="text-muted-foreground text-center">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                    <p>Invalid data table</p>
                </div>
            </Card>
        );
    }

    const cardClasses = `cursor-pointer transition-all flex flex-col h-80 ${isActive ? 'ring-primary ring-2' : ''}`;

    const renderContent = () => {
        if (visualization.isLoading) {
            return (
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="text-primary h-8 w-8 animate-spin" />
                </div>
            );
        }

        if (visualization.error) {
            return (
                <div className="text-destructive flex h-full items-center justify-center p-4 text-center">
                    <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" /> {visualization.error}
                </div>
            );
        }

        if (!visualization.columns || visualization.columns.length === 0) {
            return (
                <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">Select columns to display.</p>
                </div>
            );
        }

        // Use `visualization.columns` as the source of truth for headers.
        const tableHeaders = visualization.columns;

        return (
            <ScrollArea className="h-full w-full">
                <Table className="w-full">
                    <TableHeader className="bg-background sticky top-0 z-10">
                        <TableRow>
                            {tableHeaders.map((header) => (
                                <TableHead key={header} className="border-b px-4 py-3 text-left font-medium whitespace-nowrap">
                                    {header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!visualization.data || visualization.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={tableHeaders.length} className="text-muted-foreground h-24 text-center">
                                    No data available.
                                </TableCell>
                            </TableRow>
                        ) : (
                            visualization.data.map((row, i) => (
                                <TableRow key={i} className="hover:bg-muted/50">
                                    {tableHeaders.map((col) => (
                                        <TableCell key={col} className="px-4 py-3 text-sm">
                                            <div className="max-w-[200px] truncate" title={String(row[col] ?? '')}>
                                                {row[col] ?? ''}
                                            </div>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        );
    };

    return (
        <Card className={cardClasses} onClick={onClick}>
            <CardHeader className="flex-shrink-0 border-b pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">Data Table</CardTitle>
                        <Badge variant="outline" className="text-xs">
                            <Table2 className="mr-1 h-3 w-3" />
                            {visualization.tableName || 'Unknown'}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        {onDelete && canEdit && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onDelete) onDelete();
                                        }}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Table
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">{renderContent()}</CardContent>
        </Card>
    );
};
