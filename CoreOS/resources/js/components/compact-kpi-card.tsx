import { Card, CardContent } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface CompactKpiCardProps {
    title: string;
    value: string | number;
    change?: number;
    showDollarSign?: boolean;
    onClick?: () => void;
}

export function CompactKpiCard({ title, value, change, showDollarSign = false, onClick }: CompactKpiCardProps) {
    const formatValue = (val: string | number) => {
        if (typeof val === 'number') {
            if (showDollarSign) {
                return val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `$${(val / 1000).toFixed(1)}K` : `$${val.toLocaleString()}`;
            }
            return val.toLocaleString();
        }
        return val;
    };

    return (
        <Card className="h-full cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
            <CardContent className="p-3">
                <div className="space-y-1">
                    <p className="text-muted-foreground truncate text-xs font-medium">{title}</p>
                    <div className="flex items-center justify-between">
                        <p className="text-lg font-bold">{formatValue(value)}</p>
                        {change !== undefined && (
                            <div
                                className={`flex items-center text-xs ${
                                    change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
                                }`}
                            >
                                {change > 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : change < 0 ? <TrendingDown className="mr-1 h-3 w-3" /> : null}
                                <span>{Math.abs(change)}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
