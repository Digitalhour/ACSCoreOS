import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiVisualization } from '@/types';
import { AlertCircle, BarChart3, Database, Loader2, TrendingUp } from 'lucide-react';

interface KpiCardProps {
    visualization: KpiVisualization;
}

export const KpiCard = ({ visualization }: KpiCardProps) => {
    // Show loading state
    if (visualization.isLoading) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <Loader2 className="text-muted-foreground mb-4 h-8 w-8 animate-spin" />
                <p className="text-muted-foreground text-sm">Loading KPI data...</p>
            </div>
        );
    }

    // Check if there are any metrics configured for this KPI card
    if (!visualization.metrics || visualization.metrics.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <BarChart3 className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="text-muted-foreground mb-2 font-medium">No Metrics Configured</h3>
                <p className="text-muted-foreground text-sm">Click on this card to configure metrics for your KPI dashboard.</p>
            </div>
        );
    }

    // Prepare data for easy lookup by metric ID
    const dataMap = new Map(visualization.data?.map((d) => [d.id, d]));

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return 'N/A';
        if (value === 'Error') return 'Error';
        if (typeof value === 'number') {
            // Format large numbers nicely
            if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
            } else if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}K`;
            } else {
                return value.toLocaleString();
            }
        }
        return String(value);
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

    const getValueColor = (value: any) => {
        if (value === 'Error') return 'text-destructive';
        if (value === null || value === undefined || value === 'N/A') return 'text-muted-foreground';
        return 'text-foreground';
    };

    // Determine grid layout based on number of metrics
    const getGridClasses = () => {
        const count = visualization.metrics.length;
        if (count === 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
        if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    };

    return (
        <div className={`grid h-full gap-4 p-4 ${getGridClasses()}`}>
            {visualization.metrics.map((metric) => {
                const dataPoint = dataMap.get(metric.id);
                const value = dataPoint?.value;
                const hasError = dataPoint?.error;
                const displayValue = formatValue(value);

                return (
                    <Card key={metric.id} className="flex flex-col justify-between transition-shadow hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="line-clamp-2 text-sm font-medium">{metric.label}</CardTitle>
                            <div className="flex items-center gap-1">
                                {hasError ? (
                                    <AlertCircle className="text-destructive h-4 w-4" />
                                ) : (
                                    <TrendingUp className="text-muted-foreground h-4 w-4" />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className={`text-2xl font-bold ${getValueColor(value)}`}>{displayValue}</div>

                            <div className="space-y-1">
                                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                    <span className="bg-muted rounded px-1 font-mono">{getAggregationIcon(metric.aggregation)}</span>
                                    <span>{metric.aggregation.toUpperCase()}</span>
                                    <span>of</span>
                                    <Badge variant="outline" className="text-xs">
                                        {metric.metric}
                                    </Badge>
                                </div>

                                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                    <Database className="h-3 w-3" />
                                    <span>from {metric.tableName}</span>
                                </div>

                                {hasError && <div className="text-destructive bg-destructive/10 rounded p-2 text-xs">Error: {hasError}</div>}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};
