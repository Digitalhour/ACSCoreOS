import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head} from '@inertiajs/react';
import BlogFeed from "@/components/BlogFeed";
import React, {useEffect, useState} from 'react';

import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent
} from "@/components/ui/chart";
import {Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis} from "recharts";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";

import {usePermission} from "@/hooks/usePermission";
import DashboardTimeClock from "@/components/DashboardTimeClock";
import {TimeclockPermissionsEnum} from "@/types/permissions";

interface User {
    id: number;
    name: string;
    email: string;
    avatar: string;
    first_name: string;
    last_name: string;
    phone: string;
    is_active: boolean;
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
    grossSales: number;
    returns: number;
    cancelled: number;
    netSales: number;
    target: number;
}

interface YearlySalesData {
    month: string;
    sales: number;
    repeatSales: number;
}

// Add TimeClock-related interfaces
interface TimeClock {
    id: number;
    user_id: number;
    punch_type: 'work' | 'break';
    break_type_id?: number;
    clock_in_at: string;
    clock_out_at: string | null;
    regular_hours: number;
    overtime_hours: number;
    notes: string | null;
    status: 'active' | 'completed' | 'pending_approval';
    location_data?: any;
    breakType?: BreakType;
}

interface BreakType {
    id: number;
    name: string;
    label: string;
    description: string;
    is_paid: boolean;
    max_duration_minutes: number | null;
    is_active: boolean;
}

interface CurrentStatus {
    is_clocked_in: boolean;
    is_on_break: boolean;
    current_work_punch: TimeClock | null;
    current_break_punch: TimeClock | null;
    last_punch: TimeClock | null;
}

interface Props {
    articles: Article[];
    // Add these new props for TimeClock (make them optional initially)
    currentStatus?: CurrentStatus;
    breakTypes?: BreakType[];
    User?: User; // Update User interface to include required fields
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

const chartConfig = {
    netSales: {
        label: " Net Sales",
        color: "var(--chart-1-red)",
    },
    returns: {
        label: " Returns",
        color: "var(--chart-2-red)",
    },
    grossSales: {
        label: " Gross Sales",
        color: "var(--chart-3-red)",
    },
    target: {
        label: " Target",
        color: "var(--chart-4-red)",
    },
    sales: {
        label: " Sales",
        color: "var(--chart-1-red)",
    },
    repeatSales: {
        label: " Repeat Sales",
        color: "var(--chart-3-red)",
    },
} satisfies ChartConfig;

export default function Dashboard({
                                      articles,
                                      currentStatus,
                                      breakTypes = [],
                                      User
                                  }: Props) {
    const [monthlySalesData, setMonthlySalesData] = useState<SalesData[]>([]);
    const [totalNetSales, setTotalNetSales] = useState<number>(0);
    const [totalGrossSales, setTotalGrossSales] = useState<number>(0);
    const [totalReturns, setTotalReturns] = useState<number>(0);
    const [targetSalesThisMonth, setTargetSalesThisMonth] = useState<number>(0);
    const [yearlySalesData, setYearlySalesData] = useState<YearlySalesData[]>([]);
    const [totalSalesThisYear, setTotalSalesThisYear] = useState<number>(0);
    const [totalRepeatSalesThisYear, setTotalRepeatSalesThisYear] = useState<number>(0);
    const [timeRange, setTimeRange] = useState<string>("30d");

    useEffect(() => {
        fetchSalesData();
    }, [timeRange]);

    const fetchSalesData = () => {
        // Calculate date range based on timeRange selection
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (timeRange) {
            case "7d":
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case "30d":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case "90d":
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch monthly sales data
        fetch(`/dashboard/monthly-sales-data?start_date=${startDateStr}&end_date=${endDateStr}`)
            .then(response => response.json())
            .then((data: SalesData[]) => {
                setMonthlySalesData(data);

                // Calculate totals
                const totalNet = data.reduce((sum, item) => sum + item.netSales, 0);
                const totalGross = data.reduce((sum, item) => sum + item.grossSales, 0);
                const totalRet = data.reduce((sum, item) => sum + item.returns, 0);
                const totalTarget = data.reduce((sum, item) => sum + item.target, 0);

                setTotalNetSales(totalNet);
                setTotalGrossSales(totalGross);
                setTotalReturns(totalRet);
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
    };

    const getTimeRangeLabel = () => {
        switch (timeRange) {
            case "7d": return "Last 7 days";
            case "30d": return "This month";
            case "90d": return "Last 3 months";
            default: return "This month";
        }
    };
    const { hasPermission, hasRole, hasAnyRole } = usePermission();
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-col gap-4 rounded-xl p-2 sm:p-4">
                {/* Stats Cards Grid - Updated to include TimeClock */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
                    {hasPermission(TimeclockPermissionsEnum.Show) && (
                        <>

                            <div className="col-start-3 col-span-2 sm:col-span-2 lg:col-span-2 xl:col-span-2">
                                {User ? (
                                    <DashboardTimeClock
                                        currentStatus={currentStatus}
                                        breakTypes={breakTypes}
                                        User={User}
                                    />
                                ) : (
                                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-card p-4">
                                        <p className="text-sm text-muted-foreground">Loading time clock...</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    {!hasPermission(TimeclockPermissionsEnum.Show) && (
                        <>
                    {/* Interactive Area Chart - Total Sales - Updated col-span */}
                    <div className="col-span-1 sm:col-span-1 lg:col-span-4 xl:col-span-4">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-card">
                            <div className="flex items-center gap-2 space-y-0 border-b p-4 pb-4 sm:flex-row">
                                <div className="grid flex-1 gap-1">
                                    <h3 className="text-lg font-semibold">Sales Performance</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {getTimeRangeLabel()} - Net, Gross & Returns
                                    </p>
                                    <div className="flex gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Gross: </span>
                                            <span className="font-semibold">${totalGrossSales.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Returns: </span>
                                            <span className="font-semibold text-destructive">${totalReturns.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Net: </span>
                                            <span className="font-semibold">${totalNetSales.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Target: </span>
                                            <span className="font-semibold">${targetSalesThisMonth.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <Select value={timeRange} onValueChange={setTimeRange}>
                                    <SelectTrigger
                                        className="w-[140px] rounded-lg"
                                        aria-label="Select time range"
                                    >
                                        <SelectValue placeholder={getTimeRangeLabel()} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="90d" className="rounded-lg">
                                            Last 3 months
                                        </SelectItem>
                                        <SelectItem value="30d" className="rounded-lg">
                                            This month
                                        </SelectItem>
                                        <SelectItem value="7d" className="rounded-lg">
                                            Last 7 days
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="px-2 pt-4 pb-4 sm:px-6 sm:pt-6">
                                <ChartContainer
                                    config={chartConfig}
                                    className="aspect-auto h-[250px] w-full"
                                >
                                    <AreaChart
                                        data={monthlySalesData}
                                        margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="fillNetSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop
                                                    offset="5%"
                                                    stopColor="var(--color-netSales)"
                                                    stopOpacity={0.8}
                                                />
                                                <stop
                                                    offset="95%"
                                                    stopColor="var(--color-netSales)"
                                                    stopOpacity={0.1}
                                                />
                                            </linearGradient>
                                            <linearGradient id="fillReturns" x1="0" y1="0" x2="0" y2="1">
                                                <stop
                                                    offset="5%"
                                                    stopColor="var(--color-returns)"
                                                    stopOpacity={0.8}
                                                />
                                                <stop
                                                    offset="95%"
                                                    stopColor="var(--color-returns)"
                                                    stopOpacity={0.1}
                                                />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="day"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            minTickGap={16}
                                            tickFormatter={(value) => {
                                                if (timeRange === "7d" || timeRange === "30d") {
                                                    return `${value}`;
                                                }
                                                return value;
                                            }}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                        />
                                        <ChartTooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            content={
                                                <ChartTooltipContent
                                                    labelFormatter={(value) => `Day ${value}`}
                                                    formatter={(value: number, name: string) => {
                                                        const label = chartConfig[name as keyof typeof chartConfig]?.label || name;
                                                        return [
                                                            `$${value.toLocaleString()}`,
                                                            label
                                                        ];
                                                    }}
                                                    indicator="dot"
                                                />
                                            }
                                        />
                                        {/* Net Sales Area */}
                                        <Area
                                            dataKey="netSales"
                                            type="monotone"
                                            fill="url(#fillNetSales)"
                                            stroke="var(--color-netSales)"
                                            strokeWidth={2}
                                        />
                                        {/* Returns Area - separate, not stacked */}
                                        <Area
                                            dataKey="returns"
                                            type="monotone"
                                            fill="url(#fillReturns)"
                                            stroke="var(--color-returns)"
                                            strokeWidth={2}
                                        />
                                        {/* Target Line */}
                                        <Line
                                            dataKey="target"
                                            type="monotone"
                                            stroke="var(--color-target)"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            dot={false}
                                        />
                                        <ChartLegend content={<ChartLegendContent />} />
                                    </AreaChart>
                                </ChartContainer>
                            </div>
                        </div>
                    </div>

                    {/* Total Sales This Year - Updated col-span */}
                    <div className="col-span-1 sm:col-span-1 lg:col-span-4 xl:col-span-4">
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
                        </>
                    )}
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
