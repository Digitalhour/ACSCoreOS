import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head} from '@inertiajs/react';
import BlogFeed from "@/components/BlogFeed";
import {useEffect, useState} from 'react';

import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {Line, LineChart, XAxis} from "recharts";

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

interface SalesData {
    day: string;
    sales: number;
    target: number;
}

interface YearlySalesData {
    month: string;
    sales: number;
    repeatSales: number;
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

const chartConfig = {
    sales: {
        label: " Actual Sales",
        color: "var(--chart-1)",
    },
    target: {
        label: " Target",
        color: "var(--chart-5)",
    },
    repeatSales: {
        label: " Repeat Sales",
        color: "var(--chart-2)",
    },
    current: {
        label: " Current Month",
        color: "var(--chart-3)",
    },
    overall: {
        label: " Overall",
        color: "var(--chart-4)",
    },
} satisfies ChartConfig;

export default function Dashboard({ articles }: Props) {
    const [monthlySalesData, setMonthlySalesData] = useState<SalesData[]>([]);
    const [totalSalesThisMonth, setTotalSalesThisMonth] = useState<number>(0);
    const [targetSalesThisMonth, setTargetSalesThisMonth] = useState<number>(0);
    const [yearlySalesData, setYearlySalesData] = useState<YearlySalesData[]>([]);
    const [totalSalesThisYear, setTotalSalesThisYear] = useState<number>(0);
    const [totalRepeatSalesThisYear, setTotalRepeatSalesThisYear] = useState<number>(0);

    useEffect(() => {
        // Get current month date range
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch monthly sales data
        fetch(`/dashboard/monthly-sales-data?start_date=${startDateStr}&end_date=${endDateStr}`)
            .then(response => response.json())
            .then((data: SalesData[]) => {
                setMonthlySalesData(data);
                const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
                const totalTarget = data.reduce((sum, item) => sum + item.target, 0);
                setTotalSalesThisMonth(totalSales);
                setTargetSalesThisMonth(totalTarget);
            })
            .catch(error => console.error('Error fetching sales data:', error));

        // Fetch yearly sales data
        fetch(`/dashboard/yearly-sales-data?year=${now.getFullYear()}`)
            .then(response => response.json())
            .then((data: YearlySalesData[]) => {
                setYearlySalesData(data);
                const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
                const totalRepeatSales = data.reduce((sum, item) => sum + item.repeatSales, 0);
                setTotalSalesThisYear(totalSales);
                setTotalRepeatSalesThisYear(totalRepeatSales);
            })
            .catch(error => console.error('Error fetching yearly sales data:', error));
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full max-h-screen flex-col gap-4 rounded-xl p-2 sm:p-4">
                {/* Stats Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                    {/* Total Sales This Month */}
                    <div className="col-span-1 sm:col-span-1 lg:col-span-3 xl:col-span-3">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-card">
                            <div className="p-4 pb-2">
                                <p className="text-xs sm:text-sm text-muted-foreground">Total Sales This Month</p>
                                <h3 className="text-xl sm:text-2xl font-semibold">${totalSalesThisMonth.toLocaleString()}</h3>
                            </div>
                            <div className="px-4 pb-4">
                                <ChartContainer config={chartConfig} className="h-[80px] sm:h-[100px] w-full">
                                    <LineChart
                                        data={monthlySalesData}
                                        margin={{
                                            top: 5,
                                            right: 10,
                                            left: 10,
                                            bottom: 25,
                                        }}
                                    >
                                        <XAxis
                                            dataKey="day"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <ChartTooltip
                                            cursor={{ stroke: "var(--color-sales)", strokeWidth: 1, strokeDasharray: "3 3" }}
                                            content={<ChartTooltipContent
                                                labelFormatter={(value) => `Day ${value}`}
                                                formatter={(value: number, name: string) => [
                                                    `$${value.toLocaleString()}`,
                                                    chartConfig[name as keyof typeof chartConfig]?.label || name
                                                ]}
                                            />}
                                        />
                                        <Line
                                            dataKey="sales"
                                            type="monotone"
                                            stroke="var(--color-sales)"
                                            strokeWidth={2}
                                            dot={{ r: 2, fill: "var(--color-sales)" }}
                                            activeDot={{ r: 4, fill: "var(--color-sales)", stroke: "white", strokeWidth: 2 }}
                                        />
                                        <Line
                                            dataKey="target"
                                            type="monotone"
                                            stroke="var(--color-target)"
                                            strokeWidth={1.5}
                                            strokeDasharray="3 3"
                                            dot={false}
                                            activeDot={{ r: 3, fill: "var(--color-target)" }}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </div>
                        </div>
                    </div>

                    {/* Total Sales This Year */}
                    <div className="col-span-3 sm:col-span-1 lg:col-span-3 xl:col-span-3">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-card">
                            <div className="p-4 pb-2">
                                <p className="text-xs sm:text-sm text-muted-foreground">Total Sales This Year</p>
                                <h3 className="text-xl sm:text-2xl font-semibold">${(totalSalesThisYear / 1000000).toFixed(1)}M</h3>
                            </div>
                            <div className="px-4 pb-4">
                                <ChartContainer config={chartConfig} className="h-[80px] sm:h-[100px] w-full">
                                    <LineChart
                                        data={yearlySalesData}
                                        margin={{
                                            top: 5,
                                            right: 10,
                                            left: 10,
                                            bottom: 25,
                                        }}
                                    >
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <ChartTooltip
                                            cursor={{ stroke: "var(--color-sales)", strokeWidth: 1, strokeDasharray: "3 3" }}
                                            content={<ChartTooltipContent
                                                labelFormatter={(value) => `${value}`}
                                                formatter={(value, name) => [
                                                    `$${Number(value).toLocaleString()}`,
                                                    chartConfig[name as keyof typeof chartConfig]?.label || name
                                                ]}
                                            />}
                                        />
                                        <Line
                                            dataKey="sales"
                                            type="monotone"
                                            stroke="var(--color-sales)"
                                            strokeWidth={2}
                                            dot={{ r: 2, fill: "var(--color-sales)" }}
                                            activeDot={{ r: 4, fill: "var(--color-sales)", stroke: "white", strokeWidth: 2 }}
                                        />
                                    </LineChart>
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
