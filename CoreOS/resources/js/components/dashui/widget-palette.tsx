import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Table, TrendingUp } from 'lucide-react';

interface WidgetType {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
}

const widgetTypes: WidgetType[] = [
    { id: 'table', name: 'Data Table', icon: Table, description: 'Display tabular data' },
    { id: 'chart', name: 'Chart', icon: BarChart3, description: 'Visualize data trends' },
    { id: 'metric', name: 'Metric Card', icon: TrendingUp, description: 'Show key numbers' },
];

interface WidgetPaletteProps {
    onAddWidget: (type: string) => void;
}

export function WidgetPalette({ onAddWidget }: WidgetPaletteProps) {
    return (
        <div className="grid grid-cols-1 gap-4 pt-4">
            {widgetTypes.map((type) => (
                <Card key={type.id} className="cursor-pointer transition-colors hover:bg-gray-50" onClick={() => onAddWidget(type.id)}>
                    <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                            <div className="rounded-lg bg-gray-100 p-2">
                                <type.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-sm font-medium">{type.name}</div>
                                <div className="text-xs text-gray-500">{type.description}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default WidgetPalette;
