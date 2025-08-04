import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head} from '@inertiajs/react';
import BlogFeed from "@/components/BlogFeed";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
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
    { day: "10", sales: 18000 },
    { day: "15", sales: 22000 },
    { day: "20", sales: 25000 },
    { day: "25", sales: 28000 },
    { day: "30", sales: 32000 },
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
        color: "hsl(var(--chart-1))",
    },
    repeatSales: {
        label: "Repeat Sales",
        color: "hsl(var(--chart-2))",
    },
    current: {
        label: "Current Month",
        color: "hsl(var(--chart-3))",
    },
    overall: {
        label: "Overall",
        color: "hsl(var(--chart-4))",
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
            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid auto-rows-min gap-2 md:grid-cols-6">
                    {/* Total Sales This Month */}
                    <Card className="border-sidebar-border/70 dark:border-sidebar-border">
                        <CardHeader className="pb-2">
                            <CardDescription>Total Sales This Month</CardDescription>
                            <CardTitle className="text-2xl">${totalSalesThisMonth.toLocaleString()}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[80px] w-full">
                                <AreaChart data={monthlySalesData}>
                                    <Area
                                        dataKey="sales"
                                        type="natural"
                                        fill="var(--color-sales)"
                                        fillOpacity={0.4}
                                        stroke="var(--color-sales)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Total Sales This Year */}
                    <Card className="border-sidebar-border/70 dark:border-sidebar-border">
                        <CardHeader className="pb-2">
                            <CardDescription>Total Sales This Year</CardDescription>
                            <CardTitle className="text-2xl">${(totalSalesThisYear / 1000000).toFixed(1)}M</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[80px] w-full">
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
                        </CardContent>
                    </Card>

                    {/* Total Repeat Sales This Year */}
                    <Card className="border-sidebar-border/70 dark:border-sidebar-border">
                        <CardHeader className="pb-2">
                            <CardDescription>Repeat Sales This Year</CardDescription>
                            <CardTitle className="text-2xl">${(totalRepeatSalesThisYear / 1000000).toFixed(1)}M</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[80px] w-full">
                                <AreaChart data={yearlySalesData}>
                                    <Area
                                        dataKey="repeatSales"
                                        type="natural"
                                        fill="var(--color-repeatSales)"
                                        fillOpacity={0.4}
                                        stroke="var(--color-repeatSales)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Empty placeholder */}
                    <div className="relative aspect-video overflow-hidden rounded-xl">
                    </div>

                    {/* Machine Training Completed Current Month */}
                    <Card className="border-sidebar-border/70 dark:border-sidebar-border">
                        <CardHeader className="pb-2">
                            <CardDescription>Training Completed This Month</CardDescription>
                            <CardTitle className="text-2xl">{trainingCompletedThisMonth}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[80px] w-full">
                                <BarChart data={trainingData}>
                                    <Bar dataKey="current" fill="var(--color-current)" radius={2} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Machine Training Completed Overall */}
                    <Card className="border-sidebar-border/70 dark:border-sidebar-border">
                        <CardHeader className="pb-2">
                            <CardDescription>Training Completed Overall</CardDescription>
                            <CardTitle className="text-2xl">{trainingCompletedOverall.toLocaleString()}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[80px] w-full">
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
                        </CardContent>
                    </Card>

                    <div className="flex flex-col col-span-3 gap-4">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                            <BlogFeed articles={articles} limit={5} />
                        </div>
                    </div>

                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative col-span-3 aspect-video overflow-hidden rounded-xl border">
                        <iframe
                            src="https://calendar.google.com/calendar/embed?src=c_d04929a76af5cbda23fefabe83c2f7fafe68be53c7391c74f28fa1fa93b4e535%40group.calendar.google.com&ctz=America%2FNew_York&color=%23af0000"
                            className="h-full w-full min-w-120"
                            width="auto"
                            height="600"
                            frameBorder="0"
                            scrolling="no"
                        />
                    </div>
                </div>
                <div className="border-sidebar-border/70 dark:border-sidebar-border">
                </div>
            </div>
        </AppLayout>
    );
}
