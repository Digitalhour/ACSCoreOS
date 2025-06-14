import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BarChart3, Eye, Save, Trash2, X } from 'lucide-react';
import { KpiCard } from './kpi-card';

interface TableColumn {
    name: string;
    type: string;
    nullable: boolean;
    key: string;
}

interface DataSource {
    table: string;
    column: string;
    aggregation: 'sum' | 'count' | 'avg' | 'max' | 'min';
    customDays?: number;
    comparisonEnabled?: boolean;
    comparisonPeriod?: 'previous_period' | 'same_period_last_year';
    showChart?: boolean;
    chartType?: 'line' | 'area' | 'bar';
    showDollarSign?: boolean;
}

interface KpiCardData {
    comparisonChartData: number[] | undefined;
    id: string;
    title: string;
    source: DataSource;
    value?: string | number;
    change?: number;
    chartData?: number[];
}

interface ModuleConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    module: KpiCardData | null;
    tables: string[];
    availableColumns: Record<string, TableColumn[]>;
    onLoadTableColumns: (tableName: string) => void;
    onUpdateModule: (moduleId: string, updates: Partial<KpiCardData>) => void;
    onDeleteModule: (moduleId: string) => void;
    onLoadPreview: (module: KpiCardData) => void;
}

export function ModuleConfigModal({
    isOpen,
    onClose,
    module,
    tables,
    availableColumns,
    onLoadTableColumns,
    onUpdateModule,
    onDeleteModule,
    onLoadPreview,
}: ModuleConfigModalProps) {
    if (!module) return null;

    const defaultSource: DataSource = {
        table: '',
        column: '',
        aggregation: 'sum',
        customDays: 30,
        comparisonEnabled: true,
        comparisonPeriod: 'previous_period',
        showChart: false,
        chartType: 'line',
        showDollarSign: false,
    };

    const currentSource = module.source || defaultSource;

    const updateSource = (updates: Partial<DataSource>) => {
        onUpdateModule(module.id, {
            source: { ...currentSource, ...updates },
        });
    };

    const handleSaveAndClose = () => {
        onClose();
    };

    const handleDelete = () => {
        onDeleteModule(module.id);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-primary/10 rounded-lg p-2">
                                <BarChart3 className="text-primary h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">Configure KPI Module</DialogTitle>
                                <DialogDescription>Set up your data source</DialogDescription>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex gap-6">
                    {/* Configuration Panel */}
                    <div className="flex-1">
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-6 pr-4">
                                {/* Basic Settings */}
                                <div className="space-y-4">
                                    <Label className="text-base font-medium">Basic Settings</Label>

                                    <div>
                                        <Label htmlFor="module-title">Module Title</Label>
                                        <Input
                                            id="module-title"
                                            value={module.title}
                                            onChange={(e) => onUpdateModule(module.id, { title: e.target.value })}
                                            placeholder="Enter module title"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                {/* Data Source */}
                                <div className="space-y-4">
                                    <Label className="text-base font-medium">Data Source</Label>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <Label>Table</Label>
                                            <Select
                                                value={currentSource.table}
                                                onValueChange={(value) => {
                                                    updateSource({ table: value, column: '' });
                                                    onLoadTableColumns(value);
                                                }}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Select table" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tables.map((table) => (
                                                        <SelectItem key={table} value={table}>
                                                            {table}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label>Aggregation</Label>
                                            <Select
                                                value={currentSource.aggregation}
                                                onValueChange={(value: any) => updateSource({ aggregation: value })}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sum">Sum</SelectItem>
                                                    <SelectItem value="count">Count</SelectItem>
                                                    <SelectItem value="avg">Average</SelectItem>
                                                    <SelectItem value="max">Maximum</SelectItem>
                                                    <SelectItem value="min">Minimum</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {currentSource.aggregation === 'sum' && (
                                        <>
                                            <div>
                                                <Label>Date Range (Days)</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="365"
                                                    value={currentSource.customDays || 30}
                                                    onChange={(e) => updateSource({ customDays: parseInt(e.target.value) || 30 })}
                                                    placeholder="Enter number of days"
                                                    className="mt-1"
                                                />
                                                <p className="mt-1 text-xs text-gray-500">Last {currentSource.customDays || 30} days</p>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label>Enable Comparison</Label>
                                                    <Switch
                                                        checked={currentSource.comparisonEnabled || false}
                                                        onCheckedChange={(checked) => updateSource({ comparisonEnabled: checked })}
                                                    />
                                                </div>

                                                {currentSource.comparisonEnabled && (
                                                    <div>
                                                        <Label>Compare To</Label>
                                                        <Select
                                                            value={currentSource.comparisonPeriod || 'previous_period'}
                                                            onValueChange={(value: any) => updateSource({ comparisonPeriod: value })}
                                                        >
                                                            <SelectTrigger className="mt-1">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="previous_period">Previous Period</SelectItem>
                                                                <SelectItem value="same_period_last_year">Same Period Last Year</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label>Show Chart</Label>
                                                    <Switch
                                                        checked={currentSource.showChart || false}
                                                        onCheckedChange={(checked) => updateSource({ showChart: checked })}
                                                    />
                                                </div>

                                                {currentSource.showChart && (
                                                    <div>
                                                        <Label>Chart Type</Label>
                                                        <Select
                                                            value={currentSource.chartType || 'line'}
                                                            onValueChange={(value: any) => updateSource({ chartType: value })}
                                                        >
                                                            <SelectTrigger className="mt-1">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="line">Line Chart</SelectItem>
                                                                <SelectItem value="area">
                                                                    {currentSource.comparisonEnabled ? 'Area Chart - Stacked' : 'Area Chart'}
                                                                </SelectItem>
                                                                <SelectItem value="bar">Bar Chart</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label>Show Dollar Sign</Label>
                                                <Switch
                                                    checked={currentSource.showDollarSign || false}
                                                    onCheckedChange={(checked) => updateSource({ showDollarSign: checked })}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {currentSource.table && (
                                        <div>
                                            <Label>Column</Label>
                                            <Select value={currentSource.column} onValueChange={(value) => updateSource({ column: value })}>
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder="Select column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(availableColumns[currentSource.table] || []).map((column) => (
                                                        <SelectItem key={column.name} value={column.name}>
                                                            <div className="flex w-full items-center justify-between">
                                                                <span>{column.name}</span>
                                                                <span className="ml-2 text-xs text-gray-500">{column.type.split('(')[0]}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {currentSource.table && currentSource.column && (
                                        <div className="pt-4">
                                            <Button onClick={() => onLoadPreview(module)} variant="outline" className="w-full">
                                                <Eye className="mr-2 h-4 w-4" />
                                                Load Preview Data
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Live Preview Panel */}
                    <div className="w-80 border-l pl-6">
                        <Label className="mb-4 block text-base font-medium">Live Preview</Label>

                        <KpiCard
                            title={module.title || 'KPI Title'}
                            value={module.value || '125,000'}
                            change={currentSource.comparisonEnabled ? module.change : undefined}
                            changeLabel={currentSource.comparisonPeriod === 'previous_period' ? 'from previous period' : 'from same period last year'}
                            chartData={module.chartData || [55, 60, 45, 65, 70, 80, 85]}
                            comparisonData={module.comparisonChartData}
                            showChart={currentSource.showChart}
                            chartType={currentSource.chartType}
                            showDollarSign={currentSource.showDollarSign}
                        />

                        <div className="mt-4 space-y-1 text-xs text-gray-500">
                            <div>
                                <strong>Configuration:</strong>
                            </div>
                            <div>Table: {currentSource.table || 'Not selected'}</div>
                            <div>Column: {currentSource.column || 'Not selected'}</div>
                            <div>Aggregation: {currentSource.aggregation}</div>
                            {currentSource.aggregation === 'sum' && (
                                <>
                                    <div>Date Range: {currentSource.customDays || 30} days</div>
                                    <div>Comparison: {currentSource.comparisonEnabled ? 'Enabled' : 'Disabled'}</div>
                                    {currentSource.comparisonEnabled && (
                                        <div>
                                            Compare To:{' '}
                                            {currentSource.comparisonPeriod === 'previous_period' ? 'Previous Period' : 'Same Period Last Year'}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between border-t pt-4">
                    <Button variant="outline" onClick={onClose} className="flex items-center space-x-2">
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                    </Button>

                    <Button
                        onClick={handleSaveAndClose}
                        disabled={!currentSource.table || !currentSource.column}
                        className="flex items-center space-x-2"
                    >
                        <Save className="h-4 w-4" />
                        <span>Save & Close</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
