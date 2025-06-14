import { KpiSettings } from '@/components/bi/visualizations/KipSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { BarChart3, Database, Settings, X } from 'lucide-react';
import { useState } from 'react';

interface Column {
    name: string;
    type: 'text' | 'numeric' | 'date';
}

interface TableWithColumns {
    name: string;
    columns: Column[];
}

interface KpiMetric {
    id: string;
    label: string;
    tableName: string;
    metric: string;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

interface EnhancedVisualization {
    id: string;
    type: 'bar' | 'line' | 'pie' | 'datatable' | 'kpi';
    tableName: string;
    dimension?: string;
    metric?: string;
    aggregation: string;
    columns: string[];
    metrics?: KpiMetric[]; // For KPI visualizations
    data: any[];
    isLoading: boolean;
    error?: string;
}

interface VisualizationSettingsProps {
    visualization: EnhancedVisualization;
    columns: Column[];
    tablesWithColumns?: TableWithColumns[];
    onUpdate: (id: string, settings: Partial<EnhancedVisualization>) => void;
}

export const VisualizationSettings = ({ visualization, columns, tablesWithColumns = [], onUpdate }: VisualizationSettingsProps) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleUpdate = (field: keyof EnhancedVisualization, value: any) => {
        onUpdate(visualization.id, { [field]: value });
    };

    const handleColumnToggle = (columnName: string) => {
        const newColumns = visualization.columns.includes(columnName)
            ? visualization.columns.filter((c) => c !== columnName)
            : [...visualization.columns, columnName];
        handleUpdate('columns', newColumns);
    };

    const getChartIcon = (type: string) => {
        switch (type) {
            case 'kpi':
                return <BarChart3 className="h-4 w-4" />;
            case 'bar':
                return <BarChart3 className="h-4 w-4" />;
            case 'line':
                return <BarChart3 className="h-4 w-4" />;
            case 'pie':
                return <BarChart3 className="h-4 w-4" />;
            case 'datatable':
                return <Database className="h-4 w-4" />;
            default:
                return <Settings className="h-4 w-4" />;
        }
    };

    const getChartTitle = (type: string) => {
        switch (type) {
            case 'kpi':
                return 'Multi-Table KPI Configuration';
            case 'bar':
                return 'Bar Chart Configuration';
            case 'line':
                return 'Line Chart Configuration';
            case 'pie':
                return 'Pie Chart Configuration';
            case 'datatable':
                return 'Data Table Configuration';
            default:
                return 'Visualization Configuration';
        }
    };

    if (!isExpanded) {
        return (
            <Card className="mt-4">
                <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                        {getChartIcon(visualization.type)}
                        <span className="text-sm font-medium">
                            Configure {visualization.type.toUpperCase()} • {visualization.tableName || 'Multi-table'}
                        </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)}>
                        <Settings className="h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // KPI visualization with multi-table support
    if (visualization.type === 'kpi') {
        return (
            <Card className="mt-4">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            {getChartIcon(visualization.type)}
                            {getChartTitle(visualization.type)}
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <KpiSettings
                        visualization={visualization as any}
                        onVisualizationChange={(newViz) => {
                            onUpdate(visualization.id, {
                                metrics: newViz.metrics,
                            });
                        }}
                        availableTables={tablesWithColumns}
                    />
                </CardContent>
            </Card>
        );
    }

    // Data table configuration
    if (visualization.type === 'datatable') {
        return (
            <Card className="mt-4">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            {getChartIcon(visualization.type)}
                            {getChartTitle(visualization.type)}
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Database className="h-4 w-4" />
                        <span>Table: {visualization.tableName}</span>
                    </div>

                    <Separator />

                    <div>
                        <Label className="text-sm font-medium">Select Columns to Display</Label>
                        <p className="text-muted-foreground mb-3 text-xs">Choose which columns to show in your data table</p>
                        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
                            {columns.map((column) => (
                                <label key={column.name} className="flex cursor-pointer items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={visualization.columns.includes(column.name)}
                                        onChange={() => handleColumnToggle(column.name)}
                                        className="rounded"
                                    />
                                    <span className="text-sm">{column.name}</span>
                                    <span className="bg-muted text-muted-foreground rounded px-1 text-xs">{column.type}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-muted-foreground mt-2 text-xs">
                            {visualization.columns.length} of {columns.length} columns selected
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Chart configurations (bar, line, pie)
    const numericColumns = columns.filter((c) => c.type === 'numeric');
    const dimensionColumns = columns.filter((c) => c.type !== 'numeric');

    return (
        <Card className="mt-4">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        {getChartIcon(visualization.type)}
                        {getChartTitle(visualization.type)}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4" />
                    <span>Table: {visualization.tableName}</span>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Dimension Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Dimension (X-Axis)</Label>
                        <Select value={visualization.dimension || ''} onValueChange={(value) => handleUpdate('dimension', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select dimension..." />
                            </SelectTrigger>
                            <SelectContent>
                                {dimensionColumns.map((column) => (
                                    <SelectItem key={column.name} value={column.name}>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-muted text-muted-foreground rounded px-1 text-xs">{column.type}</span>
                                            {column.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Metric Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Metric (Y-Axis)</Label>
                        <Select value={visualization.metric || ''} onValueChange={(value) => handleUpdate('metric', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select metric..." />
                            </SelectTrigger>
                            <SelectContent>
                                {numericColumns.map((column) => (
                                    <SelectItem key={column.name} value={column.name}>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-muted text-muted-foreground rounded px-1 text-xs">{column.type}</span>
                                            {column.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Aggregation Selection */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Aggregation Method</Label>
                    <Select value={visualization.aggregation} onValueChange={(value) => handleUpdate('aggregation', value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sum">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono">∑</span>
                                    Sum - Total of all values
                                </div>
                            </SelectItem>
                            <SelectItem value="avg">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono">⌀</span>
                                    Average - Mean of all values
                                </div>
                            </SelectItem>
                            <SelectItem value="count">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono">#</span>
                                    Count - Number of records
                                </div>
                            </SelectItem>
                            <SelectItem value="min">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono">↓</span>
                                    Minimum - Lowest value
                                </div>
                            </SelectItem>
                            <SelectItem value="max">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono">↑</span>
                                    Maximum - Highest value
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Preview Query */}
                {visualization.dimension && visualization.metric && (
                    <div className="bg-muted rounded-lg p-3">
                        <Label className="text-muted-foreground text-xs">Preview Query:</Label>
                        <p className="mt-1 font-mono text-sm break-all">
                            SELECT `{visualization.dimension}` as dimension, {visualization.aggregation.toUpperCase()}(`{visualization.metric}`) as
                            value FROM `{visualization.tableName}` GROUP BY `{visualization.dimension}`
                        </p>
                    </div>
                )}

                {/* Configuration Status */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div className="flex items-center gap-2">
                        <div
                            className={`h-2 w-2 rounded-full ${visualization.dimension && visualization.metric ? 'bg-green-500' : 'bg-amber-500'}`}
                        />
                        <span className="text-sm font-medium">
                            {visualization.dimension && visualization.metric ? 'Configuration Complete' : 'Configuration Incomplete'}
                        </span>
                    </div>
                    {!(visualization.dimension && visualization.metric) && (
                        <p className="text-muted-foreground mt-1 text-xs">
                            Please select both a dimension and metric to complete the chart configuration.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
