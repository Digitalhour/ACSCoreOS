import {Separator} from '@/components/ui/separator';
import {type NavItem} from '@/types';
import {Link} from '@inertiajs/react';
import {type PropsWithChildren} from 'react';
import {BarChart3, CalendarIcon, Clock, FileText} from 'lucide-react';
import {Button} from "@/components/ui/button";
import Heading from "@/components/heading";

const sidebarNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/hr/overview',
        description: "Dashboard",
        icon: BarChart3,
    },

    {
        title: 'Employees',
        href: '/hr/employees',
        description: "Manage employees.",
        icon: FileText,
    },
    {
        title: 'Time Off Requests',
        href: '/hr/time-off-requests',
        description: 'Company-wide time off requests',
        icon: Clock,
    },
    {
        title: 'Time Off Policies',
        href: '/hr/pto-policies',
        description: 'View Time Off Policies.',
        icon: CalendarIcon,
    },
    {
        title: 'Time Off Types',
        href: '/hr/pto-types',
        description: "Time off types management.",
        icon: FileText,
    }
    ,
    {
        title: 'Blackouts',
        href: '/admin/blackouts',
        description: "set paid time blackouts.",
        icon: FileText,
    },
    {
        title: 'Departments',
        href: '/departments',
        description: "Manage ACS Departments and assign employees to them.",
        icon: FileText,
    },
    {
        title: 'Hierarchy',
        href: '/admin/user-hierarchy',
        description: "Assign users to departments, teams, and locations.",
        icon: FileText,
    },
    {
        title: 'Company Positions',
        href: '/admin/positions',
        description: "manage company positions.",
        icon: FileText,
    },
    {
        title: 'Employee Onboarding',
        href: '/user-management/onboard',
        description: "Onboard new employees.",
        icon: FileText,
    },
];

export default function HrLayout({ children }: PropsWithChildren) {
    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname;

    // Find the current navigation item based on the path
    const currentNavItem = sidebarNavItems.find(item => item.href === currentPath) || { title: 'HR Settings', description: '' };

    return (
        <div className="px-4 py-6">
            <Heading title={currentNavItem.title} description={currentNavItem.description || undefined} />

            <div className="flex flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-8">
                <aside className="w-full max-w-xl lg:w-64">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${item.href}-${index}`}

                                variant="ghost"
                                asChild
                                className={'w-full h-1/3 justify-start  ' + (currentPath === item.href ? 'bg-muted' : '') + '' }
                            >

                                <Link href={item.href} prefetch>
                                    <div className="flex items-center gap-2">
                                        {item.icon && <item.icon className="h-4 w-4 ml-2" />}

                                        <div className={"text-balance"}>
                                            <div className="font-medium">{item.title}</div>
                                            <div className=" text-muted-foreground text-xs ">{item.description}</div>
                                        </div>
                                    </div>
                                </Link>

                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-1 md:hidden" />

                <div className="flex-1 ">
                    <section className="max-w-full space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
