import React, {useMemo, useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Calendar} from '@/components/ui/calendar';
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
    Droplets,
    RefreshCwIcon,
    ThermometerIcon,
    WifiIcon
} from 'lucide-react';
import {format, isWithinInterval, subDays} from 'date-fns';
import {CartesianGrid, Line, LineChart, XAxis, YAxis} from 'recharts';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {cn} from '@/lib/utils';
import {route} from "ziggy-js";

// Interface for a single data point in the runtime history chart
interface RuntimeHistoryPoint {
    runtime_sec: number | null;
    start_time: number | null;
    stop_time: number | null;
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
    start_time: number | null;
    stop_time: number | null;
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
    const [dateRange, setDateRange] = useState<DateRange>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });

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
            trueEndTime = createdAt;
            trueStartTime = new Date(createdAt.getTime() - (runtimeSec * 1000));
        } else {
            trueStartTime = entry.start_time ? new Date(entry.start_time * 1000) : new Date(createdAt.getTime() - (runtimeSec * 1000));
            trueEndTime = entry.stop_time ? new Date(entry.stop_time * 1000) : createdAt;
        }

        return { trueStartTime, trueEndTime };
    };

    // Centralized data filtering based on the selected date range
    const filteredRuntimeHistory = useMemo(() => {
        const sorted = [...runtimeHistory].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (dateRange.from && dateRange.to) {
            return sorted.filter(item => {
                const itemDate = new Date(item.created_at);
                return isWithinInterval(itemDate, { start: dateRange.from!, end: dateRange.to! });
            });
        }

        return sorted;
    }, [runtimeHistory, dateRange]);

    const filteredStatusHistory = useMemo(() => {
        const sorted = [...statusHistory].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        if (dateRange.from && dateRange.to) {
            return sorted.filter(item => {
                const itemDate = new Date(item.created_at);
                return isWithinInterval(itemDate, { start: dateRange.from!, end: dateRange.to! });
            });
        }

        return sorted;
    }, [statusHistory, dateRange]);

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

    const clearDateRange = () => {
        setDateRange({ from: undefined, to: undefined });
    };

    // Chart configuration for environmental data
    const chartConfig = {
        sht4x_temp: {
            label: "Ambient Temp",
            color: "var(--chart-1)",
        },
        modem_temp: {
            label: "Device Temp",
            color: "var(--chart-2)",
        },
        sht4x_humidity: {
            label: "Humidity",
            color: "var(--chart-3)",
        },
        battery_soc: {
            label: "Battery",
            color: "var(--chart-4)",
        },
        runtime_sec: {
            label: "Runtime",
            color: "var(--chart-5)",
        },
        signal_strength: {
            label: "Signal",
            color: "var(--chart-6)",
        },
    } satisfies ChartConfig;

    // Use filtered status history directly (respects calendar date range)
    const environmentalData = useMemo(() => {
        return filteredStatusHistory.map(item => ({
            ...item,
            date: item.created_at,
        }));
    }, [filteredStatusHistory]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle!} />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                        {/* Header Section */}
                        <div className="flex items-center justify-between px-4 lg:px-6">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
                                    {vibetrack.name && <p className="text-muted-foreground font-mono text-sm">{vibetrack.device_id}</p>}

                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, "LLL dd, y")} -{" "}
                                                        {format(dateRange.to, "LLL dd, y")}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "LLL dd, y")
                                                )
                                            ) : (
                                                <span>Pick a date range</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                                {(dateRange.from || dateRange.to) && (
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

                        {/* Current Status Section */}
                        <div className="px-4 lg:px-6">
                            <div>
                                <h3 className="font-semibold">Device Stats</h3>
                                <p className="text-muted-foreground text-xs">Latest readings from device sensors - Last updated: {format(new Date(vibetrack.created_at), 'PPpp')}</p>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="flex items-center gap-2">
                                        <WifiIcon className="h-4 w-4 text-primary" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Signal Strength</div>
                                            <div className="text-md font-bold">{vibetrack.signal_strength ?? 'N/A'} dBm</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <BatteryFullIcon className="h-8 w-8 text-primary" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Battery</div>
                                            <div className="text-md font-bold">{vibetrack.battery_soc?.toFixed(1) ?? 'N/A'}%</div>
                                            <div className="text-xs text-muted-foreground">{vibetrack.battery_voltage ?? 'N/A'}V</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ThermometerIcon className="h-8 w-8 " />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Device Temperature</div>
                                            <div className="text-sm font-bold">{vibetrack.json?.modem?.temp ?? 'N/A'} °F</div>
                                            <div className="text-xs text-muted-foreground">Modem</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Braces className="h-8 w-8 " />
                                        <div>
                                            <a className={"text-sm font-bold"} target="_blank" href={route('api.getVibetrackDeviceData', vibetrack.device_id)}>
                                                <div className="text-xs text-muted-foreground">Device API</div>
                                                Link
                                                <div className="text-xs text-muted-foreground">API</div>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Environmental Data */}
                            <div>
                                <h3 className="font-semibold">Environmental Data</h3>
                                <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
                                    <div className="flex items-center gap-2">
                                        <ThermometerIcon className="h-6 w-6 " />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Ambient Temperature</div>
                                            <div className="text-md font-bold">{vibetrack.json?.sht4x?.temp ?? 'N/A'} °F</div>
                                            <div className="text-xs text-muted-foreground">SHT4x Sensor</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Droplets className="h-6 w-6"/>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Humidity</div>
                                            <div className="text-md font-bold">{vibetrack.json?.sht4x?.hum ?? 'N/A'}%</div>
                                            <div className="text-xs text-muted-foreground">SHT4x Sensor</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>


                        {/* Metrics Cards Section */}
                        <div className="grid gap-4 px-4 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
                                    <CardTitle className="text-sm font-medium">Total Runtime</CardTitle>
                                    <ClockArrowUp className="h-4 w-4 text-muted-foreground"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatRuntimeTotal(totalRuntimeSeconds)}</div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        From {filteredRuntimeHistory.length} sessions
                                    </p>
                                    <div className="h-[60px]">
                                        <ChartContainer
                                            config={{
                                                runtime_sec: {
                                                    label: "Runtime",
                                                    color: "var(--chart-1)",
                                                },
                                            }}
                                            className="h-[80px] w-full"
                                        >
                                            <LineChart data={[...filteredRuntimeHistory].reverse()}>
                                                <Line
                                                    type="monotone"
                                                    dataKey="runtime_sec"
                                                    stroke="var(--color-runtime_sec)"
                                                    strokeWidth={2}
                                                    dot={false}
                                                />
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={<ChartTooltipContent
                                                        labelFormatter={(value, payload) => {
                                                            if (payload && payload[0] && payload[0].payload) {
                                                                return format(new Date(payload[0].payload.created_at), 'PPp');
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
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
                                    <CardTitle className="text-sm font-medium">Battery Level</CardTitle>
                                    <BatteryFullIcon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{vibetrack.battery_soc?.toFixed(1) ?? 'N/A'}%</div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {vibetrack.battery_voltage ?? 'N/A'}V
                                    </p>
                                    <div className="h-[60px]">
                                        <ChartContainer
                                            config={{
                                                battery_soc: {
                                                    label: "Battery",
                                                    color: "var(--chart-2)",
                                                },
                                            }}
                                            className="h-[80px] w-full"
                                        >
                                            <LineChart data={filteredStatusHistory}>
                                                <Line
                                                    type="monotone"
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
                                                                return format(new Date(payload[0].payload.created_at), 'PPp');
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
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
                                    <CardTitle className="text-sm font-medium">Signal Strength</CardTitle>
                                    <WifiIcon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{vibetrack.signal_strength ?? 'N/A'}</div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        dBm
                                    </p>
                                    <div className="h-[60px]">
                                        <ChartContainer
                                            config={{
                                                signal_strength: {
                                                    label: "Signal",
                                                    color: "var(--chart-3)",
                                                },
                                            }}
                                            className="h-[80px] w-full"
                                        >
                                            <LineChart data={filteredStatusHistory}>
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
                                                                return format(new Date(payload[0].payload.created_at), 'PPp');
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
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
                                    <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                                    <ThermometerIcon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{vibetrack.json?.sht4x?.temp ?? 'N/A'}</div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        °F ambient
                                    </p>
                                    <div className="h-[60px]">
                                        <ChartContainer
                                            config={{
                                                sht4x_temp: {
                                                    label: "Temperature",
                                                    color: "var(--chart-4)",
                                                },
                                            }}
                                            className="h-[80px] w-full"
                                        >
                                            <LineChart data={filteredStatusHistory}>
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
                                                                return format(new Date(payload[0].payload.created_at), 'PPp');
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
                                        Real-time monitoring of temperature, humidity, battery, runtime, and signal strength
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                                    {environmentalData && environmentalData.length > 0 ? (
                                        <ChartContainer
                                            config={chartConfig}
                                            className="aspect-auto h-[400px] w-full"
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
                                                        const date = new Date(value);
                                                        return date.toLocaleDateString("en-US", {
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
                                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
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
                                        <div className="flex items-center justify-center h-[400px] text-muted-foreground">
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
                                                    <TableHead>Date</TableHead>
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
                                                                    <TableCell className="font-medium">{format(new Date(entry.created_at), 'PP')}</TableCell>
                                                                    <TableCell>{format(trueStartTime, 'pp')}</TableCell>
                                                                    <TableCell>{format(trueEndTime, 'pp')}</TableCell>
                                                                    <TableCell className="text-right font-mono">{formatRuntime(entry.runtime_sec)}</TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                        <TableRow className="border-t-2 font-semibold bg-muted/50">
                                                            <TableCell colSpan={3} className="font-semibold">Total Runtime</TableCell>
                                                            <TableCell className="text-right font-mono font-bold">{formatRuntimeTotal(totalRuntimeSeconds)}</TableCell>
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
                                    <pre className="max-h-96 overflow-y-auto bg-muted/30 p-4 rounded-lg text-sm font-mono">
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
