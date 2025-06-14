import { BarChartCard } from '@/components/bi/visualizations/BarChartCard';
import { DataTableCard } from '@/components/bi/visualizations/DataTableCard';
import { KpiCard } from '@/components/bi/visualizations/KpiCard';
import { LineChartCard } from '@/components/bi/visualizations/LineChartCard';
import { PieChartCard } from '@/components/bi/visualizations/PieChartCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EnhancedVisualization, KpiVisualization } from '@/types';
import { AlertCircle, BarChart3, Loader2, MoreVertical, Table2, Trash2 } from 'lucide-react';

interface EnhancedVisualizationCardProps {
    visualization: EnhancedVisualization;
    isActive: boolean;
    onClick: () => void;
    onDelete?: () => void;
    chartColors?: string[];
    canEdit?: boolean;
}

const DEFAULT_CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

export const EnhancedVisualizationCard = ({
    visualization,
    isActive,
    onClick,
    onDelete,
    chartColors = DEFAULT_CHART_COLORS,
    canEdit = true,
}: EnhancedVisualizationCardProps) => {
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

    if (visualization.type === 'datatable') {
        return <DataTableCard visualization={visualization} isActive={isActive} onClick={onClick} onDelete={onDelete} canEdit={canEdit} />;
    }

    const cardClasses = `cursor-pointer transition-all h-80 ${isActive ? 'ring-primary ring-2' : ''}`;

    const renderContent = () => {
        if (visualization.isLoading) {
            return (
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="text-primary h-8 w-8 animate-spin" />
                </div>
            );
        }

        if (visualization.error) {
            return (
                <div className="text-destructive flex h-full items-center justify-center p-4 text-center">
                    <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" /> {visualization.error}
                </div>
            );
        }

        switch (visualization.type) {
            case 'bar':
            case 'line':
            case 'pie':
                // These chart types are handled by their respective components
                if (visualization.type === 'bar') return <BarChartCard visualization={visualization} />;
                if (visualization.type === 'line') return <LineChartCard visualization={visualization} />;
                if (visualization.type === 'pie') return <PieChartCard visualization={visualization} chartColors={chartColors} />;
                break;
            case 'kpi':
                // Explicitly pass the kpi-typed visualization to the KpiCard
                return <KpiCard visualization={visualization as KpiVisualization} />;
            default:
                return (
                    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                        <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">Unknown chart type.</p>
                    </div>
                );
        }
    };

    const getChartTitle = () => {
        if (!visualization.type) return 'Chart';
        const typeMap: Record<string, string> = {
            kpi: 'KPI',
            bar: 'Bar Chart',
            line: 'Line Chart',
            pie: 'Pie Chart',
        };
        return typeMap[visualization.type] || 'Chart';
    };

    const getDisplayTableName = () => {
        if (visualization.type === 'kpi') {
            const kpiViz = visualization as KpiVisualization;
            if (!kpiViz.metrics || kpiViz.metrics.length === 0) return 'Not configured';

            // Get unique table names from the metrics
            const tableNames = [...new Set(kpiViz.metrics.map((m) => m.tableName))];

            if (tableNames.length > 1) {
                return 'Multiple Sources';
            }
            return tableNames[0] || 'Unknown';
        }
        // Fallback for other chart types
        return 'tableName' in visualization ? visualization.tableName : 'Unknown';
    };

    return (
        <Card className={cardClasses} onClick={onClick}>
            <CardHeader className="flex-shrink-0 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">{getChartTitle()}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                            <Table2 className="mr-1 h-3 w-3" />
                            {getDisplayTableName()}
                        </Badge>
                        {onDelete && canEdit && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onDelete) onDelete();
                                        }}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Chart
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden pb-3">{renderContent()}</CardContent>
        </Card>
    );
};
