import { EnhancedVisualization } from '@/types';
import { LineChart as LineChartIcon } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface LineChartCardProps {
    visualization: EnhancedVisualization;
}

export const LineChartCard = ({ visualization }: LineChartCardProps) => {
    if (!visualization.dimension || !visualization.metric) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <LineChartIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">Configure this chart.</p>
            </div>
        );
    }

    const yAxisLabel = visualization.metric && visualization.aggregation ? `${visualization.aggregation}(${visualization.metric})` : 'Value';

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visualization.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" name={yAxisLabel} stroke="#82ca9d" />
            </LineChart>
        </ResponsiveContainer>
    );
};
