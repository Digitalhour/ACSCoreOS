import React, {useCallback, useState} from 'react';
import {Head, router, useForm, usePage} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
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
import {Switch} from '@/components/ui/switch';
import {AlertTriangle, Calendar, Edit, Loader2, Plus, Trash2, Users} from 'lucide-react';
import {toast} from 'sonner';
import HrLayout from "@/layouts/settings/hr-layout";
import {Separator} from "@/components/ui/separator";

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Admin', href: '/admin' },
    { title: 'PTO Blackouts', href: '/admin/blackouts' },
];

interface Department {
    id: number;
    name: string;
}

interface Position {
    id: number;
    name: string;
}

interface PtoType {
    id: number;
    name: string;
    code: string;
    color: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface Holiday {
    id: number;
    name: string;
    date: string;
}

interface Blackout {
    id: number;
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    formatted_date_range: string;
    position?: string;
    departments: string[];
    users: string[];
    pto_types: string[];
    is_company_wide: boolean;
    is_holiday: boolean;
    is_strict: boolean;
    allow_emergency_override: boolean;
    restriction_type: 'full_block' | 'limit_requests' | 'warning_only';
    max_requests_allowed?: number;
    is_active: boolean;
    // New recurring fields
    is_recurring: boolean;
    recurring_days?: number[];
    recurring_start_date?: string;
    recurring_end_date?: string;
    recurring_day_names?: string[];
    created_at: string;
    updated_at: string;
}

interface PageProps {
    blackouts?: {
        data: Blackout[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    departments: Department[];
    positions: Position[];
    ptoTypes: PtoType[];
    users: User[];
    holidays: Holiday[];
}

export default function BlackoutsIndex() {
    const props = usePage<PageProps>().props;
    const {
        blackouts = { data: [], current_page: 1, last_page: 1, per_page: 15, total: 0 },
        departments = [],
        positions = [],
        ptoTypes = [],
        users = [],
        holidays = []
    } = props;

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editingBlackout, setEditingBlackout] = useState<Blackout | null>(null);
    const [deletingBlackout, setDeletingBlackout] = useState<Blackout | null>(null);

    // Form with explicit non-empty string defaults for Select components
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        position_id: 'none', // Never empty string
        department_ids: [] as number[],
        user_ids: [] as number[],
        is_company_wide: false,
        is_holiday: false,
        is_strict: false,
        allow_emergency_override: false,
        restriction_type: 'full_block' as 'full_block' | 'limit_requests' | 'warning_only', // Never empty
        max_requests_allowed: '',
        pto_type_ids: [] as number[],
        is_active: true,
        is_recurring: false,
        recurring_days: [] as number[],
        recurring_start_date: '',
        recurring_end_date: '',
    });

    const resetForm = useCallback(() => {
        // Reset with proper initial values to avoid empty strings in Selects
        setData({
            name: '',
            description: '',
            start_date: '',
            end_date: '',
            position_id: 'none', // Always set to 'none' instead of empty string
            department_ids: [],
            user_ids: [],
            is_company_wide: false,
            is_holiday: false,
            is_strict: false,
            allow_emergency_override: false,
            restriction_type: 'full_block',
            max_requests_allowed: '',
            pto_type_ids: [],
            is_active: true,
            is_recurring: false,
            recurring_days: [],
            recurring_start_date: '',
            recurring_end_date: '',
        });
        setEditingBlackout(null);
    }, [setData]);

    // Days of the week for recurring blackouts
    const daysOfWeek = [
        { value: 0, label: 'Sunday', short: 'Sun' },
        { value: 1, label: 'Monday', short: 'Mon' },
        { value: 2, label: 'Tuesday', short: 'Tue' },
        { value: 3, label: 'Wednesday', short: 'Wed' },
        { value: 4, label: 'Thursday', short: 'Thu' },
        { value: 5, label: 'Friday', short: 'Fri' },
        { value: 6, label: 'Saturday', short: 'Sat' },
    ];

    const handleRecurringDayToggle = (dayValue: number) => {
        const currentDays = data.recurring_days || [];
        if (currentDays.includes(dayValue)) {
            setData('recurring_days', currentDays.filter(d => d !== dayValue));
        } else {
            setData('recurring_days', [...currentDays, dayValue]);
        }
    };

    const handleCreate = () => {
        resetForm();
        // Small delay to ensure form state is set before opening modal
        setTimeout(() => {
            setShowCreateDialog(true);
        }, 10);
    };

    const handleEdit = async (blackout: Blackout) => {
        try {
            const response = await fetch(route('admin.blackouts.show', blackout.id));
            const { blackout: blackoutData } = await response.json();

            setData({
                name: blackoutData.name,
                description: blackoutData.description || '',
                start_date: blackoutData.start_date || '',
                end_date: blackoutData.end_date || '',
                is_recurring: blackoutData.is_recurring || false,
                recurring_days: blackoutData.recurring_days || [],
                recurring_start_date: blackoutData.recurring_start_date || '',
                recurring_end_date: blackoutData.recurring_end_date || '',
                position_id: blackoutData.position_id ? blackoutData.position_id.toString() : 'none',
                department_ids: blackoutData.department_ids || [],
                user_ids: blackoutData.user_ids || [],
                is_company_wide: blackoutData.is_company_wide,
                is_holiday: blackoutData.is_holiday,
                is_strict: blackoutData.is_strict,
                allow_emergency_override: blackoutData.allow_emergency_override,
                restriction_type: blackoutData.restriction_type || 'full_block',
                max_requests_allowed: blackoutData.max_requests_allowed ? blackoutData.max_requests_allowed.toString() : '',
                pto_type_ids: blackoutData.pto_type_ids || [],
                is_active: blackoutData.is_active,
            });

            setEditingBlackout(blackout);
            setShowEditDialog(true);
        } catch (error) {
            toast.error('Failed to load blackout details');
        }
    };

    const handleDelete = (blackout: Blackout) => {
        setDeletingBlackout(blackout);
        setShowDeleteDialog(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Clean up form data before submission
        const cleanedData = {
            ...data,
            // Convert 'none' to null for position_id
            position_id: data.position_id === 'none' ? null : data.position_id,
            // Convert empty string to null for max_requests_allowed
            max_requests_allowed: data.max_requests_allowed === '' ? null : data.max_requests_allowed,
            // Convert empty strings to null for recurring dates
            recurring_start_date: data.recurring_start_date === '' ? null : data.recurring_start_date,
            recurring_end_date: data.recurring_end_date === '' ? null : data.recurring_end_date,
            // Convert empty strings to null for regular dates when not recurring
            start_date: data.is_recurring ? null : (data.start_date === '' ? null : data.start_date),
            end_date: data.is_recurring ? null : (data.end_date === '' ? null : data.end_date),
            // Clear recurring fields when not recurring
            recurring_days: data.is_recurring ? data.recurring_days : null,
        };

        if (editingBlackout) {
            router.patch(route('admin.blackouts.update', editingBlackout.id), cleanedData, {
                onSuccess: () => {
                    reset();
                    setEditingBlackout(null);
                    setShowEditDialog(false);
                    toast.success('Blackout updated successfully!');
                },
                onError: (errors) => {
                    console.error('Update errors:', errors);
                }
            });
        } else {
            router.post(route('admin.blackouts.store'), cleanedData, {
                onSuccess: () => {
                    reset();
                    setShowCreateDialog(false);
                    toast.success('Blackout created successfully!');
                },
                onError: (errors) => {
                    console.error('Create errors:', errors);
                }
            });
        }
    };

    const confirmDelete = () => {
        if (deletingBlackout) {
            router.delete(route('admin.blackouts.destroy', deletingBlackout.id), {
                onSuccess: () => {
                    toast.success('Blackout deleted successfully');
                    setShowDeleteDialog(false);
                    setDeletingBlackout(null);
                },
                onError: () => {
                    toast.error('Failed to delete blackout');
                    setShowDeleteDialog(false);
                    setDeletingBlackout(null);
                },
            });
        }
    };

    const getRestrictionTypeColor = (type: string) => {
        switch (type) {
            case 'full_block':
                return 'bg-red-100 text-red-800';
            case 'limit_requests':
                return 'bg-yellow-100 text-yellow-800';
            case 'warning_only':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getRestrictionTypeLabel = (type: string) => {
        switch (type) {
            case 'full_block':
                return 'Full Block';
            case 'limit_requests':
                return 'Limit Requests';
            case 'warning_only':
                return 'Warning Only';
            default:
                return type;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PTO Blackouts" />
            <HrLayout>
                <div className="flex h-full flex-1 flex-col gap-6 ">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-600">PTO Blackouts</h1>
                        <Button onClick={handleCreate} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Blackout
                        </Button>
                    </div>

                    <Card>
                        <CardContent>
                            <div className="space-y-4">
                                {(!blackouts?.data || blackouts.data.length === 0) ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No blackout periods configured
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {blackouts.data.map((blackout) => (
                                            <div key={blackout.id} className="border rounded-sm p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="font-semibold text-lg">{blackout.name}</h3>
                                                            <Badge
                                                                className={getRestrictionTypeColor(blackout.restriction_type)}
                                                            >
                                                                {getRestrictionTypeLabel(blackout.restriction_type)}
                                                            </Badge>
                                                            {blackout.is_recurring && (
                                                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700">
                                                                    <Calendar className="h-3 w-3 mr-1" />
                                                                    Recurring
                                                                </Badge>
                                                            )}
                                                            {blackout.is_company_wide && (
                                                                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                                                    Company Wide
                                                                </Badge>
                                                            )}
                                                            {blackout.is_holiday && (
                                                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                                                    Holiday
                                                                </Badge>
                                                            )}
                                                            {!blackout.is_active && (
                                                                <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                                                    Inactive
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <div className="font-medium text-gray-700 mb-1">
                                                                    {blackout.is_recurring ? 'Recurring Schedule' : 'Date Range'}
                                                                </div>
                                                                <div className="flex items-center gap-1 text-blue-600">
                                                                    <Calendar className="h-4 w-4" />
                                                                    {blackout.formatted_date_range}
                                                                </div>
                                                                {blackout.is_recurring && blackout.recurring_day_names && (
                                                                    <div className="mt-1 text-xs text-gray-600">
                                                                        Days: {blackout.recurring_day_names.join(', ')}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <div className="font-medium text-gray-700 mb-1">Applies To</div>
                                                                <div className="space-y-1">
                                                                    {blackout.is_company_wide && (
                                                                        <div className="flex items-center gap-1">
                                                                            <Users className="h-4 w-4" />
                                                                            All employees
                                                                        </div>
                                                                    )}
                                                                    {blackout.position && (
                                                                        <div>Position: {blackout.position}</div>
                                                                    )}
                                                                    {blackout.departments.length > 0 && (
                                                                        <div>Departments: {blackout.departments.join(', ')}</div>
                                                                    )}
                                                                    {blackout.users.length > 0 && (
                                                                        <div>Users: {blackout.users.length} selected</div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div className="font-medium text-gray-700 mb-1">Restrictions</div>
                                                                <div className="space-y-1">
                                                                    {blackout.is_strict && (
                                                                        <div className="flex items-center gap-1 text-red-600">
                                                                            <AlertTriangle className="h-4 w-4" />
                                                                            Strict enforcement
                                                                        </div>
                                                                    )}
                                                                    {blackout.allow_emergency_override && (
                                                                        <div className="text-orange-600">Emergency override allowed</div>
                                                                    )}
                                                                    {blackout.max_requests_allowed && (
                                                                        <div>Max requests: {blackout.max_requests_allowed}</div>
                                                                    )}
                                                                    {blackout.pto_types.length > 0 && (
                                                                        <div>PTO Types: {blackout.pto_types.join(', ')}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {blackout.description && (
                                                            <div className="mt-3 text-sm text-gray-600">
                                                                {blackout.description}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(blackout)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDelete(blackout)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Create/Edit Dialog */}
                    <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
                        if (!open) {
                            setShowCreateDialog(false);
                            setShowEditDialog(false);
                            resetForm();
                        }
                    }}>
                        <DialogContent className="max-w-4xl min-w-8/12 max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingBlackout ? 'Edit Blackout Period' : 'Create Blackout Period'}
                                </DialogTitle>
                                <DialogDescription>
                                    Configure a blackout period to restrict Time-Off requests during specific dates or recurring days.
                                </DialogDescription>
                            </DialogHeader>

                            {/* Only render form when data is properly initialized */}
                            {(showCreateDialog || showEditDialog) && (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name *</Label>
                                            <Input
                                                id="name"
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                placeholder="e.g., Holiday Blackout"
                                            />
                                            {errors.name && <div className="text-red-500 text-sm">{errors.name}</div>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="restriction_type">Restriction Type *</Label>
                                            <Select
                                                value={data.restriction_type && data.restriction_type !== '' ? data.restriction_type : 'full_block'}
                                                onValueChange={(value) => setData('restriction_type', value as any)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select restriction type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="full_block">Full Block - No requests allowed</SelectItem>
                                                    <SelectItem value="limit_requests">Limit Requests - Maximum number allowed</SelectItem>
                                                    <SelectItem value="warning_only">Warning Only - Show warning but allow</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.restriction_type && <div className="text-red-500 text-sm">{errors.restriction_type}</div>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Optional description of the blackout period"
                                            rows={3}
                                        />
                                        {errors.description && <div className="text-red-500 text-sm">{errors.description}</div>}
                                    </div>

                                    <Separator />

                                    {/* Blackout Type Section */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">Blackout Type</h3>

                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="is_recurring"
                                                checked={data.is_recurring}
                                                onCheckedChange={(checked) => {
                                                    setData('is_recurring', checked);
                                                    // Clear date fields when switching modes
                                                    if (checked) {
                                                        setData('start_date', '');
                                                        setData('end_date', '');
                                                    } else {
                                                        setData('recurring_days', []);
                                                        setData('recurring_start_date', '');
                                                        setData('recurring_end_date', '');
                                                    }
                                                }}
                                            />
                                            <Label htmlFor="is_recurring">Recurring blackout (specific days of the week)</Label>
                                        </div>

                                        {data.is_recurring ? (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Select Days of the Week *</Label>
                                                    <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                                                        {daysOfWeek.map((day) => (
                                                            <Button
                                                                key={day.value}
                                                                type="button"
                                                                variant={data.recurring_days?.includes(day.value) ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => handleRecurringDayToggle(day.value)}
                                                                className="flex flex-col items-center p-2 h-auto"
                                                            >
                                                                <span className="text-xs font-medium">{day.short}</span>
                                                                <span className="text-xs">{day.label}</span>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                    {errors.recurring_days && (
                                                        <div className="text-red-500 text-sm">{errors.recurring_days}</div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="recurring_start_date">Effective Start Date (Optional)</Label>
                                                        <Input
                                                            id="recurring_start_date"
                                                            type="date"
                                                            value={data.recurring_start_date}
                                                            onChange={(e) => setData('recurring_start_date', e.target.value)}
                                                        />
                                                        <p className="text-xs text-gray-500">Leave empty to start immediately</p>
                                                        {errors.recurring_start_date && (
                                                            <div className="text-red-500 text-sm">{errors.recurring_start_date}</div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="recurring_end_date">Effective End Date (Optional)</Label>
                                                        <Input
                                                            id="recurring_end_date"
                                                            type="date"
                                                            value={data.recurring_end_date}
                                                            onChange={(e) => setData('recurring_end_date', e.target.value)}
                                                            min={data.recurring_start_date}
                                                        />
                                                        <p className="text-xs text-gray-500">Leave empty for ongoing restriction</p>
                                                        {errors.recurring_end_date && (
                                                            <div className="text-red-500 text-sm">{errors.recurring_end_date}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {data.recurring_days?.length > 0 && (
                                                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                                        <p className="text-sm text-blue-700">
                                                            <strong>Preview:</strong> This will block PTO requests every{" "}
                                                            {data.recurring_days
                                                                .sort()
                                                                .map(day => daysOfWeek.find(d => d.value === day)?.label)
                                                                .join(", ")}
                                                            {data.recurring_start_date && ` starting from ${new Date(data.recurring_start_date).toLocaleDateString()}`}
                                                            {data.recurring_end_date && ` until ${new Date(data.recurring_end_date).toLocaleDateString()}`}
                                                            {!data.recurring_start_date && !data.recurring_end_date && " indefinitely"}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="start_date">Start Date *</Label>
                                                    <Input
                                                        id="start_date"
                                                        type="date"
                                                        value={data.start_date}
                                                        onChange={(e) => setData('start_date', e.target.value)}
                                                    />
                                                    {errors.start_date && <div className="text-red-500 text-sm">{errors.start_date}</div>}
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="end_date">End Date *</Label>
                                                    <Input
                                                        id="end_date"
                                                        type="date"
                                                        value={data.end_date}
                                                        onChange={(e) => setData('end_date', e.target.value)}
                                                        min={data.start_date}
                                                    />
                                                    {errors.end_date && <div className="text-red-500 text-sm">{errors.end_date}</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <Separator />

                                    {data.restriction_type === 'limit_requests' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="max_requests_allowed">Maximum Requests Allowed</Label>
                                            <Input
                                                id="max_requests_allowed"
                                                type="number"
                                                min="0"
                                                value={data.max_requests_allowed}
                                                onChange={(e) => setData('max_requests_allowed', e.target.value)}
                                                placeholder="Enter maximum number of requests"
                                            />
                                            {errors.max_requests_allowed && <div className="text-red-500 text-sm">{errors.max_requests_allowed}</div>}
                                        </div>
                                    )}

                                    {/* Scope Section */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">Scope</h3>

                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="is_company_wide"
                                                    checked={data.is_company_wide}
                                                    onCheckedChange={(checked) => {
                                                        setData('is_company_wide', checked);
                                                        // When company wide is enabled, clear position and department selections
                                                        if (checked) {
                                                            setData('position_id', 'none');
                                                            setData('department_ids', []);
                                                            setData('user_ids', []);
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor="is_company_wide">Apply to entire company</Label>
                                                {data.is_company_wide && (
                                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                                                        All scope restrictions ignored
                                                    </Badge>
                                                )}
                                            </div>

                                            {!data.is_company_wide && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Position</Label>
                                                        <Select
                                                            value={data.position_id && data.position_id !== '' ? data.position_id : 'none'}
                                                            onValueChange={(value) => setData('position_id', value === 'none' ? 'none' : value)}
                                                        >
                                                            <SelectTrigger className={"w-64"}>
                                                                <SelectValue placeholder="Select position (optional)" />
                                                            </SelectTrigger>
                                                            <SelectContent >
                                                                <SelectItem value="none">None</SelectItem>
                                                                {positions.map((position) => (
                                                                    <SelectItem key={position.id} value={position.id.toString()}>
                                                                        {position.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Departments</Label>
                                                        <Select
                                                            value="add_department"
                                                            onValueChange={(value) => {
                                                                if (value !== "add_department" && value !== "no_options") {
                                                                    const id = parseInt(value);
                                                                    if (!data.department_ids.includes(id)) {
                                                                        setData('department_ids', [...data.department_ids, id]);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Add departments" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="add_department" disabled>Select a department to add</SelectItem>
                                                                {departments.filter(dept => !data.department_ids.includes(dept.id)).length === 0 ? (
                                                                    <SelectItem value="no_options" disabled>No departments available</SelectItem>
                                                                ) : (
                                                                    departments
                                                                        .filter(dept => !data.department_ids.includes(dept.id))
                                                                        .map((department) => (
                                                                            <SelectItem key={department.id} value={department.id.toString()}>
                                                                                {department.name}
                                                                            </SelectItem>
                                                                        ))
                                                                )}
                                                            </SelectContent>
                                                        </Select>

                                                        {data.department_ids.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {data.department_ids.map((id) => {
                                                                    const dept = departments.find(d => d.id === id);
                                                                    return dept ? (
                                                                        <Badge key={id} variant="outline" className="gap-1">
                                                                            {dept.name}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setData('department_ids', data.department_ids.filter(did => did !== id))}
                                                                                className="ml-1 hover:text-red-500"
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </Badge>
                                                                    ) : null;
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* PTO Type Restrictions */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">PTO Type Restrictions</h3>
                                        <div className="space-y-2">
                                            <Label>Restrict specific PTO types only (leave empty to restrict all types)</Label>
                                            <Select
                                                value="add_pto_type"
                                                onValueChange={(value) => {
                                                    if (value !== "add_pto_type" && value !== "no_options") {
                                                        const id = parseInt(value);
                                                        if (!data.pto_type_ids.includes(id)) {
                                                            setData('pto_type_ids', [...data.pto_type_ids, id]);
                                                        }
                                                    }
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Add PTO types to restrict" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="add_pto_type" disabled>Select a PTO type to restrict</SelectItem>
                                                    {ptoTypes.filter(type => !data.pto_type_ids.includes(type.id)).length === 0 ? (
                                                        <SelectItem value="no_options" disabled>No PTO types available</SelectItem>
                                                    ) : (
                                                        ptoTypes
                                                            .filter(type => !data.pto_type_ids.includes(type.id))
                                                            .map((ptoType) => (
                                                                <SelectItem key={ptoType.id} value={ptoType.id.toString()}>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ptoType.color }} />
                                                                        {ptoType.name} ({ptoType.code})
                                                                    </div>
                                                                </SelectItem>
                                                            ))
                                                    )}
                                                </SelectContent>
                                            </Select>

                                            {data.pto_type_ids.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {data.pto_type_ids.map((id) => {
                                                        const type = ptoTypes.find(t => t.id === id);
                                                        return type ? (
                                                            <Badge key={id} variant="outline" className="gap-1">
                                                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: type.color }} />
                                                                {type.name}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setData('pto_type_ids', data.pto_type_ids.filter(tid => tid !== id))}
                                                                    className="ml-1 hover:text-red-500"
                                                                >
                                                                    ×
                                                                </button>
                                                            </Badge>
                                                        ) : null;
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Settings */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">Settings</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="is_holiday"
                                                        checked={data.is_holiday}
                                                        onCheckedChange={(checked) => setData('is_holiday', checked)}
                                                    />
                                                    <Label htmlFor="is_holiday">Holiday blackout</Label>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="is_strict"
                                                        checked={data.is_strict}
                                                        onCheckedChange={(checked) => setData('is_strict', checked)}
                                                    />
                                                    <Label htmlFor="is_strict">Strict enforcement</Label>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="allow_emergency_override"
                                                        checked={data.allow_emergency_override}
                                                        onCheckedChange={(checked) => setData('allow_emergency_override', checked)}
                                                    />
                                                    <Label htmlFor="allow_emergency_override">Allow emergency override</Label>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="is_active"
                                                        checked={data.is_active}
                                                        onCheckedChange={(checked) => setData('is_active', checked)}
                                                    />
                                                    <Label htmlFor="is_active">Active</Label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setShowCreateDialog(false);
                                                setShowEditDialog(false);
                                                resetForm();
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={processing}>
                                            {processing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {editingBlackout ? 'Updating...' : 'Creating...'}
                                                </>
                                            ) : (
                                                editingBlackout ? 'Update Blackout' : 'Create Blackout'
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Delete Dialog */}
                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Delete Blackout Period</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete this blackout period? This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>

                            {deletingBlackout && (
                                <div className="py-4">
                                    <div className="font-medium">{deletingBlackout.name}</div>
                                    <div className="text-sm text-gray-600">{deletingBlackout.formatted_date_range}</div>
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowDeleteDialog(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={confirmDelete}
                                >
                                    Delete
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </HrLayout>
        </AppLayout>
    );
}
