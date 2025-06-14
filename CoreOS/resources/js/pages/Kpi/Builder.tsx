import { DashboardCanvas } from '@/components/dashui/dashboard-canvas';
import { TemplateModal } from '@/components/dashui/template-modal';
import { WidgetPalette } from '@/components/dashui/widget-palette';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

import axios from 'axios';
import { Eye, EyeOff, LayoutTemplate, Plus, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Builder', href: '/dashboard/builder' },
];

interface TableColumn {
    name: string;
    type: string;
    nullable: boolean;
    key: string;
}

interface GridPosition {
    x: number; // grid column
    y: number; // grid row
    w: number; // width in grid units
    h: number; // height in grid units
}

interface Widget {
    id: string;
    type: 'table' | 'chart' | 'metric';
    title: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    config: any;
    data?: any[];
    gridPosition: GridPosition;
}

interface Template {
    id: string;
    name: string;
    description: string;
    preview: string;
    widgets: Omit<Widget, 'id'>[];
}

// Grid utility class
class GridUtils {
    static gridConfig = {
        cols: 24,
        rowHeight: 160,
        margin: [10, 10] as [number, number],
        containerPadding: [20, 20] as [number, number],
    };

    static pixelToGrid(pixelX: number, pixelY: number, containerWidth: number): GridPosition {
        const { cols, rowHeight, margin, containerPadding } = this.gridConfig;
        const colWidth = (containerWidth - containerPadding[0] * 2 - margin[0] * (cols - 1)) / cols;

        const x = Math.round((pixelX - containerPadding[0]) / (colWidth + margin[0]));
        const y = Math.round((pixelY - containerPadding[1]) / (rowHeight + margin[1]));

        return { x: Math.max(0, Math.min(x, cols - 1)), y: Math.max(0, y), w: 1, h: 1 };
    }

    static gridToPixel(gridPos: GridPosition, containerWidth: number): { x: number; y: number; width: number; height: number } {
        const { cols, rowHeight, margin, containerPadding } = this.gridConfig;
        const colWidth = (containerWidth - containerPadding[0] * 2 - margin[0] * (cols - 1)) / cols;

        const x = containerPadding[0] + gridPos.x * (colWidth + margin[0]);
        const y = containerPadding[1] + gridPos.y * (rowHeight + margin[1]);
        const width = gridPos.w * colWidth + (gridPos.w - 1) * margin[0];
        const height = gridPos.h * rowHeight + (gridPos.h - 1) * margin[1];

        return { x, y, width, height };
    }

    static hasCollision(a: GridPosition, b: GridPosition): boolean {
        return !(a.x >= b.x + b.w || a.x + a.w <= b.x || a.y >= b.y + b.h || a.y + a.h <= b.y);
    }

    static findAvailablePosition(widgets: Widget[], w: number = 1, h: number = 1): GridPosition {
        const { cols } = this.gridConfig;
        for (let y = 0; y < Infinity; y++) {
            for (let x = 0; x <= cols - w; x++) {
                const position = { x, y, w, h };
                let collides = false;
                for (const widget of widgets) {
                    if (this.hasCollision(position, widget.gridPosition)) {
                        collides = true;
                        break;
                    }
                }
                if (!collides) return position;
            }
        }
        return { x: 0, y: 0, w, h }; // Fallback
    }

    static sortWidgets(widgets: Widget[]): Widget[] {
        return [...widgets].sort((a, b) => {
            if (a.gridPosition.y > b.gridPosition.y) return 1;
            if (a.gridPosition.y < b.gridPosition.y) return -1;
            if (a.gridPosition.x > b.gridPosition.x) return 1;
            if (a.gridPosition.x < b.gridPosition.x) return -1;
            return 0;
        });
    }

    static resolveLayout(layout: Widget[], movingItemId: string | null = null): Widget[] {
        let newLayout = JSON.parse(JSON.stringify(layout));
        let iterations = 0;
        const maxIterations = 100;

        while (true) {
            let changed = false;
            newLayout = this.sortWidgets(newLayout);

            // First, compact all non-moving items upwards.
            for (const widget of newLayout) {
                if (widget.id === movingItemId) continue;

                let newY = widget.gridPosition.y;
                while (newY > 0) {
                    const testPos = { ...widget.gridPosition, y: newY - 1 };
                    let collides = false;
                    for (const other of newLayout) {
                        if (other.id !== widget.id && this.hasCollision(testPos, other.gridPosition)) {
                            collides = true;
                            break;
                        }
                    }
                    if (collides) break;
                    newY--;
                }
                if (newY !== widget.gridPosition.y) {
                    widget.gridPosition.y = newY;
                    changed = true;
                }
            }

            // Then, resolve collisions by pushing items down.
            for (let i = 0; i < newLayout.length; i++) {
                const widgetA = newLayout[i];
                for (let j = i + 1; j < newLayout.length; j++) {
                    const widgetB = newLayout[j];
                    if (this.hasCollision(widgetA.gridPosition, widgetB.gridPosition)) {
                        // If B collides with A, push B down.
                        const newY = widgetA.gridPosition.y + widgetA.gridPosition.h;
                        if (widgetB.gridPosition.y < newY) {
                            widgetB.gridPosition.y = newY;
                            changed = true;
                        }
                    }
                }
            }

            iterations++;
            if (!changed || iterations > maxIterations) {
                break;
            }
        }
        return newLayout;
    }
}

const mockTemplates: Template[] = [
    {
        id: 'sales',
        name: 'Sales Dashboard',
        description: 'Track revenue, orders, and customer metrics',
        preview: '📊',
        widgets: [
            {
                type: 'metric',
                title: 'Total Revenue',
                position: { x: 0, y: 0 },
                size: { width: 200, height: 120 },
                gridPosition: { x: 0, y: 0, w: 3, h: 2 },
                config: { value: '$124,592', change: '+12.5%', color: 'green' },
            },
            {
                type: 'metric',
                title: 'Orders',
                position: { x: 220, y: 0 },
                size: { width: 200, height: 120 },
                gridPosition: { x: 3, y: 0, w: 3, h: 2 },
                config: { value: '1,847', change: '+8.2%', color: 'blue' },
            },
            {
                type: 'chart',
                title: 'Revenue Trend',
                position: { x: 0, y: 140 },
                size: { width: 420, height: 280 },
                gridPosition: { x: 0, y: 2, w: 6, h: 4 },
                config: { type: 'line', data: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, value: 50000 + Math.random() * 30000 })) },
            },
        ],
    },
    {
        id: 'analytics',
        name: 'Web Analytics',
        description: 'Monitor website traffic and user behavior',
        preview: '📈',
        widgets: [
            {
                type: 'metric',
                title: 'Page Views',
                position: { x: 0, y: 0 },
                size: { width: 200, height: 120 },
                gridPosition: { x: 0, y: 0, w: 3, h: 2 },
                config: { value: '45.2K', change: '+15.3%', color: 'green' },
            },
            {
                type: 'table',
                title: 'Top Pages',
                position: { x: 220, y: 0 },
                size: { width: 300, height: 280 },
                gridPosition: { x: 3, y: 0, w: 4, h: 4 },
                config: {
                    columns: ['Page', 'Views', 'Bounce Rate'],
                    data: [
                        ['/home', '12.5K', '32%'],
                        ['/products', '8.9K', '28%'],
                        ['/about', '4.2K', '45%'],
                    ],
                },
            },
        ],
    },
];

export default function DashboardBuilder({ tables = [] }: { tables?: string[] }) {
    const [dashboardTitle, setDashboardTitle] = useState('My Dashboard');
    const [dashboardDescription, setDashboardDescription] = useState('Custom analytics dashboard');
    const [isPublic, setIsPublic] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [containerWidth, setContainerWidth] = useState(1200);

    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isWidgetPaletteModalOpen, setIsWidgetPaletteModalOpen] = useState(false);
    const [isDashboardSettingsOpen, setIsDashboardSettingsOpen] = useState(false);

    const [availableColumns, setAvailableColumns] = useState<Record<string, TableColumn[]>>({});
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateWidth = () => {
            if (canvasRef.current) {
                setContainerWidth(canvasRef.current.offsetWidth);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const updateLayout = (newLayout: Widget[]) => {
        const finalWidgets = newLayout.map((widget) => {
            const pixelPos = GridUtils.gridToPixel(widget.gridPosition, containerWidth);
            return {
                ...widget,
                position: { x: pixelPos.x, y: pixelPos.y },
                size: { width: pixelPos.width, height: pixelPos.height },
            };
        });
        setWidgets(finalWidgets);
    };

    const addTemplate = (template: Template) => {
        const newWidgets = template.widgets.map((widget) => ({
            ...widget,
            id: Date.now().toString() + Math.random(),
        }));
        const combined = [...widgets, ...newWidgets];
        const resolved = GridUtils.resolveLayout(combined);
        updateLayout(resolved);
        setIsTemplateModalOpen(false);
    };

    const addWidget = (type: string) => {
        const defaultSizes = {
            metric: { w: 4, h: 1 },
            chart: { w: 4, h: 2 },
            table: { w: 12, h: 2 },
        };

        const size = defaultSizes[type as keyof typeof defaultSizes] || { w: 3, h: 2 };
        const gridPosition = GridUtils.findAvailablePosition(widgets, size.w, size.h);

        const newWidget: Omit<Widget, 'position' | 'size'> = {
            id: Date.now().toString(),
            type: type as any,
            title: `New ${type}`,
            config: type === 'metric' ? { value: '0', change: '0%' } : { data: [] },
            gridPosition,
        };

        const resolved = GridUtils.resolveLayout([...widgets, newWidget as Widget]);
        updateLayout(resolved);
        setSelectedWidget(newWidget.id);
    };

    const handleAddWidgetAndCloseModal = (type: string) => {
        addWidget(type);
        setIsWidgetPaletteModalOpen(false);
    };

    const updateWidgetProps = (id: string, updates: Partial<Widget>) => {
        setWidgets((currentWidgets) => {
            const updatedWidgets = currentWidgets.map((w) => {
                if (w.id === id) {
                    const updated = { ...w, ...updates };
                    // If gridPosition was updated, recalculate pixel position
                    if (updates.gridPosition) {
                        const pixelPos = GridUtils.gridToPixel(updates.gridPosition, containerWidth);
                        updated.position = { x: pixelPos.x, y: pixelPos.y };
                        updated.size = { width: pixelPos.width, height: pixelPos.height };
                    }
                    return updated;
                }
                return w;
            });

            // If gridPosition was updated, resolve layout to prevent collisions
            if (updates.gridPosition) {
                const resolved = GridUtils.resolveLayout(updatedWidgets);
                return resolved.map((widget) => {
                    const pixelPos = GridUtils.gridToPixel(widget.gridPosition, containerWidth);
                    return {
                        ...widget,
                        position: { x: pixelPos.x, y: pixelPos.y },
                        size: { width: pixelPos.width, height: pixelPos.height },
                    };
                });
            }

            return updatedWidgets;
        });
    };

    const deleteWidget = (id: string) => {
        const updatedWidgets = widgets.filter((w) => w.id !== id);
        const resolved = GridUtils.resolveLayout(updatedWidgets);
        updateLayout(resolved);
        setSelectedWidget(null);
    };

    const handleMouseDown = (e: React.MouseEvent, widget: Widget) => {
        if (previewMode) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        setSelectedWidget(widget.id);
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - rect.left - widget.position.x,
            y: e.clientY - rect.top - widget.position.y,
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !selectedWidget || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const pixelX = Math.max(0, e.clientX - rect.left - dragOffset.x);
        const pixelY = Math.max(0, e.clientY - rect.top - dragOffset.y);

        const selectedWidgetData = widgets.find((w) => w.id === selectedWidget);
        if (!selectedWidgetData) return;

        const newGridPos = GridUtils.pixelToGrid(pixelX, pixelY, containerWidth);
        newGridPos.w = selectedWidgetData.gridPosition.w;
        newGridPos.h = selectedWidgetData.gridPosition.h;
        newGridPos.x = Math.min(newGridPos.x, GridUtils.gridConfig.cols - newGridPos.w);

        if (newGridPos.x === selectedWidgetData.gridPosition.x && newGridPos.y === selectedWidgetData.gridPosition.y) {
            return;
        }

        const layoutWithMove = widgets.map((w) => {
            if (w.id === selectedWidget) {
                return { ...w, gridPosition: newGridPos };
            }
            return w;
        });

        const newLayout = GridUtils.resolveLayout(layoutWithMove, selectedWidget);
        updateLayout(newLayout);
    };

    const handleMouseUp = () => {
        if (isDragging) {
            const resolvedLayout = GridUtils.resolveLayout(widgets);
            updateLayout(resolvedLayout);
        }
        setIsDragging(false);
    };

    const handleWidgetResize = (widget: Widget, newSize: { w: number; h: number }) => {
        const newGridPosition = { ...widget.gridPosition, w: newSize.w, h: newSize.h };
        newGridPosition.w = Math.min(newGridPosition.w, GridUtils.gridConfig.cols - newGridPosition.x);

        const layoutWithResize = widgets.map((w) => (w.id === widget.id ? { ...w, gridPosition: newGridPosition } : w));

        const newLayout = GridUtils.resolveLayout(layoutWithResize, widget.id);
        updateLayout(newLayout);
    };

    const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('.absolute')) {
            return;
        }
        setSelectedWidget(null);
    };
    //Getting tables from api
    const loadTableColumns = async (tableName: string) => {
        if (availableColumns[tableName]) return;

        try {
            const response = await axios.get(`/api/kpi/columns?table=${tableName}`);
            setAvailableColumns((prev) => ({
                ...prev,
                [tableName]: response.data,
            }));
        } catch (error) {
            console.error('Failed to load columns:', error);
        }
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Builder" />

            <div className="flex h-screen flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b bg-white p-4">
                    <div>
                        <h1 className="text-xl font-semibold">{dashboardTitle}</h1>
                        <p className="text-sm text-gray-600">{dashboardDescription}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {!previewMode && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setIsTemplateModalOpen(true)}>
                                    <LayoutTemplate className="mr-2 h-4 w-4" />
                                    Templates
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setIsWidgetPaletteModalOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Widget
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setIsDashboardSettingsOpen(true)}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </Button>
                            </>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
                            {previewMode ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                            {previewMode ? 'Edit' : 'Preview'}
                        </Button>
                        <Button size="sm">Save Dashboard</Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    <div className="relative h-full overflow-hidden bg-gray-100" onClick={handleBackgroundClick}>
                        <DashboardCanvas
                            ref={canvasRef}
                            widgets={widgets}
                            selectedWidget={selectedWidget}
                            previewMode={previewMode}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onWidgetMouseDown={handleMouseDown}
                            onWidgetSelect={(id) => setSelectedWidget(id)}
                            onWidgetEdit={() => {}} // Not needed anymore since we have inline editing
                            onWidgetDelete={deleteWidget}
                            onWidgetResize={handleWidgetResize}
                            onUpdateWidget={updateWidgetProps}
                            onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
                            onOpenWidgetPalette={() => setIsWidgetPaletteModalOpen(true)}
                        />
                    </div>
                </div>
            </div>

            <TemplateModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                templates={mockTemplates}
                onSelectTemplate={addTemplate}
            />

            <Dialog open={isWidgetPaletteModalOpen} onOpenChange={setIsWidgetPaletteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Widget</DialogTitle>
                        <DialogDescription>Select a widget from the palette to add it to the dashboard.</DialogDescription>
                    </DialogHeader>
                    <WidgetPalette onAddWidget={handleAddWidgetAndCloseModal} />
                </DialogContent>
            </Dialog>

            <Dialog open={isDashboardSettingsOpen} onOpenChange={setIsDashboardSettingsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Dashboard Settings</DialogTitle>
                        <DialogDescription>Configure your dashboard properties</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={dashboardTitle} onChange={(e) => setDashboardTitle(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={dashboardDescription}
                                onChange={(e) => setDashboardDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
                            <Label htmlFor="public">Make dashboard public</Label>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={() => setIsDashboardSettingsOpen(false)}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
