import { Check, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';

export function Calendars({
    calendars,
}: {
    calendars: {
        name: string;
        items: string[];
    }[];
}) {
    return (
        <>
            {calendars.map((calendar, index) => (
                <React.Fragment key={calendar.name}>
                    <SidebarGroup key={calendar.name} className="py-0">
                        <Collapsible defaultOpen={index === 0} className="group/collapsible">
                            <SidebarGroupLabel
                                asChild
                                className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-sm"
                            >
                                <CollapsibleTrigger>
                                    {calendar.name}{' '}
                                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {calendar.items.map((item, index) => (
                                            <SidebarMenuItem key={item}>
                                                <SidebarMenuButton>
                                                    <div
                                                        data-active={index < 2}
                                                        className="group/calendar-item border-sidebar-border text-sidebar-primary-foreground data-[active=true]:border-sidebar-primary data-[active=true]:bg-sidebar-primary flex aspect-square size-4 shrink-0 items-center justify-center rounded-xs border"
                                                    >
                                                        <Check className="hidden size-3 group-data-[active=true]/calendar-item:block" />
                                                    </div>
                                                    {item}
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </CollapsibleContent>
                        </Collapsible>
                    </SidebarGroup>
                    <SidebarSeparator className="mx-0" />
                </React.Fragment>
            ))}
        </>
    );
}
