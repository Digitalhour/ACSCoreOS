import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { WidgetPalette } from './widget-palette';

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

interface DashboardSidebarProps {
    selectedWidget: string | null;
    widgets: Widget[];
    onOpenTemplateModal: () => void;
    onOpenWidgetPalette: () => void;
    onAddWidget: (type: string) => void;
    onUpdateWidget: (id: string, updates: Partial<Widget>) => void;
}

export function DashboardSidebar({
    selectedWidget,
    widgets,
    onOpenTemplateModal,
    onOpenWidgetPalette,
    onAddWidget,
    onUpdateWidget,
}: DashboardSidebarProps) {
    const selectedWidgetData = selectedWidget ? widgets.find((w) => w.id === selectedWidget) : null;

    return (
        <div className="w-80 space-y-4 border-r bg-gray-50 p-4">
            <div>
                <h3 className="mb-3 font-medium">Quick Start</h3>
                <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={onOpenTemplateModal}>
                        <Settings className="mr-2 h-4 w-4" />
                        Choose Template
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={onOpenWidgetPalette}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Widget
                    </Button>
                </div>
            </div>

            <WidgetPalette onAddWidget={onAddWidget} />
        </div>
    );
}
