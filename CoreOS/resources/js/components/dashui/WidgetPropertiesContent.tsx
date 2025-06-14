import { ChartWidgetProperties } from './properties/ChartWidgetProperties';
import { MetricWidgetProperties } from './properties/MetricWidgetProperties';
import { TableWidgetProperties } from './properties/TableWidgetProperties';

interface Widget {
    id: string;
    type: 'table' | 'chart' | 'metric';
    config: any;
}

interface WidgetPropertiesContentProps {
    widget: Widget;
    onUpdateWidget: (id: string, updates: any) => void;
}

export function WidgetPropertiesContent({ widget, onUpdateWidget }: WidgetPropertiesContentProps) {
    switch (widget.type) {
        case 'metric':
            return <MetricWidgetProperties widget={widget} onUpdateWidget={onUpdateWidget} />;
        case 'chart':
            return <ChartWidgetProperties widget={widget} onUpdateWidget={onUpdateWidget} />;
        case 'table':
            return <TableWidgetProperties />;
        default:
            return <div className="text-sm text-red-500">Unknown widget type properties: {widget.type}</div>;
    }
}
