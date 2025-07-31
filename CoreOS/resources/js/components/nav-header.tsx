import {Icon} from '@/components/icon';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from '@/components/ui/sidebar';
import {type NavItem, SharedData} from '@/types';
import {Link as InertiaLink, usePage} from '@inertiajs/react';
import {type ComponentPropsWithoutRef} from 'react';

export function NavHeader({
                              items,
                              currentUrl,
                              className,
                              ...props
                          }: ComponentPropsWithoutRef<typeof SidebarGroup> & {
    items: NavItem[];
    currentUrl?: string;
}) {
    const { isImpersonating } = usePage<SharedData>().props;

    return (
        <SidebarGroupHeader {...props} className={`group-data-[collapsible=icon]:p-0 ${className || ''}`}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={currentUrl ? currentUrl.startsWith(item.href) : false}
                                className="text-neutral-900 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                            >
                                {item.external ? (
                                    <a href={item.href} target="_blank" rel="noopener noreferrer">
                                        {item.icon && <Icon iconNode={item.icon} className="h-5 w-5" />}
                                        <span>{item.title}</span>
                                    </a>
                                ) : (
                                    // Inertia Link for internal navigation
                                    <InertiaLink href={item.href} prefetch>
                                        {' '}
                                        {item.icon && <Icon iconNode={item.icon} className="h-5 w-5" />}
                                        <span>{item.title}</span>
                                    </InertiaLink>
                                )}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroupHeader>
    );
}
