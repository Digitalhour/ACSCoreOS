import { LineChart } from 'lucide-react';

interface ChartWidgetProps {
    // config could be passed here for real chart implementations
}

/**
 * Renders the content for a chart widget.
 */
export function ChartWidget({}: ChartWidgetProps) {
    return (
        <div className="flex h-full items-center justify-center rounded bg-gray-50">
            <LineChart className="h-8 w-8 text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Chart View</span>
        </div>
    );
}
