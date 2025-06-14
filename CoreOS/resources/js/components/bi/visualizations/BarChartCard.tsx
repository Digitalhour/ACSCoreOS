import { EnhancedVisualization } from '@/types';
import { BarChart3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BarChartCardProps {
    visualization: EnhancedVisualization;
}

export const BarChartCard = ({ visualization }: BarChartCardProps) => {
    if (!visualization.dimension || !visualization.metric) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">Configure this chart.</p>
            </div>
        );
    }

    const yAxisLabel = visualization.metric && visualization.aggregation ? `${visualization.aggregation}(${visualization.metric})` : 'Value';

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visualization.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name={yAxisLabel} fill="#8884d8" />
            </BarChart>
        </ResponsiveContainer>
    );
};
