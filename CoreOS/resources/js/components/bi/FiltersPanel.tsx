import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter } from 'lucide-react';

interface FiltersPanelProps {
    filterOptions: Record<string, any[]>;
    activeFilters: Record<string, any[]>;
    onFilterChange: (columnName: string, value: any) => void;
}

export const FiltersPanel = ({ filterOptions, activeFilters, onFilterChange }: FiltersPanelProps) => {
    return (
        <div className="my-4 flex-1">
            <div className="flex items-center gap-2 px-3 py-2">
                <Filter className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Active Filters</h3>
                <Badge variant="secondary" className="ml-auto text-xs">
                    {Object.keys(filterOptions).length}
                </Badge>
            </div>
            <ScrollArea className="flex-1 px-3">
                {Object.keys(filterOptions).length > 0 ? (
                    <div className="space-y-4">
                        {Object.keys(filterOptions).map((col) => (
                            <div key={col} className="space-y-2">
                                <h4 className="text-sm font-medium">{col}</h4>
                                <div className="max-h-32 space-y-2 overflow-auto rounded-md border p-2">
                                    {filterOptions[col].map((opt) => (
                                        <div key={opt} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`${col}-${opt}`}
                                                checked={(activeFilters[col] || []).includes(opt)}
                                                onCheckedChange={() => onFilterChange(col, opt)}
                                            />
                                            <label htmlFor={`${col}-${opt}`} className="text-sm">
                                                {opt || '(Blank)'}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-muted-foreground p-4 text-center text-xs">Click the filter icon on a field to add filters.</div>
                )}
            </ScrollArea>
        </div>
    );
};
