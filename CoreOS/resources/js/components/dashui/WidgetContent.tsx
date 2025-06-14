import { ChartWidget } from './widgets/ChartWidget';
import { MetricWidget } from './widgets/MetricWidget';
import { TableWidget } from './widgets/TableWidget';

interface Widget {
    id: string;
    type: 'table' | 'chart' | 'metric';
    title: string;
    config: any;
}

interface WidgetContentProps {
    widget: Widget;
}

/**
 * A dispatcher component that renders the correct widget content
 * based on the widget's type.
 */
export function WidgetContent({ widget }: WidgetContentProps) {
    switch (widget.type) {
        case 'metric':
            return <MetricWidget config={widget.config} />;
        case 'chart':
            return <ChartWidget />;
        case 'table':
            return <TableWidget config={widget.config} />;
        default:
            return <div className="text-red-500">Unknown widget type: {widget.type}</div>;
    }
}
