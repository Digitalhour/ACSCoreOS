import React, {useEffect, useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import {Calendar} from '@/components/ui/calendar';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {CalendarDays, Clock, TrendingUp, Users} from 'lucide-react';
import {cn} from '@/lib/utils';

interface PtoType {
    id: number;
    name: string;
    code: string;
    color: string;
}

interface PtoEvent {
    id: number;
    request_number: string;
    user_id: number;
    user_name: string;
    user_email: string;
    pto_type_id: number;
    pto_type_name: string;
    pto_type_code: string;
    pto_type_color: string;
    start_date: string;
    end_date: string;
    total_days: number;
    reason?: string;
    is_start_date: boolean;
    is_end_date: boolean;
    is_single_day: boolean;
}

interface CalendarData {
    events: Record<string, PtoEvent[]>;
    summary: {
        total_requests: number;
        total_days: number;
        unique_users: number;
    };
    pto_type_breakdown: Array<{
        type_id: number;
        type_name: string;
        type_code: string;
        type_color: string;
        request_count: number;
        total_days: number;
    }>;
    current_year: number;
    current_month: number | null;
}

interface PtoCalendarProps {
    currentYear: number;
    currentMonth: number;
    availableYears: number[];
    ptoTypes: PtoType[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Human Resources',
        href: '/hr',
    },
    {
        title: 'PTO Calendar',
        href: '/hr/pto-calendar',
    },
];

export default function PtoCalendar({ currentYear, currentMonth, availableYears, ptoTypes }: PtoCalendarProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date(currentYear, currentMonth - 1));
    const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    // Fetch calendar data
    const fetchCalendarData = async (year: number, month: number) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/hr/pto-calendar-data?year=${year}&month=${month}`);
            const data = await response.json();
            setCalendarData(data);
        } catch (error) {
            console.error('Error fetching calendar data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCalendarData(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth]);

    const handleYearChange = (year: string) => {
        const newYear = parseInt(year);
        setSelectedYear(newYear);
        setSelectedDate(new Date(newYear, selectedMonth - 1));

        router.get('/hr/pto-calendar', { year: newYear, month: selectedMonth }, {
            preserveState: true,
            replace: true
        });
    };

    const handleMonthChange = (month: string) => {
        const newMonth = parseInt(month);
        setSelectedMonth(newMonth);
        setSelectedDate(new Date(selectedYear, newMonth - 1));

        router.get('/hr/pto-calendar', { year: selectedYear, month: newMonth }, {
            preserveState: true,
            replace: true
        });
    };

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date);
        }
    };

    const getEventsForDate = (date: Date): PtoEvent[] => {
        if (!calendarData) return [];
        const dateString = date.toISOString().split('T')[0];
        return calendarData.events[dateString] || [];
    };

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PTO Calendar" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header with controls */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">PTO Calendar</h1>
                    <div className="flex items-center gap-4">
                        <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                            <SelectTrigger className="w-24">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(month => (
                                    <SelectItem key={month.value} value={month.value.toString()}>
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Summary Cards */}
                {calendarData && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{calendarData.summary.total_requests}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Days</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{calendarData.summary.total_days}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{calendarData.summary.unique_users}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Avg Days/Request</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {calendarData.summary.total_requests > 0
                                        ? (calendarData.summary.total_days / calendarData.summary.total_requests).toFixed(1)
                                        : '0'
                                    }
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
                    {/* Calendar */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>
                                {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    Loading calendar...
                                </div>
                            ) : (
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={handleDateSelect}
                                    month={selectedDate}
                                    className="rounded-md border-0"
                                    modifiers={{
                                        hasEvents: (date: Date) => getEventsForDate(date).length > 0
                                    }}
                                    modifiersStyles={{
                                        hasEvents: { fontWeight: 'bold' }
                                    }}
                                    components={{
                                        Day: ({ date, ...props }) => {
                                            const events = getEventsForDate(date);
                                            const dayNumber = date.getDate();

                                            // Group events by user to avoid duplicates
                                            const userEvents = events.reduce((acc, event) => {
                                                if (!acc[event.user_id]) {
                                                    acc[event.user_id] = event;
                                                }
                                                return acc;
                                            }, {} as Record<number, PtoEvent>);

                                            const uniqueEvents = Object.values(userEvents);

                                            return (
                                                <div
                                                    {...props}
                                                    className={cn(props.className, 'relative h-16 w-full p-0 cursor-pointer hover:bg-accent')}
                                                >
                                                    <div className="absolute top-1 left-1 text-xs font-medium z-10">
                                                        {dayNumber}
                                                    </div>
                                                    {uniqueEvents.length > 0 && (
                                                        <div className="mt-5 space-y-0.5 px-1">
                                                            {uniqueEvents.slice(0, 2).map((event, index) => (
                                                                <div
                                                                    key={`${event.id}-${index}`}
                                                                    className="text-xs px-1 py-0.5 rounded text-white truncate leading-none"
                                                                    style={{
                                                                        backgroundColor: event.pto_type_color,
                                                                        fontSize: '9px'
                                                                    }}
                                                                    title={`${event.user_name} - ${event.pto_type_name} (${event.start_date} to ${event.end_date})`}
                                                                >
                                                                    {event.user_name.split(' ')[0]}
                                                                </div>
                                                            ))}
                                                            {uniqueEvents.length > 2 && (
                                                                <div
                                                                    className="text-xs text-gray-500 px-1"
                                                                    style={{ fontSize: '8px' }}
                                                                >
                                                                    +{uniqueEvents.length - 2}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                    }}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* PTO Types Legend */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">PTO Types</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {ptoTypes.map(type => (
                                    <div key={type.id} className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded"
                                            style={{ backgroundColor: type.color }}
                                        />
                                        <span className="text-sm">{type.name}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Monthly Breakdown */}
                        {calendarData && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">This Month Breakdown</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {calendarData.pto_type_breakdown.map(breakdown => (
                                        <div key={breakdown.type_id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-2 h-2 rounded"
                                                    style={{ backgroundColor: breakdown.type_color }}
                                                />
                                                <span className="text-xs">{breakdown.type_code}</span>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                                {breakdown.total_days}d
                                            </Badge>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Selected Date Details */}
                        {(() => {
                            const selectedEvents = getEventsForDate(selectedDate);
                            if (selectedEvents.length > 0) {
                                return (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm">
                                                {selectedDate.toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {selectedEvents.map(event => (
                                                <div key={`${event.id}-${event.user_id}`} className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-2 h-2 rounded"
                                                            style={{ backgroundColor: event.pto_type_color }}
                                                        />
                                                        <span className="text-sm font-medium">{event.user_name}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground ml-4">
                                                        {event.pto_type_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground ml-4">
                                                        {event.start_date} to {event.end_date} ({event.total_days} days)
                                                    </div>
                                                    {event.reason && (
                                                        <div className="text-xs text-muted-foreground ml-4 italic">
                                                            "{event.reason}"
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
