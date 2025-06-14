import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Grid3X3, Save, X } from 'lucide-react';

interface GridConfiguratorProps {
    isOpen: boolean;
    onClose: () => void;
    moduleId: string;
    moduleType: 'kpi' | 'table' | 'compact';
    currentColSpan: number;
    currentRowSpan?: number;
    maxCols: number;
    onUpdateModule: (moduleId: string, updates: any) => void;
}

export function GridConfigurator({
    isOpen,
    onClose,
    moduleId,
    moduleType,
    currentColSpan,
    currentRowSpan = 1,
    maxCols,
    onUpdateModule,
}: GridConfiguratorProps) {
    const handleColSpanChange = (colSpan: string) => {
        const updates = { colSpan: parseInt(colSpan) };
        onUpdateModule(moduleId, updates);
    };

    const handleRowSpanChange = (rowSpan: string) => {
        const updates = { rowSpan: parseInt(rowSpan) };
        onUpdateModule(moduleId, updates);
    };

    const handleCompactModeToggle = (isCompact: boolean) => {
        const updates = {
            isCompact,
            colSpan: isCompact ? 1 : currentColSpan,
            rowSpan: isCompact ? 1 : currentRowSpan,
        };
        onUpdateModule(moduleId, updates);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 rounded-lg p-2">
                            <Grid3X3 className="text-primary h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">Grid Configuration</DialogTitle>
                            <DialogDescription>Configure how this module spans the grid</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Preview */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Current Layout</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}>
                                {Array.from({ length: maxCols * 2 }, (_, i) => {
                                    const row = Math.floor(i / maxCols);
                                    const col = i % maxCols;
                                    const isActive = row < currentRowSpan && col < currentColSpan;

                                    return (
                                        <div
                                            key={i}
                                            className={`h-8 rounded border-2 ${
                                                isActive ? 'bg-primary/20 border-primary' : 'border-gray-200 bg-gray-100'
                                            }`}
                                        />
                                    );
                                })}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                {currentColSpan} column{currentColSpan > 1 ? 's' : ''} × {currentRowSpan} row{currentRowSpan > 1 ? 's' : ''}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Column Span */}
                    <div className="space-y-2">
                        <Label>Column Span</Label>
                        <Select value={currentColSpan.toString()} onValueChange={handleColSpanChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: maxCols }, (_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                                        {i + 1} column{i > 0 ? 's' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Row Span for KPI Cards */}
                    {moduleType === 'kpi' && (
                        <div className="space-y-2">
                            <Label>Row Span</Label>
                            <Select value={currentRowSpan.toString()} onValueChange={handleRowSpanChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 row (Standard)</SelectItem>
                                    <SelectItem value="2">2 rows (Tall)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Compact Mode for Single Column KPIs */}
                    {moduleType === 'kpi' && currentColSpan === 1 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Compact Mode</Label>
                                <Switch checked={moduleType === 'compact'} onCheckedChange={handleCompactModeToggle} />
                            </div>
                            <p className="text-xs text-gray-500">Compact mode reduces padding and font sizes for smaller displays</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-4">
                    <Button variant="outline" onClick={onClose} className="flex items-center space-x-2">
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                    </Button>

                    <Button onClick={onClose} className="flex items-center space-x-2">
                        <Save className="h-4 w-4" />
                        <span>Apply</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
