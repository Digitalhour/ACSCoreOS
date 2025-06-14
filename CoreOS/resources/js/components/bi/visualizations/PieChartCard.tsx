import { EnhancedVisualization } from '@/types';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface PieChartCardProps {
    visualization: EnhancedVisualization;
    chartColors: string[];
}

export const PieChartCard = ({ visualization, chartColors }: PieChartCardProps) => {
    if (!visualization.dimension || !visualization.metric) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <PieChartIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">Configure this chart.</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Tooltip />
                <Legend />
                <Pie data={visualization.data || []} dataKey="value" nameKey="dimension" cx="50%" cy="50%" outerRadius="80%" fill="#8884d8" label>
                    {(visualization.data || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};
