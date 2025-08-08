import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Checkbox} from '@/components/ui/checkbox';
import {ScrollArea} from '@/components/ui/scroll-area';
import {ChevronDown, Search, X} from 'lucide-react';

interface Option {
    id: string | number;
    name: string;
    [key: string]: any;
}

interface SearchableMultiSelectProps {
    options: Option[];
    value: (string | number)[];
    onChange: (value: (string | number)[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    onSearch?: (query: string) => void;
    loading?: boolean;
    maxHeight?: number;
    showSelectAll?: boolean;
    disabled?: boolean;
}

export default function SearchableMultiSelect({
                                                  options = [],
                                                  value = [],
                                                  onChange,
                                                  placeholder = "Select items...",
                                                  searchPlaceholder = "Search...",
                                                  onSearch,
                                                  loading = false,
                                                  maxHeight = 300,
                                                  showSelectAll = true,
                                                  disabled = false
                                              }: SearchableMultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [internalOptions, setInternalOptions] = useState(options);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        setInternalOptions(options);
    }, [options]);

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            if (onSearch) {
                onSearch(searchQuery);
            } else {
                const filtered = options.filter(option =>
                    option.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
                setInternalOptions(filtered);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, onSearch, options]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const selectedOptions = useMemo(() => {
        return options.filter(option => value.includes(option.id));
    }, [options, value]);

    const isAllSelected = useMemo(() => {
        return internalOptions.length > 0 && internalOptions.every(option => value.includes(option.id));
    }, [internalOptions, value]);

    const isSomeSelected = useMemo(() => {
        return internalOptions.some(option => value.includes(option.id));
    }, [internalOptions, value]);

    const handleToggleOption = (optionId: string | number) => {
        if (value.includes(optionId)) {
            onChange(value.filter(id => id !== optionId));
        } else {
            onChange([...value, optionId]);
        }
    };

    const handleSelectAll = () => {
        if (isAllSelected) {
            const visibleIds = internalOptions.map(option => option.id);
            onChange(value.filter(id => !visibleIds.includes(id)));
        } else {
            const visibleIds = internalOptions.map(option => option.id);
            const newSelection = [...new Set([...value, ...visibleIds])];
            onChange(newSelection);
        }
    };

    const handleRemoveSelected = (optionId: string | number) => {
        onChange(value.filter(id => id !== optionId));
    };

    const handleClearAll = () => {
        onChange([]);
    };

    return (
        <div className="w-full relative" ref={containerRef}>
            {/* Selected items display */}
            {selectedOptions.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                    {selectedOptions.slice(0, 10).map(option => (
                        <Badge key={option.id} variant="secondary" className="text-xs flex items-center gap-1">
                            <span>{option.name}</span>
                            <button
                                type="button"
                                onClick={() => handleRemoveSelected(option.id)}
                                className="ml-1 hover:text-destructive"
                                disabled={disabled}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                    {selectedOptions.length > 10 && (
                        <Badge variant="outline" className="text-xs">
                            +{selectedOptions.length - 10} more
                        </Badge>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="h-6 px-2 text-xs"
                        disabled={disabled}
                    >
                        Clear all
                    </Button>
                </div>
            )}

            {/* Trigger button */}
            <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full justify-between"
                disabled={disabled}
            >
        <span className="truncate">
          {selectedOptions.length === 0 ? placeholder : `${selectedOptions.length} selected`}
        </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
                    {/* Search input */}
                    <div className="border-b p-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Select all option */}
                    {showSelectAll && internalOptions.length > 0 && (
                        <div className="border-b p-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="select-all"
                                    checked={isAllSelected}
                                    ref={(el) => {
                                        if (el) el.indeterminate = !isAllSelected && isSomeSelected;
                                    }}
                                    onCheckedChange={handleSelectAll}
                                />
                                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                                    Select All ({internalOptions.length})
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Options list */}
                    <ScrollArea style={{ maxHeight: maxHeight }}>
                        {loading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                Loading...
                            </div>
                        ) : internalOptions.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                {searchQuery ? 'No results found' : 'No options available'}
                            </div>
                        ) : (
                            <div className="p-1">
                                {internalOptions.map(option => (
                                    <div
                                        key={option.id}
                                        className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                                        onClick={() => handleToggleOption(option.id)}
                                    >
                                        <Checkbox
                                            id={`option-${option.id}`}
                                            checked={value.includes(option.id)}
                                            readOnly
                                        />
                                        <label
                                            htmlFor={`option-${option.id}`}
                                            className="flex-1 text-sm cursor-pointer"
                                        >
                                            {option.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
