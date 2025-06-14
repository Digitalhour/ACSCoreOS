// components/bi/VisualizationCard.tsx - Fixed Version
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, BarChart3, FileSpreadsheet, Gauge, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Visualization {
    id: string;
    type: 'bar' | 'line' | 'pie' | 'datatable' | 'kpi';
    dimension?: string;
    metric?: string;
    aggregation: string;
    columns: string[];
    data: any[];
    isLoading: boolean;
    error?: string;
}

interface VisualizationCardProps {
    visualization: Visualization;
    isActive: boolean;
    onClick: () => void;
    chartColors?: string[];
}

const DEFAULT_CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

export const VisualizationCard = ({ visualization, isActive, onClick, chartColors = DEFAULT_CHART_COLORS }: VisualizationCardProps) => {
    // Safety check for visualization object
    if (!visualization) {
        return (
            <Card className="flex h-80 items-center justify-center">
                <div className="text-muted-foreground text-center">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                    <p>Invalid visualization</p>
                </div>
            </Card>
        );
    }

    const renderChart = () => {
        if (visualization.isLoading) {
            return (
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="text-primary h-8 w-8 animate-spin" />
                </div>
            );
        }

        if (visualization.error) {
            return (
                <div className="text-destructive flex h-full items-center justify-center">
                    <AlertCircle className="mr-2 h-4 w-4" /> {visualization.error}
                </div>
            );
        }

        const yAxisLabel = visualization.metric && visualization.aggregation ? `${visualization.aggregation}(${visualization.metric})` : 'Value';

        switch (visualization.type) {
            case 'bar':
            case 'line':
            case 'pie':
                if (!visualization.dimension || !visualization.metric) {
                    return (
                        <div className="p-4 text-center">
                            <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
                            <p className="mt-2 text-sm text-gray-500">Configure this chart.</p>
                        </div>
                    );
                }

                const ChartComponent = {
                    bar: BarChart,
                    line: LineChart,
                    pie: PieChart,
                }[visualization.type];

                const ChartElement = {
                    bar: Bar,
                    line: Line,
                    pie: Pie,
                }[visualization.type];

                return (
                    <ResponsiveContainer>
                        <ChartComponent data={visualization.data || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="dimension" hide={visualization.type === 'pie'} tick={{ fontSize: 10 }} />
                            <YAxis hide={visualization.type === 'pie'} />
                            <Tooltip />
                            <Legend />
                            <ChartElement dataKey="value" name={yAxisLabel} fill="#8884d8" label={visualization.type === 'pie'}>
                                {visualization.type === 'pie' &&
                                    (visualization.data || []).map((_, i) => <Cell key={`cell-${i}`} fill={chartColors[i % chartColors.length]} />)}
                            </ChartElement>
                        </ChartComponent>
                    </ResponsiveContainer>
                );

            case 'kpi':
                if (!visualization.metric) {
                    return (
                        <div className="p-4 text-center">
                            <Gauge className="mx-auto h-12 w-12 text-gray-300" />
                            <p className="mt-2 text-sm text-gray-500">Select a metric.</p>
                        </div>
                    );
                }
                return (
                    <div className="flex h-full flex-col items-center justify-center">
                        <CardDescription>{yAxisLabel}</CardDescription>
                        <CardTitle className="text-4xl">
                            {typeof visualization.data?.[0]?.value === 'number' ? visualization.data[0].value.toLocaleString() : 'N/A'}
                        </CardTitle>
                    </div>
                );

            case 'datatable':
                if (!visualization.columns || visualization.columns.length === 0) {
                    return (
                        <div className="p-4 text-center">
                            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-300" />
                            <p className="mt-2 text-sm text-gray-500">Select columns to display.</p>
                        </div>
                    );
                }

                const tableHeaders = visualization.data?.[0] ? Object.keys(visualization.data[0]) : visualization.columns;

                return (
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {tableHeaders.map((header) => (
                                        <TableHead key={header}>{header}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(visualization.data || []).map((row, i) => (
                                    <TableRow key={i}>
                                        {tableHeaders.map((col) => (
                                            <TableCell key={col}>{row[col]}</TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                );

            default:
                return (
                    <div className="p-4 text-center">
                        <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">Unknown chart type.</p>
                    </div>
                );
        }
    };

    // Safe string handling for chart title
    const getChartTitle = () => {
        if (!visualization.type) return 'Chart';

        try {
            return visualization.type.charAt(0).toUpperCase() + visualization.type.slice(1) + ' Chart';
        } catch (error) {
            return 'Chart';
        }
    };

    return (
        <Card className={`h-80 cursor-pointer transition-all ${isActive ? 'ring-primary ring-2' : ''}`} onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">{getChartTitle()}</CardTitle>
            </CardHeader>
            <CardContent className="h-full pb-6">{renderChart()}</CardContent>
        </Card>
    );
};
