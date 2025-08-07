import * as React from "react"
import AdminCommandDialog from '@/components/admin-command';
import {NavFooter} from '@/components/nav-footer';
import {NavUser} from '@/components/nav-user';
import {Collapsible, CollapsibleContent, CollapsibleTrigger,} from "@/components/ui/collapsible"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import {type NavItem, type User} from '@/types';
import {Link, usePage} from '@inertiajs/react';
import {
    Activity,
    BookOpenText,
    BotMessageSquareIcon,
    ChevronDown,
    ChevronRight,
    Clock,
    Cog,
    DollarSign,
    FileText,
    GraduationCap,
    ImageUp,
    LayoutDashboard,
    LayoutList,
    LucideIcon,
    Package,
    ShieldCheck,
    ShipWheel,
    Smartphone,
    Users
} from 'lucide-react';
import AppLogo from './app-logo';
import {NavHeader} from "@/components/nav-header";

interface AuthenticatedUser extends User {
    permissions?: string[];
    roles?: string[];
}

interface PageProps {
    auth: {
        user: AuthenticatedUser | null;
    };
    [key: string]: unknown;
}

interface NavCategory {
    title: string;
    icon: LucideIcon;
    items: NavItem[];
    roles?: string | string[];
    permission?: string;
}

// Header Nav items
const headerNavItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: '', description: null },
    { title: 'Billy The AI', href: '/billy', icon: BotMessageSquareIcon, description: null },
    { title: 'My Time Clock', href: '/time-clock/employee', icon: BookOpenText, description: null },
    { title: 'My PTO', href: '/employee/pto', icon: ShipWheel, description: null },
    { title: 'ACS Org', href: '/organization-chart', icon: Users, roles: '', description: null },
    { title: 'ACS Parts Database', href: '/parts-catalog', icon: Cog, roles: '', description: null },
    { title: 'ACS Wiki', href: '/wiki', icon: BookOpenText, roles: '', description: null },
];

// Organize navigation items into categories
const navigationCategories: NavCategory[] = [
    {
        title: "Time PTO Management",
        icon: Clock,
        roles: '[Human Resources Employee, Inside Sales Manager, Warehouse Manager, Developer]',
        items: [
            { title: 'Department PTO', href: '/department-pto', icon: Users, description: null },
            { title: 'Timesheet Manager Dash', href: '/time-clock/manager/dashboard', icon: BookOpenText, description: null },
        ]
    },
    {
        title: "Time & PTO Payroll",
        icon: DollarSign,
        roles: '[Finance Executive, Finance Employee, Developer]',
        items: [
            { title: 'Timesheet Payroll Dash', href: '/time-clock/payroll/dashboard', icon: BookOpenText, description: null },
        ]
    },
    {
        title: "Human Resources",
        icon: Users,
        roles: '[Human Resources Employee, Developer]',
        items: [
            { title: 'Holiday', href: '/holidays', icon: Users, description: null },
            { title: 'ACS blog Admin', href: '/admin/blog', icon: ShipWheel, description: null },
            { title: 'Admin Documents', href: '/folders', icon: BookOpenText, description: null },
        ]
    },
    {
        title: "Warehouse",
        icon: Package,
        roles: '[Warehouse Manager, Warehouse Employee, Developer]',
        items: [
            { title: 'Product Picture Manager', href: '/product-picture-manager', icon: ImageUp, permission: '', description: null },
        ]
    },
    {
        title: "Content & Documents",
        icon: FileText,
        items: [
            { title: 'Company Documents', href: '/employee/documents', icon: BookOpenText, description: null },

        ]
    },
    {
        title: "Vibetrack",
        icon: Activity,
        // roles: '[Warehouse Manager, Warehouse Employee, Developer]',
        permission: 'vibetrack-view',
        items: [
            { title: 'Vibetrack', href: '/vibetrack', icon: Smartphone, roles: '', description: null },
            { title: 'Vibetrack Admin', href: '/vibetrack/admin', icon: LayoutList, roles: '', description: null },
        ]
    },
    {
        title: "Training & Learning",
        icon: GraduationCap,
        roles: '[Human Resources Employee, Developer]',
        items: [
            { title: 'Training Dashboard', href: '/old-style-training-tracking', icon: BookOpenText, description: null },
        ]
    },
    {
        title: "Tools & Resources",
        icon: Cog,
        roles: 'Developer',
        items: [
        //
        //     // { title: 'ACS Organization', href: '/acs-org', icon: Users, permission: '', description: null},
        //     // { title: 'ACS PermissionTest', href: '/test', icon: Users, permission: 'AdminMenu', description: null },
        //     // { title: 'ACS RoleTest', href: '/Roletest', icon: Users, roles: '', description: null},
        //     // { title: 'Articles', href: '/articles', icon: Users, description: null },
        //     // { title: 'Roles and Permissions', href: '/roles-permissions', icon: Users, description: null },
        ]
    }
];

const footerNavItems: NavItem[] = [
    { title: 'HR Dashboard', href: '/hr/dashboard', icon: Users, roles: '[Human Resources Employee, Developer]', description: null },
    { title: 'Admin Dashboard', href: '/admin', icon: ShieldCheck, roles: '', description: null },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const page = usePage<PageProps>();
    const user = page.props.auth?.user;
    const currentUrl = page.url;

    const can = (permissionName: string): boolean => {
        if (!user || !user.permissions) {
            return false;
        }
        return user.permissions.includes(permissionName);
    };

    const hasRole = (roles: string | string[]): boolean => {
        if (!user || !user.roles) {
            return false;
        }

        // User roles are already strings
        const userRoleNames = user.roles;

        // Handle single role (string)
        if (typeof roles === 'string') {
            if (roles === '') return true;

            // Check if it's a string that looks like an array [Role1, Role2]
            if (roles.startsWith('[') && roles.endsWith(']')) {
                const roleString = roles.slice(1, -1);
                const roleArray = roleString.split(',').map(role => role.trim());
                const hasMatch = roleArray.some(role => userRoleNames.includes(role));
                return hasMatch;
            }

            return userRoleNames.includes(roles);
        }

        // Handle multiple roles (array)
        if (Array.isArray(roles)) {
            return roles.some(role => userRoleNames.includes(role));
        }

        return false;
    };

    // Check if user can access a category
    const canAccessCategory = (category: NavCategory): boolean => {
        if (category.roles !== undefined) {
            return hasRole(category.roles);
        }
        if (category.permission !== undefined) {
            if (category.permission === '') return true;
            return can(category.permission);
        }
        return true; // Default to accessible if no restrictions
    };

    // Filter individual nav items
    const filterNavItems = (items: NavItem[]): NavItem[] => {
        return items.filter((item) => {
            if (item.roles !== undefined) {
                return hasRole(item.roles);
            }
            if (item.permission !== undefined) {
                if (item.permission === '') return true;
                return can(item.permission);
            }
            return true;
        });
    };

    // Filter categories and their items
    const filterCategories = (categories: NavCategory[]): NavCategory[] => {
        return categories
            .filter(category => canAccessCategory(category)) // Filter by category access
            .map(category => ({
                ...category,
                items: filterNavItems(category.items)
            }))
            .filter(category => category.items.length > 0); // Only show categories that have visible items
    };

    const filteredCategories = filterCategories(navigationCategories);
    const filteredFooterNavItems = filterNavItems(footerNavItems);
    const filteredHeaderNavItems = filterNavItems(headerNavItems);

    // Check if a category contains the active page
    const categoryContainsActivePage = (category: NavCategory): boolean => {
        return category.items.some(item => currentUrl.startsWith(item.href));
    };

    // Check if any footer nav item is active
    const footerContainsActivePage = (): boolean => {
        return filteredFooterNavItems.some(item => currentUrl.startsWith(item.href));
    };

    // Check if any header nav item is active
    const headerContainsActivePage = (): boolean => {
        return filteredHeaderNavItems.some(item => currentUrl.startsWith(item.href));
    };

    // Check if we should expand categories based on active page location
    const shouldExpandCategory = (category: NavCategory, index: number): boolean => {
        // Always expand first category if no active page found anywhere
        if (index === 0 && !categoryContainsActivePage(category) && !footerContainsActivePage() && !headerContainsActivePage()) {
            return true;
        }
        // Expand if this category contains the active page
        return categoryContainsActivePage(category);
    };

    // For AdminCommandDialog
    const ROLE_FOR_ADMIN_DIALOG = '';

    return (
        <Sidebar collapsible="icon" variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <NavHeader items={filteredHeaderNavItems} currentUrl={currentUrl} className="mt-auto" />
                    <SidebarMenu>
                        {filteredCategories.map((category, index) => (
                            <Collapsible
                                key={category.title}
                                defaultOpen={shouldExpandCategory(category, index)}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton>
                                            {category.icon && <category.icon />}
                                            {category.title}{" "}
                                            <ChevronRight className="ml-auto group-data-[state=open]/collapsible:hidden" />
                                            <ChevronDown className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    {category.items?.length ? (
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {category.items.map((item) => (
                                                    <SidebarMenuSubItem key={item.title}>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={currentUrl.startsWith(item.href)}
                                                        >
                                                            <Link href={item.href} prefetch>
                                                                {item.icon && <item.icon />}
                                                                <span>{item.title}</span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    ) : null}
                                </SidebarMenuItem>
                            </Collapsible>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            {/* AdminCommandDialog with role check */}
            {user && hasRole(ROLE_FOR_ADMIN_DIALOG) && <AdminCommandDialog />}

            <SidebarFooter>
                <NavFooter items={filteredFooterNavItems} currentUrl={currentUrl} className="mt-auto" />
                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
