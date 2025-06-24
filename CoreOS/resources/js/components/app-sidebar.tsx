import AdminCommandDialog from '@/components/admin-command';
import {NavFooter} from '@/components/nav-footer';
import {NavMain} from '@/components/nav-main';
import {NavUser} from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from '@/components/ui/sidebar';
import {type NavItem, type User} from '@/types'; // Ensure NavItem can have 'roles?: string' and 'permission?: string'
import {Link, usePage} from '@inertiajs/react';
import {BookOpen, Folder, LayoutGrid, ShieldCheck, ShipWheel, Users} from 'lucide-react';
import AppLogo from './app-logo';

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

const mainNavItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid, description:null },
    { title: 'Your PTO', href: '/employee/pto', icon: ShipWheel, description:null },
    // { title: 'Billy The AI', href: '/billy', icon: BotMessageSquareIcon },
    // { title: 'Product Picture Manager', href: '/ppm', icon: ImageUp, permission: '' }, // Shows if permission is empty string
    // { title: 'ACS Organization', href: '/acs-org', icon: Users, permission: '' }, // Shows if permission is empty string
    // { title: 'ACS PermissionTest', href: '/test', icon: Users, permission: 'AdminMenu' },
    // { title: 'ACS RoleTest', href: '/Roletest', icon: Users, roles: '' },
    { title: 'ACS Parts Database', href: '/parts-catalog', icon: Users, roles: '', description:null },
    // { title: 'ACS Org', href: '/organization-chart', icon: Users, roles: '' },

    { title: 'Department PTO', href: '/department-pto', icon: Users, description:null },
    { title: 'holiday', href: '/holidays', icon: Users, description:null },
    { title: 'HR Dashboard', href: '/hr/dashboard', icon: Users, description:null },
    { title: 'Articles', href: '/articles', icon: Users, description:null },
];

const footerNavItems: NavItem[] = [
    { title: 'Repository', href: 'https://github.com/laravel/react-starter-kit', icon: Folder, external: true, description:null },
    { title: 'Documentation', href: 'https://laravel.com/docs/starter-kits#react', icon: BookOpen, external: true, description:null },
    { title: 'Admin Dashboard', href: '/admin', icon: ShieldCheck, roles: '', description:null },
];

export function AppSidebar() {
    const { props } = usePage<PageProps>();
    const user = props.auth?.user;

    const can = (permissionName: string): boolean => {
        if (!user || !user.permissions) {
            return false;
        }
        return user.permissions.includes(permissionName);
    };

    const hasRole = (roleName: string): boolean => {
        if (!user || !user.roles) {
            // console.log(`HASROLE: User or roles undefined for '${roleName}'`);
            return false;
        }
        // console.log(`HASROLE: Checking for role '${roleName}'. User roles:`, user.roles);
        return user.roles.includes(roleName);
    };

    // Corrected filtering logic
    const filterNavItems = (items: NavItem[]): NavItem[] => {
        return items.filter((item) => {
            if (item.roles) {
                // 1. Check for roles first
                return hasRole(item.roles);
            }
            if (item.permission !== undefined) {
                // 2. Then check for permissions if defined
                if (item.permission === '') return true; // Explicitly show if permission is an empty string
                return can(item.permission);
            }
            return true; // 3. Default to show if no specific role or permission property is present
        });
    };

    const filteredMainNavItems = filterNavItems(mainNavItems);
    const filteredFooterNavItems = filterNavItems(footerNavItems);

    // For AdminCommandDialog, which you want by role.
    // The HandleInertiaRequests.php is correctly sending roles and permissions.
    const ROLE_FOR_ADMIN_DIALOG = '';

    return (
        <Sidebar collapsible="icon" variant="inset">
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
                <NavMain items={filteredMainNavItems} />
            </SidebarContent>

            {/* This check should now work correctly since HandleInertiaRequests.php is sending roles */}
            {user && hasRole(ROLE_FOR_ADMIN_DIALOG) && <AdminCommandDialog />}

            {/* For debugging the AdminCommandDialog visibility:
            <div className="p-2 text-xs">
                <p>User Logged In: {user ? 'Yes' : 'No'}</p>
                {user && <p>User Roles: {JSON.stringify(user.roles)}</p>}
                {user && <p>User Permissions: {JSON.stringify(user.permissions)}</p>}
                <p>Has '{ROLE_FOR_ADMIN_DIALOG}' Role: {user && hasRole(ROLE_FOR_ADMIN_DIALOG) ? 'Yes' : 'No'}</p>
            </div>
            */}

            <SidebarFooter>
                <NavFooter items={filteredFooterNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
