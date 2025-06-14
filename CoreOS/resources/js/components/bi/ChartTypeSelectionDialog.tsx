import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart3, FileSpreadsheet, Gauge, LineChart, PieChart } from 'lucide-react';

interface ChartTypeSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onChartTypeSelect: (type: string) => void;
    selectedTable?: string;
}

export const ChartTypeSelectionDialog = ({ isOpen, onClose, onChartTypeSelect, selectedTable }: ChartTypeSelectionDialogProps) => {
    const chartTypes = [
        {
            type: 'kpi',
            name: 'KPI Card',
            description: 'Display key metrics from multiple tables',
            icon: Gauge,
            color: 'text-orange-600',
        },
        {
            type: 'bar',
            name: 'Bar Chart',
            description: 'Compare values across categories',
            icon: BarChart3,
            color: 'text-blue-600',
        },
        {
            type: 'line',
            name: 'Line Chart',
            description: 'Show trends over time',
            icon: LineChart,
            color: 'text-green-600',
        },
        {
            type: 'pie',
            name: 'Pie Chart',
            description: 'Show proportions and percentages',
            icon: PieChart,
            color: 'text-purple-600',
        },
        {
            type: 'datatable',
            name: 'Data Table',
            description: 'Show detailed tabular data',
            icon: FileSpreadsheet,
            color: 'text-gray-600',
        },
    ];

    const handleChartSelect = (type: string) => {
        onChartTypeSelect(type);
        // Don't automatically close - let the parent component handle closing
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Choose Visualization Type</DialogTitle>
                    <DialogDescription>Select how you want to visualize your data</DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 py-4">
                    {chartTypes.map((chart) => {
                        const Icon = chart.icon;
                        return (
                            <Card
                                key={chart.type}
                                className="hover:bg-accent cursor-pointer transition-colors"
                                onClick={() => handleChartSelect(chart.type)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <Icon className={`h-8 w-8 ${chart.color}`} />
                                        <div className="flex-1">
                                            <CardTitle className="text-base">{chart.name}</CardTitle>
                                            <CardDescription className="text-sm">{chart.description}</CardDescription>
                                        </div>
                                        {chart.type === 'kpi' && (
                                            <div className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">Multi-table</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
