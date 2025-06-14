import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import { forwardRef } from 'react';
import { DraggableWidget } from './draggable-widget';

interface Widget {
    id: string;
    type: 'table' | 'chart' | 'metric';
    title: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    config: any;
    data?: any[];
    gridPosition: { x: number; y: number; w: number; h: number };
}

interface DashboardCanvasProps {
    widgets: Widget[];
    selectedWidget: string | null;
    previewMode: boolean;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onWidgetMouseDown: (e: React.MouseEvent, widget: Widget) => void;
    onWidgetSelect: (id: string) => void;
    onWidgetEdit: (id: string) => void;
    onWidgetDelete: (id: string) => void;
    onWidgetResize?: (widget: Widget, newSize: { w: number; h: number }) => void;
    onUpdateWidget?: (id: string, updates: Partial<Widget>) => void;
    onOpenTemplateModal: () => void;
    onOpenWidgetPalette: () => void;
}

export const DashboardCanvas = forwardRef<HTMLDivElement, DashboardCanvasProps>(
    (
        {
            widgets,
            selectedWidget,
            previewMode,
            onMouseMove,
            onMouseUp,
            onWidgetMouseDown,
            onWidgetSelect,
            onWidgetEdit,
            onWidgetDelete,
            onWidgetResize,
            onUpdateWidget,
            onOpenTemplateModal,
            onOpenWidgetPalette,
        },
        ref,
    ) => {
        return (
            <div ref={ref} className="relative h-full w-full" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
                {widgets.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <Database className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                            <h3 className="mb-2 text-lg font-medium text-gray-900">Start Building Your Dashboard</h3>
                            <p className="mb-6 text-gray-600">Choose a template or add widgets to get started</p>
                            <div className="space-x-2">
                                <Button onClick={onOpenTemplateModal}>Use Template</Button>
                                <Button variant="outline" onClick={onOpenWidgetPalette}>
                                    Add Widget
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    widgets.map((widget) => (
                        <DraggableWidget
                            key={widget.id}
                            widget={widget}
                            isSelected={selectedWidget === widget.id}
                            isPreviewMode={previewMode}
                            onMouseDown={onWidgetMouseDown}
                            onClick={() => !previewMode && onWidgetSelect(widget.id)}
                            onEdit={() => onWidgetEdit(widget.id)}
                            onDelete={() => onWidgetDelete(widget.id)}
                            onResize={onWidgetResize}
                            onUpdateWidget={onUpdateWidget}
                        />
                    ))
                )}
            </div>
        );
    },
);
