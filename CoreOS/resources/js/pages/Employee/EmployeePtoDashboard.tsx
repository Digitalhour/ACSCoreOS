import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Head, router, useForm, usePage} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {AlertCircle, AlertTriangle, Calendar, CheckCircle, Loader2, Save, Shield, Users, X} from 'lucide-react';
import {Calendar as BigCalendar, momentLocalizer, Views} from 'react-big-calendar';
import {Checkbox} from '@/components/ui/checkbox';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {toast} from 'sonner';

const localizer = momentLocalizer(moment);

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'My PTO',
        href: '/pto',
    },
];

interface Holiday {
    date: string;
    name: string;
    type: string;
    formatted_date: string;
}

interface PtoType {
    id: number;
    name: string;
    description?: string;
    color: string;
    code: string;
    current_balance: number;
    policy: {
        initial_days: number;
        annual_accrual_amount: number;
        rollover_enabled: boolean;
        max_rollover_days?: number;
    };
}

interface PtoRequest {
    id: number;
    request_number: string;
    pto_type: {
        id: number;
        name: string;
        color: string;
        code: string;
    };
    start_date: string;
    end_date: string;
    total_days: number;
    reason?: string;
    status: 'pending' | 'approved' | 'denied' | 'cancelled';
    submitted_at: string;
    created_at: string;
    can_be_cancelled?: boolean;
    cancellation_reason?: string;
    denial_reason?: string;
    // New blackout fields
    has_blackout_conflicts?: boolean;
    has_blackout_warnings?: boolean;
    has_emergency_override?: boolean;
    override_approved?: boolean;
}


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

interface PtoDataItem {
    policy: any;
    balance: number;
    used_balance: number;
    pending_balance: number;
    available_balance: number;
    pto_type: {
        id: number;
        name: string;
        description?: string;
        color: string;
        code: string;
    };
    can_request: boolean;
    has_balance_record: boolean;
}

interface PageProps {
    pto_data: PtoDataItem[];
    recent_requests: PtoRequest[];
    pending_requests_count: number;
    user: {
        id: number;
        name: string;
        email: string;
    };
    department_pto_requests: DepartmentPtoRequest[];
    pto_types: PtoType[];
    upcoming_holidays: Holiday[];
    holidays: Holiday[];
    blackout_conflicts?: BlackoutConflict[];
    blackout_warnings?: BlackoutConflict[];
    [key: string]: any;
}

interface DayOption {
    date: Date;
    type: 'full' | 'half';
    isHoliday?: boolean;
    holidayName?: string;
}

interface BlackoutConflict {
    id: number;
    name: string;
    description?: string;
    message: string;
    type: 'conflict' | 'warning';
    can_override: boolean;
    restriction_details?: {
        period?: string;
        type?: string;
        remaining_slots?: number;
        will_consume_slot?: boolean;
    };
    blackout?: {
        id: number;
        name: string;
        restriction_type: string;
        is_strict: boolean;
        allow_emergency_override: boolean;
    };
}

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource: {
        user: string;
        type: string;
        status: 'pending' | 'approved' | 'denied' | 'cancelled';
        color: string;
        days: number;
    };
}

const DonutChart = ({ data, size = 120 }: { data: Array<{ label: string; value: number; color: string; description?: string }>, size?: number }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let cumulativePercentage = 0;

    return (
        <div className="flex items-center gap-4">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#f3f4f6"
                        strokeWidth={strokeWidth}
                    />
                    {data.map((segment, index) => {
                        const percentage = (segment.value / total) * 100;
                        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -((cumulativePercentage / 100) * circumference);

                        cumulativePercentage += percentage;

                        return (
                            <circle
                                key={index}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-2xl font-bold">{total}</div>
                        <div className="text-xs text-muted-foreground">days total</div>
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <div>
                            <div className="font-medium">{item.value} days {item.label}</div>
                            {item.description && (
                                <div className="text-xs text-muted-foreground">{item.description}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// BlackoutHandler component
const BlackoutHandler = ({ conflicts = [], warnings = [], onAcknowledgeWarnings, onEmergencyOverride, showActions = true, className = '' }: {
    conflicts: BlackoutConflict[];
    warnings: BlackoutConflict[];
    onAcknowledgeWarnings?: (acknowledged: boolean) => void;
    onEmergencyOverride?: (enabled: boolean, reason?: string) => void;
    showActions?: boolean;
    className?: string;
}) => {
    const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
    const [emergencyOverride, setEmergencyOverride] = useState(false);
    const [overrideReason, setOverrideReason] = useState('');
    const [showOverrideForm, setShowOverrideForm] = useState(false);

    const hasConflicts = conflicts.length > 0;
    const hasWarnings = warnings.length > 0;
    const canOverride = conflicts.some(c => c.can_override);

    useEffect(() => {
        if (onAcknowledgeWarnings) {
            onAcknowledgeWarnings(warningsAcknowledged);
        }
    }, [warningsAcknowledged, onAcknowledgeWarnings]);

    useEffect(() => {
        if (onEmergencyOverride) {
            onEmergencyOverride(emergencyOverride, overrideReason);
        }
    }, [emergencyOverride, overrideReason, onEmergencyOverride]);

    const handleWarningAcknowledgment = useCallback((checked: boolean) => {
        setWarningsAcknowledged(checked);
    }, []);

    const handleEmergencyOverrideToggle = useCallback((checked: boolean) => {
        setEmergencyOverride(checked);
        if (!checked) {
            setOverrideReason('');
            setShowOverrideForm(false);
        } else if (hasConflicts && canOverride) {
            setShowOverrideForm(true);
        }
    }, [hasConflicts, canOverride]);

    if (!hasConflicts && !hasWarnings) {
        return null;
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Conflicts Section */}
            {hasConflicts && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-800 mb-2">
                                Blackout Period Conflicts
                            </h3>
                            <div className="space-y-3">
                                {conflicts.map((conflict, index) => (
                                    <div key={index} className="bg-white rounded border border-red-200 p-3">
                                        <div className="font-medium text-red-900 text-sm">
                                            {conflict.blackout?.name || conflict.name}
                                        </div>
                                        <div className="text-red-700 text-sm mt-1">
                                            {conflict.message}
                                        </div>
                                        <div className="text-red-600 text-xs mt-1">
                                            Period: {conflict.restriction_details?.period || 'Unknown period'}
                                        </div>
                                        {conflict.blackout?.is_strict && (
                                            <div className="text-red-800 text-xs mt-1 font-medium">
                                                ⚠️ Strict blackout - No exceptions
                                            </div>
                                        )}
                                        {conflict.can_override && !conflict.blackout?.is_strict && (
                                            <div className="text-orange-600 text-xs mt-1">
                                                Emergency override available
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Emergency Override Section */}
                            {canOverride && showActions && (
                                <div className="mt-4 pt-3 border-t border-red-200">
                                    <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                        <div className="flex items-start gap-3">
                                            <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Checkbox
                                                        id="emergency_override"
                                                        checked={emergencyOverride}
                                                        onCheckedChange={handleEmergencyOverrideToggle}
                                                    />
                                                    <Label htmlFor="emergency_override" className="text-sm font-medium text-orange-800">
                                                        Submit as Emergency Override
                                                    </Label>
                                                </div>
                                                <p className="text-xs text-orange-700 mb-2">
                                                    This will override blackout restrictions for urgent situations.
                                                    Your manager will be notified that this is an emergency request.
                                                </p>

                                                {showOverrideForm && emergencyOverride && (
                                                    <div className="mt-3 space-y-2">
                                                        <Label className="text-xs font-medium text-orange-800">
                                                            Emergency Justification (Required)
                                                        </Label>
                                                        <Textarea
                                                            value={overrideReason}
                                                            onChange={(e) => setOverrideReason(e.target.value)}
                                                            placeholder="Please explain why this emergency override is necessary..."
                                                            className="text-sm"
                                                            rows={3}
                                                        />
                                                        {overrideReason.trim().length < 10 && (
                                                            <p className="text-xs text-red-600">
                                                                Please provide a detailed explanation (minimum 10 characters).
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Warnings Section */}
            {hasWarnings && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-amber-800 mb-2">
                                Blackout Period Warnings
                            </h3>
                            <div className="space-y-3">
                                {warnings.map((warning, index) => (
                                    <div key={index} className="bg-white rounded border border-amber-200 p-3">
                                        <div className="font-medium text-amber-900 text-sm">
                                            {warning.blackout?.name || warning.name}
                                        </div>
                                        <div className="text-amber-700 text-sm mt-1">
                                            {warning.message}
                                        </div>
                                        <div className="text-amber-600 text-xs mt-1">
                                            Period: {warning.restriction_details?.period || 'Unknown period'}
                                        </div>
                                        {warning.restriction_details?.will_consume_slot && (
                                            <div className="text-amber-700 text-xs mt-1">
                                                ⚠️ Will consume one of the limited slots for this period
                                            </div>
                                        )}
                                        {warning.restriction_details?.remaining_slots !== undefined && (
                                            <div className="text-amber-600 text-xs mt-1">
                                                Remaining slots: {warning.restriction_details.remaining_slots}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Warning Acknowledgment Section */}
                            {showActions && (
                                <div className="mt-4 pt-3 border-t border-amber-200">
                                    {warningsAcknowledged ? (
                                        <div className="flex items-center text-sm text-green-700">
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Warnings acknowledged
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-2">
                                                <Checkbox
                                                    id="acknowledge_warnings"
                                                    checked={warningsAcknowledged}
                                                    onCheckedChange={handleWarningAcknowledgment}
                                                />
                                                <Label htmlFor="acknowledge_warnings" className="text-sm text-amber-700 leading-relaxed">
                                                    I understand these restrictions and acknowledge that my request falls during a restricted period.
                                                </Label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Summary for submission requirements */}
            {(hasConflicts || hasWarnings) && showActions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-blue-800">
                        <strong>Submission Requirements:</strong>
                        {hasConflicts && !emergencyOverride && ' Cannot submit due to blackout conflicts.'}
                        {hasConflicts && emergencyOverride && overrideReason.trim().length >= 10 && ' Ready to submit with emergency override.'}
                        {hasConflicts && emergencyOverride && overrideReason.trim().length < 10 && ' Emergency justification required.'}
                        {!hasConflicts && hasWarnings && !warningsAcknowledged && ' Must acknowledge warnings to proceed.'}
                        {!hasConflicts && hasWarnings && warningsAcknowledged && ' Ready to submit with acknowledged warnings.'}
                    </div>
                </div>
            )}
        </div>
    );
};


export default function EmployeePtoDashboard() {
    const { pto_data, recent_requests, department_pto_requests, upcoming_holidays, holidays = [], user, blackout_conflicts = [], blackout_warnings = [] } = usePage<PageProps>().props;

    // Request form state
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [requestedDays, setRequestedDays] = useState<number | null>(null);
    const [dayOptions, setDayOptions] = useState<DayOption[]>([]);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [requestToCancel, setRequestToCancel] = useState<PtoRequest | null>(null);
    const [loadingHolidays, setLoadingHolidays] = useState(false);
    const [blackoutConflicts, setBlackoutConflicts] = useState<BlackoutConflict[]>(blackout_conflicts);
    const [blackoutWarnings, setBlackoutWarnings] = useState<BlackoutConflict[]>(blackout_warnings);
    const [checkingBlackouts, setCheckingBlackouts] = useState(false);

    // Blackout handling state
    const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
    const [isEmergencyOverride, setIsEmergencyOverride] = useState(false);
    const [emergencyReason, setEmergencyReason] = useState('');

    // Inertia form for PTO requests
    const { data, setData, post, processing, errors, reset } = useForm
    ({
        pto_type_id: '',
        start_date: '',
        end_date: '',
        reason: '',
        total_days: 0,
        day_options: [] as Array<{ date: string; type: 'full' | 'half' }>,
        is_emergency_override: false as boolean,
        acknowledge_warnings: false as boolean,

    });

    // Inertia form for cancellation
    const { post: postCancel, processing: cancelProcessing } = useForm();

    // Fetch holidays for date range
    const fetchHolidaysInRange = useCallback(async (startDate: string, endDate: string) => {
        if (!startDate || !endDate) {
            return;
        }

        router.get(route('pto.dashboard'), {
            start_date: startDate,
            end_date: endDate,
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['holidays'],
            onStart: () => setLoadingHolidays(true),
            onFinish: () => setLoadingHolidays(false),
        });
    }, []);

    // Check blackouts for date range
    const checkBlackouts = useCallback((startDate: string, endDate: string, ptoTypeId: string) => {
        if (!startDate || !endDate || !ptoTypeId) {
            setBlackoutConflicts([]);
            setBlackoutWarnings([]);
            return;
        }

        router.get(route('pto.dashboard'), {
            start_date: startDate,
            end_date: endDate,
            pto_type_id: ptoTypeId,
            user_id: user.id,
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['blackout_conflicts', 'blackout_warnings'],
            onStart: () => setCheckingBlackouts(true),
            onFinish: () => setCheckingBlackouts(false),
            onSuccess: (page) => {
                const conflicts = (page.props.blackout_conflicts as BlackoutConflict[]) || [];
                const warnings = (page.props.blackout_warnings as BlackoutConflict[]) || [];


                setBlackoutConflicts(conflicts);
                setBlackoutWarnings(warnings);
            },
            onError: () => {
                toast.error('Failed to check blackout periods');
                setBlackoutConflicts([]);
                setBlackoutWarnings([]);
            },
        });
    }, [user.id]);

    const handleCancelRequest = useCallback((request: PtoRequest) => {
        setRequestToCancel(request);
        setShowCancelDialog(true);
    }, []);

    const confirmCancelRequest = useCallback(() => {
        if (requestToCancel) {
            postCancel(route('pto.requests.cancel', { ptoRequest: requestToCancel.id }), {
                onSuccess: () => {
                    toast.success('PTO request cancelled successfully!');
                    setShowCancelDialog(false);
                    setRequestToCancel(null);
                },
                onError: () => {
                    toast.error('Failed to cancel PTO request.');
                    setShowCancelDialog(false);
                    setRequestToCancel(null);
                },
            });
        }
    }, [postCancel, requestToCancel]);

    // Convert PTO requests to calendar events
    const calendarEvents = useMemo((): CalendarEvent[] => {
        if (!department_pto_requests) return [];

        return department_pto_requests
            .filter((request) => request.status === 'approved' || request.status === 'pending')
            .map((request) => {
                const startDate = new Date(request.start_date);
                const endDate = new Date(request.end_date);
                const calendarEndDate = new Date(endDate);
                calendarEndDate.setDate(calendarEndDate.getDate() + 1);

                return {
                    id: `pto-${request.id}`,
                    title: `${request.user.name} - ${request.pto_type.code}${request.status === 'pending' ? ' *' : ''}`,
                    start: startDate,
                    end: calendarEndDate,
                    allDay: true,
                    resource: {
                        user: request.user.name,
                        type: request.pto_type.name,
                        status: request.status,
                        color: request.pto_type.color,
                        days: request.total_days,
                    },
                };
            });
    }, [department_pto_requests]);

    // Custom event style
    const eventStyleGetter = useCallback((event: CalendarEvent) => {
        const isPending = event.resource.status === 'pending';

        return {
            style: {
                backgroundColor: isPending ? '#fef3c7' : event.resource.color + '80',
                borderColor: isPending ? '#d97706' : '#22c55e',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: '#333',
                borderRadius: '3px',
                fontSize: '12px',
                padding: '1px 3px',
                lineHeight: '1.2',
            },
        };
    }, []);

    // Custom event component
    const EventComponent = useCallback(({ event }: { event: CalendarEvent }) => (
        <div className="overflow-hidden">
            <div className="truncate font-medium text-xs leading-tight">
                {event.resource.user} - {event.resource.type} {event.resource.status === 'pending' && ' * Pending'}
            </div>
        </div>
    ), []);

    // Generate day options and check for holidays
    const generateDayOptions = useCallback((startDate: string, endDate: string): DayOption[] => {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const businessDays: Date[] = [];
        const curDate = new Date(start.getTime());

        while (curDate <= end) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                businessDays.push(new Date(curDate.getTime()));
            }
            curDate.setDate(curDate.getDate() + 1);
        }

        return businessDays.map((date) => {
            const dateString = date.toISOString().split('T')[0];
            const holiday = holidays.find(h => h.date === dateString);

            return {
                date,
                type: 'full' as const,
                isHoliday: !!holiday,
                holidayName: holiday?.name,
            };
        });
    }, [holidays]);

    // Handle blackout warnings acknowledgment
    const handleWarningsAcknowledgment = useCallback((acknowledged: boolean) => {
        setWarningsAcknowledged(acknowledged);
        setData('acknowledge_warnings', acknowledged);
    }, [setData]);

    // Handle emergency override
    const handleEmergencyOverride = useCallback((enabled: boolean, reason?: string) => {
        setIsEmergencyOverride(enabled);
        setEmergencyReason(reason || '');
        setData('is_emergency_override', enabled);
    }, [setData]);

    // Update useEffect to handle date changes and blackout checking
    useEffect(() => {
        if (data.start_date && data.end_date && data.pto_type_id) {
            const start = new Date(data.start_date);
            const end = new Date(data.end_date);

            if (start <= end) {
                fetchHolidaysInRange(data.start_date, data.end_date);
                checkBlackouts(data.start_date, data.end_date, data.pto_type_id);
            } else {
                setDayOptions([]);
                setRequestedDays(null);
                setData('total_days', 0);
                setData('day_options', []);
                setBlackoutConflicts([]);
                setBlackoutWarnings([]);
            }
        } else {
            setDayOptions([]);
            setRequestedDays(null);
            setData('total_days', 0);
            setData('day_options', []);
            setBlackoutConflicts([]);
            setBlackoutWarnings([]);
        }
    }, [data.start_date, data.end_date, data.pto_type_id, fetchHolidaysInRange, checkBlackouts, setData]);


    // Update day options when holidays are loaded
    useEffect(() => {
        if (data.start_date && data.end_date) {
            const start = new Date(data.start_date + 'T00:00:00');
            const end = new Date(data.end_date + 'T00:00:00');
            const businessDays: Date[] = [];
            const curDate = new Date(start.getTime());

            // Generate business days
            while (curDate <= end) {
                const dayOfWeek = curDate.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    businessDays.push(new Date(curDate.getTime()));
                }
                curDate.setDate(curDate.getDate() + 1);
            }

            // Create day options with holiday information
            const newDayOptions = businessDays.map((date) => {
                const dateString = date.toISOString().split('T')[0];
                const holiday = holidays.find(h => h.date === dateString);

                return {
                    date,
                    type: 'full' as const,
                    isHoliday: !!holiday,
                    holidayName: holiday?.name,
                };
            });

            setDayOptions(newDayOptions);

            // Calculate total days excluding holidays
            const totalDays = newDayOptions
                .filter(day => !day.isHoliday)
                .reduce((sum, day) => sum + (day.type === 'full' ? 1.0 : 0.5), 0);

            setRequestedDays(totalDays);
            setData('total_days', totalDays);

            // Only include non-holiday days in day_options for backend
            setData('day_options', newDayOptions
                .filter(day => !day.isHoliday)
                .map(option => ({
                    date: option.date.toISOString().split('T')[0],
                    type: option.type,
                }))
            );
        }
    }, [holidays, data.start_date, data.end_date, setData]);


    // Handle day option change
    const handleDayOptionChange = useCallback((date: Date, type: 'full' | 'half') => {
        const updatedOptions = dayOptions.map((option) => {
            if (option.date.getTime() === date.getTime()) {
                return { ...option, type };
            }
            return option;
        });

        setDayOptions(updatedOptions);

        // Calculate total days excluding holidays
        const totalDays = updatedOptions
            .filter(day => !day.isHoliday)
            .reduce((sum, day) => sum + (day.type === 'full' ? 1.0 : 0.5), 0);

        setRequestedDays(totalDays);
        setData('total_days', totalDays);

        // Only include non-holiday days in day_options for backend
        setData('day_options', updatedOptions
            .filter(day => !day.isHoliday)
            .map(option => ({
                date: option.date.toISOString().split('T')[0],
                type: option.type,
            }))
        );
    }, [dayOptions, setData]);

    // Handle date input changes with weekend validation
    const handleDateChange = useCallback((field: 'start_date' | 'end_date', value: string) => {
        if (!value) {
            setData(field, '');
            return;
        }

        const selectedDate = new Date(value + 'T00:00:00');
        const dayOfWeek = selectedDate.getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            toast.error('Weekends are not valid for PTO requests. Please select a weekday.');
        } else {
            setData(field, value);
        }
    }, [setData]);

    // Reset form
    const resetForm = useCallback(() => {
        reset();
        setRequestedDays(null);
        setDayOptions([]);
        setBlackoutConflicts([]);
        setBlackoutWarnings([]);
        setWarningsAcknowledged(false);
        setIsEmergencyOverride(false);
        setEmergencyReason('');
        setShowRequestForm(false);
    }, [reset]);

    // Handle form submission
    const handleSubmit = useCallback(() => {

        if (!data.pto_type_id || !data.start_date || !data.end_date) {
            toast.error('Please fill in all required fields.');
            return;
        }

        if (requestedDays === null || requestedDays < 0) {
            toast.error('Please select valid business days.');
            return;
        }

        if (requestedDays === 0 && holidays.length > 0) {
            toast.info('Your selected date range only contains holidays, so no PTO days are required!');
            return;
        }

        // Check if there are blocking conflicts without emergency override
        if (blackoutConflicts.length > 0 && !isEmergencyOverride) {
            toast.error('Cannot submit request due to blackout period conflicts. Enable emergency override if available.');
            return;
        }

        // Check if emergency override requires reason
        if (isEmergencyOverride && emergencyReason.trim().length < 10) {
            toast.error('Emergency override requires a detailed justification (minimum 10 characters).');
            return;
        }

        // Check if warnings need acknowledgment
        if (blackoutWarnings.length > 0 && !warningsAcknowledged) {
            toast.error('Please acknowledge blackout period warnings before submitting.');
            return;
        }

        // Check balance
        const selectedType = pto_data.find((item) => item.pto_type.id === parseInt(data.pto_type_id));
        if (selectedType && requestedDays > selectedType.available_balance) {
            toast.error(`You don't have enough PTO balance (${selectedType.available_balance} days available, ${requestedDays} days required after excluding holidays).`);
            return;
        }

        post(route('pto.requests.store'), {
            onSuccess: () => {
                resetForm();
                if (isEmergencyOverride) {
                    toast.success('PTO request submitted with emergency override! Please check with your manager.');
                } else if (blackoutWarnings.length > 0) {
                    toast.success('PTO request submitted successfully! Note: Request has blackout period warnings.');
                } else {
                    toast.success('PTO request submitted successfully! Holidays were automatically excluded.');
                }
            },
            onError: (errors) => {
                if (errors.blackout_conflicts) {
                    toast.error('PTO request conflicts with blackout periods.');
                } else {
                    toast.error('Failed to submit PTO request.');
                }
            },
        });
    }, [data, requestedDays, pto_data, holidays, blackoutConflicts, blackoutWarnings, isEmergencyOverride, emergencyReason, warningsAcknowledged, post, resetForm]);

    // Helper function to check if request can be cancelled
    const canCancelRequest = useCallback((request: PtoRequest) => {
        if (request.status === 'pending') {
            return true;
        }

        if (request.status === 'approved') {
            const startDateTime = new Date(request.start_date);
            const now = new Date();
            const hoursUntilStart = (startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            return hoursUntilStart >= 24;
        }

        return false;
    }, []);

    // Format date for display
    const formatDate = useCallback((dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }, []);

    // Get status color
    const getStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'denied':
                return 'bg-red-100 text-red-800';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    }, []);

    const getApprovedDaysForType = useCallback((ptoTypeId: number) => {
        return recent_requests
            .filter(request =>
                request.pto_type.id === ptoTypeId &&
                request.status === 'approved'
            )
            .reduce((total, request) => total + request.total_days, 0);
    }, [recent_requests]);

    // Prepare donut chart data for each PTO type
    const getPtoChartData = (ptoItem: PtoDataItem) => {
        const remainingBalance = ptoItem.balance; // This is the remaining balance after used
        const usedBalance = ptoItem.used_balance; // This is what was actually used
        const pendingBalance = ptoItem.pending_balance || 0;
        const availableBalance = ptoItem.available_balance; // This is remaining - pending

        const data = [];

        if (usedBalance > 0) {
            data.push({
                label: 'taken',
                value: usedBalance,
                color: '#ef4444',
                description: `${usedBalance} days taken`
            });
        }

        if (pendingBalance > 0) {
            data.push({
                label: 'scheduled',
                value: pendingBalance,
                color: '#f59e0b',
                description: `${pendingBalance} days scheduled`
            });
        }

        if (availableBalance > 0) {
            data.push({
                label: 'remaining',
                value: availableBalance,
                color: ptoItem.pto_type.color,
                description: `${availableBalance} days remaining`
            });
        }

        return data;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PTO Dashboard" />

            <div className="flex flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-600">PTO Dashboard</h1>
                    <Button onClick={() => setShowRequestForm(true)} className="gap-2 bg-green-600 hover:bg-green-700">
                        Request Time Off
                    </Button>
                </div>

                {/* Time Off Policy Overview */}
                <div className="flex flex-col-4 gap-2 ">
                    {pto_data.map((item) => (
                        <div key={item.pto_type.id} className={"border-2 border-gray-200 rounded-lg p-4 "}>
                            <div className="pb-4">
                                <div className="flex justify-between gap-2">
                                    <div className="text-gray-600 font-medium">Your Time Off Overview</div>
                                    <Badge variant="outline" style={{ backgroundColor: item.pto_type.color }}>
                                        <p className="text-md font-semibold text-gray-700 uppercase">{item.pto_type.name}</p>
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <div>
                                    <div className="space-y-4">
                                        <DonutChart data={getPtoChartData(item)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Upcoming Requests */}
                    <div className={"border-2 border-gray-200 rounded-lg p-4 "}>
                        <div>
                            <div className="text-gray-900 font-medium">Upcoming Requests</div>
                        </div>
                        <div className={"p-4"}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-600">
                                    <div>Date</div>
                                    <div>Type</div>
                                    <div>Status</div>
                                    <div>Action</div>
                                </div>
                                {recent_requests
                                    .filter(request => request.status === 'approved' || request.status === 'pending')
                                    .slice(0, 5)
                                    .map((request) => {
                                        const canCancel = canCancelRequest(request);
                                        const startDateTime = new Date(request.start_date);
                                        const now = new Date();
                                        const hoursUntilStart = (startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                                        return (
                                            <div key={request.id} className="grid grid-cols-4 gap-4 items-center py-2 border-b last:border-b-0">
                                                <div className="text-blue-500 text-sm">
                                                    {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: request.pto_type.color }} />
                                                    <span className="text-xs">{request.pto_type.code}</span>
                                                    {/* Show blackout indicators */}
                                                    {request.has_blackout_conflicts && (
                                                        <AlertTriangle className="h-3 w-3 text-red-500" />
                                                    )}
                                                    {request.has_blackout_warnings && (
                                                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                                    )}
                                                    {request.has_emergency_override && (
                                                        <Badge variant="outline" className="text-xs px-1 py-0">
                                                            {request.override_approved ? 'Override ✓' : 'Override Pending'}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div>
                                                    <Badge className={getStatusColor(request.status)}>
                                                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {canCancel ? (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleCancelRequest(request)}
                                                            disabled={cancelProcessing}
                                                            className="text-xs px-2 py-1 h-auto"
                                                        >
                                                            {cancelProcessing ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <X className="h-3 w-3" />
                                                            )}
                                                            Cancel
                                                        </Button>
                                                    ) : (
                                                        <div className="text-xs text-gray-500">
                                                            {request.status === 'approved' && hoursUntilStart < 24
                                                                ? `Started on ${formatDate(request.start_date)}`
                                                                : request.status === 'denied' || request.status === 'cancelled'
                                                                    ? 'Not cancellable'
                                                                    : ''
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                {recent_requests.filter(r => r.status === 'approved' || r.status === 'pending').length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No upcoming requests
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Company Holidays */}
                    <div className={"border-2 border-gray-200 rounded-lg p-4 "}>
                        <div >
                            <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="h-5 w-5" />
                                Upcoming Company Holidays
                            </div>
                        </div>
                        <div className={"p-4"}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-500">
                                    <div>Date</div>
                                    <div>Holiday</div>
                                </div>
                                {upcoming_holidays.slice(0, 5).map((holiday) => (
                                    <div key={holiday.date} className="grid grid-cols-2 gap-4 items-center py-2 border-b last:border-b-0">
                                        <div className="text-blue-500 text-sm">{holiday.formatted_date}</div>
                                        <div className="text-sm">
                                            <div>{holiday.name}</div>
                                            <div className="text-xs text-gray-500 capitalize">{holiday.type} holiday</div>
                                        </div>
                                    </div>
                                ))}
                                {upcoming_holidays.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No upcoming holidays
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cancel Dialog */}
                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Cancel PTO Request</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to cancel this PTO request?
                            </DialogDescription>
                            {requestToCancel && requestToCancel.pto_type && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                    <div className="text-sm">
                                        <div><strong>Date:</strong> {formatDate(requestToCancel.start_date)} - {formatDate(requestToCancel.end_date)}</div>
                                        <div><strong>Type:</strong> {requestToCancel.pto_type.name}</div>
                                        <div><strong>Days:</strong> {requestToCancel.total_days}</div>
                                        <div><strong>Status:</strong> {requestToCancel.status}</div>
                                    </div>
                                </div>
                            )}
                            <div className="mt-2 text-sm text-gray-600">
                                This action cannot be undone. The days will be returned to your balance.
                            </div>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCancelDialog(false)}
                                disabled={cancelProcessing}
                            >
                                Keep Request
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={confirmCancelRequest}
                                disabled={cancelProcessing}
                            >
                                {cancelProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Cancelling...
                                    </>
                                ) : (
                                    <>
                                        <X className="mr-2 h-4 w-4" />
                                        Cancel Request
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Taken Time Off */}
                <div className={"border-2 border-gray-200 rounded-lg p-4 "}>
                    <div>
                        <div className="text-gray-900 font-medium">Taken Time Off</div>
                    </div>
                    <div className={"p-4"}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-500">
                                <div>Date</div>
                                <div>Type</div>
                                <div>Days</div>
                            </div>
                            {recent_requests
                                .filter(request => request.status === 'approved')
                                .slice(0, 5)
                                .map((request) => (
                                    <div key={request.id} className="grid grid-cols-3 gap-4 items-center py-2 border-b last:border-b-0">
                                        <div className="text-blue-500">
                                            {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: request.pto_type.color }} />
                                            {request.pto_type.name}
                                        </div>
                                        <div>{request.total_days}</div>
                                    </div>
                                ))}
                            {recent_requests.filter(r => r.status === 'approved').length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    No time off taken yet
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Department PTO Calendar */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            <CardTitle>Department PTO Calendar</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className='h-dvh'>
                            <BigCalendar
                                localizer={localizer}
                                events={calendarEvents}
                                startAccessor="start"
                                endAccessor="end"
                                titleAccessor="title"
                                allDayAccessor="allDay"
                                views={['month', 'week', 'day']}
                                defaultView={Views.MONTH}
                                eventPropGetter={eventStyleGetter}
                                components={{
                                    event: EventComponent,
                                }}
                                popup
                                showMultiDayTimes
                                step={60}
                                showAllEvents
                                onSelectEvent={(event) => {
                                    toast.info(
                                        `${event.resource.user} - ${event.resource.type} (${event.resource.status}) - ${event.resource.days} days`
                                    );
                                }}
                            />
                        </div>

                        {/* Legend */}
                        <div className="mt-4 border-t pt-4">
                            <div className="text-muted-foreground mb-2 text-sm">Legend:</div>
                            <div className="flex flex-wrap gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                    <div className="h-3 w-3 border-2 border-orange-600 bg-yellow-200"></div>
                                    <span>Pending (*)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="h-3 w-3 border-2 border-green-500 bg-green-200"></div>
                                    <span>Approved</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Request PTO Dialog */}
                <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
                    <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Request PTO</DialogTitle>
                            <DialogDescription>Submit a new paid time off request. Holidays will be automatically excluded.</DialogDescription>
                        </DialogHeader>

                        <div onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="pto_type_id">
                                    PTO Type <span className="text-red-500">*</span>
                                </Label>
                                <Select value={data.pto_type_id} onValueChange={(value) => setData('pto_type_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select PTO type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pto_data.map((item) => (
                                            <SelectItem key={item.pto_type.id} value={item.pto_type.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.pto_type.color }} />
                                                    {item.pto_type.name} ({item.available_balance} days available)
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.pto_type_id && <div className="text-red-500 text-sm">{errors.pto_type_id}</div>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">
                                        Start Date <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={data.start_date}
                                        onChange={(e) => handleDateChange('start_date', e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    {errors.start_date && <div className="text-red-500 text-sm">{errors.start_date}</div>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="end_date">
                                        End Date <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="end_date"
                                        type="date"
                                        value={data.end_date}
                                        onChange={(e) => handleDateChange('end_date', e.target.value)}
                                        min={data.start_date || new Date().toISOString().split('T')[0]}
                                    />
                                    {errors.end_date && <div className="text-red-500 text-sm">{errors.end_date}</div>}
                                </div>
                            </div>

                            {/* Holiday Notice */}
                            {data.start_date && data.end_date && holidays.length > 0 && (
                                <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                        <p className="text-sm font-medium text-blue-800">Holidays in your date range:</p>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {holidays.map((holiday) => (
                                            <div key={holiday.date} className="text-sm text-blue-700">
                                                • {holiday.formatted_date}: {holiday.name}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-blue-600">
                                        These holidays will be automatically excluded from your PTO calculation.
                                    </p>
                                </div>
                            )}

                            {/* Blackout Handler Component */}
                            {data.start_date && data.end_date && data.pto_type_id && (
                                checkingBlackouts ? (
                                    <div className="rounded-md bg-gray-50 border border-gray-200 p-4">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm">Checking blackout periods...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <BlackoutHandler
                                        conflicts={blackoutConflicts}
                                        warnings={blackoutWarnings}
                                        onAcknowledgeWarnings={handleWarningsAcknowledgment}
                                        onEmergencyOverride={handleEmergencyOverride}
                                        showActions={true}
                                        className="my-4"
                                    />
                                )
                            )}

                            {requestedDays !== null && (
                                <div className="rounded-md bg-gray-50 p-3">
                                    <p className="text-sm">
                                        <strong>PTO days required:</strong> {requestedDays}
                                        {holidays.length > 0 && (
                                            <span className="text-green-600 ml-1">(holidays excluded)</span>
                                        )}
                                        {requestedDays !== Math.floor(requestedDays) && (
                                            <span className="text-muted-foreground ml-1">(includes half days)</span>
                                        )}
                                    </p>
                                </div>
                            )}

                            {/* Day Options */}
                            {dayOptions.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Day Options</Label>
                                    <div className="max-h-60 space-y-3 overflow-y-auto rounded-md border p-4">
                                        {dayOptions.map((dayOption, index) => (
                                            <div key={index} className={`flex items-center justify-between ${dayOption.isHoliday ? 'opacity-50' : ''}`}>
                                                <div className="text-sm font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <span>
                                                            {dayOption.date.toLocaleDateString('en-US', {
                                                                weekday: 'long',
                                                                month: 'short',
                                                                day: 'numeric',
                                                            })}
                                                        </span>
                                                        {dayOption.isHoliday && (
                                                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                                                {dayOption.holidayName}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex space-x-4">
                                                    {dayOption.isHoliday ? (
                                                        <div className="text-xs text-gray-500 italic">Holiday - No PTO needed</div>
                                                    ) : (
                                                        <>
                                                            <label className="flex items-center text-sm">
                                                                <input
                                                                    type="radio"
                                                                    name={`day-option-${index}`}
                                                                    checked={dayOption.type === 'full'}
                                                                    onChange={() => handleDayOptionChange(dayOption.date, 'full')}
                                                                    className="mr-2"
                                                                />
                                                                Full Day (-1.0)
                                                            </label>
                                                            <label className="flex items-center text-sm">
                                                                <input
                                                                    type="radio"
                                                                    name={`day-option-${index}`}
                                                                    checked={dayOption.type === 'half'}
                                                                    onChange={() => handleDayOptionChange(dayOption.date, 'half')}
                                                                    className="mr-2"
                                                                />
                                                                Half Day (-0.5)
                                                            </label>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="reason">Reason (Optional)</Label>
                                <Textarea
                                    id="reason"
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    placeholder="Optional reason for your request..."
                                    rows={3}
                                />
                                {errors.reason && <div className="text-red-500 text-sm">{errors.reason}</div>}
                            </div>

                            {errors.total_days && <div className="text-red-500 text-sm">{errors.total_days}</div>}

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={resetForm} disabled={processing || loadingHolidays || checkingBlackouts}>
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={
                                        processing ||
                                        loadingHolidays ||
                                        checkingBlackouts ||
                                        (blackoutConflicts.length > 0 && !isEmergencyOverride) ||
                                        (blackoutWarnings.length > 0 && !warningsAcknowledged) ||
                                        (isEmergencyOverride && emergencyReason.trim().length < 10)
                                    }
                                >
                                    {processing ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : loadingHolidays ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : checkingBlackouts ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    {checkingBlackouts ? 'Checking Blackouts...' :
                                        loadingHolidays ? 'Checking Holidays...' :
                                            isEmergencyOverride ? 'Submit Emergency Override' :
                                                'Submit Request'}
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
