import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, PageProps } from '@/types';
import { Head } from '@inertiajs/react';

import {
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    FileText,
    Shield,
    Calendar as CalendarIcon,
    Users,
    BarChart3,
    Settings,
    Plus,
    ChevronRight,
    Home
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import HistoricalPtoModal from '@/components/HistoricalPtoModal';
import PtoTypesComponent from "@/components/pto/PtoTypesComponent";
import PtoRequestsComponent from "@/components/pto/PtoRequestsComponent";
import PtoPoliciesComponent from "@/components/pto/PtoPoliciesComponent";
import PtoOverviewComponent from "@/components/pto/PtoOverviewCompnent";

interface PtoStats {
    total_requests: number;
    pending_requests: number;
    approved_requests: number;
    denied_requests: number;
    total_types: number;
    total_policies: number;
    total_blackouts: number;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface PtoType {
    id: number;
    name: string;
    code: string;
    color: string;
}

// Enhanced types for the overview component
interface PTOData {
    type_id: number;
    type_name: string;
    balance: number | string;
    used_balance: number | string;
    pending_balance: number | string;
    available_balance: number | string;
}

interface OverviewUser {
    id: number;
    name: string;
    email: string;
    department: string;
    start_date: string;
    pto_data: PTOData[];
}

interface OverviewPtoType {
    id: number;
    name: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'HR Dashboard',
        href: '/admin',
    },
    {
        title: 'PTO Dashboard',
        href: '/pto',
    },
];

function BlackoutPeriodsComponent() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Blackout Periods</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage holidays and blackout periods</p>
                </div>
                <Button className="bg-gray-900 hover:bg-gray-800">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Blackout Period
                </Button>
            </div>
            <Card className="border border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-full bg-gray-100 mb-4">
                        <CalendarIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Blackout Periods Component</h3>
                    <p className="text-gray-500 max-w-md">
                        This component will manage company holidays and periods when PTO cannot be taken.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

function PtoBalancesComponent() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">PTO Balances</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage employee PTO balances</p>
                </div>
                <Button className="bg-gray-900 hover:bg-gray-800">
                    <Users className="h-4 w-4 mr-2" />
                    Bulk Update
                </Button>
            </div>
            <Card className="border border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-full bg-gray-100 mb-4">
                        <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">PTO Balances Component</h3>
                    <p className="text-gray-500 max-w-md">
                        This component will manage employee PTO balances, accruals, and adjustments.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

function DashboardOverview({ stats }: { stats?: PtoStats }) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Dashboard Overview</h2>
                <p className="text-sm text-gray-600 mt-1">System statistics and recent activity</p>
            </div>
            <Card className="border border-gray-200">
                <CardContent>
                    <PtoOverviewComponent />
                </CardContent>
            </Card>
        </div>
    );
}

export default function HRPtoDashboardView({
                                               stats,
                                               users,
                                               ptoTypes,
                                               overviewUsers,
                                               overviewPtoTypes,
                                               currentYear,
                                               availableYears
                                           }: PageProps & {
    stats?: PtoStats,
    users: User[],
    ptoTypes: PtoType[],
    overviewUsers: OverviewUser[],
    overviewPtoTypes: OverviewPtoType[],
    currentYear?: number,
    availableYears?: number[]
}) {
    const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState<boolean>(false);
    const [activeComponent, setActiveComponent] = useState<string>('overview');

    const handleHistoricalPtoSuccess = () => {
        toast.success('Historical PTO submitted successfully');
    };

    const statsBadges = [

        {
            title: 'Pending',
            value: stats?.pending_requests || 0,
            icon: Clock,
            variant: 'outline' as const
        },
        {
            title: 'Approved',
            value: stats?.approved_requests || 0,
            icon: CheckCircle,
            variant: 'secondary' as const
        },
        {
            title: 'Denied',
            value: stats?.denied_requests || 0,
            icon: XCircle,
            variant: 'outline' as const
        },
        {
            title: 'Total Requests',
            value: stats?.total_requests || 0,
            icon: FileText,
            variant: 'secondary' as const
        },
    ];

    const quickLinks = [
        {
            title: 'PTO Requests',
            description: 'View requests',
            component: 'requests',
            icon: BarChart3
        },
        {
            title: 'PTO Policies',
            description: 'Manage employees policies',
            component: 'policies',
            icon: Shield,
            count: stats?.total_policies || 0
        },
        {
            title: 'PTO Types',
            description: 'Manage PTO types and settings',
            component: 'types',
            icon: Settings,
            count: stats?.total_types || 0
        },

        {
            title: 'Blackout Periods',
            description: 'Manage paid time blackouts',
            component: 'blackouts',
            icon: CalendarIcon,
            count: stats?.total_blackouts || 0
        },

    ];

    const renderActiveComponent = () => {
        switch (activeComponent) {
            case 'types':
                return <PtoTypesComponent />;
            case 'policies':
                return <PtoPoliciesComponent />;
            case 'blackouts':
                return <BlackoutPeriodsComponent />;
            case 'requests':
                return <PtoRequestsComponent />;
            case 'balances':
                return <PtoBalancesComponent />;
            default:
                return <PtoOverviewComponent
                    users={overviewUsers}
                    ptoTypes={overviewPtoTypes}
                    currentYear={currentYear}
                    availableYears={availableYears}
                />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PTO Administration Dashboard" />
            <Toaster richColors position="top-right" />

            <div className="flex h-screen bg-gray-50">
                {/* Sidebar */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-6 border-b border-gray-200">
                        <h1 className="text-2xl font-semibold text-gray-900">PTO System Overview</h1>
                        <p className="text-sm text-gray-600 mt-1">Monitor and manage employee time off requests</p>
                    </div>

                    <div className="flex-1 p-4 space-y-2">
                        {/* Overview Link */}
                        <div
                            onClick={() => setActiveComponent('overview')}
                            className={`group flex items-center justify-between p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                                activeComponent === 'overview'
                                    ? 'border-gray-400 bg-gray-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-md transition-colors ${
                                    activeComponent === 'overview' ? 'bg-gray-200' : 'bg-gray-100 group-hover:bg-gray-200'
                                }`}>
                                    <Home className="h-4 w-4 text-gray-700" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 text-sm">Time Off</p>
                                    <p className="text-xs text-gray-500">Employee summary </p>
                                </div>
                            </div>
                            <ChevronRight className={`h-4 w-4 transition-colors ${
                                activeComponent === 'overview' ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-600'
                            }`} />
                        </div>

                        {/* Quick Links */}
                        {quickLinks.map((link, index) => {
                            const IconComponent = link.icon;
                            const isActive = activeComponent === link.component;
                            return (
                                <div
                                    key={index}
                                    onClick={() => setActiveComponent(link.component)}
                                    className={`group flex items-center justify-between p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                                        isActive
                                            ? 'border-gray-400 bg-gray-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-md transition-colors ${
                                            isActive ? 'bg-gray-200' : 'bg-gray-100 group-hover:bg-gray-200'
                                        }`}>
                                            <IconComponent className="h-4 w-4 text-gray-700" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">{link.title}</p>
                                            <p className="text-xs text-gray-500">{link.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {link.count !== undefined && (
                                            <Badge variant="secondary" className="text-xs">
                                                {link.count}
                                            </Badge>
                                        )}
                                        <ChevronRight className={`h-4 w-4 transition-colors ${
                                            isActive ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-600'
                                        }`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>

                            </div>

                        </div>
                    </div>

                    {/* Stats Badges */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center space-x-6">
                            {statsBadges.map((stat, index) => {
                                return (
                                    <Badge variant="secondary" key={index} className="flex items-center space-x-3">
                                        <div className="ph-5 min-w-5 rounded-full px-2 bg-gray-300">
                                            <p className=" font-semibold text-gray-900">{stat.value.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.title}</p>
                                        </div>
                                    </Badge>
                                );
                            })}
                            <Button
                                onClick={() => setIsHistoricalModalOpen(true)}
                                className="bg-gray-900 hover:bg-gray-800 text-white justify-items-end"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Submit Historical PTO
                            </Button>

                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 p-1 overflow-auto">
                        <div className="max-w-7xl mx-auto">
                            {renderActiveComponent()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Historical PTO Modal */}
            <HistoricalPtoModal
                isOpen={isHistoricalModalOpen}
                onClose={() => setIsHistoricalModalOpen(false)}
                users={users}
                ptoTypes={ptoTypes}
                onSuccess={handleHistoricalPtoSuccess}
            />
        </AppLayout>
    );
}
