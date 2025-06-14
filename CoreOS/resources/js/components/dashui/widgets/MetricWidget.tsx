import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

// Defines the structure for the widget's configuration
interface WidgetConfig {
    table?: string;
    column?: string;
    aggregation?: 'sum' | 'count' | 'avg' | 'max' | 'min';
    comparisonEnabled?: boolean;
    // The old static properties can be fallback or removed
    value?: string;
    change?: string;
    color?: 'green' | 'blue' | 'red' | 'purple';
}

// Defines the props for the MetricWidget component
interface MetricWidgetProps {
    config: WidgetConfig;
}

/**
 * Renders the content for a metric widget.
 * It fetches data from the backend based on its configuration.
 */
export function MetricWidget({ config }: MetricWidgetProps) {
    const [data, setData] = useState<{ value: string | number; change: string | number | null } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { table, column, aggregation, comparisonEnabled } = config;

    // Effect to fetch data when the configuration changes
    useEffect(() => {
        // Only fetch if the required configuration is present
        if (table && column && aggregation) {
            setIsLoading(true);
            setError(null);

            const params = new URLSearchParams({
                table,
                column,
                aggregation,
                comparisonEnabled: String(!!comparisonEnabled),
                customDays: '30', // You can make this configurable later
            });

            // Fetch the KPI data from the backend
            fetch(`/api/kpi/preview?${params.toString()}`)
                .then((res) => {
                    if (!res.ok) {
                        throw new Error('Failed to fetch metric data.');
                    }
                    return res.json();
                })
                .then((apiData) => {
                    setData({
                        value: apiData.value,
                        change: apiData.change,
                    });
                })
                .catch((err) => {
                    console.error(err);
                    setError('Could not load data.');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            // If config is incomplete, reset the state
            setData(null);
            setError(null);
        }
    }, [table, column, aggregation, comparisonEnabled]); // Rerun effect when these change

    // Render loading state
    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
            </div>
        );
    }

    // Render error state
    if (error) {
        return <div className="text-sm text-red-500">{error}</div>;
    }

    // Render informational state if not configured
    if (!table || !column || !aggregation) {
        return <div className="text-sm text-gray-500">Please configure this widget.</div>;
    }

    // Render the fetched data
    if (data) {
        const isPositive = data.change !== null && Number(data.change) >= 0;
        const changeColor = data.change === null ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600';

        return (
            <div className="space-y-2">
                <div className="text-2xl font-bold">{data.value}</div>
                {data.change !== null && (
                    <div className={`text-sm ${changeColor}`}>
                        {isPositive ? '↑' : '↓'} {Math.abs(Number(data.change))}% vs previous period
                    </div>
                )}
            </div>
        );
    }

    return null; // Should not be reached, but good for safety
}
