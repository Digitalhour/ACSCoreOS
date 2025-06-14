import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Widget {
    id: string;
    config: any;
}

interface ChartWidgetPropertiesProps {
    widget: Widget;
    onUpdateWidget: (id: string, updates: { config: any }) => void;
}

export function ChartWidgetProperties({ widget, onUpdateWidget }: ChartWidgetPropertiesProps) {
    return (
        <div className="border-t pt-4">
            <h4 className="mb-4 font-medium">Chart Options</h4>
            <Label htmlFor="chart-type">Chart Type</Label>
            <Select
                value={widget.config.type || 'line'}
                onValueChange={(value) =>
                    onUpdateWidget(widget.id, {
                        config: { ...widget.config, type: value },
                    })
                }
            >
                <SelectTrigger className="mt-1">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
