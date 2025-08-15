import React, {useEffect, useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {CalendarDays, ChevronLeft, ChevronRight, Clock, TrendingUp, Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
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

interface ProcessedEvent {
    id: number;
    user_name: string;
    pto_type_name: string;
    pto_type_color: string;
    start_date: Date;
    end_date: Date;
    total_days: number;
    reason?: string;
    start_col: number;
    span: number;
    row: number;
    week_start: number;
    week_spans: Array<{ start_col: number; span: number; week: number }>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Training Tracker',
        href: '/old-style-training-tracking',
    },
    {
        title: 'PTO Calendar',
        href: '/hr/pto-calendar',
    },
];

export default function PtoCalendar({ currentYear, currentMonth, availableYears, ptoTypes }: PtoCalendarProps) {
    const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(currentYear || new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentMonth || new Date().getMonth() + 1);
    const [currentDate, setCurrentDate] = useState(new Date(selectedYear, selectedMonth - 1, 1));

    // Fetch calendar data
    const fetchCalendarData = async (year: number, month: number) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/hr/pto-calendar-data?year=${year}&month=${month}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.events && data.summary && data.pto_type_breakdown) {
                setCalendarData(data);
            } else {
                console.error('Invalid API response structure:', data);
                setCalendarData({
                    events: {},
                    summary: { total_requests: 0, total_days: 0, unique_users: 0 },
                    pto_type_breakdown: [],
                    current_year: year,
                    current_month: month
                });
            }
        } catch (error) {
            console.error('Error fetching calendar data:', error);
            setCalendarData({
                events: {},
                summary: { total_requests: 0, total_days: 0, unique_users: 0 },
                pto_type_breakdown: [],
                current_year: year,
                current_month: month
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCalendarData(selectedYear, selectedMonth);
        setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
    }, [selectedYear, selectedMonth]);

    const handleYearChange = (year: string) => {
        const newYear = parseInt(year);
        setSelectedYear(newYear);

        router.get('/hr/pto-calendar', { year: newYear, month: selectedMonth }, {
            preserveState: true,
            replace: true
        });
    };

    const handleMonthChange = (month: string) => {
        const newMonth = parseInt(month);
        setSelectedMonth(newMonth);

        router.get('/hr/pto-calendar', { year: selectedYear, month: newMonth }, {
            preserveState: true,
            replace: true
        });
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }

        const newYear = newDate.getFullYear();
        const newMonth = newDate.getMonth() + 1;

        setSelectedYear(newYear);
        setSelectedMonth(newMonth);
        setCurrentDate(newDate);

        router.get('/hr/pto-calendar', { year: newYear, month: newMonth }, {
            preserveState: true,
            replace: true
        });
    };

    // Generate calendar days
    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

        const days = [];
        const current = new Date(startDate);

        // Generate 6 weeks (42 days) to ensure full month coverage
        for (let i = 0; i < 42; i++) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return days;
    };

    // Process events to create spanning bars
    const processEvents = () => {
        if (!calendarData) return [];

        const allEvents: ProcessedEvent[] = [];
        const eventsByDate: Record<string, PtoEvent[]> = {};

        // Group all unique events
        Object.entries(calendarData.events).forEach(([dateStr, events]) => {
            events.forEach(event => {
                if (!eventsByDate[event.id]) {
                    eventsByDate[event.id] = [];
                }
                eventsByDate[event.id].push(event);
            });
        });

        // Process unique events
        Object.values(eventsByDate).forEach(eventGroup => {
            if (eventGroup.length === 0) return;

            const event = eventGroup[0]; // Take the first occurrence
            const startDate = new Date(event.start_date);
            const endDate = new Date(event.end_date);

            // Calculate calendar position
            const calendarDays = generateCalendarDays();
            const startIndex = calendarDays.findIndex(day =>
                day.toDateString() === startDate.toDateString()
            );
            const endIndex = calendarDays.findIndex(day =>
                day.toDateString() === endDate.toDateString()
            );

            if (startIndex === -1 || endIndex === -1) return;

            // Calculate week spans for multi-week events
            const weekSpans = [];
            let currentIndex = startIndex;

            while (currentIndex <= endIndex) {
                const weekStart = Math.floor(currentIndex / 7) * 7;
                const weekEnd = weekStart + 6;
                const spanStart = Math.max(currentIndex, weekStart);
                const spanEnd = Math.min(endIndex, weekEnd);
                const startCol = spanStart % 7;
                const span = spanEnd - spanStart + 1;

                weekSpans.push({
                    start_col: startCol,
                    span: span,
                    week: Math.floor(currentIndex / 7)
                });

                currentIndex = weekEnd + 1;
            }

            allEvents.push({
                id: event.id,
                user_name: event.user_name,
                pto_type_name: event.pto_type_name,
                pto_type_color: event.pto_type_color,
                start_date: startDate,
                end_date: endDate,
                total_days: event.total_days,
                reason: event.reason,
                start_col: startIndex % 7,
                span: endIndex - startIndex + 1,
                row: 0, // Will be calculated for positioning
                week_start: Math.floor(startIndex / 7),
                week_spans: weekSpans
            });
        });

        // Calculate row positions to avoid overlaps
        const weekEvents: Record<number, ProcessedEvent[]> = {};
        allEvents.forEach(event => {
            event.week_spans.forEach(span => {
                if (!weekEvents[span.week]) {
                    weekEvents[span.week] = [];
                }
                weekEvents[span.week].push(event);
            });
        });

        // Assign row positions within each week
        Object.values(weekEvents).forEach(events => {
            events.sort((a, b) => a.start_date.getTime() - b.start_date.getTime());

            events.forEach(event => {
                if (event.row === 0) { // Not yet assigned
                    let row = 1;
                    let conflict = true;

                    while (conflict) {
                        conflict = events.some(otherEvent =>
                            otherEvent.row === row &&
                            otherEvent.id !== event.id &&
                            !(event.end_date < otherEvent.start_date || event.start_date > otherEvent.end_date)
                        );

                        if (conflict) {
                            row++;
                        }
                    }

                    event.row = row;
                }
            });
        });

        return allEvents;
    };

    const calendarDays = generateCalendarDays();
    const processedEvents = processEvents();
    const maxRows = Math.max(...processedEvents.map(e => e.row), 0);

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

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Company PTO Calendar" />
            <div className="flex  flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header with controls */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Company PTO Calendar</h1>
                    <div className="flex items-center gap-4">
                        <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                            <SelectTrigger className="w-24">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(availableYears || []).map(year => (
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


                <div className="grid grid-cols-1 lg:grid-cols-6 justify-center gap-4 flex-1">
                    {/* Calendar */}
                    <div className="lg:col-span-1 flex flex-col gap-4">
                        {calendarData && (
                            <>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
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
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">PTO Types</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {(ptoTypes || []).map(type => (
                                            <div key={type.id} className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded"
                                                    style={{ backgroundColor: type.color || '#3b82f6' }}
                                                />
                                                <span className="text-sm">{type.name || 'Unknown Type'}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                          </>
                        )}
                    </div>
                    <Card className="lg:col-span-5">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>
                                    {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigateMonth('prev')}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigateMonth('next')}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    Loading calendar...
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Calendar Grid */}
                                    <div className="grid grid-cols-7 gap-0 border border-gray-200">
                                        {/* Weekday Headers */}
                                        {weekdays.map(day => (
                                            <div
                                                key={day}
                                                className="p-2 text-center font-medium text-sm bg-gray-50 border-r border-b border-gray-200 last:border-r-0"
                                            >
                                                {day}
                                            </div>
                                        ))}

                                        {/* Calendar Days */}
                                        {calendarDays.map((day, index) => {
                                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                                            const isToday = day.toDateString() === new Date().toDateString();
                                            const weekIndex = Math.floor(index / 7);

                                            return (
                                                <div
                                                    key={index}
                                                    className={cn(
                                                        "relative p-2 border-r border-b border-gray-200 last:border-r-0",
                                                        !isCurrentMonth && "bg-gray-50 text-gray-400",
                                                        isToday && "bg-blue-50",
                                                        `min-h-[${Math.max(80, (maxRows + 1) * 75)}px]`
                                                    )}
                                                    style={{
                                                        minHeight: `${Math.max(80, (maxRows + 1) * 75)}px`
                                                    }}
                                                >
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        isToday && "text-blue-600 font-bold"
                                                    )}>
                                                        {day.getDate()}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Event Overlay */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {processedEvents.map(event => (
                                            event.week_spans.map((span, spanIndex) => {
                                                const top = 40 + span.week * Math.max(80, (maxRows + 1) * 25) + (event.row - 1) * 20;
                                                const left = (span.start_col / 7) * 100;
                                                const width = (span.span / 7) * 100;

                                                return (
                                                    <div
                                                        key={`${event.id}-${spanIndex}`}
                                                        className="absolute text-xs text-white px-2 py-1 rounded pointer-events-auto cursor-pointer hover:opacity-90 transition-opacity"
                                                        style={{
                                                            backgroundColor: event.pto_type_color,
                                                            top: `${top}px`,
                                                            left: `${left}%`,
                                                            width: `${width - 1}%`,
                                                            height: '18px',
                                                            fontSize: '11px',
                                                            lineHeight: '1.2',
                                                            zIndex: 10
                                                        }}
                                                        title={`${event.user_name} - ${event.pto_type_name} (${event.start_date.toLocaleDateString()} to ${event.end_date.toLocaleDateString()}) - ${event.total_days} days${event.reason ? ` - ${event.reason}` : ''}`}
                                                    >
                                                        <div className="truncate">
                                                            {event.user_name} - {event.pto_type_name}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>


                </div>
            </div>
        </AppLayout>
    );
}
