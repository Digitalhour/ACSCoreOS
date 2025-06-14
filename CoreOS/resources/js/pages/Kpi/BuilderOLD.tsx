import { BlankModule } from '@/components/blank-module';
import { DataTable } from '@/components/data-table';
import { DataTableConfigModal } from '@/components/data-table-config';
import { GridConfigurator } from '@/components/grid-configurator';
import { GridSlot } from '@/components/grid-slot';
import { ModuleSelectorModal } from '@/components/module-selector-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

import axios from 'axios';
import { Database, Eye, EyeOff, Grid3X3, Plus, Settings } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'KPI', href: '/kpi' },
    { title: 'Builder', href: '/kpi/builder' },
];

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
}

interface DataTableData {
    id: string;
    title: string;
    config: DataTableConfig;
    data?: any[];
    loading?: boolean;
    totalRecords?: number;
    currentPage?: number;
    slotId?: string;
    colSpan?: number;
    rowSpan?: number;
}

interface KpiBuilderProps {
    tables: string[];
}

export default function KpiBuilder({ tables }: KpiBuilderProps) {
    const [kpiTitle, setKpiTitle] = useState('Data Analytics');
    const [kpiDescription, setKpiDescription] = useState('Track and analyze your data');
    const [isPublic, setIsPublic] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    const [dataTables, setDataTables] = useState<DataTableData[]>([]);
    const [availableColumns, setAvailableColumns] = useState<Record<string, TableColumn[]>>({});
    const [activeTab, setActiveTab] = useState('overview');
    const [isModuleSelectorOpen, setIsModuleSelectorOpen] = useState(false);
    const [isDataTableConfigOpen, setIsDataTableConfigOpen] = useState(false);
    const [configuringModule, setConfiguringModule] = useState<string | null>(null);
    const [isDashboardSettingsOpen, setIsDashboardSettingsOpen] = useState(false);
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
    const [isGridConfigOpen, setIsGridConfigOpen] = useState(false);
    const [configuringGridModule, setConfiguringGridModule] = useState<{ id: string; type: 'table' } | null>(null);

    // Dynamic grid calculation
    const gridCols = 4;
    const occupiedSlots = dataTables.map((m) => m.slotId).filter(Boolean) as string[];
    const maxRow = occupiedSlots.map((id) => Number(id.split('-')[0])).reduce((mx, r) => Math.max(mx, r), -1);
    const gridRows = Math.max(maxRow + 2, 2);

    const handleConfigureGrid = (moduleId: string, type: 'table') => {
        setConfiguringGridModule({ id: moduleId, type });
        setIsGridConfigOpen(true);
    };

    const updateModuleGrid = (moduleId: string, updates: any) => {
        updateDataTable(moduleId, updates);
    };

    // Generate grid slots
    const generateGridSlots = () => {
        const slots = [];
        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const slotId = `${row}-${col}`;
                slots.push(slotId);
            }
        }
        return slots;
    };

    // Check if slot is occupied
    const isSlotOccupied = (slotId: string) => {
        return dataTables.some((table) => table.slotId === slotId);
    };

    // Get module in slot
    const getModuleInSlot = (slotId: string) => {
        const dataTable = dataTables.find((table) => table.slotId === slotId);
        if (dataTable) {
            return { type: 'table', module: dataTable };
        }
        return null;
    };

    // Check if slot should be hidden (covered by spanning module)
    const isSlotCovered = (slotId: string) => {
        const [row, col] = slotId.split('-').map(Number);

        for (const table of dataTables) {
            if (!table.slotId) continue;
            const [tableRow, tableCol] = table.slotId.split('-').map(Number);
            const colSpan = table.colSpan || 2;
            const rowSpan = table.rowSpan || 1;

            if (
                tableRow <= row &&
                row < tableRow + rowSpan &&
                tableCol <= col &&
                col < tableCol + colSpan &&
                !(tableRow === row && tableCol === col)
            ) {
                return true;
            }
        }

        return false;
    };

    // Determine max colspan for a slot
    const getMaxColSpan = (slotId: string) => {
        const [row, start] = slotId.split('-').map(Number);
        let span = 0;
        for (let col = start; col < gridCols; col++) {
            const id = `${row}-${col}`;
            if (isSlotCovered(id) || getModuleInSlot(id)) break;
            span++;
        }
        return Math.max(span, 1);
    };

    const addNewCard = (slotId?: string) => {
        setSelectedSlotId(slotId || null);
        setIsModuleSelectorOpen(true);
    };

    const handleModuleSelect = (moduleId: string) => {
        const slotId = selectedSlotId || `slot-${Date.now()}`;
        const maxColSpan = selectedSlotId ? getMaxColSpan(selectedSlotId) : 1;

        if (moduleId === 'data-table') {
            const newDataTable: DataTableData = {
                id: Date.now().toString(),
                title: 'New Data Table',
                config: {
                    table: '',
                    columns: [],
                    pageSize: 10,
                    searchable: true,
                    exportable: true,
                    tableHeight: 400,
                },
                loading: false,
                totalRecords: 0,
                currentPage: 1,
                slotId: slotId,
                colSpan: Math.min(maxColSpan, 2),
                rowSpan: 1,
            };
            setDataTables([...dataTables, newDataTable]);
            setConfiguringModule(newDataTable.id);
            setIsDataTableConfigOpen(true);
        }
        setSelectedSlotId(null);
        setIsModuleSelectorOpen(false);
    };

    const handleConfigureModule = (moduleId: string) => {
        setConfiguringModule(moduleId);
        setIsDataTableConfigOpen(true);
    };

    const handleDeleteModule = (moduleId: string) => {
        setDataTables(dataTables.filter((table) => table.id !== moduleId));
        if (configuringModule === moduleId) {
            setConfiguringModule(null);
            setIsDataTableConfigOpen(false);
        }
    };

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

    const togglePreview = () => {
        setPreviewMode(!previewMode);
    };

    const updateDataTable = (tableId: string, updates: Partial<DataTableData>) => {
        setDataTables(dataTables.map((table) => (table.id === tableId ? { ...table, ...updates } : table)));
    };

    const handleDeleteDataTable = (tableId: string) => {
        setDataTables(dataTables.filter((table) => table.id !== tableId));
        if (configuringModule === tableId) {
            setConfiguringModule(null);
            setIsDataTableConfigOpen(false);
        }
    };

    const handleLoadDataTablePreview = async (module: DataTableData) => {
        try {
            updateDataTable(module.id, { loading: true });

            const response = await axios.post('/api/data-table/preview', {
                table: module.config.table,
                columns: module.config.columns.map((col) => col.key),
                pageSize: module.config.pageSize,
                page: module.currentPage || 1,
                orderBy: module.config.orderBy || null,
                orderDirection: module.config.orderDirection || 'asc',
                whereClause: module.config.whereClause || null,
            });

            updateDataTable(module.id, {
                data: response.data.data,
                totalRecords: response.data.total,
                loading: false,
            });
        } catch (error) {
            console.error('Failed to load data table preview:', error);
            updateDataTable(module.id, { loading: false });
        }
    };

    const handleDataTablePageChange = async (tableId: string, page: number) => {
        const table = dataTables.find((t) => t.id === tableId);
        if (!table) return;

        updateDataTable(tableId, { currentPage: page, loading: true });

        try {
            const response = await axios.post('/api/data-table/preview', {
                table: table.config.table,
                columns: table.config.columns.map((col) => col.key),
                pageSize: table.config.pageSize,
                page: page,
                orderBy: table.config.orderBy || null,
                orderDirection: table.config.orderDirection || 'asc',
                whereClause: table.config.whereClause || null,
            });

            updateDataTable(tableId, {
                data: response.data.data,
                totalRecords: response.data.total,
                currentPage: page,
                loading: false,
            });
        } catch (error) {
            console.error('Failed to load page:', error);
            updateDataTable(tableId, { loading: false, currentPage: table.currentPage });
        }
    };

    const renderDataTable = (table: DataTableData, isPreview = false) => {
        if (!table.config.table || table.config.columns.length === 0) {
            return (
                <BlankModule title={table.title} onConfigure={() => handleConfigureModule(table.id)} onDelete={() => handleDeleteModule(table.id)} />
            );
        }

        return (
            <div className="group relative">
                <DataTable
                    title={table.title}
                    data={table.data || []}
                    columns={table.config.columns.filter((col) => col.visible)}
                    pageSize={table.config.pageSize}
                    searchable={table.config.searchable}
                    exportable={table.config.exportable}
                    loading={table.loading}
                    totalRecords={table.totalRecords || 0}
                    currentPage={table.currentPage || 1}
                    onPageChange={(page) => handleDataTablePageChange(table.id, page)}
                    onClick={isPreview ? undefined : () => handleConfigureModule(table.id)}
                    tableHeight={table.config.tableHeight}
                />
                {!isPreview && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-14 right-4 z-10 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleConfigureGrid(table.id, 'table');
                        }}
                    >
                        <Grid3X3 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Data Table Builder" />

            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Data Table Builder</h2>
                        <p className="text-muted-foreground">Create and customize your data analytics dashboard</p>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="flex items-center gap-1.5 px-2 py-1">
                                <Database className="h-3 w-3" />
                                <span className="text-xs">Data Sources: {tables.length}</span>
                            </Badge>

                            <Badge variant="outline" className="flex items-center gap-1.5 px-2 py-1">
                                <Database className="h-3 w-3" />
                                <span className="text-xs">Total Tables: {dataTables.length}</span>
                            </Badge>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setIsDashboardSettingsOpen(true)} className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Settings
                        </Button>
                        <Button variant="outline" size="sm" onClick={addNewCard} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Table
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('data')} className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Data Sources
                        </Button>
                        <Button variant="outline" size="sm" onClick={togglePreview} className="flex items-center gap-2">
                            {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {previewMode ? 'Edit' : 'Preview'}
                        </Button>
                        <Button>Save Dashboard</Button>
                    </div>
                </div>

                <Tabs value={previewMode ? 'preview' : activeTab} onValueChange={setActiveTab} className="space-y-4">
                    {!previewMode && (
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="data">Data Sources</TabsTrigger>
                        </TabsList>
                    )}

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Data Tables</CardTitle>
                                <CardDescription>
                                    Your configured data tables. Click on a table to edit its configuration and customize its appearance.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {/* Grid Layout */}
                                    <div
                                        className="grid gap-4"
                                        style={{
                                            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                                            gridTemplateRows: `repeat(${gridRows}, minmax(120px, auto))`,
                                        }}
                                    >
                                        {generateGridSlots().map((slotId) => {
                                            if (isSlotCovered(slotId)) {
                                                return null;
                                            }

                                            const moduleInSlot = getModuleInSlot(slotId);

                                            if (moduleInSlot) {
                                                const { module } = moduleInSlot;
                                                return (
                                                    <GridSlot
                                                        key={slotId}
                                                        slotId={slotId}
                                                        isOccupied={true}
                                                        colSpan={module.colSpan || 1}
                                                        rowSpan={module.rowSpan || 1}
                                                        onAddModule={() => {}}
                                                    >
                                                        <div
                                                            className="cursor-pointer transition-all hover:scale-105"
                                                            style={{
                                                                gridRow: module.rowSpan && module.rowSpan > 1 ? `span ${module.rowSpan}` : undefined,
                                                            }}
                                                        >
                                                            {renderDataTable(module as DataTableData)}
                                                        </div>
                                                    </GridSlot>
                                                );
                                            }

                                            return (
                                                <GridSlot
                                                    key={slotId}
                                                    slotId={slotId}
                                                    isOccupied={false}
                                                    onAddModule={(slotId) => addNewCard(slotId)}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Data Sources Tab */}
                    <TabsContent value="data" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Database className="h-5 w-5" />
                                    <span>Data Sources</span>
                                </CardTitle>
                                <CardDescription>Available tables and columns from your acsdatawarehouse database.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Badge variant="outline" className="px-3 py-1">
                                            Connected: acsdatawarehouse
                                        </Badge>
                                        <Badge variant="secondary">{tables.length} tables available</Badge>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {tables.map((table) => (
                                            <Card key={table} className="border-muted">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="flex items-center space-x-2 text-sm">
                                                        <Database className="h-4 w-4" />
                                                        <span>{table}</span>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-0">
                                                    <Button variant="outline" size="sm" onClick={() => loadTableColumns(table)} className="w-full">
                                                        View Columns
                                                    </Button>
                                                    {availableColumns[table] && (
                                                        <div className="mt-3 space-y-1">
                                                            <p className="text-muted-foreground text-xs font-medium">
                                                                {availableColumns[table].length} columns
                                                            </p>
                                                            <div className="max-h-32 space-y-1 overflow-y-auto">
                                                                {availableColumns[table].slice(0, 5).map((column) => (
                                                                    <div key={column.name} className="flex items-center justify-between text-xs">
                                                                        <span>{column.name}</span>
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {column.type.split('(')[0]}
                                                                        </Badge>
                                                                    </div>
                                                                ))}
                                                                {availableColumns[table].length > 5 && (
                                                                    <p className="text-muted-foreground text-xs">
                                                                        +{availableColumns[table].length - 5} more columns
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Preview Tab */}
                    <TabsContent value="preview" className="space-y-4">
                        <div className="space-y-6">
                            {/* Dashboard Header */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h1 className="text-3xl font-bold tracking-tight">{kpiTitle}</h1>
                                    {isPublic && (
                                        <Badge variant="secondary" className="flex items-center space-x-1">
                                            <Eye className="h-3 w-3" />
                                            <span>Public</span>
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-muted-foreground">{kpiDescription}</p>
                            </div>

                            {/* Data Tables Grid */}
                            {dataTables.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="grid gap-4">
                                        {dataTables.map((table) => (
                                            <div key={table.id}>{renderDataTable(table, true)}</div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-24">
                                        <Database className="text-muted-foreground h-16 w-16 opacity-50" />
                                        <h3 className="mt-4 text-xl font-semibold">No data tables to display</h3>
                                        <p className="text-muted-foreground mt-2 max-w-sm text-center">
                                            Your dashboard preview will appear here once you add and configure data tables.
                                        </p>
                                        <Button
                                            onClick={() => {
                                                setPreviewMode(false);
                                                setActiveTab('overview');
                                            }}
                                            className="mt-6"
                                            variant="outline"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Data Tables
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Module Selector Modal */}
                <ModuleSelectorModal
                    isOpen={isModuleSelectorOpen}
                    onClose={() => setIsModuleSelectorOpen(false)}
                    onSelectModule={handleModuleSelect}
                />

                {/* Data Table Configuration Modal */}
                <DataTableConfigModal
                    isOpen={isDataTableConfigOpen}
                    onClose={() => {
                        setIsDataTableConfigOpen(false);
                        setConfiguringModule(null);
                    }}
                    module={configuringModule ? dataTables.find((table) => table.id === configuringModule) || null : null}
                    tables={tables}
                    availableColumns={availableColumns}
                    onLoadTableColumns={loadTableColumns}
                    onUpdateModule={updateDataTable}
                    onDeleteModule={handleDeleteDataTable}
                    onLoadPreview={handleLoadDataTablePreview}
                />

                {/* Grid Configuration Modal */}
                <GridConfigurator
                    isOpen={isGridConfigOpen}
                    onClose={() => {
                        setIsGridConfigOpen(false);
                        setConfiguringGridModule(null);
                    }}
                    moduleId={configuringGridModule?.id || ''}
                    moduleType="table"
                    currentColSpan={(() => {
                        if (!configuringGridModule) return 1;
                        const module = dataTables.find((t) => t.id === configuringGridModule.id);
                        return module?.colSpan || 1;
                    })()}
                    currentRowSpan={(() => {
                        if (!configuringGridModule) return 1;
                        const module = dataTables.find((t) => t.id === configuringGridModule.id);
                        return module?.rowSpan || 1;
                    })()}
                    maxCols={gridCols}
                    onUpdateModule={updateModuleGrid}
                />

                {/* Dashboard Settings Modal */}
                <Dialog open={isDashboardSettingsOpen} onOpenChange={setIsDashboardSettingsOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <div className="flex items-center space-x-3">
                                <div className="bg-primary/10 rounded-lg p-2">
                                    <Settings className="text-primary h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl">Dashboard Settings</DialogTitle>
                                    <DialogDescription>Configure your dashboard title, description and visibility.</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="modal-title">Dashboard Title</Label>
                                <Input
                                    id="modal-title"
                                    value={kpiTitle}
                                    onChange={(e) => setKpiTitle(e.target.value)}
                                    placeholder="Enter dashboard title"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="modal-description">Description</Label>
                                <Textarea
                                    id="modal-description"
                                    value={kpiDescription}
                                    onChange={(e) => setKpiDescription(e.target.value)}
                                    placeholder="Enter dashboard description"
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch id="modal-public" checked={isPublic} onCheckedChange={setIsPublic} />
                                <Label htmlFor="modal-public">Make dashboard public</Label>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" onClick={() => setIsDashboardSettingsOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
