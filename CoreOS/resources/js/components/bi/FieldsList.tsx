import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Calendar, Filter, Hash, Type } from 'lucide-react';

interface Column {
    name: string;
    type: 'text' | 'numeric' | 'date';
}

interface FieldsListProps {
    columns: Column[];
    onAddFilter: (columnName: string) => void;
    isLoading: Record<string, boolean>;
}

export const FieldsList = ({ columns, onAddFilter, isLoading }: FieldsListProps) => {
    const getFieldIcon = (type: string) => {
        switch (type) {
            case 'text':
                return <Type size={14} />;
            case 'date':
                return <Calendar size={14} />;
            default:
                return <Hash size={14} />;
        }
    };

    return (
        <div className="my-4">
            <div className="flex items-center gap-2 px-3 py-2">
                <Activity className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Fields</h3>
                <Badge variant="secondary" className="ml-auto text-xs">
                    {columns.length}
                </Badge>
            </div>
            <ScrollArea className="h-48">
                <div className="space-y-1 px-3">
                    {columns.map((column) => (
                        <div key={column.name} className="hover:bg-accent flex items-center justify-between rounded-md p-2">
                            <div className="flex items-center gap-2">
                                <div className="w-4">{getFieldIcon(column.type)}</div>
                                <span className="text-sm">{column.name}</span>
                            </div>
                            {column.type !== 'numeric' && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => onAddFilter(column.name)}
                                    disabled={isLoading[column.name]}
                                >
                                    <Filter size={12} />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};
