import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head} from '@inertiajs/react';
import {PlaceholderPattern} from "@/components/ui/placeholder-pattern";
import BlogFeed from "@/components/BlogFeed";


interface User {
    id: number;
    name: string;
    email: string;
    avatar: string;
}

interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    status: 'draft' | 'published';
    user: User;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    articles: Article[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard({ articles }: Props) {
    // useEcho('orders', 'OrderStatusUpdatedEvent', (e) => {
    //     console.log(e);
    // })

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    <div className="flex flex-col col-span-2 gap-4">

                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                            <BlogFeed articles={articles} limit={5} />
                        {/*<TimeClock />*/}
                        </div>

                    </div>

                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative col-span-2 aspect-video overflow-hidden rounded-xl border">
                        <iframe
                            src="https://calendar.google.com/calendar/embed?src=c_d04929a76af5cbda23fefabe83c2f7fafe68be53c7391c74f28fa1fa93b4e535%40group.calendar.google.com&ctz=America%2FNew_York&color=%23af0000"
                            className="h-full w-full min-w-120"
                            width="auto"
                            height="600"
                            frameBorder="0"
                            scrolling="no"
                        ></iframe>

                    </div>
                    {/* New block added below */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        {/*<div className="relative z-10 p-4">Order Status: {orderStatus}</div>*/}
                    </div>
                    {/* New block added below */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        {/*<div className="relative z-10 p-4">Order Status: {orderStatus}</div>*/}
                    </div>
                    {/* New block added below */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        {/*<div className="relative z-10 p-4">Order Status: {orderStatus}</div>*/}
                    </div>
                    {/* New block added below */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        {/*<div className="relative z-10 p-4">Order Status: {orderStatus}</div>*/}
                    </div>
                </div>
                <div className="border-sidebar-border/70 dark:border-sidebar-border">

                    {/*<PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />*/}
                </div>
            </div>
        </AppLayout>
    );
}
