import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Database, Eye, Layout, Palette, Plus, Save, Settings, Trash2, TrendingDown, TrendingUp, Type, X } from 'lucide-react';
import { useState } from 'react';

// Simple chart component for the preview (fallback if KpiChart import fails)
function SimpleChart({ data, type, color, height }: { data: number[]; type: string; color: string; height: number }) {
    if (type === 'bar') {
        const max = Math.max(...data);
        const barWidth = 100 / data.length - 2;
        return (
            <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100" preserveAspectRatio="none">
                {data.map((value, index) => (
                    <rect
                        key={index}
                        x={index * (100 / data.length) + 1}
                        y={100 - (value / max) * 90}
                        width={barWidth}
                        height={(value / max) * 90}
                        fill={color}
                        rx="1"
                    />
                ))}
            </svg>
        );
    }

    if (type === 'radial') {
        const percentage = (data[0] / Math.max(...data)) * 100;
        const circumference = 2 * Math.PI * 30;
        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

        return (
            <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="30" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                    cx="50"
                    cy="50"
                    r="30"
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                    strokeLinecap="round"
                />
                <text x="50" y="55" textAnchor="middle" fontSize="12" fill={color}>
                    {Math.round(percentage)}%
                </text>
            </svg>
        );
    }

    if (type === 'radar') {
        const centerX = 50;
        const centerY = 50;
        const radius = 35;
        const angleStep = (2 * Math.PI) / data.length;

        const points = data.map((value, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const normalizedValue = value / Math.max(...data);
            const x = centerX + radius * normalizedValue * Math.cos(angle);
            const y = centerY + radius * normalizedValue * Math.sin(angle);
            return `${x},${y}`;
        });

        return (
            <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100">
                {/* Grid lines */}
                {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
                    <polygon
                        key={scale}
                        points={data
                            .map((_, index) => {
                                const angle = index * angleStep - Math.PI / 2;
                                const x = centerX + radius * scale * Math.cos(angle);
                                const y = centerY + radius * scale * Math.sin(angle);
                                return `${x},${y}`;
                            })
                            .join(' ')}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                    />
                ))}
                {/* Axis lines */}
                {data.map((_, index) => {
                    const angle = index * angleStep - Math.PI / 2;
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    return <line key={index} x1={centerX} y1={centerY} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
                })}
                {/* Data area */}
                <polygon points={points.join(' ')} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
                {/* Data points */}
                {points.map((point, index) => {
                    const [x, y] = point.split(',').map(Number);
                    return <circle key={index} cx={x} cy={y} r="2" fill={color} />;
                })}
            </svg>
        );
    }

    if (type === 'pie' || type === 'donut') {
        const total = data.reduce((sum, val) => sum + val, 0);
        let currentAngle = 0;
        const centerX = 50;
        const centerY = 50;
        const radius = type === 'donut' ? 35 : 40;
        const innerRadius = type === 'donut' ? 20 : 0;

        return (
            <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100">
                {data.map((value, index) => {
                    const angle = (value / total) * 360;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + angle;
                    currentAngle += angle;

                    const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
                    const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
                    const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
                    const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

                    const largeArcFlag = angle > 180 ? 1 : 0;

                    const pathData = [`M ${centerX} ${centerY}`, `L ${x1} ${y1}`, `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, 'Z'].join(
                        ' ',
                    );

                    if (type === 'donut') {
                        const ix1 = centerX + innerRadius * Math.cos((startAngle * Math.PI) / 180);
                        const iy1 = centerY + innerRadius * Math.sin((startAngle * Math.PI) / 180);
                        const ix2 = centerX + innerRadius * Math.cos((endAngle * Math.PI) / 180);
                        const iy2 = centerY + innerRadius * Math.sin((endAngle * Math.PI) / 180);

                        const donutPath = [
                            `M ${centerX + innerRadius} ${centerY}`,
                            `L ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                            `L ${ix2} ${iy2}`,
                            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}`,
                            'Z',
                        ].join(' ');

                        return <path key={index} d={donutPath} fill={index === 0 ? color : `hsl(${(index * 60) % 360}, 70%, 50%)`} />;
                    }

                    return <path key={index} d={pathData} fill={index === 0 ? color : `hsl(${(index * 60) % 360}, 70%, 50%)`} />;
                })}
            </svg>
        );
    }

    if (type === 'area') {
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;

        const points = data.map((value, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((value - min) / range) * 100;
            return `${x},${y}`;
        });

        const areaPath = `M 0,100 L ${points.join(' L ')} L 100,100 Z`;

        return (
            <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#areaGradient)" />
                <path d={`M ${points.join(' L ')}`} fill="none" stroke={color} strokeWidth="2" />
            </svg>
        );
    }

    // Default line chart
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
    });

    return (
        <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={`M ${points.join(' L ')}`} fill="none" stroke={color} strokeWidth="2" />
        </svg>
    );
}

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
    dateColumn?: string;
    dateRange?: string;
    label?: string;
    whereClause?: string;
    whereColumn?: string;
    whereOperator?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
    whereValue?: string;
}

interface KpiCardStyle {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    titleColor?: string;
    titleSize?: 'sm' | 'base' | 'lg' | 'xl';
    titleWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    valueColor?: string;
    valueSize?: 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    valueWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    changeColor?: string;
    changeSize?: 'xs' | 'sm' | 'base';
    showIcon?: boolean;
    iconColor?: string;
    showChart?: boolean;
    chartColor?: string;
    chartType?: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radial' | 'radar';
    chartStyle?: 'default' | 'gradient' | 'smooth' | 'stepped';
    chartAnimation?: 'enabled' | 'disabled' | 'slow' | 'fast';
    chartHeight?: number;
    showComparisons?: boolean;
    showSources?: boolean;
    compactMode?: boolean;
    shadowLevel?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

interface KpiCardData {
    id: string;
    title: string;
    sources: DataSource[];
    comparisonMode?: 'difference' | 'percentage' | 'both';
    comparisonType?: 'adjacent' | 'first_vs_all' | 'custom_pairs';
    value?: string | number;
    change?: number;
    chartData?: number[];
    comparison?: any;
    loading?: boolean;
    style?: KpiCardStyle;
    customTitle?: string;
    customSubtitle?: string;
    showSubtitle?: boolean;
}

interface ModuleConfigSheetProps {
    isOpen: boolean;
    onClose: () => void;
    module: KpiCardData | null;
    tables: string[];
    availableColumns: Record<string, TableColumn[]>;
    onLoadTableColumns: (tableName: string) => void;
    onUpdateModule: (moduleId: string, updates: Partial<KpiCardData>) => void;
    onLoadData: (module: KpiCardData) => void;
    onDeleteModule: (moduleId: string) => void;
}

export function ModuleConfigSheet({
    isOpen,
    onClose,
    module,
    tables,
    availableColumns,
    onLoadTableColumns,
    onUpdateModule,
    onLoadData,
    onDeleteModule,
}: ModuleConfigSheetProps) {
    const [activeTab, setActiveTab] = useState('data');
    const [editingElement, setEditingElement] = useState<string | null>(null);

    if (!module) return null;

    // Initialize default style if not present
    const defaultStyle: KpiCardStyle = {
        backgroundColor: 'white',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 8,
        titleColor: '#64748b',
        titleSize: 'sm',
        titleWeight: 'medium',
        valueColor: '#0f172a',
        valueSize: '2xl',
        valueWeight: 'bold',
        changeColor: 'auto',
        changeSize: 'xs',
        showIcon: true,
        iconColor: '#64748b',
        showChart: true,
        chartColor: '#3b82f6',
        chartType: 'line',
        chartStyle: 'default',
        chartAnimation: 'enabled',
        chartHeight: 64,
        showComparisons: true,
        showSources: true,
        compactMode: false,
        shadowLevel: 'sm',
    };

    const currentStyle = { ...defaultStyle, ...module.style };

    const addDataSource = () => {
        const newSource: DataSource = {
            table: '',
            column: '',
            aggregation: 'sum',
            label: `Source ${module.sources.length + 1}`,
        };
        onUpdateModule(module.id, {
            sources: [...module.sources, newSource],
        });
    };

    const removeDataSource = (sourceIndex: number) => {
        if (module.sources.length > 1) {
            const newSources = module.sources.filter((_, index) => index !== sourceIndex);
            onUpdateModule(module.id, { sources: newSources });
        }
    };

    const updateDataSource = (sourceIndex: number, updates: Partial<DataSource>) => {
        const newSources = module.sources.map((source, index) => (index === sourceIndex ? { ...source, ...updates } : source));
        onUpdateModule(module.id, { sources: newSources });
    };

    const updateStyle = (styleUpdates: Partial<KpiCardStyle>) => {
        onUpdateModule(module.id, {
            style: { ...currentStyle, ...styleUpdates },
        });
    };

    const getDateColumns = (tableName: string): TableColumn[] => {
        const columns = availableColumns[tableName] || [];
        return columns.filter(
            (col) =>
                col.type.includes('date') ||
                col.type.includes('timestamp') ||
                col.name.toLowerCase().includes('date') ||
                col.name.toLowerCase().includes('created') ||
                col.name.toLowerCase().includes('updated'),
        );
    };

    const getTextColumns = (tableName: string): TableColumn[] => {
        const columns = availableColumns[tableName] || [];
        return columns.filter(
            (col) => col.type.includes('varchar') || col.type.includes('char') || col.type.includes('text') || col.type.includes('enum'),
        );
    };

    const handleSaveAndClose = () => {
        if (module.sources[0]?.table && module.sources[0]?.column) {
            onLoadData(module);
        }
        onClose();
    };

    const handleDelete = () => {
        onDeleteModule(module.id);
        onClose();
    };

    const handleCardElementClick = (element: string) => {
        setEditingElement(element);
        if (element === 'title' || element === 'subtitle') {
            setActiveTab('appearance');
        } else if (element === 'value' || element === 'change') {
            setActiveTab('data');
        } else if (element === 'chart') {
            setActiveTab('appearance');
        }
    };

    // Mock data for preview
    const mockSources =
        module.sources.length > 0
            ? module.sources.map((source, index) => ({
                  label: source.label || `Source ${index + 1}`,
                  value: 125000 + index * 50000,
                  formatted_value: `$${(125000 + index * 50000).toLocaleString()}`,
                  change: 12.5 - index * 5,
              }))
            : [
                  {
                      label: 'Primary',
                      value: 125000,
                      formatted_value: '$125,000',
                      change: 12.5,
                  },
              ];

    const mockComparison =
        module.sources.length > 1
            ? {
                  display: {
                      value: 15.2,
                      formatted: '15.2%',
                      is_positive: true,
                  },
                  primary_label: mockSources[0].label,
                  secondary_label: mockSources[1].label,
                  comparisons: [
                      {
                          source_a: mockSources[0].label,
                          source_b: mockSources[1].label,
                          value: 15.2,
                          formatted: '15.2%',
                          is_positive: true,
                      },
                  ],
              }
            : undefined;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-7xl">
                <SheetHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-primary/10 rounded-lg p-2">
                                <BarChart3 className="text-primary h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl">Configure KPI Module</SheetTitle>
                                <SheetDescription>Set up your data sources and customize the appearance</SheetDescription>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 gap-6">
                    {/* Configuration Panel */}
                    <div className="flex-1">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="data" className="flex items-center gap-2">
                                    <Database className="h-4 w-4" />
                                    Data Sources
                                </TabsTrigger>
                                <TabsTrigger value="appearance" className="flex items-center gap-2">
                                    <Palette className="h-4 w-4" />
                                    Appearance
                                </TabsTrigger>
                                <TabsTrigger value="layout" className="flex items-center gap-2">
                                    <Layout className="h-4 w-4" />
                                    Layout
                                </TabsTrigger>
                            </TabsList>

                            <ScrollArea className="mt-4 flex-1">
                                <TabsContent value="data" className="mt-0 space-y-6">
                                    {/* Basic Settings */}
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Settings className="text-muted-foreground h-4 w-4" />
                                            <Label className="text-base font-medium">Basic Settings</Label>
                                        </div>

                                        <div className="space-y-3">
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

                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div>
                                                    <Label>Custom Title Override</Label>
                                                    <Input
                                                        value={module.customTitle || ''}
                                                        onChange={(e) => onUpdateModule(module.id, { customTitle: e.target.value })}
                                                        placeholder="Override display title"
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Subtitle</Label>
                                                    <Input
                                                        value={module.customSubtitle || ''}
                                                        onChange={(e) => onUpdateModule(module.id, { customSubtitle: e.target.value })}
                                                        placeholder="Add subtitle"
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>

                                            {module.sources.length > 1 && (
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div>
                                                        <Label>Comparison Mode</Label>
                                                        <Select
                                                            value={module.comparisonMode || 'percentage'}
                                                            onValueChange={(value: any) => onUpdateModule(module.id, { comparisonMode: value })}
                                                        >
                                                            <SelectTrigger className="mt-1">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="percentage">Percentage Difference</SelectItem>
                                                                <SelectItem value="difference">Value Difference</SelectItem>
                                                                <SelectItem value="both">Both</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div>
                                                        <Label>Comparison Type</Label>
                                                        <Select
                                                            value={module.comparisonType || 'adjacent'}
                                                            onValueChange={(value: any) => onUpdateModule(module.id, { comparisonType: value })}
                                                        >
                                                            <SelectTrigger className="mt-1">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="adjacent">Adjacent Sources</SelectItem>
                                                                <SelectItem value="first_vs_all">First vs All Others</SelectItem>
                                                                <SelectItem value="custom_pairs">Custom Pairs</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Data Sources */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Database className="text-muted-foreground h-4 w-4" />
                                                <Label className="text-base font-medium">Data Sources ({module.sources.length})</Label>
                                            </div>
                                            <Button onClick={addDataSource} size="sm" variant="outline" className="h-8">
                                                <Plus className="mr-1 h-3 w-3" />
                                                Add Source
                                            </Button>
                                        </div>

                                        <div className="space-y-4">
                                            {module.sources.map((source, sourceIndex) => (
                                                <Card key={sourceIndex} className="border-muted">
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-sm font-medium">
                                                                    {source.label || `Source ${sourceIndex + 1}`}
                                                                </span>
                                                                <Badge variant={sourceIndex === 0 ? 'default' : 'secondary'} className="text-xs">
                                                                    {sourceIndex === 0 ? 'Primary' : `Source ${sourceIndex + 1}`}
                                                                </Badge>
                                                            </div>
                                                            {module.sources.length > 1 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeDataSource(sourceIndex)}
                                                                    className="text-muted-foreground h-6 w-6 p-0 hover:text-red-500"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div>
                                                            <Label>Source Label</Label>
                                                            <Input
                                                                value={source.label || ''}
                                                                onChange={(e) => updateDataSource(sourceIndex, { label: e.target.value })}
                                                                placeholder={`Source ${sourceIndex + 1} label`}
                                                                className="mt-1"
                                                            />
                                                        </div>

                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                            <div>
                                                                <Label>Table</Label>
                                                                <Select
                                                                    value={source.table}
                                                                    onValueChange={(value) => {
                                                                        updateDataSource(sourceIndex, { table: value, column: '', whereColumn: '' });
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
                                                                    value={source.aggregation}
                                                                    onValueChange={(value: any) =>
                                                                        updateDataSource(sourceIndex, { aggregation: value })
                                                                    }
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

                                                        {source.table && (
                                                            <div>
                                                                <Label>Column</Label>
                                                                <Select
                                                                    value={source.column}
                                                                    onValueChange={(value) => updateDataSource(sourceIndex, { column: value })}
                                                                >
                                                                    <SelectTrigger className="mt-1">
                                                                        <SelectValue placeholder="Select column" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {(availableColumns[source.table] || []).map((column) => (
                                                                            <SelectItem key={column.name} value={column.name}>
                                                                                <div className="flex w-full items-center justify-between">
                                                                                    <span>{column.name}</span>
                                                                                    <Badge variant="outline" className="ml-2 text-xs">
                                                                                        {column.type.split('(')[0]}
                                                                                    </Badge>
                                                                                </div>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}

                                                        {/* Row Filtering */}
                                                        {source.table && getTextColumns(source.table).length > 0 && (
                                                            <div>
                                                                <Label className="text-sm font-medium">Row Filtering (Optional)</Label>
                                                                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                                                                    <div>
                                                                        <Label className="text-xs">Filter Column</Label>
                                                                        <Select
                                                                            value={source.whereColumn || 'none'}
                                                                            onValueChange={(value) =>
                                                                                updateDataSource(sourceIndex, {
                                                                                    whereColumn: value === 'none' ? undefined : value,
                                                                                })
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="mt-1">
                                                                                <SelectValue placeholder="Select column" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="none">No filter</SelectItem>
                                                                                {(availableColumns[source.table] || []).map((column) => (
                                                                                    <SelectItem key={column.name} value={column.name}>
                                                                                        {column.name}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>

                                                                    {source.whereColumn && (
                                                                        <>
                                                                            <div>
                                                                                <Label className="text-xs">Operator</Label>
                                                                                <Select
                                                                                    value={source.whereOperator || '='}
                                                                                    onValueChange={(value: any) =>
                                                                                        updateDataSource(sourceIndex, { whereOperator: value })
                                                                                    }
                                                                                >
                                                                                    <SelectTrigger className="mt-1">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="=">=</SelectItem>
                                                                                        <SelectItem value="!=">!=</SelectItem>
                                                                                        <SelectItem value=">">{'>'}</SelectItem>
                                                                                        <SelectItem value="<"> {'<'}</SelectItem>
                                                                                        <SelectItem value=">=">=</SelectItem>
                                                                                        <SelectItem value="<=">=</SelectItem>
                                                                                        <SelectItem value="LIKE">LIKE</SelectItem>
                                                                                        <SelectItem value="IN">IN</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>

                                                                            <div>
                                                                                <Label className="text-xs">Value</Label>
                                                                                <Input
                                                                                    value={source.whereValue || ''}
                                                                                    onChange={(e) =>
                                                                                        updateDataSource(sourceIndex, { whereValue: e.target.value })
                                                                                    }
                                                                                    placeholder="Filter value"
                                                                                    className="mt-1"
                                                                                />
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Date Filtering */}
                                                        {source.table && getDateColumns(source.table).length > 0 && (
                                                            <div className="grid gap-3 sm:grid-cols-2">
                                                                <div>
                                                                    <Label>Date Column</Label>
                                                                    <Select
                                                                        value={source.dateColumn || 'none'}
                                                                        onValueChange={(value) =>
                                                                            updateDataSource(sourceIndex, {
                                                                                dateColumn: value === 'none' ? undefined : value,
                                                                            })
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="mt-1">
                                                                            <SelectValue placeholder="Select date column" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">No date filter</SelectItem>
                                                                            {getDateColumns(source.table).map((column) => (
                                                                                <SelectItem key={column.name} value={column.name}>
                                                                                    {column.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {source.dateColumn && (
                                                                    <div>
                                                                        <Label>Date Range</Label>
                                                                        <Select
                                                                            value={source.dateRange || '30days'}
                                                                            onValueChange={(value) =>
                                                                                updateDataSource(sourceIndex, { dateRange: value })
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="mt-1">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="7days">Last 7 days</SelectItem>
                                                                                <SelectItem value="30days">Last 30 days</SelectItem>
                                                                                <SelectItem value="90days">Last 90 days</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="appearance" className="mt-0 space-y-6">
                                    {/* Typography */}
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Type className="text-muted-foreground h-4 w-4" />
                                            <Label className="text-base font-medium">Typography</Label>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <Label>Title Size</Label>
                                                <Select
                                                    value={currentStyle.titleSize}
                                                    onValueChange={(value: any) => updateStyle({ titleSize: value })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="sm">Small</SelectItem>
                                                        <SelectItem value="base">Medium</SelectItem>
                                                        <SelectItem value="lg">Large</SelectItem>
                                                        <SelectItem value="xl">Extra Large</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label>Title Weight</Label>
                                                <Select
                                                    value={currentStyle.titleWeight}
                                                    onValueChange={(value: any) => updateStyle({ titleWeight: value })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="normal">Normal</SelectItem>
                                                        <SelectItem value="medium">Medium</SelectItem>
                                                        <SelectItem value="semibold">Semi Bold</SelectItem>
                                                        <SelectItem value="bold">Bold</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label>Value Size</Label>
                                                <Select
                                                    value={currentStyle.valueSize}
                                                    onValueChange={(value: any) => updateStyle({ valueSize: value })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="lg">Large</SelectItem>
                                                        <SelectItem value="xl">Extra Large</SelectItem>
                                                        <SelectItem value="2xl">2X Large</SelectItem>
                                                        <SelectItem value="3xl">3X Large</SelectItem>
                                                        <SelectItem value="4xl">4X Large</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label>Value Weight</Label>
                                                <Select
                                                    value={currentStyle.valueWeight}
                                                    onValueChange={(value: any) => updateStyle({ valueWeight: value })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="normal">Normal</SelectItem>
                                                        <SelectItem value="medium">Medium</SelectItem>
                                                        <SelectItem value="semibold">Semi Bold</SelectItem>
                                                        <SelectItem value="bold">Bold</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Colors */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Colors</Label>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <Label>Title Color</Label>
                                                <Input
                                                    type="color"
                                                    value={currentStyle.titleColor}
                                                    onChange={(e) => updateStyle({ titleColor: e.target.value })}
                                                    className="mt-1 h-10"
                                                />
                                            </div>

                                            <div>
                                                <Label>Value Color</Label>
                                                <Input
                                                    type="color"
                                                    value={currentStyle.valueColor}
                                                    onChange={(e) => updateStyle({ valueColor: e.target.value })}
                                                    className="mt-1 h-10"
                                                />
                                            </div>

                                            <div>
                                                <Label>Chart Color</Label>
                                                <Input
                                                    type="color"
                                                    value={currentStyle.chartColor}
                                                    onChange={(e) => updateStyle({ chartColor: e.target.value })}
                                                    className="mt-1 h-10"
                                                />
                                            </div>

                                            <div>
                                                <Label>Icon Color</Label>
                                                <Input
                                                    type="color"
                                                    value={currentStyle.iconColor}
                                                    onChange={(e) => updateStyle({ iconColor: e.target.value })}
                                                    className="mt-1 h-10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Chart Settings */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Chart Settings</Label>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Show Chart</Label>
                                                <Switch
                                                    checked={currentStyle.showChart}
                                                    onCheckedChange={(checked) => updateStyle({ showChart: checked })}
                                                />
                                            </div>

                                            {currentStyle.showChart && (
                                                <>
                                                    <div>
                                                        <Label>Chart Type</Label>
                                                        <Select
                                                            value={currentStyle.chartType || 'line'}
                                                            onValueChange={(value: any) => updateStyle({ chartType: value })}
                                                        >
                                                            <SelectTrigger className="mt-1">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="line">Line Chart</SelectItem>
                                                                <SelectItem value="area">Area Chart</SelectItem>
                                                                <SelectItem value="bar">Bar Chart</SelectItem>
                                                                <SelectItem value="pie">Pie Chart</SelectItem>
                                                                <SelectItem value="donut">Donut Chart</SelectItem>
                                                                <SelectItem value="radial">Radial Chart</SelectItem>
                                                                <SelectItem value="radar">Radar Chart</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div>
                                                        <Label>Chart Height: {currentStyle.chartHeight}px</Label>
                                                        <Slider
                                                            value={[currentStyle.chartHeight || 64]}
                                                            onValueChange={([value]) => updateStyle({ chartHeight: value })}
                                                            max={200}
                                                            min={32}
                                                            step={8}
                                                            className="mt-2"
                                                        />
                                                    </div>

                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <div>
                                                            <Label>Chart Style</Label>
                                                            <Select
                                                                value={currentStyle.chartStyle || 'default'}
                                                                onValueChange={(value: any) => updateStyle({ chartStyle: value })}
                                                            >
                                                                <SelectTrigger className="mt-1">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="default">Default</SelectItem>
                                                                    <SelectItem value="gradient">Gradient</SelectItem>
                                                                    <SelectItem value="smooth">Smooth</SelectItem>
                                                                    <SelectItem value="stepped">Stepped</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div>
                                                            <Label>Animation</Label>
                                                            <Select
                                                                value={currentStyle.chartAnimation || 'enabled'}
                                                                onValueChange={(value: any) => updateStyle({ chartAnimation: value })}
                                                            >
                                                                <SelectTrigger className="mt-1">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="enabled">Enabled</SelectItem>
                                                                    <SelectItem value="disabled">Disabled</SelectItem>
                                                                    <SelectItem value="slow">Slow</SelectItem>
                                                                    <SelectItem value="fast">Fast</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="layout" className="mt-0 space-y-6">
                                    {/* Card Layout */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Card Layout</Label>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <Label>Border Radius: {currentStyle.borderRadius}px</Label>
                                                <Slider
                                                    value={[currentStyle.borderRadius || 8]}
                                                    onValueChange={([value]) => updateStyle({ borderRadius: value })}
                                                    max={24}
                                                    min={0}
                                                    step={2}
                                                    className="mt-2"
                                                />
                                            </div>

                                            <div>
                                                <Label>Border Width: {currentStyle.borderWidth}px</Label>
                                                <Slider
                                                    value={[currentStyle.borderWidth || 1]}
                                                    onValueChange={([value]) => updateStyle({ borderWidth: value })}
                                                    max={4}
                                                    min={0}
                                                    step={1}
                                                    className="mt-2"
                                                />
                                            </div>

                                            <div>
                                                <Label>Shadow Level</Label>
                                                <Select
                                                    value={currentStyle.shadowLevel}
                                                    onValueChange={(value: any) => updateStyle({ shadowLevel: value })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">None</SelectItem>
                                                        <SelectItem value="sm">Small</SelectItem>
                                                        <SelectItem value="md">Medium</SelectItem>
                                                        <SelectItem value="lg">Large</SelectItem>
                                                        <SelectItem value="xl">Extra Large</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label>Border Color</Label>
                                                <Input
                                                    type="color"
                                                    value={currentStyle.borderColor}
                                                    onChange={(e) => updateStyle({ borderColor: e.target.value })}
                                                    className="mt-1 h-10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Display Options */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Display Options</Label>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Show Icon</Label>
                                                <Switch
                                                    checked={currentStyle.showIcon}
                                                    onCheckedChange={(checked) => updateStyle({ showIcon: checked })}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label>Show Subtitle</Label>
                                                <Switch
                                                    checked={module.showSubtitle}
                                                    onCheckedChange={(checked) => onUpdateModule(module.id, { showSubtitle: checked })}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label>Show Comparisons</Label>
                                                <Switch
                                                    checked={currentStyle.showComparisons}
                                                    onCheckedChange={(checked) => updateStyle({ showComparisons: checked })}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label>Show Sources</Label>
                                                <Switch
                                                    checked={currentStyle.showSources}
                                                    onCheckedChange={(checked) => updateStyle({ showSources: checked })}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Label>Compact Mode</Label>
                                                <Switch
                                                    checked={currentStyle.compactMode}
                                                    onCheckedChange={(checked) => updateStyle({ compactMode: checked })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    </div>

                    {/* Live Preview Panel */}
                    <div className="w-80 border-l pl-6">
                        <div className="sticky top-0">
                            <Label className="mb-4 block text-base font-medium">Live Preview</Label>
                            <div className="space-y-4">
                                <p className="text-muted-foreground text-xs">Click on any part of the card below to edit it directly</p>

                                <div
                                    className="hover:ring-opacity-50 cursor-pointer transition-all hover:ring-2 hover:ring-blue-500"
                                    style={{
                                        borderRadius: `${currentStyle.borderRadius}px`,
                                    }}
                                >
                                    <EnhancedKpiCard
                                        title={module.customTitle || module.title}
                                        subtitle={module.showSubtitle ? module.customSubtitle : undefined}
                                        value={mockSources[0]?.formatted_value || '$0'}
                                        change={mockSources[0]?.change}
                                        chartData={[55, 60, 45, 65, 70, 80, 85]}
                                        comparison={mockComparison}
                                        sources={currentStyle.showSources ? mockSources : undefined}
                                        style={currentStyle}
                                        onElementClick={handleCardElementClick}
                                        editingElement={editingElement}
                                    />
                                </div>

                                {editingElement && (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                        <p className="text-xs font-medium text-blue-900">Editing: {editingElement}</p>
                                        <p className="mt-1 text-xs text-blue-700">Use the controls on the left to customize this element.</p>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingElement(null)} className="mt-2 h-6 text-xs">
                                            Done Editing
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between border-t pt-4">
                    <Button variant="outline" onClick={onClose} className="flex items-center space-x-2">
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                    </Button>

                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => onLoadData(module)}
                            disabled={!module.sources[0]?.table || !module.sources[0]?.column || module.loading}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            {module.loading ? 'Loading...' : 'Preview Data'}
                        </Button>

                        <Button
                            onClick={handleSaveAndClose}
                            disabled={!module.sources[0]?.table || !module.sources[0]?.column}
                            className="flex items-center space-x-2"
                        >
                            <Save className="h-4 w-4" />
                            <span>Save & Close</span>
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

// Enhanced KPI Card component with click handling and styling
interface EnhancedKpiCardProps {
    title: string;
    subtitle?: string;
    value: string | number;
    change?: number;
    chartData?: number[];
    comparison?: any;
    sources?: Array<{
        label: string;
        value: string | number;
        formatted_value: string;
        change?: number;
    }>;
    style: KpiCardStyle;
    onElementClick: (element: string) => void;
    editingElement?: string | null;
}

function EnhancedKpiCard({
    title,
    subtitle,
    value,
    change,
    chartData,
    comparison,
    sources,
    style,
    onElementClick,
    editingElement,
}: EnhancedKpiCardProps) {
    const getShadowClass = (level: 'none' | 'sm' | 'md' | 'lg' | 'xl' | undefined) => {
        switch (level) {
            case 'none':
                return '';
            case 'sm':
                return 'shadow-sm';
            case 'md':
                return 'shadow-md';
            case 'lg':
                return 'shadow-lg';
            case 'xl':
                return 'shadow-xl';
            default:
                return 'shadow-sm';
        }
    };

    const getTitleSizeClass = (size: 'sm' | 'base' | 'lg' | 'xl' | undefined) => {
        switch (size) {
            case 'sm':
                return 'text-sm';
            case 'base':
                return 'text-base';
            case 'lg':
                return 'text-lg';
            case 'xl':
                return 'text-xl';
            default:
                return 'text-sm';
        }
    };

    const getValueSizeClass = (size: 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | undefined) => {
        switch (size) {
            case 'lg':
                return 'text-lg';
            case 'xl':
                return 'text-xl';
            case '2xl':
                return 'text-2xl';
            case '3xl':
                return 'text-3xl';
            case '4xl':
                return 'text-4xl';
            default:
                return 'text-2xl';
        }
    };

    const getWeightClass = (weight: 'normal' | 'medium' | 'semibold' | 'bold' | undefined) => {
        switch (weight) {
            case 'normal':
                return 'font-normal';
            case 'medium':
                return 'font-medium';
            case 'semibold':
                return 'font-semibold';
            case 'bold':
                return 'font-bold';
            default:
                return 'font-medium';
        }
    };

    return (
        <Card
            className={`${getShadowClass(style.shadowLevel)} transition-all`}
            style={{
                backgroundColor: style.backgroundColor,
                borderColor: style.borderColor,
                borderWidth: `${style.borderWidth}px`,
                borderRadius: `${style.borderRadius}px`,
            }}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex-1">
                    <CardTitle
                        className={`${getTitleSizeClass(style.titleSize)} ${getWeightClass(style.titleWeight)} cursor-pointer rounded p-1 transition-colors hover:bg-gray-100 ${editingElement === 'title' ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}
                        style={{ color: style.titleColor }}
                        onClick={() => onElementClick('title')}
                    >
                        {title}
                    </CardTitle>
                    {subtitle && (
                        <p
                            className={`text-muted-foreground mt-1 cursor-pointer rounded p-1 text-xs transition-colors hover:bg-gray-100 ${editingElement === 'subtitle' ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}
                            onClick={() => onElementClick('subtitle')}
                        >
                            {subtitle}
                        </p>
                    )}
                </div>
                {style.showIcon && (
                    <BarChart3
                        className="h-4 w-4 cursor-pointer rounded p-0.5 transition-colors hover:bg-gray-100"
                        style={{ color: style.iconColor }}
                        onClick={() => onElementClick('icon')}
                    />
                )}
            </CardHeader>
            <CardContent className={style.compactMode ? 'space-y-2' : 'space-y-3'}>
                <div
                    className={`${getValueSizeClass(style.valueSize)} ${getWeightClass(style.valueWeight)} cursor-pointer rounded p-1 transition-colors hover:bg-gray-100 ${editingElement === 'value' ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}
                    style={{ color: style.valueColor }}
                    onClick={() => onElementClick('value')}
                >
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </div>

                {/* Sources Display */}
                {style.showSources && sources && sources.length > 1 && (
                    <div className="space-y-2">
                        <div className="text-muted-foreground text-xs font-medium">Sources:</div>
                        <div className="grid gap-2">
                            {sources.map((source, index) => (
                                <div key={index} className="bg-muted/50 flex items-center justify-between rounded p-2 text-xs">
                                    <div className="flex items-center space-x-2">
                                        <Badge variant={index === 0 ? 'default' : 'secondary'} className="text-xs">
                                            {source.label}
                                        </Badge>
                                        <span className="font-medium">{source.formatted_value}</span>
                                    </div>
                                    {source.change !== undefined && (
                                        <span
                                            className={`inline-flex items-center ${
                                                source.change > 0 ? 'text-emerald-600' : source.change < 0 ? 'text-red-600' : 'text-muted-foreground'
                                            }`}
                                        >
                                            {source.change > 0 && <TrendingUp className="mr-1 h-3 w-3" />}
                                            {source.change < 0 && <TrendingDown className="mr-1 h-3 w-3" />}
                                            {source.change > 0 ? '+' : ''}
                                            {source.change}%
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Comparisons Display */}
                {style.showComparisons && comparison?.comparisons && comparison.comparisons.length > 0 && (
                    <div className="space-y-1">
                        <div className="text-muted-foreground text-xs font-medium">Comparisons:</div>
                        {comparison.comparisons.map((comp: any, index: number) => (
                            <div key={index} className="text-muted-foreground flex items-center justify-between text-xs">
                                <span className="truncate">
                                    {comp.source_a} vs {comp.source_b}
                                </span>
                                <span className={`inline-flex items-center ${comp.is_positive ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {comp.is_positive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                                    {comp.formatted}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Change Display */}
                {change !== undefined && (!comparison || !style.showComparisons) && (!sources || sources.length <= 1 || !style.showSources) && (
                    <p
                        className={`cursor-pointer rounded p-1 text-xs transition-colors hover:bg-gray-100 ${editingElement === 'change' ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}
                        onClick={() => onElementClick('change')}
                    >
                        <span
                            className={`inline-flex items-center ${
                                change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'
                            }`}
                        >
                            {change > 0 && <TrendingUp className="mr-1 h-3 w-3" />}
                            {change < 0 && <TrendingDown className="mr-1 h-3 w-3" />}
                            {change > 0 ? '+' : ''}
                            {change}%
                        </span>{' '}
                        from last period
                    </p>
                )}

                {/* Chart Display */}
                {style.showChart && chartData && chartData.length > 0 && (
                    <div
                        className={`cursor-pointer rounded p-1 transition-colors hover:bg-gray-100 ${editingElement === 'chart' ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}
                        onClick={() => onElementClick('chart')}
                    >
                        <SimpleChart
                            data={chartData}
                            type={style.chartType || 'line'}
                            color={style.chartColor || '#3b82f6'}
                            height={style.chartHeight || 64}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
