import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import {ImpersonationBanner} from "@/components/impersonation-banner";
import { usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { isImpersonating } = usePage<SharedData>().props;

    return (
        <header
            className={`border-sidebar-border/50 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4 ${
                isImpersonating ? 'bg-red-600 text-white' : ''
            }`}
        >
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <ImpersonationBanner variant="header" />
        </header>
    );
}

