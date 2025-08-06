import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head} from '@inertiajs/react';
import BlogFeed from "@/components/BlogFeed";

import {ChartConfig, ChartContainer} from "@/components/ui/chart";
import {Area, AreaChart, Bar, BarChart, Line, LineChart} from "recharts";

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
    featured_image: string | null;
    status: 'draft' | 'published' | 'archived';
    user: User;
    published_at: string;
    created_at: string;
    reading_time: number;
    approved_comments_count: number;
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

// Mock data
const monthlySalesData = [
    { day: "1", sales: 12000 },
    { day: "5", sales: 15000 },
    { day: "10", sales: 6000 },
    { day: "15", sales: 20000 },
    { day: "20", sales: 5000 },
    { day: "25", sales: 28000 },
    { day: "30", sales: 22000 },
];

const yearlySalesData = [
    { month: "Jan", sales: 245000, repeatSales: 89000 },
    { month: "Feb", sales: 289000, repeatSales: 112000 },
    { month: "Mar", sales: 321000, repeatSales: 145000 },
    { month: "Apr", sales: 298000, repeatSales: 134000 },
    { month: "May", sales: 367000, repeatSales: 178000 },
    { month: "Jun", sales: 412000, repeatSales: 203000 },
    { month: "Jul", sales: 389000, repeatSales: 189000 },
    { month: "Aug", sales: 445000, repeatSales: 234000 },
];

const trainingData = [
    { week: "Week 1", current: 23, overall: 156 },
    { week: "Week 2", current: 31, overall: 187 },
    { week: "Week 3", current: 28, overall: 215 },
    { week: "Week 4", current: 35, overall: 250 },
];

const chartConfig = {
    sales: {
        label: "Sales",
        color: "var(--chart-1)",
    },
    repeatSales: {
        label: "Repeat Sales",
        color: "var(--chart-2)",
    },
    current: {
        label: "Current Month",
        color: "var(--chart-3)",
    },
    overall: {
        label: "Overall",
        color: "var(--chart-4)",
    },
} satisfies ChartConfig;

export default function Dashboard({ articles }: Props) {
    const totalSalesThisMonth = 32000;
    const totalSalesThisYear = 2766000;
    const totalRepeatSalesThisYear = 1284000;
    const trainingCompletedThisMonth = 117;
    const trainingCompletedOverall = 2847;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-2 sm:p-4">
                {/* Stats Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                    {/* Total Sales This Month */}
                    <div className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-card">
                            <div className="p-4 pb-2">
                                <p className="text-xs sm:text-sm text-muted-foreground">Total Sales This Month</p>
                                <h3 className="text-xl sm:text-2xl font-semibold">${totalSalesThisMonth.toLocaleString()}</h3>
                            </div>
                            <div className="px-4 pb-4">
                                <ChartContainer config={chartConfig} className="h-[60px] sm:h-[80px] w-full">
                                    <LineChart data={monthlySalesData}>
                                        <Line
                                            dataKey="sales"
                                            type="natural"
                                            fill="var(--color-sales)"
                                            fillOpacity={0.4}
                                            stroke="var(--color-sales)"
                                            strokeWidth={1.5}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </div>
                        </div>
                    </div>

                    {/* Total Sales This Year */}
                    <div className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-card">
                            <div className="p-4 pb-2">
                                <p className="text-xs sm:text-sm text-muted-foreground">Total Sales This Year</p>
                                <h3 className="text-xl sm:text-2xl font-semibold">${(totalSalesThisYear / 1000000).toFixed(1)}M</h3>
                            </div>
                            <div className="px-4 pb-4">
                                <ChartContainer config={chartConfig} className="h-[60px] sm:h-[80px] w-full">
                                    <LineChart data={yearlySalesData}>
                                        <Line
                                            dataKey="sales"
                                            type="monotone"
                                            stroke="var(--color-sales)"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </div>
                        </div>
                    </div>

                    {/* Total Repeat Sales This Year */}
                    <div className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-card">
                            <div className="p-4 pb-2">
                                <p className="text-xs sm:text-sm text-muted-foreground">Repeat Sales This Year</p>
                                <h3 className="text-xl sm:text-2xl font-semibold">${(totalRepeatSalesThisYear / 1000000).toFixed(1)}M</h3>
                            </div>
                            <div className="px-4 pb-4">
                                <ChartContainer config={chartConfig} className="h-[60px] sm:h-[80px] w-full">
                                    <LineChart data={yearlySalesData}
                                               margin={{
                                                   top: 5,
                                                   right: 10,
                                                   left: 10,
                                                   bottom: 0,
                                               }}
                                    >
                                        <Line
                                            dataKey="repeatSales"
                                            type="monotone"
                                            strokeWidth={2}
                                            activeDot={{
                                                r: 6,
                                                fill: "var(--color-sales)",
                                            }}
                                            stroke="var(--color-sales)"
                                            dot={false}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </div>
                        </div>
                    </div>

                    {/* Empty placeholder - hidden on mobile */}
                    <div className="hidden xl:block col-span-1">
                    </div>

                    {/* Machine Training Completed Current Month */}
                    <div className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-card">
                            <div className="p-4 pb-2">
                                <p className="text-xs sm:text-sm text-muted-foreground">Training This Month</p>
                                <h3 className="text-xl sm:text-2xl font-semibold">{trainingCompletedThisMonth}</h3>
                            </div>
                            <div className="px-4 pb-4">
                                <ChartContainer config={chartConfig} className="h-[60px] sm:h-[80px] w-full">
                                    <BarChart data={trainingData}>
                                        <Bar dataKey="current" fill="var(--color-current)" radius={2} />
                                    </BarChart>
                                </ChartContainer>
                            </div>
                        </div>
                    </div>

                    {/* Machine Training Completed Overall */}
                    <div className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-card">
                            <div className="p-4 pb-2">
                                <p className="text-xs sm:text-sm text-muted-foreground">Training Overall</p>
                                <h3 className="text-xl sm:text-2xl font-semibold">{trainingCompletedOverall.toLocaleString()}</h3>
                            </div>
                            <div className="px-4 pb-4">
                                <ChartContainer config={chartConfig} className="h-[60px] sm:h-[80px] w-full">
                                    <AreaChart data={trainingData}>
                                        <Area
                                            dataKey="overall"
                                            type="natural"
                                            fill="var(--color-overall)"
                                            fillOpacity={0.4}
                                            stroke="var(--color-overall)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                    {/* Blog Feed */}
                    <div className="order-1 lg:order-1">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border h-full overflow-hidden rounded-xl border bg-card">
                            <BlogFeed articles={articles} limit={5} />
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className="order-2 lg:order-2">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative h-full min-h-[400px] lg:min-h-[500px] overflow-hidden rounded-xl border bg-card">
                            <div className="h-full w-full">
                                <iframe
                                    src="https://calendar.google.com/calendar/embed?src=c_d04929a76af5cbda23fefabe83c2f7fafe68be53c7391c74f28fa1fa93b4e535%40group.calendar.google.com&ctz=America%2FNew_York&color=%23af0000"
                                    className="h-full w-full"
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    scrolling="no"
                                    title="Google Calendar"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
