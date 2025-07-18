import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head} from '@inertiajs/react';
import {Badge} from "@/components/ui/badge";


interface User {
    id: number;
    name: string;
    email: string;
    current_position?: {
        title: string;
    };
    departments?: Department[];
}

interface Department {
    id: number;
    name: string;
}

interface Timesheet {
    id: number;
    user_id: number;
    week_start_date: string;
    week_end_date: string;
    status: 'draft' | 'submitted' | 'approved' | 'processed';
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    approved_at?: string;
    processed_at?: string;
    user: User;
    approved_by?: User;
    processed_by?: User;
}

interface Props {
    timesheets: {
        data: Timesheet[];
        links: any[];
        meta: any;
    };
    departments: Department[];
    filters: {
        week_start?: string;
        week_end?: string;
        department_id?: string;
        status?: string;
    };
}


const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Team',
        href: '/team',
    }
];

export default function Dashboard({ timesheets, departments, filters }: Props) {
    // useEcho('orders', 'OrderStatusUpdatedEvent', (e) => {
    //     console.log(e);
    // })

const userCurrentStatus = timesheets.data.map(data =>
   <div className={"flex gap-2 p-2"}>
    <Badge> {data.week_start_date} | {data.week_end_date} {data.user.name} </Badge>
    <Badge>{data.status}</Badge>
   </div>
       )
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    <div className="flex flex-col col-span-2 gap-4">

                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                           {/* {timesheets.data.map(data  => (*/}
                           {/*<p key={data.id}> {data.user.name}, {data.status}</p>*/}
                           {/* ) )}*/}
                            {userCurrentStatus.map((item) => (
                                <div>
                                    <p>{item}</p>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>

            </div>
        </AppLayout>
    );
}
