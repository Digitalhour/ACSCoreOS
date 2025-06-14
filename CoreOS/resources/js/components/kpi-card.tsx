import { KpiChart } from '@/components/KpiChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';

interface KpiCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    chartData?: number[];
    comparisonData?: number[];
    showChart?: boolean;
    chartType?: 'line' | 'area' | 'bar';
    showDollarSign?: boolean;
    className?: string;
    onClick?: () => void;
    onEdit?: () => void;
}

export function KpiCard({
    title,
    value,
    change,
    changeLabel = 'from last period',
    chartData,
    comparisonData,
    showChart = false,
    chartType = 'line',
    showDollarSign = false,
    className = '',
    onClick,
    onEdit,
}: KpiCardProps) {
    const formatValue = (val: string | number) => {
        let formatted = '';
        if (typeof val === 'number') {
            formatted = val.toLocaleString();
        } else {
            formatted = val;
        }
        return showDollarSign ? `${formatted}` : formatted;
    };

    const getChangeColor = () => {
        if (!change) return 'text-gray-500';
        return change > 0 ? 'text-green-600' : 'text-red-600';
    };

    const getChangeIcon = () => {
        if (!change) return null;
        return change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
    };

    const handleCardClick = () => {
        if (onClick) {
            onClick();
        } else if (onEdit) {
            onEdit();
        }
    };

    return (
        <Card className={`cursor-pointer transition-all hover:shadow-md ${className}`} onClick={handleCardClick}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
                <BarChart3 className="h-4 w-4 text-gray-400" />
            </CardHeader>

            <CardContent>
                <div className="mb-2 text-2xl font-bold text-gray-900">{formatValue(value)}</div>

                {change !== undefined && (
                    <div className="flex items-center text-xs">
                        <span className={`inline-flex items-center font-medium ${getChangeColor()}`}>
                            {getChangeIcon()}
                            <span className="ml-1">
                                {change > 0 ? '+' : ''}
                                {change}%
                            </span>
                        </span>
                        <span className="ml-1 text-gray-500">{changeLabel}</span>
                    </div>
                )}

                {showChart && chartData && chartData.length > 0 && (
                    <div className="mt-3">
                        <KpiChart data={chartData} comparisonData={comparisonData} type={chartType} height={64} color="#3b82f6" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
