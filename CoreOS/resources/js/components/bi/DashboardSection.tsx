import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Grip, MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { VisualizationCard } from './VisualizationCard';

interface DashboardSectionProps {
    section: DashboardSection;
    visualizations: Visualization[];
    activeVizId: string | null;
    onUpdateSection: (sectionId: string, updates: Partial<DashboardSection>) => void;
    onDeleteSection: (sectionId: string) => void;
    onVisualizationClick: (vizId: string) => void;
    onAddVisualization: (sectionId: string, type?: string) => void;
    dragHandleProps?: any; // Props from @dnd-kit for drag handle
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

interface Visualization {
    id: string;
    type: 'bar' | 'line' | 'pie' | 'datatable' | 'kpi';
    dimension?: string;
    metric?: string;
    aggregation: string;
    columns: string[];
    data: any[];
    isLoading: boolean;
    error?: string;
}

export const DashboardSection = ({
    section,
    visualizations,
    activeVizId,
    onUpdateSection,
    onDeleteSection,
    onVisualizationClick,
    onAddVisualization,
    dragHandleProps,
}: DashboardSectionProps) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(section.title);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        title: section.title,
        description: section.description || '',
        layout: section.layout,
    });

    const sectionVisualizations = visualizations.filter((viz) => section.visualizationIds.includes(viz.id));

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
                                <CardTitle className="hover:text-primary cursor-pointer transition-colors" onClick={() => setIsEditingTitle(true)}>
                                    {section.title}
                                </CardTitle>
                                {section.description && <CardDescription className="mt-1">{section.description}</CardDescription>}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Add Chart
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => onAddVisualization(section.id, 'bar')}>Bar Chart</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAddVisualization(section.id, 'line')}>Line Chart</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAddVisualization(section.id, 'pie')}>Pie Chart</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAddVisualization(section.id, 'kpi')}>KPI Card</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAddVisualization(section.id, 'datatable')}>Data Table</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

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
                            <VisualizationCard
                                key={viz.id}
                                visualization={viz}
                                isActive={viz.id === activeVizId}
                                onClick={() => onVisualizationClick(viz.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="border-muted-foreground/25 flex h-40 items-center justify-center rounded-lg border-2 border-dashed">
                        <div className="text-center">
                            <p className="text-muted-foreground">No visualizations in this section</p>
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => onAddVisualization(section.id)}>
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
    );
};
