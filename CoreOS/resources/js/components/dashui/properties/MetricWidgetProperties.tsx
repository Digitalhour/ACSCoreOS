import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';

// Defines the structure for a database table column
interface TableColumn {
    name: string;
    type: string;
}

// Defines the props for the MetricWidgetProperties component
interface MetricWidgetPropertiesProps {
    widget: {
        id: string;
        config: any;
    };
    onUpdateWidget: (id: string, updates: { config: any }) => void;
    tables: string[]; // Expect a list of table names from the builder
}

/**
 * Renders the property editor for the Metric Widget.
 * It allows users to select a data source and configure the metric.
 */
export function MetricWidgetProperties({ widget, onUpdateWidget, tables = [] }: MetricWidgetPropertiesProps) {
    const [columns, setColumns] = useState<TableColumn[]>([]);
    const [isLoadingColumns, setIsLoadingColumns] = useState(false);

    const { table, column, aggregation, comparisonEnabled } = widget.config;

    // Effect to fetch columns when a table is selected
    useEffect(() => {
        if (table) {
            setIsLoadingColumns(true);
            // Fetch columns for the selected table from your Laravel backend
            fetch(`/api/kpi/columns?table=${table}`)
                .then((res) => res.json())
                .then((data) => {
                    setColumns(data);
                    // If the currently selected column is not in the new list, reset it.
                    if (column && !data.some((c: TableColumn) => c.name === column)) {
                        handleConfigChange('column', null);
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoadingColumns(false));
        } else {
            setColumns([]); // Clear columns if no table is selected
        }
    }, [table, column]); // Rerun when table changes

    /**
     * Handles changes to the widget's configuration and updates the parent state.
     * @param key The configuration key to update.
     * @param value The new value.
     */
    const handleConfigChange = (key: string, value: any) => {
        onUpdateWidget(widget.id, {
            config: {
                ...widget.config,
                [key]: value,
            },
        });
    };

    return (
        <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Metric Options</h4>

            {/* Table Selection */}
            <div>
                <Label htmlFor="table-select">Data Source Table</Label>
                <Select value={table} onValueChange={(value) => handleConfigChange('table', value)}>
                    <SelectTrigger id="table-select" className="mt-1">
                        <SelectValue placeholder="Select a table" />
                    </SelectTrigger>
                    <SelectContent>
                        {tables.map((tableName) => (
                            <SelectItem key={tableName} value={tableName}>
                                {tableName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Column Selection */}
            {table && (
                <div>
                    <Label htmlFor="column-select">Column</Label>
                    <Select
                        value={column}
                        onValueChange={(value) => handleConfigChange('column', value)}
                        disabled={isLoadingColumns || columns.length === 0}
                    >
                        <SelectTrigger id="column-select" className="mt-1">
                            <SelectValue placeholder={isLoadingColumns ? 'Loading...' : 'Select a column'} />
                        </SelectTrigger>
                        <SelectContent>
                            {columns.map((col) => (
                                <SelectItem key={col.name} value={col.name}>
                                    {col.name} ({col.type})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Aggregation Selection */}
            {column && (
                <div>
                    <Label htmlFor="aggregation-select">Calculation</Label>
                    <Select value={aggregation} onValueChange={(value) => handleConfigChange('aggregation', value)}>
                        <SelectTrigger id="aggregation-select" className="mt-1">
                            <SelectValue placeholder="Select a calculation" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                            <SelectItem value="avg">Average</SelectItem>
                            <SelectItem value="max">Maximum</SelectItem>
                            <SelectItem value="min">Minimum</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Comparison Switch */}
            {aggregation && (
                <div className="flex items-center space-x-2 pt-2">
                    <Switch
                        id="comparison-switch"
                        checked={comparisonEnabled}
                        onCheckedChange={(checked) => handleConfigChange('comparisonEnabled', checked)}
                    />
                    <Label htmlFor="comparison-switch">Compare to Previous Period</Label>
                </div>
            )}
        </div>
    );
}
