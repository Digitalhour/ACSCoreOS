import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Activity, BarChart3, Calendar, CheckCircle2, DollarSign, Gauge, LineChart, Map, PieChart, Table, Users } from 'lucide-react';
import { useState } from 'react';

interface ModuleType {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: 'Analytics' | 'Data' | 'Performance' | 'Planning';
    status: 'available' | 'coming_soon' | 'beta';
    features: string[];
}

interface ModuleSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectModule: (moduleId: string) => void;
}

const modules: ModuleType[] = [
    {
        id: 'kpi-card',
        name: 'KPI Card',
        description: 'Track key performance indicators with real-time data and comparisons',
        icon: <BarChart3 className="h-6 w-6" />,
        category: 'Analytics',
        status: 'available',
        features: ['Multi-source data', 'Real-time updates', 'Trend analysis', 'Comparison mode', 'Were all mad here'],
    },
    {
        id: 'data-table',
        name: 'Data Table',
        description: 'Display structured data with sorting, filtering, and pagination',
        icon: <Table className="h-6 w-6" />,
        category: 'Data',
        status: 'available',
        features: ['this is kinda cool really', 'Sort & filter', 'Pagination', 'Export data', 'Custom columns'],
    },
    {
        id: 'trend-chart',
        name: 'Trend Chart',
        description: 'Visualize data trends over time with interactive charts',
        icon: <LineChart className="h-6 w-6" />,
        category: 'Analytics',
        status: 'coming_soon',
        features: [
            'Same as kpi',
            'should be fun to make',
            'im trending to be mad',
            'Time series',
            'Multiple metrics',
            'Zoom & pan',
            'Export options',
        ],
    },
    {
        id: 'pie-chart',
        name: 'Pie Chart',
        description: 'Show data distribution and proportions clearly',
        icon: <PieChart className="h-6 w-6" />,
        category: 'Analytics',
        status: 'coming_soon',
        features: ['Interactive segments', 'Custom colors', 'Drill-down', 'Legends'],
    },
    {
        id: 'gauge-meter',
        name: 'Gauge Meter',
        description: 'Show progress towards goals with visual gauges',
        icon: <Gauge className="h-6 w-6" />,
        category: 'Performance',
        status: 'coming_soon',
        features: ['Vroom motherfucker', 'Color zones', 'Targets', 'Animations effects'],
    },
    {
        id: 'calendar-view',
        name: 'Calendar View',
        description: 'Timeline and schedule visualization for events',
        icon: <Calendar className="h-6 w-6" />,
        category: 'Planning',
        status: 'beta',
        features: ['Event timeline', 'Drag & drop', 'Recurring events', 'Multiple views', 'Driving Chris Insane'],
    },
    {
        id: 'map-view',
        name: 'Map View',
        description: 'Geographic data visualization and location analytics',
        icon: <Map className="h-6 w-6" />,
        category: 'Analytics',
        status: 'coming_soon',
        features: ['Interactive maps', 'Heat maps', 'Markers', 'Geographic filters'],
    },
    {
        id: 'user-activity',
        name: 'User Activity',
        description: 'Track user engagement and activity patterns',
        icon: <Users className="h-6 w-6" />,
        category: 'Analytics',
        status: 'coming_soon',
        features: ['Activity feeds', 'User tracking', 'Engagement metrics', 'Session analysis'],
    },
    {
        id: 'financial-summary',
        name: 'Financial Summary',
        description: 'Comprehensive financial reporting and analysis',
        icon: <DollarSign className="h-6 w-6" />,
        category: 'Analytics',
        status: 'coming_soon',
        features: ['Revenue tracking', 'Profit analysis', 'Budget overview', 'Financial ratios'],
    },
];

export function ModuleSelectorModal({ isOpen, onClose, onSelectModule }: ModuleSelectorModalProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const categories = ['all', 'Analytics', 'Data', 'Performance', 'Planning'];

    const filteredModules = selectedCategory === 'all' ? modules : modules.filter((module) => module.category === selectedCategory);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available':
                return (
                    <Badge variant="default" className="border-green-200 bg-green-100 text-green-800">
                        Available
                    </Badge>
                );
            case 'beta':
                return (
                    <Badge variant="secondary" className="border-blue-200 bg-blue-100 text-blue-800">
                        Beta
                    </Badge>
                );
            case 'coming_soon':
                return (
                    <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-600">
                        Coming Soon
                    </Badge>
                );
            default:
                return null;
        }
    };

    const handleModuleSelect = (moduleId: string) => {
        const module = modules.find((m) => m.id === moduleId);
        if (module?.status === 'available') {
            onSelectModule(moduleId);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Add Module</DialogTitle>
                    <DialogDescription>
                        Choose a module to add to your dashboard. Each module provides different ways to visualize and interact with the shit you
                        wanna see.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex max-h-[calc(90vh-120px)] flex-col space-y-4 overflow-hidden">
                    {/* Category Filter */}
                    <div className="flex flex-wrap gap-2 border-b pb-2">
                        {categories.map((category) => (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedCategory(category)}
                                className="capitalize"
                            >
                                {category === 'all' ? 'All Modules' : category}
                                {category !== 'all' && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                        {modules.filter((m) => m.category === category).length}
                                    </Badge>
                                )}
                            </Button>
                        ))}
                    </div>

                    {/* Modules Grid */}
                    <div className="grid grid-cols-1 gap-4 overflow-y-auto p-2 pr-2 md:grid-cols-2 lg:grid-cols-3">
                        {filteredModules.map((module) => (
                            <Card
                                key={module.id}
                                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                                    module.status === 'available' ? 'hover:border-primary hover:scale-[1.01]' : 'cursor-not-allowed opacity-75'
                                }`}
                                onClick={() => handleModuleSelect(module.id)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className={`rounded-lg p-2 ${
                                                    module.status === 'available' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                                                }`}
                                            >
                                                {module.icon}
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{module.name}</CardTitle>
                                                <Badge variant="outline" className="mt-1 text-xs">
                                                    {module.category}
                                                </Badge>
                                            </div>
                                        </div>
                                        {getStatusBadge(module.status)}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <CardDescription className="text-sm leading-relaxed">{module.description}</CardDescription>

                                    <div className="space-y-2">
                                        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Key Features</div>
                                        <div className="grid grid-cols-2 gap-1">
                                            {module.features.map((feature, index) => (
                                                <div key={index} className="flex items-center space-x-1 text-xs">
                                                    <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-green-500" />
                                                    <span className="text-muted-foreground">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {module.status === 'available' && (
                                        <Button
                                            className="mt-3 w-full"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleModuleSelect(module.id);
                                            }}
                                        >
                                            Add Module
                                        </Button>
                                    )}

                                    {module.status === 'beta' && (
                                        <Button variant="outline" className="mt-3 w-full" size="sm" disabled>
                                            Beta Access Required
                                        </Button>
                                    )}

                                    {module.status === 'coming_soon' && (
                                        <Button variant="outline" className="mt-3 w-full" size="sm" disabled>
                                            Coming Soon
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredModules.length === 0 && (
                        <div className="text-muted-foreground py-12 text-center">
                            <Activity className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <h3 className="font-medium">No modules found</h3>
                            <p className="mt-1 text-sm">Try selecting a different category</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
