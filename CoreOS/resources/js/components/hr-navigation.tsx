import {Button} from '@/components/ui/button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
import {Separator} from '@/components/ui/separator';
import {Link} from '@inertiajs/react';
import {BarChart3, Building, CalendarIcon, ChevronDown, Users} from 'lucide-react';
import {useEffect, useState} from 'react';
import Heading from "@/components/heading";

// Navigation data
const navGroups = [
    {
        title: "Dashboard",
        icon: BarChart3,
        items: [
            {
                title: "Human Resources Dashboard",
                href: "/hr/overview",
                description: "View key insights",
            },
        ],
    },
    {
        title: "Employees",
        icon: Users,
        items: [
            {
                title: "All Employees",
                href: "/hr/employees",
                description: "Manage employee records",
            },
            {
                title: "Onboarding",
                href: "/user-management/onboard",
                description: "Onboard new employees",
            },
        ],
    },
    {
        title: "Time Off",
        icon: CalendarIcon,
        items: [
            {
                title: "Requests",
                href: "/hr/time-off-requests",
                description: "Approve or deny time off",
            },
            {
                title: "Policies",
                href: "/hr/pto-policies",
                description: "Configure time off policies",
            },
            {
                title: "Types",
                href: "/hr/pto-types",
                description: "Manage PTO types",
            },
            {
                title: "Blackouts",
                href: "/admin/blackouts",
                description: "Set blackout dates",
            },
        ],
    },
    {
        title: "Organization",
        icon: Building,
        items: [
            {
                title: "Departments",
                href: "/departments",
                description: "Manage departments",
            },
            {
                title: "Hierarchy",
                href: "/admin/user-hierarchy",
                description: "Assign users to teams and locations",
            },
            {
                title: "Positions",
                href: "/admin/positions",
                description: "Manage company positions",
            },
        ],
    },
];

export default function HrNavigation() {
    const [currentPath, setCurrentPath] = useState("");

    useEffect(() => {
        setCurrentPath(window.location.pathname);
    }, []);

    const allItems = navGroups.flatMap((group) => group.items);
    const currentNavItem = allItems.find((item) => item.href === currentPath) || {
        title: "HR Dashboard",
        description: "Welcome to the HR management system",
    };

    return (
        <div className="px-4 py-2">
            {/* Dynamic Heading */}
            <Heading title={currentNavItem.title} description={currentNavItem.description || undefined} />

            {/* Navigation Menu */}
            <div className="flex flex-wrap gap-2 mb-4">
                {/* Dashboard Link */}
                <Link
                    href={navGroups[0].items[0].href}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                >
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                </Link>

                {/* Employees Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Employees
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start">
                        {navGroups[1].items.map((item) => (
                            <DropdownMenuItem key={item.href} asChild>
                                <Link href={item.href} className="flex flex-col items-start">
                                    <div className="font-medium">{item.title}</div>
                                    <div className="text-xs text-muted-foreground">{item.description}</div>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Time Off Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Time Off
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64" align="start">
                        {navGroups[2].items.map((item) => (
                            <DropdownMenuItem key={item.href} asChild>
                                <Link href={item.href} className="flex flex-col items-start">
                                    <div className="font-medium">{item.title}</div>
                                    <div className="text-xs text-muted-foreground">{item.description}</div>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Organization Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            Organization
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start">
                        {navGroups[3].items.map((item) => (
                            <DropdownMenuItem key={item.href} asChild>
                                <Link href={item.href} className="flex flex-col items-start">
                                    <div className="font-medium">{item.title}</div>
                                    <div className="text-xs text-muted-foreground">{item.description}</div>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Separator className="my-4" />
        </div>
    );
}
