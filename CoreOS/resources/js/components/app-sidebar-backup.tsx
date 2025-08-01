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
import {BookOpenText, BotMessageSquareIcon, ImageUp, LayoutGrid, ShieldCheck, ShipWheel, Users} from 'lucide-react';
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
    { title: 'My Time Clock', href: '/time-clock/employee', icon:BookOpenText , description:null },
    { title: 'Your PTO', href: '/employee/pto', icon: ShipWheel, description:null },
    { title: 'ACS blog Admin', href: '/admin/blog', icon: ShipWheel, description:null },
    { title: 'Billy The AI', href: '/billy', icon: BotMessageSquareIcon, description:null },
    { title: 'Product Picture Manager', href: '/product-picture-manager', icon: ImageUp, permission: '', description:null }, // Shows if permission is empty string
    // { title: 'ACS Organization', href: '/acs-org', icon: Users, permission: '', description:null}, // Shows if permission is empty string
    // { title: 'ACS PermissionTest', href: '/test', icon: Users, permission: 'AdminMenu', description:null },
    // { title: 'ACS RoleTest', href: '/Roletest', icon: Users, roles: '', description:null},
    {title: 'Vibetrack', href: '/vibetrack', icon: Users, roles: '', description:null},
    {title: 'Vibetrack Admin', href: '/vibetrack/admin', icon: Users, roles: '', description:null},
    { title: 'ACS Parts Database', href: '/parts-catalog', icon: Users, roles: '', description:null },
    { title: 'ACS Org', href: '/organization-chart', icon: Users, roles: '',description:null },
    { title: 'Department PTO', href: '/department-pto', icon: Users, description:null },
    { title: 'holiday', href: '/holidays', icon: Users, description:null },
    { title: 'HR Dashboard', href: '/hr/dashboard', icon: Users, description:null },
    // { title: 'Articles', href: '/articles', icon: Users, description:null },
    // { title: 'Roles and Permissions', href: '/roles-permissions', icon: Users, description:null },
    { title: 'Company Documents', href: '/employee/documents', icon:BookOpenText , description:null },
    { title: 'Admin Documents', href: '/folders', icon:BookOpenText , description:null },
    // New Training Stuff Not in use right now, Use Old style for right now.
    // { title: 'Your Training', href: '/training', icon:BookOpenText , description:null },
    // { title: 'Training Dashboard', href: '/admin/reports', icon:BookOpenText , description:null },
    { title: 'Old Training Dashboard', href: route('old-style-training-tracking.index'), icon:BookOpenText , description:null },
    // { title: 'My Timesheet', href: route('time-clock.employee'), icon:BookOpenText , description:null },


    { title: 'Timesheet Manager Dash', href: route('time-clock.manager.dashboard'), icon:BookOpenText , description:null },
    { title: 'Timesheet Payroll Dash', href: route('time-clock.payroll.dashboard'), icon:BookOpenText , description:null },

];

const footerNavItems: NavItem[] = [
    // { title: 'Repository', href: 'https://github.com/laravel/react-starter-kit', icon: Folder, external: true, description:null },
    // { title: 'Documentation', href: 'https://laravel.com/docs/starter-kits#react', icon: BookOpen, external: true, description:null },
    // { title: 'Shadcn Component explore', href: 'https://shipixen.com/component-explorer-shadcn', icon: BookOpen, external: true, description:null },
    { title: 'Admin Dashboard', href: '/admin', icon: ShieldCheck, roles: '', description:null },
    { title: 'article Dashboard', href: '/article', icon: ShieldCheck, roles: '', description:null },
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
