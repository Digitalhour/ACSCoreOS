// components/bi/EnhancedDashboardSection.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Grip, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ChartTypeSelectionDialog } from './ChartTypeSelectionDialog';
import { EnhancedVisualizationCard } from './EnhancedVisualizationCard';
import { TableSelectionDialog } from './TableSelectionDialog';

interface EnhancedDashboardSectionProps {
    section: DashboardSection;
    visualizations: EnhancedVisualization[];
    activeVizId: string | null;
    availableTables: string[];
    onUpdateSection: (sectionId: string, updates: Partial<DashboardSection>) => void;
    onDeleteSection: (sectionId: string) => void;
    onVisualizationClick: (vizId: string) => void;
    onAddVisualization: (sectionId: string, tableName: string, type: string) => void;
    onDeleteVisualization: (vizId: string) => void;
    dragHandleProps?: any;
}

interface DashboardSection {
    id: string;
    title: string;
    description?: string;
    layout: 'grid' | 'single' | 'sidebar';
    visualizationIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

interface EnhancedVisualization {
    id: string;
    type: 'bar' | 'line' | 'pie' | 'datatable' | 'kpi';
    tableName: string;
    dimension?: string;
    metric?: string;
    aggregation: string;
    columns: string[];
    data: any[];
    isLoading: boolean;
    error?: string;
}

export const EnhancedDashboardSection = ({
    section,
    visualizations,
    activeVizId,
    availableTables,
    onUpdateSection,
    onDeleteSection,
    onVisualizationClick,
    onAddVisualization,
    onDeleteVisualization,
    dragHandleProps,
}: EnhancedDashboardSectionProps) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(section.title);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
    const [isChartTypeDialogOpen, setIsChartTypeDialogOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [editForm, setEditForm] = useState({
        title: section.title,
        description: section.description || '',
        layout: section.layout,
    });

    const sectionVisualizations = visualizations.filter((viz) => section.visualizationIds.includes(viz.id));

    // Get unique tables used in this section
    const usedTables = [...new Set(sectionVisualizations.map((viz) => viz.tableName))];

    const handleTitleSave = () => {
        if (editTitle.trim()) {
            onUpdateSection(section.id, { title: editTitle.trim() });
            setIsEditingTitle(false);
        }
    };

    const handleEditFormSave = () => {
        onUpdateSection(section.id, {
            title: editForm.title,
            description: editForm.description,
            layout: editForm.layout as DashboardSection['layout'],
        });
        setIsEditSheetOpen(false);
    };

    const handleTableSelect = (tableName: string) => {
        setSelectedTable(tableName);
        setIsChartTypeDialogOpen(true);
    };

    const handleChartTypeSelect = (chartType: string) => {
        onAddVisualization(section.id, selectedTable, chartType);
        setSelectedTable('');
    };

    const getLayoutClasses = () => {
        switch (section.layout) {
            case 'grid':
                return 'grid gap-4 md:grid-cols-2 lg:grid-cols-3';
            case 'sidebar':
                return 'grid gap-4 md:grid-cols-3';
            case 'single':
            default:
                return 'grid gap-4';
        }
    };

    return (
        <>
            <Card className="mb-6">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div {...dragHandleProps}>
                                <Grip className="text-muted-foreground hover:text-foreground h-4 w-4 cursor-grab transition-colors" />
                            </div>

                            {isEditingTitle ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onBlur={handleTitleSave}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleTitleSave();
                                            if (e.key === 'Escape') {
                                                setEditTitle(section.title);
                                                setIsEditingTitle(false);
                                            }
                                        }}
                                        className="h-8 text-lg font-semibold"
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <CardTitle
                                            className="hover:text-primary cursor-pointer transition-colors"
                                            onClick={() => setIsEditingTitle(true)}
                                        >
                                            {section.title}
                                        </CardTitle>
                                        {usedTables.length > 0 && (
                                            <div className="flex gap-1">
                                                {usedTables.map((table) => (
                                                    <Badge key={table} variant="secondary" className="text-xs">
                                                        {table}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {section.description && <CardDescription className="mt-1">{section.description}</CardDescription>}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsTableDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Chart
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setIsEditSheetOpen(true)}>
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        Edit Section
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDeleteSection(section.id)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Section
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {sectionVisualizations.length > 0 ? (
                        <div className={getLayoutClasses()}>
                            {sectionVisualizations.map((viz) => (
                                <EnhancedVisualizationCard
                                    key={viz.id}
                                    visualization={viz}
                                    isActive={viz.id === activeVizId}
                                    onClick={() => onVisualizationClick(viz.id)}
                                    onDelete={() => onDeleteVisualization(viz.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="border-muted-foreground/25 flex h-40 items-center justify-center rounded-lg border-2 border-dashed">
                            <div className="text-center">
                                <p className="text-muted-foreground">No visualizations in this section</p>
                                <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsTableDialogOpen(true)}>
                                    Add First Chart
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>

                {/* Edit Section Sheet */}
                <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Edit Section</SheetTitle>
                            <SheetDescription>Customize your dashboard section settings</SheetDescription>
                        </SheetHeader>

                        <div className="space-y-6 py-6">
                            <div className="space-y-2">
                                <Label htmlFor="section-title">Section Title</Label>
                                <Input
                                    id="section-title"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                                    placeholder="Enter section title"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="section-description">Description (Optional)</Label>
                                <Textarea
                                    id="section-description"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe what this section contains..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Data Sources in this Section</Label>
                                <div className="flex flex-wrap gap-2">
                                    {usedTables.length > 0 ? (
                                        usedTables.map((table) => (
                                            <Badge key={table} variant="outline">
                                                {table}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground text-sm">No data sources yet</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Layout Style</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { value: 'grid', label: 'Grid Layout', description: 'Multiple charts in a grid' },
                                        { value: 'single', label: 'Single Column', description: 'Charts stacked vertically' },
                                        { value: 'sidebar', label: 'Sidebar Layout', description: 'Charts with sidebar arrangement' },
                                    ].map((layout) => (
                                        <Card
                                            key={layout.value}
                                            className={`cursor-pointer transition-colors ${
                                                editForm.layout === layout.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                            }`}
                                            onClick={() => setEditForm((prev) => ({ ...prev, layout: layout.value as any }))}
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex items-center space-x-2">
                                                    <div
                                                        className={`h-3 w-3 rounded-full border-2 ${
                                                            editForm.layout === layout.value ? 'border-primary bg-primary' : 'border-muted-foreground'
                                                        }`}
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium">{layout.label}</p>
                                                        <p className="text-muted-foreground text-xs">{layout.description}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button onClick={handleEditFormSave} className="flex-1">
                                    Save Changes
                                </Button>
                                <Button variant="outline" onClick={() => setIsEditSheetOpen(false)} className="flex-1">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </Card>

            {/* Table Selection Dialog */}
            <TableSelectionDialog
                isOpen={isTableDialogOpen}
                onClose={() => setIsTableDialogOpen(false)}
                tables={availableTables}
                onTableSelect={handleTableSelect}
            />

            {/* Chart Type Selection Dialog */}
            <ChartTypeSelectionDialog
                isOpen={isChartTypeDialogOpen}
                onClose={() => setIsChartTypeDialogOpen(false)}
                onChartTypeSelect={handleChartTypeSelect}
                selectedTable={selectedTable}
            />
        </>
    );
};
