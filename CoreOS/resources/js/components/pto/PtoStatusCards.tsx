import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, FileText, Users } from 'lucide-react';

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

interface PtoRequest {
    id: number;
    request_number: string;
    user: User;
    pto_type: PtoType;
    start_date: string;
    end_date: string;
    total_days: number;
    reason?: string;
    status: 'pending' | 'approved' | 'denied' | 'cancelled';
    submitted_at: string;
    requires_multi_level_approval: boolean;
    approvals: any[];
}

interface PtoStatusCardsProps {
    requests: PtoRequest[];
    className?: string;
}

export default function PtoStatusCards({ requests, className = '' }: PtoStatusCardsProps) {
    const pendingCount = requests.filter((r) => r.status === 'pending').length;

    const approvedTodayCount = requests.filter(
        (r) => r.status === 'approved' && new Date(r.submitted_at).toDateString() === new Date().toDateString(),
    ).length;

    const multiLevelCount = requests.filter((r) => r.requires_multi_level_approval).length;

    const totalCount = requests.length;

    return (
        <div className={`grid gap-4 md:grid-cols-4 ${className}`}>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <div>
                            <p className="text-sm font-medium">Pending Approval</p>
                            <p className="text-2xl font-bold">{pendingCount}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                            <p className="text-sm font-medium">Approved Today</p>
                            <p className="text-2xl font-bold">{approvedTodayCount}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div>
                            <p className="text-sm font-medium">Multi-Level</p>
                            <p className="text-2xl font-bold">{multiLevelCount}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <div>
                            <p className="text-sm font-medium">Total Requests</p>
                            <p className="text-2xl font-bold">{totalCount}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
