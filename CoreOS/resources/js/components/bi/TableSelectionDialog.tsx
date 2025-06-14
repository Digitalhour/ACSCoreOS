import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Search, Table2 } from 'lucide-react';
import { useState } from 'react';

interface TableSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    tables: string[];
    onTableSelect: (tableName: string) => void;
    title?: string;
    description?: string;
}

export const TableSelectionDialog = ({
    isOpen,
    onClose,
    tables,
    onTableSelect,
    title = 'Select Data Source',
    description = 'Choose a table to create your visualization from',
}: TableSelectionDialogProps) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTables = tables.filter((table) => table.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleTableSelect = (tableName: string) => {
        onTableSelect(tableName);
        setSearchQuery('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            placeholder="Search tables..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Table List */}
                    <ScrollArea className="h-96">
                        <div className="grid gap-2">
                            {filteredTables.length > 0 ? (
                                filteredTables.map((table) => (
                                    <Card
                                        key={table}
                                        className="hover:bg-accent cursor-pointer transition-colors"
                                        onClick={() => handleTableSelect(table)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Table2 className="text-muted-foreground h-5 w-5" />
                                                    <div>
                                                        <p className="font-medium">{table}</p>
                                                        <p className="text-muted-foreground text-sm">Database table</p>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary">Available</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-muted-foreground flex h-32 items-center justify-center">
                                    <p>No tables found matching "{searchQuery}"</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
