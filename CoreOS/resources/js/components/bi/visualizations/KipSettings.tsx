import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, BarChart3, CheckCircle, Database, PlusCircle, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface KpiMetric {
    id: string;
    label: string;
    tableName: string;
    metric: string;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

interface KpiVisualization {
    id: string;
    type: 'kpi';
    metrics: KpiMetric[];
    data: any[];
    isLoading: boolean;
    error?: string;
}

interface TableWithColumns {
    name: string;
    columns: { name: string; type: string }[];
}

interface KpiSettingsProps {
    visualization: KpiVisualization;
    onVisualizationChange: (newVisualization: KpiVisualization) => void;
    availableTables: TableWithColumns[];
}

export const KpiSettings = ({ visualization, onVisualizationChange, availableTables }: KpiSettingsProps) => {
    const handleMetricChange = (metricId: string, field: keyof KpiMetric, value: string) => {
        const newMetrics = visualization.metrics.map((m) => (m.id === metricId ? { ...m, [field]: value } : m));
        onVisualizationChange({ ...visualization, metrics: newMetrics });
    };

    const addMetric = () => {
        const newMetric: KpiMetric = {
            id: uuidv4(),
            label: `Metric ${visualization.metrics.length + 1}`,
            tableName: availableTables[0]?.name || '',
            metric: '',
            aggregation: 'sum',
        };
        const newMetrics = [...visualization.metrics, newMetric];
        onVisualizationChange({ ...visualization, metrics: newMetrics });
    };

    const removeMetric = (metricId: string) => {
        const newMetrics = visualization.metrics.filter((m) => m.id !== metricId);
        onVisualizationChange({ ...visualization, metrics: newMetrics });
    };

    const duplicateMetric = (metricId: string) => {
        const metricToDuplicate = visualization.metrics.find((m) => m.id === metricId);
        if (metricToDuplicate) {
            const newMetric: KpiMetric = {
                ...metricToDuplicate,
                id: uuidv4(),
                label: `${metricToDuplicate.label} (Copy)`,
            };
            const newMetrics = [...visualization.metrics, newMetric];
            onVisualizationChange({ ...visualization, metrics: newMetrics });
        }
    };

    const getColumnsForTable = (tableName: string) => {
        return availableTables.find((t) => t.name === tableName)?.columns || [];
    };

    const getAggregationIcon = (aggregation: string) => {
        switch (aggregation) {
            case 'sum':
                return '∑';
            case 'avg':
                return '⌀';
            case 'count':
                return '#';
            case 'min':
                return '↓';
            case 'max':
                return '↑';
            default:
                return '?';
        }
    };

    // Debug information about available tables
    const tablesStatus = {
        totalTables: availableTables.length,
        tablesWithColumns: availableTables.filter((t) => t.columns && t.columns.length > 0).length,
        numericColumns: availableTables.reduce((sum, t) => sum + (t.columns?.filter((c) => c.type === 'numeric').length || 0), 0),
    };

    const isMetricComplete = (metric: KpiMetric) => {
        return metric.label && metric.tableName && metric.metric && metric.aggregation;
    };

    const getValidationMessage = (metric: KpiMetric) => {
        if (!metric.tableName) return 'Please select a table';
        if (!metric.metric) return 'Please select a metric column';
        if (!metric.label.trim()) return 'Please enter a display label';
        return null;
    };

    return (
        <div className="space-y-6 p-4">
            {/* Header */}
            <div className="text-center">
                <h3 className="flex items-center justify-center gap-2 text-lg font-semibold">
                    <BarChart3 className="h-5 w-5" />
                    Multi-Table KPI Configuration
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                    Create KPI metrics from different tables. Each metric can use a different data source.
                </p>
            </div>

            {/* Status Information */}
            <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                    <strong>Available Data:</strong> {tablesStatus.totalTables} tables, {tablesStatus.tablesWithColumns} with columns loaded,
                    {tablesStatus.numericColumns} numeric columns total.
                    {tablesStatus.totalTables === 0 && <span className="text-destructive"> No tables found - check database connection.</span>}
                </AlertDescription>
            </Alert>

            {/* Show warning if no tables available */}
            {availableTables.length === 0 ? (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        No database tables are available. Please check your database connection and ensure the data warehouse is accessible.
                    </AlertDescription>
                </Alert>
            ) : (
                <>
                    {/* Metrics List */}
                    <div className="space-y-4">
                        {visualization.metrics.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-8">
                                    <BarChart3 className="text-muted-foreground mb-4 h-12 w-12" />
                                    <p className="text-muted-foreground text-center">
                                        No KPI metrics configured yet.
                                        <br />
                                        Click "Add Metric" to create your first metric.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            visualization.metrics.map((metric, index) => {
                                const validationMessage = getValidationMessage(metric);
                                const isComplete = isMetricComplete(metric);
                                const tableColumns = getColumnsForTable(metric.tableName);
                                const numericColumns = tableColumns.filter((c) => c.type === 'numeric');

                                return (
                                    <Card
                                        key={metric.id}
                                        className={`relative ${!isComplete ? 'border-amber-200 bg-amber-50/50' : 'border-green-200 bg-green-50/50'}`}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center gap-2 text-sm">
                                                    <span
                                                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isComplete ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}
                                                    >
                                                        {index + 1}
                                                    </span>
                                                    KPI Metric Configuration
                                                </CardTitle>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => duplicateMetric(metric.id)}
                                                        title="Duplicate metric"
                                                    >
                                                        <PlusCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeMetric(metric.id)}
                                                        className="text-destructive hover:text-destructive"
                                                        title="Remove metric"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <CardDescription className="flex items-center gap-2">
                                                <Database className="h-3 w-3" />
                                                {isComplete ? (
                                                    <span className="text-green-700">
                                                        {getAggregationIcon(metric.aggregation)} {metric.aggregation.toUpperCase()} of {metric.metric}{' '}
                                                        from {metric.tableName}
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-700">{validationMessage || 'Incomplete configuration'}</span>
                                                )}
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            {/* Display Label */}
                                            <div className="space-y-2">
                                                <Label htmlFor={`label-${index}`} className="text-sm font-medium">
                                                    Display Label *
                                                </Label>
                                                <Input
                                                    id={`label-${index}`}
                                                    value={metric.label}
                                                    onChange={(e) => handleMetricChange(metric.id, 'label', e.target.value)}
                                                    placeholder="e.g., Total Sales, Active Users, Monthly Revenue"
                                                    className="w-full"
                                                />
                                                <p className="text-muted-foreground text-xs">This label will be displayed on your KPI card</p>
                                            </div>

                                            {/* Table Selection */}
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Data Source Table *</Label>
                                                <Select
                                                    value={metric.tableName}
                                                    onValueChange={(value) => {
                                                        handleMetricChange(metric.id, 'tableName', value);
                                                        handleMetricChange(metric.id, 'metric', ''); // Reset metric when table changes
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a table..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableTables.map((t) => (
                                                            <SelectItem key={t.name} value={t.name}>
                                                                <div className="flex items-center gap-2">
                                                                    <Database className="h-4 w-4" />
                                                                    <span>{t.name}</span>
                                                                    <Badge variant="outline" className="ml-auto text-xs">
                                                                        {t.columns?.filter((c) => c.type === 'numeric').length || 0} numeric cols
                                                                    </Badge>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {metric.tableName && (
                                                    <p className="text-muted-foreground text-xs">
                                                        Selected table has {numericColumns.length} numeric columns available for metrics
                                                    </p>
                                                )}
                                            </div>

                                            {/* Column and Aggregation Selection */}
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Metric Column *</Label>
                                                    <Select
                                                        value={metric.metric}
                                                        onValueChange={(value) => handleMetricChange(metric.id, 'metric', value)}
                                                        disabled={!metric.tableName}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue
                                                                placeholder={metric.tableName ? 'Select a column...' : 'Select table first'}
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {numericColumns.length > 0 ? (
                                                                numericColumns.map((c) => (
                                                                    <SelectItem key={c.name} value={c.name}>
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {c.type}
                                                                            </Badge>
                                                                            <span>{c.name}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))
                                                            ) : (
                                                                <SelectItem value="_none" disabled>
                                                                    No numeric columns available
                                                                </SelectItem>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    {metric.tableName && numericColumns.length === 0 && (
                                                        <p className="text-xs text-amber-600">This table has no numeric columns for metrics</p>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Aggregation Method *</Label>
                                                    <Select
                                                        value={metric.aggregation}
                                                        onValueChange={(value) =>
                                                            handleMetricChange(metric.id, 'aggregation', value as KpiMetric['aggregation'])
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="sum">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-lg">∑</span>
                                                                    <div className="flex flex-col">
                                                                        <span>Sum</span>
                                                                        <span className="text-muted-foreground text-xs">Total of all values</span>
                                                                    </div>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="avg">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-lg">⌀</span>
                                                                    <div className="flex flex-col">
                                                                        <span>Average</span>
                                                                        <span className="text-muted-foreground text-xs">Mean of all values</span>
                                                                    </div>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="count">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-lg">#</span>
                                                                    <div className="flex flex-col">
                                                                        <span>Count</span>
                                                                        <span className="text-muted-foreground text-xs">Number of records</span>
                                                                    </div>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="min">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-lg">↓</span>
                                                                    <div className="flex flex-col">
                                                                        <span>Minimum</span>
                                                                        <span className="text-muted-foreground text-xs">Lowest value</span>
                                                                    </div>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="max">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-lg">↑</span>
                                                                    <div className="flex flex-col">
                                                                        <span>Maximum</span>
                                                                        <span className="text-muted-foreground text-xs">Highest value</span>
                                                                    </div>
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* SQL Preview */}
                                            {metric.tableName && metric.metric && metric.aggregation && (
                                                <div className="bg-muted rounded-lg p-3">
                                                    <Label className="text-muted-foreground text-xs font-medium">SQL Preview:</Label>
                                                    <p className="mt-1 font-mono text-sm break-all">
                                                        SELECT {metric.aggregation.toUpperCase()}(`{metric.metric}`) FROM `{metric.tableName}`
                                                    </p>
                                                    <p className="text-muted-foreground mt-1 text-xs">
                                                        This query will be executed independently for this metric
                                                    </p>
                                                </div>
                                            )}

                                            {/* Validation Feedback */}
                                            {!isComplete && (
                                                <Alert>
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription className="text-sm">
                                                        {validationMessage || 'Please complete all required fields for this metric.'}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>

                    {/* Add Metric Button */}
                    <div className="flex justify-center">
                        <Button onClick={addMetric} variant="outline" size="lg" className="w-full max-w-md">
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Add New KPI Metric
                        </Button>
                    </div>

                    {/* Quick Actions */}
                    {visualization.metrics.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    // Add a common revenue metric example
                                    const revenueMetric: KpiMetric = {
                                        id: uuidv4(),
                                        label: 'Total Revenue',
                                        tableName: availableTables[0]?.name || '',
                                        metric: '',
                                        aggregation: 'sum',
                                    };
                                    onVisualizationChange({ ...visualization, metrics: [...visualization.metrics, revenueMetric] });
                                }}
                                disabled={availableTables.length === 0}
                            >
                                + Revenue Metric
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    // Add a count metric example
                                    const countMetric: KpiMetric = {
                                        id: uuidv4(),
                                        label: 'Total Records',
                                        tableName: availableTables[0]?.name || '',
                                        metric: availableTables[0]?.columns?.[0]?.name || '',
                                        aggregation: 'count',
                                    };
                                    onVisualizationChange({ ...visualization, metrics: [...visualization.metrics, countMetric] });
                                }}
                                disabled={availableTables.length === 0}
                            >
                                + Count Metric
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Summary */}
            {visualization.metrics.length > 0 && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="pt-6">
                        <div className="space-y-2 text-center">
                            <div className="flex items-center justify-center gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">{visualization.metrics.length}</p>
                                    <p className="text-muted-foreground text-xs">Total Metrics</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">{visualization.metrics.filter(isMetricComplete).length}</p>
                                    <p className="text-muted-foreground text-xs">Complete</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-purple-600">
                                        {new Set(visualization.metrics.map((m) => m.tableName).filter(Boolean)).size}
                                    </p>
                                    <p className="text-muted-foreground text-xs">Tables Used</p>
                                </div>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                Each metric can pull data from a different table and will be calculated independently
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Help Section */}
            <Card className="bg-muted/30">
                <CardContent className="pt-6">
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">💡 Multi-Table KPI Tips:</h4>
                        <ul className="text-muted-foreground space-y-1 text-sm">
                            <li>• Each metric can use a different data source table</li>
                            <li>• Mix different aggregations (SUM sales + COUNT customers + AVG ratings)</li>
                            <li>• Use descriptive labels to make your KPI dashboard clear</li>
                            <li>• Metrics are calculated independently, so filters apply per table</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
