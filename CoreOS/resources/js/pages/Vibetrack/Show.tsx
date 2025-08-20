import React, {useMemo, useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    BatteryFullIcon,
    Braces,
    CalendarIcon,
    ClockArrowUp,
    Cpu,
    Droplets,
    RefreshCwIcon,
    ThermometerIcon,
    WifiIcon
} from 'lucide-react';
import {format, isWithinInterval, subDays, subMonths} from 'date-fns';
import {Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis} from 'recharts';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {route} from "ziggy-js";

// Interface for a single data point in the runtime history chart
interface RuntimeHistoryPoint {
    runtime_sec: number | null;
    start_time: number | null; // Milliseconds since epoch
    stop_time: number | null;  // Milliseconds since epoch
    created_at: string;
}

// Interface for a single data point in the status history charts
interface StatusHistoryPoint {
    battery_soc: number | null;
    temperature: number | null;
    signal_strength: number | null;
    sht4x_temp: number | null;
    sht4x_humidity: number | null;
    modem_temp: number | null;
    created_at: string;
}

// Expanded Vibetrack interface to include all possible fields
interface Vibetrack {
    id: number;
    device_id: string | null;
    name: string | null;
    is_runtime_data: boolean;
    is_status_data: boolean;
    signal_strength: number | null;
    device_type: 'runtime' | 'status' | 'unknown';
    start_time: number | null; // Milliseconds since epoch
    stop_time: number | null;  // Milliseconds since epoch
    runtime_seconds: number | null;
    runtime_minutes: number | null;
    battery_voltage: number | null;
    battery_soc: number | null;
    temperature: number | null;
    humidity: number | null;
    json: any;
    created_at: string;
    updated_at: string;
}

// Props for the component
interface Props {
    vibetrack: Vibetrack;
    runtimeHistory: RuntimeHistoryPoint[];
    statusHistory: StatusHistoryPoint[];
}

// Date range interface
interface DateRange {
    from: Date | undefined;
    to: Date | undefined;
}

export default function VibetrackShow({ vibetrack, runtimeHistory, statusHistory }: Props) {
    const [dateRangeType, setDateRangeType] = useState<string>('30days');
    const [customFromDate, setCustomFromDate] = useState<string>('');
    const [customToDate, setCustomToDate] = useState<string>('');
    const [showCustomDates, setShowCustomDates] = useState(false);

    // Define predefined date ranges
    const getDateRangeFromType = (type: string): DateRange => {
        const now = new Date();

        switch (type) {
            case '7days':
                return { from: subDays(now, 7), to: now };
            case '14days':
                return { from: subDays(now, 14), to: now };
            case '30days':
                return { from: subDays(now, 30), to: now };
            case '90days':
                return { from: subDays(now, 90), to: now };
            case '6months':
                return { from: subMonths(now, 6), to: now };
            case '1year':
                return { from: subMonths(now, 12), to: now };
            case 'custom':
                if (customFromDate && customToDate) {
                    return {
                        from: new Date(customFromDate),
                        to: new Date(customToDate)
                    };
                }
                return { from: subDays(now, 30), to: now };
            case 'all':
            default:
                return { from: undefined, to: undefined };
        }
    };

    const dateRange = getDateRangeFromType(dateRangeType);

    // Handler for date range type change
    const handleDateRangeTypeChange = (value: string) => {
        setDateRangeType(value);
        if (value === 'custom') {
            setShowCustomDates(true);
        } else {
            setShowCustomDates(false);
        }
    };

    const clearDateRange = () => {
        setDateRangeType('all');
        setShowCustomDates(false);
        setCustomFromDate('');
        setCustomToDate('');
    };

    const pageTitle = vibetrack.name || vibetrack.device_id;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Vibetrack', href: '/vibetrack' },
        { title: pageTitle!, href: '#' },
    ];

    // Helper function to calculate true start/end times
    const calculateTrueTimes = (entry: RuntimeHistoryPoint) => {
        const createdAt = new Date(entry.created_at);
        const runtimeSec = entry.runtime_sec || 0;

        let trueStartTime: Date;
        let trueEndTime: Date;

        if (runtimeSec <= 60) {
            // For short runtimes, calculate based on created_at
            trueEndTime = createdAt;
            trueStartTime = new Date(createdAt.getTime() - (runtimeSec * 1000));
        } else {
            // For longer runtimes, use the actual timestamps from JSON
            // Note: timestamps are already in milliseconds, so no need to multiply by 1000
            trueStartTime = entry.start_time ? new Date(entry.start_time) : new Date(createdAt.getTime() - (runtimeSec * 1000));
            trueEndTime = entry.stop_time ? new Date(entry.stop_time) : createdAt;
        }

        return { trueStartTime, trueEndTime };
    };

    // Helper function to aggregate runtime data by day
    // Note: Using local dates so data appears on the day it actually occurred in user's timezone
    const aggregateRuntimeByDay = (data: RuntimeHistoryPoint[]) => {
        const grouped = data.reduce((acc, entry) => {
            // Use local date - this ensures data appears on the day it actually happened
            const entryDate = new Date(entry.created_at);
            const dayKey = format(entryDate, 'yyyy-MM-dd');

            if (!acc[dayKey]) {
                acc[dayKey] = {
                    date: dayKey,
                    total_runtime_sec: 0,
                    session_count: 0,
                    entries: []
                };
            }

            acc[dayKey].total_runtime_sec += entry.runtime_sec || 0;
            acc[dayKey].session_count += 1;
            acc[dayKey].entries.push(entry);

            return acc;
        }, {} as Record<string, { date: string; total_runtime_sec: number; session_count: number; entries: RuntimeHistoryPoint[] }>);

        return Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    // Helper function to aggregate status data by day (taking daily averages)
    // Note: Using local dates so data appears on the day it actually occurred in user's timezone
    const aggregateStatusByDay = (data: StatusHistoryPoint[]) => {
        const grouped = data.reduce((acc, entry) => {
            // Use local date - this ensures data appears on the day it actually happened
            const entryDate = new Date(entry.created_at);
            const dayKey = format(entryDate, 'yyyy-MM-dd');

            if (!acc[dayKey]) {
                acc[dayKey] = {
                    date: dayKey,
                    battery_soc_sum: 0,
                    temperature_sum: 0,
                    signal_strength_sum: 0,
                    sht4x_temp_sum: 0,
                    sht4x_humidity_sum: 0,
                    modem_temp_sum: 0,
                    count: 0,
                    battery_soc: null,
                    temperature: null,
                    signal_strength: null,
                    sht4x_temp: null,
                    sht4x_humidity: null,
                    modem_temp: null,
                    created_at: entry.created_at
                };
            }

            const day = acc[dayKey];

            if (entry.battery_soc !== null) day.battery_soc_sum += entry.battery_soc;
            if (entry.temperature !== null) day.temperature_sum += entry.temperature;
            if (entry.signal_strength !== null) day.signal_strength_sum += entry.signal_strength;
            if (entry.sht4x_temp !== null) day.sht4x_temp_sum += entry.sht4x_temp;
            if (entry.sht4x_humidity !== null) day.sht4x_humidity_sum += entry.sht4x_humidity;
            if (entry.modem_temp !== null) day.modem_temp_sum += entry.modem_temp;

            day.count += 1;

            return acc;
        }, {} as Record<string, any>);

        // Calculate averages
        return Object.values(grouped).map((day: any) => ({
            ...day,
            battery_soc: day.count > 0 ? day.battery_soc_sum / day.count : null,
            temperature: day.count > 0 ? day.temperature_sum / day.count : null,
            signal_strength: day.count > 0 ? day.signal_strength_sum / day.count : null,
            sht4x_temp: day.count > 0 ? day.sht4x_temp_sum / day.count : null,
            sht4x_humidity: day.count > 0 ? day.sht4x_humidity_sum / day.count : null,
            modem_temp: day.count > 0 ? day.modem_temp_sum / day.count : null,
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    // Centralized data filtering based on the selected date range
    const filteredRuntimeHistory = useMemo(() => {
        const sorted = [...runtimeHistory].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        let filtered = sorted;
        if (dateRange.from && dateRange.to) {
            const fromDate = new Date(dateRange.from);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);

            filtered = sorted.filter(item => {
                const itemDate = new Date(item.created_at);
                return isWithinInterval(itemDate, { start: fromDate, end: toDate });
            });
        }

        return filtered;
    }, [runtimeHistory, dateRange]);

    const filteredStatusHistory = useMemo(() => {
        const sorted = [...statusHistory].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        let filtered = sorted;
        if (dateRange.from && dateRange.to) {
            const fromDate = new Date(dateRange.from);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);

            filtered = sorted.filter(item => {
                const itemDate = new Date(item.created_at);
                return isWithinInterval(itemDate, { start: fromDate, end: toDate });
            });
        }

        return filtered;
    }, [statusHistory, dateRange]);

    // Aggregate data by day for charts
    const dailyRuntimeData = useMemo(() => {
        return aggregateRuntimeByDay(filteredRuntimeHistory);
    }, [filteredRuntimeHistory]);

    const dailyStatusData = useMemo(() => {
        return aggregateStatusByDay(filteredStatusHistory);
    }, [filteredStatusHistory]);

    const formatTick = (tick: string) => format(new Date(tick), 'MM/dd HH:mm');
    const formatTooltipLabel = (label: string) => format(new Date(label), 'PPpp');

    // Helper function to format seconds into a string like "1m 30s"
    const formatRuntime = (totalSeconds: number | null) => {
        if (totalSeconds === null || totalSeconds === undefined) return 'N/A';
        if (totalSeconds < 0) return 'N/A';
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}m ${seconds}s`;
    };

    const formatRuntimeTotal = (totalSeconds: number | null) => {
        if (totalSeconds === null || totalSeconds === undefined) return 'N/A';
        if (totalSeconds < 0) return 'N/A';

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else {
            return `${minutes}m ${seconds}s`;
        }
    };

    const totalRuntimeSeconds = useMemo(() => {
        return filteredRuntimeHistory.reduce((total, entry) => {
            return total + (entry.runtime_sec || 0);
        }, 0);
    }, [filteredRuntimeHistory]);

    // Prepare bar chart data for runtime history (daily aggregated)
    const runtimeBarChartData = useMemo(() => {
        return dailyRuntimeData.map((day) => {
            // Fix: Parse date string properly to avoid timezone shifts
            // day.date is '2025-08-15', but new Date('2025-08-15') interprets as UTC midnight
            // which shifts to previous day in local timezone
            const [year, month, dayNum] = day.date.split('-').map(Number);
            const localDate = new Date(year, month - 1, dayNum); // month is 0-indexed

            return {
                date: format(localDate, 'MM/dd'),
                dateLabel: format(localDate, 'PP'),
                runtime_minutes: Math.round(day.total_runtime_sec / 60),
                runtime_sec: day.total_runtime_sec,
                session_count: day.session_count,
            };
        });
    }, [dailyRuntimeData]);

    // Chart configuration for environmental data
    const chartConfig = {
        sht4x_temp: {
            label: "Ambient Temp",
            color: "var(--chart-vibetreck-4)",
        },
        modem_temp: {
            label: "Device Temp",
            color: "var(--chart-vibetreck-5)",
        },
        sht4x_humidity: {
            label: "Humidity",
            color: "var(--chart-vibetreck-6)",
        },
        battery_soc: {
            label: "Battery",
            color: "var(--chart-vibetreck-2)",
        },
        runtime_sec: {
            label: "Runtime",
            color: "var(--chart-vibetreck-1)",
        },
        runtime_minutes: {
            label: "Runtime (min)",
            color: "var(--chart-vibetreck-1)",
        },
        signal_strength: {
            label: "Signal",
            color: "var(--chart-vibetreck-3)",
        },
    } satisfies ChartConfig;

    // Use daily aggregated status history for environmental charts
    const environmentalData = useMemo(() => {
        return dailyStatusData.map(item => {
            // Fix: Parse date string properly to avoid timezone shifts
            const [year, month, dayNum] = item.date.split('-').map(Number);
            const localDate = new Date(year, month - 1, dayNum); // month is 0-indexed

            return {
                ...item,
                date: item.date, // Keep original string for data grouping
                displayDate: localDate, // Add proper date object for chart formatting
            };
        });
    }, [dailyStatusData]);

    const formatUTCToLocal = (utcDateString: string) => {
        const utcDate = new Date(utcDateString);
        return format(utcDate, 'PPpp');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle!} />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-2 md:gap-6 md:py-6">

                        {/* Header Section */}
                        <div className="flex flex-col gap-4 px-4 lg:px-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{pageTitle}</h1>
                                    {vibetrack.name && (
                                        <p className="flex px-1 text-muted-foreground font-mono text-sm">
                                            <div className="flex items-center gap-1">
                                                <Cpu className="h-4 w-4 text-primary" />
                                                <div>
                                                    <div className="text-sm text-muted-foreground">{vibetrack.device_id}</div>
                                                </div>
                                            </div>
                                        </p>
                                    )}
                                    {dateRange.from && dateRange.to && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Showing data from {format(dateRange.from, "LLL dd, y")} to {format(dateRange.to, "LLL dd, y")}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="flex gap-2 items-center">
                                    <Select value={dateRangeType} onValueChange={handleDateRangeTypeChange}>
                                        <SelectTrigger className="w-full sm:w-[200px]">
                                            <SelectValue placeholder="Select date range" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Time</SelectItem>
                                            <SelectItem value="7days">Last 7 Days</SelectItem>
                                            <SelectItem value="14days">Last 14 Days</SelectItem>
                                            <SelectItem value="30days">Last 30 Days</SelectItem>
                                            <SelectItem value="90days">Last 90 Days</SelectItem>
                                            <SelectItem value="6months">Last 6 Months</SelectItem>
                                            <SelectItem value="1year">Last Year</SelectItem>
                                            <SelectItem value="custom">Custom Range</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {showCustomDates && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    <CalendarIcon className="h-4 w-4 mr-2" />
                                                    Custom Dates
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80" align="start">
                                                <div className="grid gap-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium leading-none">Custom Date Range</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            Select your custom date range
                                                        </p>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <div className="grid grid-cols-3 items-center gap-4">
                                                            <Label htmlFor="from-date">From</Label>
                                                            <Input
                                                                id="from-date"
                                                                type="date"
                                                                value={customFromDate}
                                                                onChange={(e) => setCustomFromDate(e.target.value)}
                                                                className="col-span-2 h-8"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-3 items-center gap-4">
                                                            <Label htmlFor="to-date">To</Label>
                                                            <Input
                                                                id="to-date"
                                                                type="date"
                                                                value={customToDate}
                                                                onChange={(e) => setCustomToDate(e.target.value)}
                                                                className="col-span-2 h-8"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )}

                                    {dateRangeType !== 'all' && (
                                        <Button variant="outline" size="sm" onClick={clearDateRange}>
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.reload({ preserveScroll: true })}
                                >
                                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        {/* Current Status Section */}
                        <div className="px-4 lg:px-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold">Device Stats</h3>
                                    <p className="text-muted-foreground text-xs">
                                        Latest readings from device sensors - Last updated: {formatUTCToLocal(vibetrack.created_at)}
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="flex items-center gap-2">
                                        <WifiIcon className="h-4 w-4 text-primary" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Signal Strength</div>
                                            <div className="text-md font-bold">{vibetrack.signal_strength ?? 'N/A'} dBm</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <BatteryFullIcon className="h-6 w-6 text-primary" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Battery</div>
                                            <div className="text-md font-bold">{vibetrack.battery_soc?.toFixed(1) ?? 'N/A'}%</div>
                                            <div className="text-xs text-muted-foreground">{vibetrack.battery_voltage ?? 'N/A'}V</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <ThermometerIcon className="h-6 w-6" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Device Temperature</div>
                                            <div className="text-sm font-bold">{vibetrack.json?.modem?.temp ? vibetrack.json.modem.temp.toFixed(1) : 'N/A'} °F</div>
                                            <div className="text-xs text-muted-foreground">Modem</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Braces className="h-6 w-6" />
                                        <div>
                                            <a className="text-sm font-bold" target="_blank" href={route('api.getVibetrackDeviceData', vibetrack.device_id)}>
                                                <div className="text-xs text-muted-foreground">Device API</div>
                                                Link
                                                <div className="text-xs text-muted-foreground">API</div>
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Environmental Data */}
                                <div>
                                    <h3 className="font-semibold">Environmental Data</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2">
                                            <ThermometerIcon className="h-6 w-6" />
                                            <div>
                                                <div className="text-xs text-muted-foreground">Ambient Temperature</div>
                                                <div className="text-md font-bold">{vibetrack.json?.sht4x?.temp?.toFixed(1) ?? 'N/A'} °F</div>
                                                <div className="text-xs text-muted-foreground">SHT4x Sensor</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Droplets className="h-6 w-6"/>
                                            <div>
                                                <div className="text-xs text-muted-foreground">Humidity</div>
                                                <div className="text-md font-bold">{vibetrack.json?.sht4x?.hum?.toFixed(1) ?? 'N/A'}%</div>
                                                <div className="text-xs text-muted-foreground">SHT4x Sensor</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Metrics Cards Section */}
                        <div className="grid gap-4 px-4 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Runtime</CardTitle>
                                    <ClockArrowUp className="h-4 w-4 text-muted-foreground"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatRuntimeTotal(totalRuntimeSeconds)}</div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        From {filteredRuntimeHistory.length} sessions over {dailyRuntimeData.length} days
                                    </p>
                                    <div className="h-[80px]">
                                        <ChartContainer
                                            config={chartConfig}
                                            className="h-[80px] w-full"
                                        >
                                            <BarChart data={runtimeBarChartData}>
                                                <CartesianGrid vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickLine={false}
                                                    tickMargin={10}
                                                    axisLine={false}
                                                    tickFormatter={(value) => value}
                                                />
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={
                                                        <ChartTooltipContent
                                                            labelFormatter={(value, payload) => {
                                                                if (payload && payload[0] && payload[0].payload) {
                                                                    return payload[0].payload.dateLabel;
                                                                }
                                                                return '';
                                                            }}
                                                            formatter={(value, name, props) => [
                                                                `${value} min (${props.payload.session_count} sessions)`,
                                                                'Total Runtime'
                                                            ]}
                                                        />
                                                    }
                                                />
                                                <Bar
                                                    dataKey="runtime_minutes"
                                                    fill="var(--color-runtime_minutes)"
                                                />
                                            </BarChart>
                                        </ChartContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Battery Level</CardTitle>
                                    <BatteryFullIcon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{vibetrack.battery_soc?.toFixed(1) ?? 'N/A'}%</div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {vibetrack.battery_voltage ?? 'N/A'}V
                                    </p>
                                    <div className="h-[80px]">
                                        <ChartContainer
                                            config={chartConfig}
                                            className="h-[80px] w-full"
                                        >
                                            <LineChart data={dailyStatusData}>
                                                <Line
                                                    type="step"
                                                    dataKey="battery_soc"
                                                    stroke="var(--color-battery_soc)"
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={<ChartTooltipContent
                                                        labelFormatter={(value, payload) => {
                                                            if (payload && payload[0] && payload[0].payload) {
                                                                // Fix: Parse date string properly to avoid timezone shifts
                                                                const dateStr = payload[0].payload.date;
                                                                const [year, month, dayNum] = dateStr.split('-').map(Number);
                                                                const localDate = new Date(year, month - 1, dayNum);
                                                                return format(localDate, 'PP');
                                                            }
                                                            return '';
                                                        }}
                                                    />}
                                                />
                                            </LineChart>
                                        </ChartContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Signal Strength</CardTitle>
                                    <WifiIcon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{vibetrack.signal_strength ?? 'N/A'}</div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        dBm
                                    </p>
                                    <div className="h-[80px]">
                                        <ChartContainer
                                            config={chartConfig}
                                            className="h-[80px] w-full"
                                        >
                                            <LineChart data={dailyStatusData}>
                                                <Line
                                                    type="monotone"
                                                    dataKey="signal_strength"
                                                    stroke="var(--color-signal_strength)"
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={<ChartTooltipContent
                                                        labelFormatter={(value, payload) => {
                                                            if (payload && payload[0] && payload[0].payload) {
                                                                // Fix: Parse date string properly to avoid timezone shifts
                                                                const dateStr = payload[0].payload.date;
                                                                const [year, month, dayNum] = dateStr.split('-').map(Number);
                                                                const localDate = new Date(year, month - 1, dayNum);
                                                                return format(localDate, 'PP');
                                                            }
                                                            return '';
                                                        }}
                                                    />}
                                                />
                                            </LineChart>
                                        </ChartContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                                    <ThermometerIcon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{vibetrack.json?.sht4x?.temp ?? 'N/A'}</div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        °F ambient
                                    </p>
                                    <div className="h-[80px]">
                                        <ChartContainer
                                            config={chartConfig}
                                            className="h-[80px] w-full"
                                        >
                                            <LineChart data={dailyStatusData}>
                                                <Line
                                                    type="monotone"
                                                    dataKey="sht4x_temp"
                                                    stroke="var(--color-sht4x_temp)"
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={<ChartTooltipContent
                                                        labelFormatter={(value, payload) => {
                                                            if (payload && payload[0] && payload[0].payload) {
                                                                // Fix: Parse date string properly to avoid timezone shifts
                                                                const dateStr = payload[0].payload.date;
                                                                const [year, month, dayNum] = dateStr.split('-').map(Number);
                                                                const localDate = new Date(year, month - 1, dayNum);
                                                                return format(localDate, 'PP');
                                                            }
                                                            return '';
                                                        }}
                                                    />}
                                                />
                                            </LineChart>
                                        </ChartContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Interactive Chart Section */}
                        <div className="px-4 lg:px-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Environmental, Device & System Metrics</CardTitle>
                                    <CardDescription>
                                        Daily averages of temperature, humidity, battery, and signal strength
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                                    {environmentalData && environmentalData.length > 0 ? (
                                        <ChartContainer
                                            config={chartConfig}
                                            className="aspect-auto h-[300px] md:h-[400px] w-full"
                                        >
                                            <LineChart data={environmentalData}>
                                                <CartesianGrid vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickLine={true}
                                                    axisLine={true}
                                                    tickMargin={8}
                                                    minTickGap={32}
                                                    tickFormatter={(value) => {
                                                        // Fix: Parse date string properly to avoid timezone shifts
                                                        const [year, month, dayNum] = value.split('-').map(Number);
                                                        const localDate = new Date(year, month - 1, dayNum);
                                                        return localDate.toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                        });
                                                    }}
                                                />
                                                {/* Left Y-axis for temperatures (°F) */}
                                                <YAxis
                                                    yAxisId="temp"
                                                    orientation="left"
                                                    tickFormatter={(value) => `${value}°F`}
                                                />
                                                {/* Right Y-axis for percentages (%) */}
                                                <YAxis
                                                    yAxisId="percent"
                                                    orientation="right"
                                                    tickFormatter={(value) => `${value}%`}
                                                />
                                                <ChartTooltip cursor={false} content={<ChartTooltipContent
                                                    labelFormatter={(value) => {
                                                        // Fix: Parse date string properly to avoid timezone shifts
                                                        const [year, month, dayNum] = value.split('-').map(Number);
                                                        const localDate = new Date(year, month - 1, dayNum);
                                                        return format(localDate, 'PP');
                                                    }}
                                                />} />
                                                <Line
                                                    yAxisId="temp"
                                                    type="monotone"
                                                    dataKey="sht4x_temp"
                                                    stroke="var(--color-sht4x_temp)"
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                                <Line
                                                    yAxisId="temp"
                                                    type="monotone"
                                                    dataKey="modem_temp"
                                                    stroke="var(--color-modem_temp)"
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                                <Line
                                                    yAxisId="percent"
                                                    type="monotone"
                                                    dataKey="sht4x_humidity"
                                                    stroke="var(--color-sht4x_humidity)"
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                                <Line
                                                    yAxisId="percent"
                                                    type="monotone"
                                                    dataKey="battery_soc"
                                                    stroke="var(--color-battery_soc)"
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                                <ChartLegend content={<ChartLegendContent />} />
                                            </LineChart>
                                        </ChartContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[300px] md:h-[400px] text-muted-foreground">
                                            No data available for the selected period.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Data Table Section */}
                        <div className="px-4 lg:px-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Runtime History</CardTitle>
                                    <CardDescription>
                                        Detailed runtime sessions with start/end times and duration
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="max-h-96 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                                                    <TableHead>Start Time</TableHead>
                                                    <TableHead>End Time</TableHead>
                                                    <TableHead className="text-right">Duration</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredRuntimeHistory.length > 0 ? (
                                                    <>
                                                        {filteredRuntimeHistory.map((entry, index) => {
                                                            const { trueStartTime, trueEndTime } = calculateTrueTimes(entry);
                                                            return (
                                                                <TableRow key={index}>
                                                                    <TableCell className="font-medium hidden sm:table-cell">
                                                                        {format(new Date(entry.created_at), 'PP')}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs sm:text-sm">
                                                                        <div className="sm:hidden text-xs text-muted-foreground">
                                                                            {format(new Date(entry.created_at), 'PP')}
                                                                        </div>
                                                                        {format(trueStartTime, 'pp')}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs sm:text-sm">
                                                                        {format(trueEndTime, 'pp')}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono text-xs sm:text-sm">
                                                                        {formatRuntime(entry.runtime_sec)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                        <TableRow className="border-t-2 font-semibold bg-muted/50">
                                                            <TableCell colSpan={3} className="font-semibold">Total Runtime</TableCell>
                                                            <TableCell className="text-right font-mono font-bold">
                                                                {formatRuntimeTotal(totalRuntimeSeconds)}
                                                            </TableCell>
                                                        </TableRow>
                                                    </>
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                            No runtime data for this period.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Raw JSON Data Card */}
                        <div className="px-4 lg:px-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Raw Device Data</CardTitle>
                                    <CardDescription>
                                        Latest JSON payload from the device
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <pre className="max-h-96 overflow-y-auto bg-muted/30 p-4 rounded-lg text-xs sm:text-sm font-mono whitespace-pre-wrap break-words">
                                        {JSON.stringify(vibetrack.json, null, 2)}
                                    </pre>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
