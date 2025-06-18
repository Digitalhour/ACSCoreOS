import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import HrLayout from '@/layouts/settings/hr-layout';
import {type BreadcrumbItem, PageProps} from '@/types';
import {Head} from '@inertiajs/react';

import {CheckCircle, Clock, FileText, Plus, XCircle} from 'lucide-react';
import {useState} from 'react';
import {toast} from 'sonner';

import HistoricalPtoModal from '@/components/HistoricalPtoModal';
import AppLayout from "@/layouts/app-layout";


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

// function PtoBalancesComponent() {
//     return (
//         <div className="space-y-6">
//             <div className="flex items-center justify-between">
//                 <div>
//                     <h2 className="text-xl font-semibold text-gray-900">PTO Balances</h2>
//                     <p className="text-sm text-gray-600 mt-1">Manage employee PTO balances</p>
//                 </div>
//                 <Button className="bg-gray-900 hover:bg-gray-800">
//                     <Users className="h-4 w-4 mr-2" />
//                     Bulk Update
//                 </Button>
//             </div>
//             <Card className="border border-gray-200">
//                 <CardContent className="flex flex-col items-center justify-center py-12 text-center">
//                     <div className="p-4 rounded-full bg-gray-100 mb-4">
//                         <Users className="h-8 w-8 text-gray-400" />
//                     </div>
//                     <h3 className="text-lg font-medium text-gray-900 mb-2">PTO Balances Component</h3>
//                     <p className="text-gray-500 max-w-md">
//                         This component will manage employee PTO balances, accruals, and adjustments.
//                     </p>
//                 </CardContent>
//             </Card>
//         </div>
//     );
// }

// function DashboardOverview({ stats }: { stats?: PtoStats }) {
//     return (
//         <div className="space-y-6">
//             <div>
//                 <h2 className="text-xl font-semibold text-gray-900">Dashboard Overview</h2>
//                 <p className="text-sm text-gray-600 mt-1">System statistics and recent activity</p>
//             </div>
//             <Card className="border border-gray-200">
//                 <CardContent>
//                     <PtoOverviewComponent />
//                 </CardContent>
//             </Card>
//         </div>
//     );
// }

export default function HRDashboardView({
                                               stats,
                                               users,
                                               ptoTypes,

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
    // const [activeComponent, setActiveComponent] = useState<string>('overview');

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


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PTO Administration Dashboard" />
            <HrLayout>

                <div className="space-y-6">

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




            {/* Historical PTO Modal */}
            <HistoricalPtoModal
                isOpen={isHistoricalModalOpen}
                onClose={() => setIsHistoricalModalOpen(false)}
                users={users}
                ptoTypes={ptoTypes}
                onSuccess={handleHistoricalPtoSuccess}
            />
                </div>
        </HrLayout>
        </AppLayout>
    );
}
