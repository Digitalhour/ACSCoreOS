import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Table2 } from 'lucide-react';

interface DataSourceSidebarProps {
    tables: string[];
    selectedTable: string | null;
    onTableSelect: (tableName: string) => void;
}

export const DataSourceSidebar = ({ tables, selectedTable, onTableSelect }: DataSourceSidebarProps) => {
    return (
        <div className="flex h-full flex-col">
            <div className="mb-6">
                <div className="flex items-center gap-2 px-3 py-2">
                    <Database className="h-4 w-4" />
                    <h2 className="text-sm font-semibold">Data Sources</h2>
                    <Badge variant="secondary" className="ml-auto text-xs">
                        {tables.length}
                    </Badge>
                </div>
                <ScrollArea className="h-48">
                    <div className="space-y-1 px-3">
                        {tables.map((table) => (
                            <Button
                                key={table}
                                variant={selectedTable === table ? 'secondary' : 'ghost'}
                                className="w-full justify-start text-sm"
                                onClick={() => onTableSelect(table)}
                            >
                                <Table2 className="mr-2 h-4 w-4" />
                                {table}
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};
