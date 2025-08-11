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
    Bell,
    BookOpenText,
    BotMessageSquareIcon,
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    Cog,
    DollarSign,
    Download,
    Edit,
    FileText,
    GraduationCap,
    Home,
    ImageUp,
    LayoutDashboard,
    LayoutList,
    LucideIcon,
    Mail,
    Minus,
    Package,
    Plus,
    Power,
    Save,
    Search,
    Settings,
    ShieldCheck,
    ShipWheel,
    Smartphone,
    Trash,
    Upload,
    Users,
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
    navigationData?: {
        header: NavigationItem[];
        categories: NavigationItem[];
        footer: NavigationItem[];
    };
    [key: string]: unknown;
}

interface NavigationItem {
    id: number;
    title: string;
    href: string;
    icon?: string;
    description?: string;
    parent_id?: number;
    type: 'header' | 'category' | 'footer';
    sort_order: number;
    is_active: boolean;
    roles?: string[];
    permissions?: string[];
    children?: NavigationItem[];
}

interface NavCategory {
    title: string;
    icon: LucideIcon;
    items: NavItem[];
    roles?: string | string[];
    permission?: string;
}

// Utility functions for URL handling
const isExternalUrl = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://');
};

const isInternalUrl = (url: string): boolean => {
    return url.startsWith('/') || url === '#';
};

// Icon mapping - maps string names to actual Lucide icons
const iconMap: Record<string, LucideIcon> = {
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
    Package,
    ShieldCheck,
    ShipWheel,
    Smartphone,
    Users,
    Home,
    Settings,
    Bell,
    Calendar,
    Mail,
    Search,
    Plus,
    Minus,
    Edit,
    Trash,
    Save,
    Download,
    Upload,
    Power,
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const page = usePage<PageProps>();
    const user = page.props.auth?.user;
    const currentUrl = page.url;

    // Get navigation data from props or use empty defaults
    const navigationData = page.props.navigationData || {
        header: [],
        categories: [],
        footer: []
    };

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

        const userRoleNames = user.roles;

        if (typeof roles === 'string') {
            if (roles === '') return true;

            if (roles.startsWith('[') && roles.endsWith(']')) {
                const roleString = roles.slice(1, -1);
                const roleArray = roleString.split(',').map(role => role.trim());
                return roleArray.some(role => userRoleNames.includes(role));
            }

            return userRoleNames.includes(roles);
        }

        if (Array.isArray(roles)) {
            return roles.some(role => userRoleNames.includes(role));
        }

        return false;
    };

    // Convert NavigationItem to NavItem format
    const convertToNavItem = (item: NavigationItem): NavItem => {
        const IconComponent = item.icon && iconMap[item.icon] ? iconMap[item.icon] : Users; // Default icon

        // Convert roles array back to your original string format
        let rolesString: string | undefined = undefined;
        if (item.roles && item.roles.length > 0) {
            if (item.roles.length === 1) {
                rolesString = item.roles[0];
            } else {
                rolesString = `[${item.roles.join(', ')}]`;
            }
        }

        return {
            title: item.title,
            href: item.href,
            icon: IconComponent,
            roles: rolesString,
            permission: item.permissions?.[0], // Take first permission for compatibility
            description: item.description || null,
            external: isExternalUrl(item.href), // Set external property based on URL
        };
    };

    // Convert NavigationItem to NavCategory format
    const convertToNavCategory = (item: NavigationItem): NavCategory => {
        const IconComponent = item.icon && iconMap[item.icon] ? iconMap[item.icon] : Users; // Default icon

        // Convert roles array back to your original string format
        let rolesString: string | undefined = undefined;
        if (item.roles && item.roles.length > 0) {
            if (item.roles.length === 1) {
                rolesString = item.roles[0];
            } else {
                rolesString = `[${item.roles.join(', ')}]`;
            }
        }

        return {
            title: item.title,
            icon: IconComponent,
            roles: rolesString,
            permission: item.permissions?.[0], // Take first permission for compatibility
            items: item.children ? item.children.map(convertToNavItem) : [],
        };
    };

    // Check if user can access navigation item
    const canAccessNavigationItem = (item: NavigationItem): boolean => {
        if (!user) return true;

        // If no restrictions, allow access
        if ((!item.roles || item.roles.length === 0) && (!item.permissions || item.permissions.length === 0)) {
            return true;
        }

        // Check roles
        if (item.roles && item.roles.length > 0) {
            const hasRequiredRole = item.roles.some(role => hasRole(role));
            if (hasRequiredRole) return true;
        }

        // Check permissions
        if (item.permissions && item.permissions.length > 0) {
            const hasRequiredPermission = item.permissions.some(permission => can(permission));
            if (hasRequiredPermission) return true;
        }

        // If we have restrictions but don't meet them, deny access
        if ((item.roles && item.roles.length > 0) || (item.permissions && item.permissions.length > 0)) {
            return false;
        }

        return true;
    };

    // Filter navigation items based on user access
    const filterNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
        return items
            .filter(item => canAccessNavigationItem(item))
            .map(item => ({
                ...item,
                children: item.children ? item.children.filter(child => canAccessNavigationItem(child)) : []
            }))
            .filter(item => {
                // For categories, only show if they have accessible children or are not just containers
                if (item.type === 'category' && item.href === '#') {
                    return item.children && item.children.length > 0;
                }
                return true;
            });
    };

    // Process navigation data
    const filteredHeaderItems = filterNavigationItems(navigationData.header).map(convertToNavItem);
    const filteredCategoryItems = filterNavigationItems(navigationData.categories).map(convertToNavCategory);
    const filteredFooterItems = filterNavigationItems(navigationData.footer).map(convertToNavItem);

    // Check if a category contains the active page
    const categoryContainsActivePage = (category: NavCategory): boolean => {
        return category.items.some(item => !isExternalUrl(item.href) && currentUrl.startsWith(item.href));
    };

    // Check if any footer nav item is active
    const footerContainsActivePage = (): boolean => {
        return filteredFooterItems.some(item => !isExternalUrl(item.href) && currentUrl.startsWith(item.href));
    };

    // Check if any header nav item is active
    const headerContainsActivePage = (): boolean => {
        return filteredHeaderItems.some(item => !isExternalUrl(item.href) && currentUrl.startsWith(item.href));
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

    // Component to render navigation link (internal vs external)
    const NavigationLink = ({
                                href,
                                children,
                                isActive = false,
                                className = ""
                            }: {
        href: string;
        children: React.ReactNode;
        isActive?: boolean;
        className?: string;
    }) => {
        if (isExternalUrl(href)) {
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                >
                    {children}
                </a>
            );
        }

        return (
            <Link href={href} prefetch className={className}>
                {children}
            </Link>
        );
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
                    <NavHeader items={filteredHeaderItems} currentUrl={currentUrl} className="mt-auto" />
                    <SidebarMenu>
                        {filteredCategoryItems.map((category, index) => (
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
                                                            isActive={!isExternalUrl(item.href) && currentUrl.startsWith(item.href)}
                                                        >
                                                            <NavigationLink href={item.href}>
                                                                {item.icon && <item.icon />}
                                                                <span>{item.title}</span>
                                                            </NavigationLink>
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
                <NavFooter items={filteredFooterItems} currentUrl={currentUrl} className="mt-auto" />
                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
