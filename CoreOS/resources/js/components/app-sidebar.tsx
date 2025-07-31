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
import {BookOpenText, BotMessageSquareIcon, ImageUp, Minus, Plus, ShieldCheck, ShipWheel, Users} from 'lucide-react';
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
    [key: string]: any;
}

interface NavCategory {
    title: string;
    items: NavItem[];
}

// Organize navigation items into categories
const navigationCategories: NavCategory[] = [
    {
        title: "Dashboard & Core",
        items: [

            { title: 'Billy The AI', href: '/billy', icon: BotMessageSquareIcon, description: null },
        ]
    },
    {
        title: "Time & PTO Management",
        items: [
            { title: 'My Time Clock', href: '/time-clock/employee', icon: BookOpenText, description: null },
            { title: 'Your PTO', href: '/employee/pto', icon: ShipWheel, description: null },
            { title: 'Department PTO', href: '/department-pto', icon: Users, description: null },
            { title: 'Holiday', href: '/holidays', icon: Users, description: null },
            { title: 'Timesheet Manager Dash', href: route('time-clock.manager.dashboard'), icon: BookOpenText, description: null },
            { title: 'Timesheet Payroll Dash', href: route('time-clock.payroll.dashboard'), icon: BookOpenText, description: null },
        ]
    },
    {
        title: "Content & Documents",
        items: [
            { title: 'ACS blog Admin', href: '/admin/blog', icon: ShipWheel, description: null },
            { title: 'Company Documents', href: '/employee/documents', icon: BookOpenText, description: null },
            { title: 'Admin Documents', href: '/folders', icon: BookOpenText, description: null },
            { title: 'Product Picture Manager', href: '/product-picture-manager', icon: ImageUp, permission: '', description: null },
        ]
    },
    {
        title: "Organization & People",
        items: [
            { title: 'ACS Org', href: '/organization-chart', icon: Users, roles: '', description: null },
            { title: 'HR Dashboard', href: '/hr/dashboard', icon: Users, description: null },
            { title: 'Vibetrack', href: '/vibetrack', icon: Users, roles: '', description: null },
            { title: 'Vibetrack Admin', href: '/vibetrack/admin', icon: Users, roles: '', description: null },
        ]
    },
    {
        title: "Training & Learning",
        items: [
            // { title: 'Your Training', href: '/training', icon: BookOpenText, description: null },
            // { title: 'Training Dashboard', href: '/admin/reports', icon: BookOpenText, description: null },
            { title: 'Old Training Dashboard', href: route('old-style-training-tracking.index'), icon: BookOpenText, description: null },
        ]
    },
    {
        title: "Tools & Resources",
        items: [
            { title: 'ACS Parts Database', href: '/parts-catalog', icon: Users, roles: '', description: null },
            // { title: 'ACS Organization', href: '/acs-org', icon: Users, permission: '', description: null},
            // { title: 'ACS PermissionTest', href: '/test', icon: Users, permission: 'AdminMenu', description: null },
            // { title: 'ACS RoleTest', href: '/Roletest', icon: Users, roles: '', description: null},
            // { title: 'Articles', href: '/articles', icon: Users, description: null },
            // { title: 'Roles and Permissions', href: '/roles-permissions', icon: Users, description: null },
        ]
    }
];

const footerNavItems: NavItem[] = [
    // { title: 'Repository', href: 'https://github.com/laravel/react-starter-kit', icon: Folder, external: true, description: null },
    // { title: 'Documentation', href: 'https://laravel.com/docs/starter-kits#react', icon: BookOpen, external: true, description: null },
    // { title: 'Shadcn Component explore', href: 'https://shipixen.com/component-explorer-shadcn', icon: BookOpen, external: true, description: null },
    { title: 'Admin Dashboard', href: '/admin', icon: ShieldCheck, roles: '', description: null },

];

const headerNavItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: null, roles: '', description: null },
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

    const hasRole = (roleName: string): boolean => {
        if (!user || !user.roles) {
            return false;
        }
        return user.roles.includes(roleName);
    };

    // Filter individual nav items
    const filterNavItems = (items: NavItem[]): NavItem[] => {
        return items.filter((item) => {
            if (item.roles) {
                return hasRole(item.roles);
            }
            if (item.permission !== undefined) {
                if (item.permission === '') return true; // Explicitly show if permission is empty string
                return can(item.permission);
            }
            return true; // Default to show if no specific role or permission property is present
        });
    };

    // Filter categories and their items
    const filterCategories = (categories: NavCategory[]): NavCategory[] => {
        return categories
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
                    <NavHeader items={filteredHeaderNavItems} className="mt-auto" />
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
                                            {category.title}{" "}
                                            <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                                            <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
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
