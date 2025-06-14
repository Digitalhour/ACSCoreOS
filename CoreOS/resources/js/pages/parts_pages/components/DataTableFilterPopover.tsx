import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface DataTableFilterPopoverProps {
    title: string;
    options: string[];
    selectedValues: string[];
    setSelectedValues: (values: string[]) => void;
    filterKey: string;
    onOpen?: () => void;
    enableSearch?: boolean; // New prop to enable/disable search
}

export default function DataTableFilterPopover({
    title,
    options,
    selectedValues,
    setSelectedValues,
    filterKey,
    onOpen,
    enableSearch = false, // Default to false, but enable for models
}: DataTableFilterPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
        if (!enableSearch || !searchTerm.trim()) {
            return options;
        }
        return options.filter((option) => option.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm, enableSearch]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && onOpen) {
            onOpen();
        }
        // Clear search when closing
        if (!open) {
            setSearchTerm('');
        }
    };

    const handleSelectAll = () => {
        setSelectedValues(filteredOptions);
    };

    const handleClearAll = () => {
        setSelectedValues([]);
    };

    const handleValueChange = (value: string, checked: boolean) => {
        if (checked) {
            setSelectedValues([...selectedValues, value]);
        } else {
            setSelectedValues(selectedValues.filter((v) => v !== value));
        }
    };

    const handleClearSearch = () => {
        setSearchTerm('');
    };

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                    {title}
                    {selectedValues.length > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                {selectedValues.length}
                            </Badge>
                        </>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <div className="border-b p-4">
                    <h4 className="leading-none font-medium">{title}</h4>
                    <p className="text-muted-foreground mt-1 text-sm">Filter by {title.toLowerCase()}</p>
                </div>

                {/* Search Input - Only show if enableSearch is true */}
                {enableSearch && (
                    <div className="border-b p-4">
                        <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                placeholder={`Search ${title.toLowerCase()}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-8 pl-10"
                            />
                            {searchTerm && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 p-0"
                                    onClick={handleClearSearch}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                        {enableSearch && searchTerm && (
                            <p className="text-muted-foreground mt-2 text-xs">
                                {filteredOptions.length} of {options.length} {title.toLowerCase()} found
                            </p>
                        )}
                    </div>
                )}

                {/* Control buttons */}
                <div className="flex items-center justify-between border-b px-4 py-2">
                    <div className="flex space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAll}
                            disabled={filteredOptions.length === 0}
                            className="h-6 px-2 text-xs"
                        >
                            Select All
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAll}
                            disabled={selectedValues.length === 0}
                            className="h-6 px-2 text-xs"
                        >
                            Clear All
                        </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">{selectedValues.length} selected</p>
                </div>

                {/* Options list */}
                <div className="max-h-64 overflow-y-auto p-2">
                    {filteredOptions.length === 0 ? (
                        <div className="py-6 text-center">
                            <p className="text-muted-foreground text-sm">
                                {enableSearch && searchTerm
                                    ? `No ${title.toLowerCase()} found matching "${searchTerm}"`
                                    : `No ${title.toLowerCase()} available`}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1 overflow-hidden">
                            {filteredOptions.map((option) => {
                                const isSelected = selectedValues.includes(option);
                                return (
                                    <div key={option} className="hover:bg-accent flex items-center space-x-2 rounded-sm px-2 py-1.5">
                                        <Checkbox
                                            id={`${filterKey}-${option}`}
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleValueChange(option, checked as boolean)}
                                        />
                                        <Label htmlFor={`${filterKey}-${option}`} className="flex-1 cursor-pointer text-sm font-normal">
                                            {option}
                                        </Label>
                                        {isSelected && <Check className="text-primary h-4 w-4" />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Selected values display */}
                {selectedValues.length > 0 && (
                    <div className="border-t p-4">
                        <p className="text-muted-foreground mb-2 text-xs">Selected:</p>
                        <div className="flex flex-wrap gap-1">
                            {selectedValues.slice(0, 6).map((value) => (
                                <Badge key={value} variant="secondary" className="text-xs">
                                    {value.length > 15 ? `${value.slice(0, 15)}...` : value}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                                        onClick={() => handleValueChange(value, false)}
                                    >
                                        <X className="h-2 w-2" />
                                    </Button>
                                </Badge>
                            ))}
                            {selectedValues.length > 6 && (
                                <Badge variant="outline" className="text-xs">
                                    +{selectedValues.length - 6} more
                                </Badge>
                            )}
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
