import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

import AppLayout from '@/layouts/app-layout';
import QueueDashboardPage from '@/pages/quese-status'; // Ensured all icons are imported
import {type BreadcrumbItem} from '@/types';
import {Head, Link as InertiaLink} from '@inertiajs/react'; // Renamed Link to InertiaLink to avoid conflict
import {DatabaseZap, LayoutDashboardIcon, UploadCloud} from 'lucide-react';

// Breadcrumbs for the page
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        // Assuming 'route' helper is available globally, otherwise use literal string '/admin'
        // This should point to the route that renders this AdminDashboardPage component
        href: typeof route !== 'undefined' ? route('dev-ops.index') : '/dev-ops',
    },
];

// Interface for individual dashboard links
interface DashboardLink {
    href: string;
    label: string;
    icon?: React.ElementType;
    description?: string;
    routeName: string; // Store the route name for InertiaLink
}

// Interface for link categories
interface LinkCategory {
    title: string;
    links: DashboardLink[];
    icon?: React.ElementType;
}

// Define the links, using route names for href generation
// Ensure these route names exist in your web.php and are passed to the frontend
const adminLinks: LinkCategory[] = [
    // {
    //     title: 'Time Management',
    //     icon: Calendar,
    //     links: [
    //         {
    //             routeName: 'holidays',
    //             href: '/holidays',
    //             label: 'Holidays',
    //             icon: Calendar,
    //             description: 'Holiday Controller',
    //         },
    //         {
    //             routeName: 'admin.pto.dashboard',
    //             href: '/admin/pto',
    //             label: 'HR PTO Dashboard',
    //             icon: Calendar,
    //             description: 'Overview of PTO system.',
    //         },
    //         {
    //             routeName: 'admin.pto.types',
    //             href: '/admin/pto-types',
    //             label: 'PTO Types',
    //             icon: Settings2,
    //             description: 'Manage PTO types and settings.',
    //         },
    //         {
    //             routeName: 'admin.pto.policies',
    //             href: '/admin/pto-policies',
    //             label: 'PTO Policies',
    //             icon: FileText,
    //             description: 'Configure PTO policies.',
    //         },
    //         {
    //             routeName: 'admin.pto.requests',
    //             href: '/admin/pto-requests',
    //             label: 'PTO Requests',
    //             icon: CalendarDays,
    //             description: 'Manage PTO requests.',
    //         },
    //         {
    //             routeName: 'admin.pto.approvals',
    //             href: '/admin/pto-approvals',
    //             label: 'PTO Approvals',
    //             icon: ThumbsUp,
    //             description: 'Review and approve PTO requests.',
    //         },
    //         {
    //             routeName: 'admin.pto.balances',
    //             href: '/admin/pto-balances',
    //             label: 'PTO Balances',
    //             icon: Wallet,
    //             description: 'Manage Employees PTO balances.',
    //         },
    //         {
    //             routeName: 'admin.pto.Blackouts',
    //             href: '/admin/Blackouts',
    //             label: 'Blackout Periods',
    //             icon: CalendarOff,
    //             description: 'Manage holidays and blackout periods.',
    //         },
    //     ],
    // },
    // {
    //     title: 'User & Access Management',
    //     icon: Users,
    //     links: [
    //         {
    //             routeName: 'admin.positions.index',
    //             href: '/admin/positions',
    //             label: 'Manage Positions',
    //             icon: Briefcase,
    //             description: 'Configure job titles and roles.',
    //         },
    //         {
    //             routeName: 'admin.user-hierarchy.index',
    //             href: '/admin/user-hierarchy',
    //             label: 'User Hierarchy',
    //             icon: Users,
    //             description: 'Set or modify Employees structures.',
    //         },
    //         {
    //             routeName: 'acs-origination',
    //             href: '/organization-chart',
    //             label: 'Organization Chart',
    //             icon: Network,
    //             description: 'Company hierarchy.',
    //         },
    //         {
    //             routeName: 'roles-permissions.index',
    //             href: '/roles-permissions',
    //             label: 'Roles & Permissions',
    //             icon: Settings2,
    //             description: 'Define user access controls.',
    //         },
    //         {
    //             routeName: 'admin.user-activity.index',
    //             href: '/admin/user-activity',
    //             label: 'User Activity Monitor',
    //             icon: Activity,
    //             description: 'Track user actions and behavior.',
    //         },
    //         {
    //             routeName: 'impersonate.index',
    //             href: '/impersonate',
    //             icon: Plane,
    //             description: 'Impersonate a user',
    //             label: 'Impersonation',
    //         },
    //     ],
    // },
    {
        title: 'Data & Content',
        icon: DatabaseZap,
        links: [
            {
                routeName: 'parts.index',
                href: '/parts',
                label: 'Dataset uploader',
                icon: UploadCloud,
                description: 'upload parts.index.',
            },

        ],
    },
    // {
    //     title: 'Billy AI Suite',
    //     icon: MessageSquare,
    //     links: [
    //         { routeName: 'billy', href: '/billy', label: 'Billy Chat', icon: MessageSquare, description: 'Interact with the AI assistant.' },
    //         {
    //             routeName: 'billy.feedback.index',
    //             href: '/billy/feedback',
    //             label: 'AI Feedback',
    //             icon: FileText,
    //             description: 'Review user feedback on AI.',
    //         },
    //         {
    //             routeName: 'billy.conversations.index',
    //             href: '/billy/conversations',
    //             label: 'AI Conversations',
    //             icon: ListChecks,
    //             description: 'Manage AI chat logs.',
    //         },
    //     ],
    // },
    // {
    //     title: 'General',
    //     icon: LayoutDashboardIcon,
    //     links: [
    //         {
    //             routeName: 'dashboard',
    //             href: '/dashboard',
    //             label: 'Main Dashboard',
    //             icon: LayoutDashboardIcon,
    //             description: 'Go to the main user dashboard.',
    //         },
    //     ],
    // },
    {
        title: 'Developers',
        icon: LayoutDashboardIcon,
        links: [
            {
                routeName: 'Navigate Controls',
                href: route('navigation.index') as string,
                label: 'navigation.index',
                icon: LayoutDashboardIcon,
                description: 'Go to the main navigation.index.',
            },
            {
                routeName: 'activity-log',
                href: route('activity-log.index') as string,
                label: 'Activity log',
                icon: LayoutDashboardIcon,
                description: 'Go to the main Activity dashboard.',
            },
            {
                routeName: 'departments',
                href: '/departments',
                label: 'Departments',
                icon: LayoutDashboardIcon,
                description: 'Go to the Departments dashboard.',
            },
            {
                routeName: 'access-control.index',
                href: route('access-control.index'),
                label: 'access-control.index',
                icon: LayoutDashboardIcon,
                description: 'Go to the user-roles-matrix dashboard.',
            },
        ],
    },
];


// The Admin Dashboard Page Component
export default function adminDashboard() {


    const getHref = (link: DashboardLink): string => {
        if (typeof route === 'function') {
            try {
                return route(link.routeName);
            } catch (e) {
                console.warn(`Route '${link.routeName}' not found, falling back to href: ${link.href}`, e);
                return link.href; // Fallback to hardcoded href if route generation fails
            }
        }
        return link.href; // Fallback if route function is not defined
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard" />
            {/* Main container for the dashboard content */}
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Admin Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage various aspects of the application.</p>

                </div>

                {/* Grid layout for link categories */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {adminLinks.map((category) => (
                        <Card
                            key={category.title}
                            className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800"
                        >
                            <CardHeader className="flex flex-row items-center space-x-3 border-b border-gray-200 p-4 dark:border-gray-700">
                                {category.icon && <category.icon className="text-primary h-6 w-6 dark:text-sky-400" />}
                                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white">{category.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow p-4">
                                <ul className="space-y-2">
                                    {category.links.map((link) => (
                                        <li key={link.routeName}>
                                            <InertiaLink
                                                href={getHref(link)} // Use the helper to get the correct href
                                                className="group flex items-start space-x-3 rounded-md p-3 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                            >
                                                {link.icon && (
                                                    <link.icon className="group-hover:text-primary mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500 dark:text-gray-400 dark:group-hover:text-sky-400" />
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="group-hover:text-primary font-medium dark:group-hover:text-sky-400">
                                                        {link.label}
                                                    </span>
                                                    {link.description && (
                                                        <small className="text-xs text-gray-500 dark:text-gray-400">{link.description}</small>
                                                    )}
                                                </div>
                                            </InertiaLink>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="mt-8 grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="flex flex-col gap-4">

                    </div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative col-span-2 rounded-xl border">
                        <QueueDashboardPage />
                    </div>
                </div>
                {/*<div className="border-sidebar-border/70 dark:border-sidebar-border relative mt-4 min-h-[50vh] flex-1 overflow-hidden rounded-xl border md:min-h-min"></div>*/}
                {/*
                // Original placeholder structure from user's file - can be removed or repurposed.
                // If you need to add more sections, you can adapt this.

                */}
            </div>
        </AppLayout>
    );
}
