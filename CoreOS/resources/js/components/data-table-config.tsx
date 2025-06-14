import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Eye, Plus, Save, Table, Trash2, X } from 'lucide-react';
import { DataTable } from './data-table';

interface TableColumn {
    name: string;
    type: string;
    nullable: boolean;
    key: string;
}

interface DataTableColumn {
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    sortable: boolean;
    visible: boolean;
}

interface DataTableConfig {
    table: string;
    columns: DataTableColumn[];
    pageSize: number;
    searchable: boolean;
    exportable: boolean;
    tableHeight?: number;
    whereClause?: string;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
}

interface DataTableData {
    id: string;
    title: string;
    config: DataTableConfig;
    data?: any[];
    loading?: boolean;
}

interface DataTableConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    module: DataTableData | null;
    tables: string[];
    availableColumns: Record<string, TableColumn[]>;
    onLoadTableColumns: (tableName: string) => void;
    onUpdateModule: (moduleId: string, updates: Partial<DataTableData>) => void;
    onDeleteModule: (moduleId: string) => void;
    onLoadPreview: (module: DataTableData) => void;
}

export function DataTableConfigModal({
    isOpen,
    onClose,
    module,
    tables,
    availableColumns,
    onLoadTableColumns,
    onUpdateModule,
    onDeleteModule,
    onLoadPreview,
}: DataTableConfigModalProps) {
    if (!module) return null;

    const defaultConfig: DataTableConfig = {
        table: '',
        columns: [],
        pageSize: 10,
        searchable: true,
        exportable: true,
        tableHeight: 400,
    };

    const currentConfig = module.config || defaultConfig;

    const updateConfig = (updates: Partial<DataTableConfig>) => {
        onUpdateModule(module.id, {
            config: { ...currentConfig, ...updates },
        });
    };

    const handleTableChange = (tableName: string) => {
        onLoadTableColumns(tableName);
        const tableColumns = availableColumns[tableName] || [];
        const dataTableColumns: DataTableColumn[] = tableColumns.slice(0, 5).map((col) => ({
            key: col.name,
            label: col.name.charAt(0).toUpperCase() + col.name.slice(1),
            type: getColumnType(col.type),
            sortable: true,
            visible: true,
        }));

        updateConfig({
            table: tableName,
            columns: dataTableColumns,
        });
    };

    const getColumnType = (sqlType: string): 'string' | 'number' | 'date' | 'boolean' => {
        const type = sqlType.toLowerCase();
        if (type.includes('int') || type.includes('decimal') || type.includes('float') || type.includes('double')) {
            return 'number';
        }
        if (type.includes('date') || type.includes('timestamp')) {
            return 'date';
        }
        if (type.includes('bool') || type.includes('tinyint(1)')) {
            return 'boolean';
        }
        return 'string';
    };

    const addColumn = () => {
        const tableColumns = availableColumns[currentConfig.table] || [];
        const usedKeys = currentConfig.columns.map((col) => col.key);
        const availableColumn = tableColumns.find((col) => !usedKeys.includes(col.name));

        if (availableColumn) {
            const newColumn: DataTableColumn = {
                key: availableColumn.name,
                label: availableColumn.name.charAt(0).toUpperCase() + availableColumn.name.slice(1),
                type: getColumnType(availableColumn.type),
                sortable: true,
                visible: true,
            };

            updateConfig({
                columns: [...currentConfig.columns, newColumn],
            });
        }
    };

    const removeColumn = (index: number) => {
        const newColumns = currentConfig.columns.filter((_, i) => i !== index);
        updateConfig({ columns: newColumns });
    };

    const updateColumn = (index: number, updates: Partial<DataTableColumn>) => {
        const newColumns = currentConfig.columns.map((col, i) => (i === index ? { ...col, ...updates } : col));
        updateConfig({ columns: newColumns });
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
            <DialogContent className="max-w-7xl">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-primary/10 rounded-lg p-2">
                                <Table className="text-primary h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">Configure Data Table</DialogTitle>
                                <DialogDescription>Set up your data table configuration</DialogDescription>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex gap-4">
                    {/* Configuration Panel */}
                    <div className="flex-1">
                        <ScrollArea className="h-[500px]">
                            <div className="space-y-6 pr-4">
                                {/* Basic Settings */}
                                <div className="space-y-4">
                                    <Label className="text-base font-medium">Basic Settings</Label>

                                    <div>
                                        <Label htmlFor="module-title">Table Title</Label>
                                        <Input
                                            id="module-title"
                                            value={module.title}
                                            onChange={(e) => onUpdateModule(module.id, { title: e.target.value })}
                                            placeholder="Enter table title"
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label>Data Source Table</Label>
                                        <Select value={currentConfig.table} onValueChange={handleTableChange}>
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
                                </div>

                                {/* Columns Configuration */}
                                {currentConfig.table && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base font-medium">Columns ({currentConfig.columns.length})</Label>
                                            <Button onClick={addColumn} size="sm" variant="outline">
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Column
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {currentConfig.columns.map((column, index) => (
                                                <div key={index} className="space-y-3 rounded-lg border p-4">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-sm font-medium">Column {index + 1}</Label>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeColumn(index)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>

                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <div>
                                                            <Label>Database Column</Label>
                                                            <Select value={column.key} onValueChange={(value) => updateColumn(index, { key: value })}>
                                                                <SelectTrigger className="mt-1">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {(availableColumns[currentConfig.table] || []).map((col) => (
                                                                        <SelectItem key={col.name} value={col.name}>
                                                                            {col.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div>
                                                            <Label>Display Label</Label>
                                                            <Input
                                                                value={column.label}
                                                                onChange={(e) => updateColumn(index, { label: e.target.value })}
                                                                className="mt-1"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-3 sm:grid-cols-3">
                                                        <div>
                                                            <Label>Type</Label>
                                                            <Select
                                                                value={column.type}
                                                                onValueChange={(value: any) => updateColumn(index, { type: value })}
                                                            >
                                                                <SelectTrigger className="mt-1">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="string">Text</SelectItem>
                                                                    <SelectItem value="number">Number</SelectItem>
                                                                    <SelectItem value="date">Date</SelectItem>
                                                                    <SelectItem value="boolean">Boolean</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-6">
                                                            <Label>Sortable</Label>
                                                            <Switch
                                                                checked={column.sortable}
                                                                onCheckedChange={(checked) => updateColumn(index, { sortable: checked })}
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-between pt-6">
                                                            <Label>Visible</Label>
                                                            <Switch
                                                                checked={column.visible}
                                                                onCheckedChange={(checked) => updateColumn(index, { visible: checked })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Display Options */}
                                <div className="space-y-4">
                                    <Label className="text-base font-medium">Display Options</Label>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label>Page Size</Label>
                                            <Select
                                                value={currentConfig.pageSize.toString()}
                                                onValueChange={(value) => updateConfig({ pageSize: parseInt(value) })}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="5">5 rows</SelectItem>
                                                    <SelectItem value="10">10 rows</SelectItem>
                                                    <SelectItem value="25">25 rows</SelectItem>
                                                    <SelectItem value="50">50 rows</SelectItem>
                                                    <SelectItem value="100">100 rows</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label>Table Height</Label>
                                            <Select
                                                value={currentConfig.tableHeight?.toString() || '400'}
                                                onValueChange={(value) => updateConfig({ tableHeight: parseInt(value) })}
                                            >
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="300">Small (300px)</SelectItem>
                                                    <SelectItem value="400">Medium (400px)</SelectItem>
                                                    <SelectItem value="500">Large (500px)</SelectItem>
                                                    <SelectItem value="600">Extra Large (600px)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Enable Search</Label>
                                            <Switch
                                                checked={currentConfig.searchable}
                                                onCheckedChange={(checked) => updateConfig({ searchable: checked })}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <Label>Enable Export</Label>
                                            <Switch
                                                checked={currentConfig.exportable}
                                                onCheckedChange={(checked) => updateConfig({ exportable: checked })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Live Preview Panel */}
                    <div className="w-2/4 border-l pl-6">
                        <Label className="mb-4 block text-base font-medium">Live Preview</Label>

                        <div className="rounded-lg border">
                            <DataTable
                                title={module.title || 'Data Table'}
                                data={module.data || []}
                                columns={currentConfig.columns.filter((col) => col.visible)}
                                pageSize={Math.min(currentConfig.pageSize, 5)}
                                searchable={currentConfig.searchable}
                                exportable={currentConfig.exportable}
                                loading={module.loading}
                                tableHeight={currentConfig.tableHeight}
                            />
                            {/* Preview Button */}
                            {currentConfig.table && currentConfig.columns.length > 0 && (
                                <div className="pt-4">
                                    <Button onClick={() => onLoadPreview(module)} variant="outline" className="w-full">
                                        <Eye className="mr-2 h-4 w-4" />
                                        Load Preview Data
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 space-y-1 text-xs text-gray-500">
                            <div>
                                <strong>Configuration:</strong>
                            </div>
                            <div>Table: {currentConfig.table || 'Not selected'}</div>
                            <div>Columns: {currentConfig.columns.length}</div>
                            <div>Page Size: {currentConfig.pageSize}</div>
                            <div>Height: {currentConfig.tableHeight || 400}px</div>
                            <div>Search: {currentConfig.searchable ? 'Enabled' : 'Disabled'}</div>
                            <div>Export: {currentConfig.exportable ? 'Enabled' : 'Disabled'}</div>
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
                        disabled={!currentConfig.table || currentConfig.columns.length === 0}
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
