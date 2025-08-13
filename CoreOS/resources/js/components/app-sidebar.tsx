import * as React from "react"
import AdminCommandDialog from '@/components/admin-command';
import {NavFooter} from '@/components/nav-footer';
import {NavUser} from '@/components/nav-user';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
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
import {Link as InertiaLink, Link, usePage} from '@inertiajs/react';
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

/* ---------------------------------------------
 * URL helpers
 * -------------------------------------------*/
const isExternalUrl = (href: string) => /^https?:\/\//i.test(href);

const normalizePath = (url: string) =>
    url.replace(/\/+$/, '').split('?')[0].split('#')[0];

const isActiveUrl = (currentUrl: string, itemHref: string): boolean => {
    if (isExternalUrl(itemHref) || itemHref === '#') return false;

    const cleanCurrent = normalizePath(currentUrl);
    const cleanItem = normalizePath(itemHref);

    // exact match or sub-path (so /holidays matches /holidays and /holidays/new)
    return cleanCurrent === cleanItem || cleanCurrent.startsWith(`${cleanItem}/`);
};

/* ---------------------------------------------
 * Link component that works with asChild
 * and keeps types correct for Inertia vs <a>
 * -------------------------------------------*/
type InternalProps = React.ComponentPropsWithoutRef<typeof InertiaLink>;
type ExternalProps = React.ComponentPropsWithoutRef<'a'>;

type NavigationLinkProps =
    | ({ href: string; external?: false } & Omit<InternalProps, 'href'>)
    | ({ href: string; external: true } & Omit<ExternalProps, 'href'>);

export const NavigationLink = React.forwardRef<any, NavigationLinkProps>(
    ({ href, external, ...rest }, ref) => {
        if (external ?? isExternalUrl(href)) {
            return (
                <a

                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    ref={ref as React.Ref<HTMLAnchorElement>}
                    {...(rest as Omit<ExternalProps, 'href'>)}
                />
            );
        }
        return <InertiaLink href={href} ref={ref} {...(rest as Omit<InternalProps, 'href'>)} />;
    }
);
NavigationLink.displayName = 'NavigationLink';

/* ---------------------------------------------
 * Icon map
 * -------------------------------------------*/
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
        footer: [],
    };

    const can = (permissionName: string): boolean => {
        if (!user || !user.permissions) return false;
        return user.permissions.includes(permissionName);
    };

    const hasRole = (roles: string | string[]): boolean => {
        if (!user || !user.roles) return false;

        const userRoleNames = user.roles;

        if (typeof roles === 'string') {
            if (roles === '') return true;

            if (roles.startsWith('[') && roles.endsWith(']')) {
                const roleString = roles.slice(1, -1);
                const roleArray = roleString.split(',').map((role) => role.trim());
                return roleArray.some((role) => userRoleNames.includes(role));
            }

            return userRoleNames.includes(roles);
        }

        if (Array.isArray(roles)) {
            return roles.some((role) => userRoleNames.includes(role));
        }

        return false;
    };

    // Convert NavigationItem -> NavItem
    const convertToNavItem = (item: NavigationItem): NavItem => {
        const IconComponent =
            item.icon && iconMap[item.icon] ? iconMap[item.icon] : Users;

        let rolesString: string | undefined = undefined;
        if (item.roles && item.roles.length > 0) {
            rolesString = item.roles.length === 1 ? item.roles[0] : `[${item.roles.join(', ')}]`;
        }

        return {
            title: item.title,
            href: item.href,
            icon: IconComponent,
            roles: rolesString,
            permission: item.permissions?.[0],
            description: item.description || null,
            external: isExternalUrl(item.href),
        };
    };

    // Convert NavigationItem -> NavCategory
    const convertToNavCategory = (item: NavigationItem): NavCategory => {
        const IconComponent =
            item.icon && iconMap[item.icon] ? iconMap[item.icon] : Users;

        let rolesString: string | undefined = undefined;
        if (item.roles && item.roles.length > 0) {
            rolesString = item.roles.length === 1 ? item.roles[0] : `[${item.roles.join(', ')}]`;
        }

        return {
            title: item.title,
            icon: IconComponent,
            roles: rolesString,
            permission: item.permissions?.[0],
            items: item.children ? item.children.map(convertToNavItem) : [],
        };
    };

    // Access checks
    const canAccessNavigationItem = (item: NavigationItem): boolean => {
        if (!user) return true;

        if ((!item.roles || item.roles.length === 0) && (!item.permissions || item.permissions.length === 0)) {
            return true;
        }

        if (item.roles && item.roles.length > 0) {
            const hasRequiredRole = item.roles.some((role) => hasRole(role));
            if (hasRequiredRole) return true;
        }

        if (item.permissions && item.permissions.length > 0) {
            const hasRequiredPermission = item.permissions.some((permission) => can(permission));
            if (hasRequiredPermission) return true;
        }

        if ((item.roles && item.roles.length > 0) || (item.permissions && item.permissions.length > 0)) {
            return false;
        }

        return true;
    };

    const filterNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
        return items
            .filter((item) => canAccessNavigationItem(item))
            .map((item) => ({
                ...item,
                children: item.children ? item.children.filter((child) => canAccessNavigationItem(child)) : [],
            }))
            .filter((item) => {
                if (item.type === 'category' && item.href === '#') {
                    return item.children && item.children.length > 0;
                }
                return true;
            });
    };

    // Processed nav data
    const filteredHeaderItems = filterNavigationItems(navigationData.header).map(convertToNavItem);
    const filteredCategoryItems = filterNavigationItems(navigationData.categories).map(convertToNavCategory);
    const filteredFooterItems = filterNavigationItems(navigationData.footer).map(convertToNavItem);

    // Helpers for auto-expansion
    const categoryContainsActivePage = (category: NavCategory): boolean =>
        category.items.some((item) => isActiveUrl(currentUrl, item.href));

    const footerContainsActivePage = (): boolean =>
        filteredFooterItems.some((item) => isActiveUrl(currentUrl, item.href));

    const headerContainsActivePage = (): boolean =>
        filteredHeaderItems.some((item) => isActiveUrl(currentUrl, item.href));

    const shouldExpandCategory = (category: NavCategory, index: number): boolean => {
        if (
            index === 0 &&
            !categoryContainsActivePage(category) &&
            !footerContainsActivePage() &&
            !headerContainsActivePage()
        ) {
            return true;
        }
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
                                            {category.title}
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
                                                            isActive={isActiveUrl(currentUrl, item.href)}
                                                        >
                                                            <NavigationLink href={item.href} external={item.external}>
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

            {user && hasRole(ROLE_FOR_ADMIN_DIALOG) && <AdminCommandDialog />}

            <SidebarFooter>
                <NavFooter items={filteredFooterItems} currentUrl={currentUrl} className="mt-auto" />
                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
