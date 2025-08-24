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
import {Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer, ReferenceLine} from "recharts";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {usePermission} from "@/hooks/usePermission";
import DashboardTimeClock from "@/components/DashboardTimeClock";
import {TimeclockPermissionsEnum} from "@/types/permissions";
import { TrendingUp, TrendingDown, Target, BarChart3, Calendar, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
    pageId?: number;
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




export default function Dashboard ({
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
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [salesTrend, setSalesTrend] = useState<number>(0);
    const [targetAchievement, setTargetAchievement] = useState<number>(0);
    const [previousPeriodData, setPreviousPeriodData] = useState<number>(0);

    useEffect(() => {
        fetchSalesData();
    }, [timeRange]);


    const fetchSalesData = async () => {
        setIsLoading(true);

        // Calculate date range based on timeRange selection
        const now = new Date();
        let startDate: Date;
        let endDate: Date;
        let prevStartDate: Date;
        let prevEndDate: Date;

        switch (timeRange) {
            case "7d":
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
                prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case "30d":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case "90d":
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                prevStartDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                prevEndDate = new Date(now.getFullYear(), now.getMonth() - 2, 0);
                break;
            case "ytd":
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
                prevEndDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            case "qtd":
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                prevStartDate = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
                prevEndDate = new Date(now.getFullYear(), quarter * 3, 0);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        const prevStartDateStr = prevStartDate.toISOString().split('T')[0];
        const prevEndDateStr = prevEndDate.toISOString().split('T')[0];

        try {
            // Fetch current period data
            const currentResponse = await fetch(`/dashboard/monthly-sales-data?start_date=${startDateStr}&end_date=${endDateStr}`);
            const currentData: SalesData[] = await currentResponse.json();

            // Fetch previous period data for comparison
            const prevResponse = await fetch(`/dashboard/monthly-sales-data?start_date=${prevStartDateStr}&end_date=${prevEndDateStr}`);
            const prevData: SalesData[] = await prevResponse.json();

            setMonthlySalesData(currentData);


            // Calculate current period totals
            const totalNet = currentData.reduce((sum, item) => sum + item.netSales, 0);
            const totalGross = currentData.reduce((sum, item) => sum + item.grossSales, 0);
            const totalRet = currentData.reduce((sum, item) => sum + item.returns, 0);
            const totalTarget = currentData.reduce((sum, item) => sum + item.target, 0);

            // Calculate previous period totals
            const prevTotalNet = prevData.reduce((sum, item) => sum + item.netSales, 0);

            // Calculate trends and performance metrics
            const trend = prevTotalNet > 0 ? ((totalNet - prevTotalNet) / prevTotalNet) * 100 : 0;
            const achievement = totalTarget > 0 ? (totalNet / totalTarget) * 100 : 0;

            setTotalNetSales(totalNet);
            setTotalGrossSales(totalGross);
            setTotalReturns(totalRet);
            setTargetSalesThisMonth(totalTarget);
            setPreviousPeriodData(prevTotalNet);
            setSalesTrend(trend);
            setTargetAchievement(achievement);
        } catch (error) {
            console.error('Error fetching sales data:', error);
        } finally {
            setIsLoading(false);
        }

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
            case "ytd": return "Year to date";
            case "qtd": return "Quarter to date";
            case "custom": return "Custom range";
            default: return "This month";
        }
    };

    // Function to ensure data matches selected time range
    const getFilteredSalesData = () => {
        const baseData = monthlySalesData;
        if (!baseData.length) return baseData;

        const expectedDays = getExpectedDataPoints();

        // If we have more data than expected, take the most recent points
        if (baseData.length > expectedDays) {
            return baseData.slice(-expectedDays);
        }

        // If we have less data than expected, pad with empty/zero data points
        if (baseData.length < expectedDays) {
            const paddingNeeded = expectedDays - baseData.length;
            const paddedData = [];

            for (let i = paddingNeeded; i > 0; i--) {
                const baseEntry = {
                    day: (expectedDays - i + 1).toString(),
                    grossSales: 0,
                    returns: 0,
                    cancelled: 0,
                    netSales: 0,
                    target: 0
                };

                paddedData.push(baseEntry);
            }

            return [...paddedData, ...baseData];
        }

        return baseData;
    };

    const getExpectedDataPoints = (): number => {
        switch (timeRange) {
            case "7d": return 7;
            case "30d": return 30;
            case "90d": return 90;
            case "ytd": {
                const now = new Date();
                const start = new Date(now.getFullYear(), 0, 1);
                return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            }
            case "qtd": {
                const now = new Date();
                const quarter = Math.floor(now.getMonth() / 3);
                const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
                return Math.ceil((now.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24));
            }
            default: return 30;
        }
    };


    const { hasPermission, hasRole, hasAnyRole } = usePermission();
    // useEchoPresence('online-users','UserOnlineStatus', (e) => {
    //     console.log(e);
    // })

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
                            <div className="flex items-center gap-2 space-y-0 border-b p-4 pb-4 sm:flex-row bg-gradient-to-r from-background to-muted/20">
                                <div className="grid flex-1  gap-2">
                                    <div className="flex items-center gap-2 ">
                                        <BarChart3 className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">Sales Performance</h3>
                                        {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        <div className="ml-auto ">
                                            <Select value={timeRange} onValueChange={setTimeRange} disabled={isLoading}>
                                                <SelectTrigger
                                                    className="w-[140px] rounded-lg"
                                                    aria-label="Select time range"
                                                >
                                                    <SelectValue placeholder={getTimeRangeLabel()} />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="ytd" className="rounded-lg">
                                                        Year to Date
                                                    </SelectItem>
                                                    <SelectItem value="qtd" className="rounded-lg">
                                                        Quarter to Date
                                                    </SelectItem>
                                                    <SelectItem value="90d" className="rounded-lg">
                                                        Last 3 months
                                                    </SelectItem>
                                                    <SelectItem value="30d" className="rounded-lg">
                                                        This month
                                                    </SelectItem>
                                                    <SelectItem value="7d" className="rounded-lg">
                                                        Last 7 days
                                                    </SelectItem>
                                                    <SelectItem value="custom" className="rounded-lg">
                                                        Custom Range
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {getTimeRangeLabel()} - Performance Analytics & Trends
                                    </p>

                                    {/* Enhanced Metrics Cards */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                                        <div className="p-3 rounded-lg bg-card border border-border/50 hover:shadow-sm transition-shadow">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">Net Sales</span>
                                                <div className="flex items-center gap-1">
                                                    {salesTrend > 0 ? (
                                                        <TrendingUp className="h-3 w-3 text-green-500" />
                                                    ) : salesTrend < 0 ? (
                                                        <TrendingDown className="h-3 w-3 text-red-500" />
                                                    ) : null}
                                                    <span className={`text-xs ${salesTrend > 0 ? 'text-green-500' : salesTrend < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                        {salesTrend !== 0 ? `${salesTrend > 0 ? '+' : ''}${salesTrend.toFixed(1)}%` : '--'}
                                                    </span>
                                                </div>
                                            </div>
                                            {isLoading ? (
                                                <Skeleton className="h-5 w-16 mt-1" />
                                            ) : (
                                                <p className="font-semibold text-sm">${totalNetSales.toLocaleString()}</p>
                                            )}
                                        </div>

                                        <div className="p-3 rounded-lg bg-card border border-border/50 hover:shadow-sm transition-shadow">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">Target</span>
                                                <div className="flex items-center gap-1">
                                                    <Target className="h-3 w-3 text-blue-500" />
                                                    <span className={`text-xs ${targetAchievement >= 100 ? 'text-green-500' : targetAchievement >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                        {targetAchievement.toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                            {isLoading ? (
                                                <Skeleton className="h-5 w-16 mt-1" />
                                            ) : (
                                                <p className="font-semibold text-sm">${targetSalesThisMonth.toLocaleString()}</p>
                                            )}
                                        </div>

                                        <div className="p-3 rounded-lg bg-card border border-border/50 hover:shadow-sm transition-shadow">
                                            <span className="text-xs text-muted-foreground">Gross Sales</span>
                                            {isLoading ? (
                                                <Skeleton className="h-5 w-16 mt-1" />
                                            ) : (
                                                <p className="font-semibold text-sm">${totalGrossSales.toLocaleString()}</p>
                                            )}
                                        </div>

                                        <div className="p-3 rounded-lg bg-card border border-border/50 hover:shadow-sm transition-shadow">
                                            <span className="text-xs text-muted-foreground">Returns</span>
                                            {isLoading ? (
                                                <Skeleton className="h-5 w-16 mt-1" />
                                            ) : (
                                                <p className="font-semibold text-sm text-destructive">${totalReturns.toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>


                            </div>
                            <div className="px-2 pt-4 pb-4 sm:px-6 sm:pt-6 relative">
                                {isLoading && (
                                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                                            <span className="text-sm text-muted-foreground">Loading chart data...</span>
                                        </div>
                                    </div>
                                )}


                                {/* Data range indicator */}
                                <div className="absolute top-2 left-2 bg-muted/80 text-muted-foreground px-2 py-1 rounded text-xs z-20">
                                    Showing {getFilteredSalesData().length} data points
                                </div>

                                <ChartContainer
                                    config={chartConfig}
                                    className="aspect-auto h-[300px] w-full"
                                >
                                    <AreaChart
                                        data={getFilteredSalesData()}
                                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                    >
                                        <defs>
                                            <linearGradient id="fillNetSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop
                                                    offset="5%"
                                                    stopColor="var(--color-netSales)"
                                                    stopOpacity={0.9}
                                                />
                                                <stop
                                                    offset="50%"
                                                    stopColor="var(--color-netSales)"
                                                    stopOpacity={0.4}
                                                />
                                                <stop
                                                    offset="95%"
                                                    stopColor="var(--color-netSales)"
                                                    stopOpacity={0.05}
                                                />
                                            </linearGradient>
                                            <linearGradient id="fillReturns" x1="0" y1="0" x2="0" y2="1">
                                                <stop
                                                    offset="5%"
                                                    stopColor="var(--color-returns)"
                                                    stopOpacity={0.8}
                                                />
                                                <stop
                                                    offset="50%"
                                                    stopColor="var(--color-returns)"
                                                    stopOpacity={0.3}
                                                />
                                                <stop
                                                    offset="95%"
                                                    stopColor="var(--color-returns)"
                                                    stopOpacity={0.05}
                                                />
                                            </linearGradient>
                                            <filter id="glow">
                                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                                <feMerge>
                                                    <feMergeNode in="coloredBlur"/>
                                                    <feMergeNode in="SourceGraphic"/>
                                                </feMerge>
                                            </filter>
                                        </defs>

                                        <CartesianGrid
                                            vertical={false}
                                            strokeDasharray="2 4"
                                            stroke="hsl(var(--border))"
                                            opacity={0.3}
                                        />

                                        {/* Target Reference Lines */}
                                        {targetSalesThisMonth > 0 && (
                                            <ReferenceLine
                                                y={targetSalesThisMonth / monthlySalesData.length || 0}
                                                stroke="var(--color-target)"
                                                strokeDasharray="8 4"
                                                strokeWidth={2}
                                                label={{ value: "Target", position: "topRight", fontSize: 12 }}
                                            />
                                        )}

                                        <XAxis
                                            dataKey="day"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={12}
                                            minTickGap={timeRange === "7d" ? 10 : timeRange === "30d" ? 20 : 30}
                                            fontSize={11}
                                            interval={timeRange === "7d" ? 0 : timeRange === "30d" ? 4 : 'preserveStartEnd'}
                                            tickFormatter={(value) => {
                                                switch (timeRange) {
                                                    case "7d":
                                                        return `Day ${value}`;
                                                    case "30d":
                                                        return `${value}`;
                                                    case "90d":
                                                        return `${value}`;
                                                    case "ytd":
                                                    case "qtd":
                                                        return `${value}`;
                                                    default:
                                                        return value;
                                                }
                                            }}
                                        />

                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={12}
                                            fontSize={11}
                                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                            domain={['dataMin - 1000', 'dataMax + 1000']}
                                        />

                                        <ChartTooltip
                                            cursor={{
                                                strokeDasharray: '2 4',
                                                stroke: "hsl(var(--primary))",
                                                strokeWidth: 1,
                                                opacity: 0.8
                                            }}
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload?.length) return null;

                                                const getTooltipLabel = (label: string) => {
                                                    switch (timeRange) {
                                                        case "7d":
                                                            return `Day ${label} of 7`;
                                                        case "30d":
                                                            return `Day ${label} of month`;
                                                        case "90d":
                                                            return `Day ${label}`;
                                                        case "ytd":
                                                            return `Day ${label} of year`;
                                                        case "qtd":
                                                            return `Day ${label} of quarter`;
                                                        default:
                                                            return `Day ${label}`;
                                                    }
                                                };

                                                return (
                                                    <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
                                                        <p className="font-medium mb-2">{getTooltipLabel(label)}</p>
                                                        {payload.map((entry, index) => {
                                                            const config = chartConfig[entry.dataKey as keyof typeof chartConfig];
                                                            return (
                                                                <div key={index} className="flex items-center gap-2 text-sm">
                                                                    <div
                                                                        className="w-2 h-2 rounded-full"
                                                                        style={{ backgroundColor: entry.color }}
                                                                    />
                                                                    <span className="text-muted-foreground">{config?.label}:</span>
                                                                    <span className="font-semibold">${Number(entry.value).toLocaleString()}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            }}
                                        />

                                        {/* Net Sales Area with glow effect */}
                                        <Area
                                            dataKey="netSales"
                                            type="monotone"
                                            fill="url(#fillNetSales)"
                                            stroke="var(--color-netSales)"
                                            strokeWidth={3}
                                            filter="url(#glow)"
                                            animationDuration={1500}
                                            animationBegin={0}
                                        />

                                        {/* Returns Area */}
                                        <Area
                                            dataKey="returns"
                                            type="monotone"
                                            fill="url(#fillReturns)"
                                            stroke="var(--color-returns)"
                                            strokeWidth={2}
                                            animationDuration={1500}
                                            animationBegin={300}
                                        />


                                        <ChartLegend
                                            content={<ChartLegendContent />}
                                            iconType="circle"
                                            wrapperStyle={{ paddingTop: "20px" }}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Yearly Sales Chart */}
                    <div className="col-span-1 sm:col-span-1 lg:col-span-4 xl:col-span-4">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-card">
                            <div className="p-4 pb-2 bg-gradient-to-r from-background to-muted/10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingUp className="h-4 w-4 text-green-500" />
                                            <p className="text-xs sm:text-sm text-muted-foreground">Total Sales This Year</p>
                                        </div>
                                        {isLoading ? (
                                            <Skeleton className="h-7 w-20" />
                                        ) : (
                                            <h3 className="text-xl sm:text-2xl font-semibold">${(totalSalesThisYear / 1000000).toFixed(1)}M</h3>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1">
                                            vs ${(totalRepeatSalesThisYear / 1000000).toFixed(1)}M repeat sales
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-green-500">
                                            {totalSalesThisYear > 0 ? '+12.5%' : '--'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">vs last year</div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-4 pb-4 relative">
                                {isLoading && (
                                    <div className="absolute inset-0 bg-background/30 backdrop-blur-sm z-10 flex items-center justify-center">
                                        <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                                    </div>
                                )}
                                <ChartContainer config={chartConfig} className="h-[120px] sm:h-[140px] w-full">
                                    <LineChart
                                        data={yearlySalesData}
                                        margin={{
                                            top: 10,
                                            right: 15,
                                            left: 15,
                                            bottom: 30,
                                        }}
                                    >
                                        <defs>
                                            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>

                                        <CartesianGrid
                                            strokeDasharray="2 4"
                                            stroke="hsl(var(--border))"
                                            opacity={0.2}
                                            vertical={false}
                                        />

                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10 }}
                                            tickMargin={8}
                                        />

                                        <ChartTooltip
                                            cursor={{
                                                stroke: "var(--color-sales)",
                                                strokeWidth: 1,
                                                strokeDasharray: "2 4",
                                                opacity: 0.7
                                            }}
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload?.length) return null;

                                                return (
                                                    <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
                                                        <p className="font-medium text-sm mb-1">{label}</p>
                                                        {payload.map((entry, index) => (
                                                            <div key={index} className="flex items-center gap-2 text-sm">
                                                                <div
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ backgroundColor: entry.color }}
                                                                />
                                                                <span className="text-muted-foreground">Sales:</span>
                                                                <span className="font-semibold">${Number(entry.value).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }}
                                        />

                                        <Line
                                            dataKey="sales"
                                            type="monotone"
                                            stroke="var(--color-sales)"
                                            strokeWidth={2.5}
                                            dot={{ r: 3, fill: "var(--color-sales)", strokeWidth: 2, stroke: "white" }}
                                            activeDot={{
                                                r: 5,
                                                fill: "var(--color-sales)",
                                                stroke: "white",
                                                strokeWidth: 2,
                                                filter: "drop-shadow(0 0 4px var(--color-sales))"
                                            }}
                                            animationDuration={2000}
                                            animationBegin={500}
                                        />

                                        {/* Optional: Add area fill under the line */}
                                        <Area
                                            dataKey="sales"
                                            type="monotone"
                                            fill="url(#salesGradient)"
                                            stroke="none"
                                            animationDuration={2000}
                                            animationBegin={500}
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
