import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface DepartmentPtoRequest {
    id: number;
    user: {
        id: number;
        name: string;
    };
    pto_type: {
        id: number;
        name: string;
        color: string;
        code: string;
    };
    start_date: string;
    end_date: string;
    total_days: number;
    status: 'pending' | 'approved' | 'denied' | 'cancelled';
}

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    ptoRequests: DepartmentPtoRequest[];
}

interface DepartmentPtoCalendarProps {
    departmentPtoRequests: DepartmentPtoRequest[];
    title?: string;
    showHeader?: boolean;
    initialDate?: Date;
    className?: string;
    maxRequestsPerDay?: number;
    onDateClick?: (date: Date, requests: DepartmentPtoRequest[]) => void;
}

export default function DepartmentPtoCalendar({
                                                  departmentPtoRequests,
                                                  title = "Department PTO Calendar",
                                                  showHeader = true,
                                                  initialDate = new Date(),
                                                  className = "",
                                                  maxRequestsPerDay = 3,
                                                  onDateClick
                                              }: DepartmentPtoCalendarProps) {
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate calendar days when current date or department PTO requests change
    useEffect(() => {
        generateCalendarDays();
    }, [currentDate, departmentPtoRequests]);

    // Generate calendar days
    const generateCalendarDays = useCallback(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);

        // First day to show (might be from previous month)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Last day to show (might be from next month)
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

        const days: CalendarDay[] = [];
        const currentDateLoop = new Date(startDate);
        const today = new Date();

        while (currentDateLoop <= endDate) {
            const isCurrentMonth = currentDateLoop.getMonth() === month;
            const isToday = currentDateLoop.toDateString() === today.toDateString();

            // Find PTO requests for this day
            const ptoRequests = departmentPtoRequests?.filter((request) => {
                if (request.status !== 'approved' && request.status !== 'pending') return false;

                // Add 'T00:00:00' to parse the dates in the user's local timezone,
                // avoiding off-by-one errors caused by UTC conversion.
                const requestStart = new Date(request.start_date + 'T00:00:00');
                const requestEnd = new Date(request.end_date + 'T00:00:00');

                return currentDateLoop >= requestStart && currentDateLoop <= requestEnd;
            }) || [];

            days.push({
                date: new Date(currentDateLoop),
                isCurrentMonth,
                isToday,
                ptoRequests,
            });

            currentDateLoop.setDate(currentDateLoop.getDate() + 1);
        }

        setCalendarDays(days);
    }, [currentDate, departmentPtoRequests]);

    // Navigate calendar
    const navigateMonth = useCallback((direction: 'prev' | 'next') => {
        setCurrentDate((prev) => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    }, []);

    // Go to today
    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    // Handle date click
    const handleDateClick = useCallback((day: CalendarDay) => {
        if (onDateClick) {
            onDateClick(day.date, day.ptoRequests);
        }
    }, [onDateClick]);

    return (
        <Card className={className}>
            {showHeader && (
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            <CardTitle>{title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={goToToday}>
                                Today
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-semibold">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h3>
                    </div>
                </CardHeader>
            )}
            <CardContent>
                <div className="grid grid-cols-7 gap-1">
                    {/* Day headers */}
                    {dayNames.map((day) => (
                        <div key={day} className="text-muted-foreground p-2 text-center text-sm font-medium">
                            {day}
                        </div>
                    ))}

                    {/* Calendar days */}
                    {calendarDays.map((day, index) => (
                        <div
                            key={index}
                            className={`min-h-[80px] border border-gray-200 p-1 ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''} ${day.isToday ? 'border-blue-300 bg-blue-50' : ''} ${onDateClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                            onClick={() => handleDateClick(day)}
                        >
                            <div className="mb-1 text-sm font-medium">{day.date.getDate()}</div>

                            {/* PTO requests for this day */}
                            <div className="space-y-1">
                                {day.ptoRequests.slice(0, maxRequestsPerDay).map((request, reqIndex) => (
                                    <div
                                        key={reqIndex}
                                        className="truncate rounded p-1 text-xs"
                                        style={{
                                            backgroundColor: request.pto_type.color + '20',
                                            borderLeft: `3px solid ${request.status === 'pending' ? '#e6aa00' : '#44c14f'}`
                                        }}
                                        title={`${request.user.name} - ${request.pto_type.name} (${request.status})`}
                                    >
                                        <div className="truncate font-medium">{request.user.name}</div>
                                        <div className="truncate text-gray-600">
                                            {request.pto_type.code}
                                            {request.status === 'pending' && (
                                                <Badge
                                                    className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                                                    variant="outline"
                                                >
                                                    *
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {day.ptoRequests.length > maxRequestsPerDay && (
                                    <div className="p-1 text-xs text-gray-500">
                                        +{day.ptoRequests.length - maxRequestsPerDay} more
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="mt-4 border-t pt-4">
                    <div className="text-muted-foreground mb-2 text-sm">Legend:</div>
                    <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="h-3 w-3 border-l-4 border-yellow-500 bg-yellow-200"></div>
                            <span>Pending (*)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="h-3 w-3 border-l-4 border-green-500 bg-green-200"></div>
                            <span>Approved</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
