import React, {useCallback, useEffect, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {ArrowLeft, Calendar, Edit, Eye, EyeOff, Filter, Loader2, Plus, Search, Trash2} from 'lucide-react';
import {toast} from 'sonner';
import axios from 'axios';
import {cn} from '@/lib/utils';

interface Department {
    id: number;
    name: string;
}

interface Position {
    id: number;
    name: string;
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

interface PtoType {
    id: number;
    name: string;
}

interface PtoBlackout {
    id: number;
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    formatted_date_range: string;
    position?: Position;
    departments: Department[];
    users: User[];
    is_company_wide: boolean;
    is_holiday: boolean;
    is_strict: boolean;
    allow_emergency_override: boolean;
    restriction_type: 'full_block' | 'limit_requests' | 'warning_only';
    max_requests_allowed?: number;
    is_active: boolean;
}

interface FormData {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    position_id: string;
    department_ids: number[];
    user_ids: number[];
    is_company_wide: boolean;
    is_holiday: boolean;
    is_strict: boolean;
    allow_emergency_override: boolean;
    restriction_type: 'full_block' | 'limit_requests' | 'warning_only';
    max_requests_allowed: string;
    pto_type_ids: number[];
    is_active: boolean;
}

type FilterType = 'all' | 'active' | 'company_wide' | 'holidays' | 'strict';

export default function PtoBlackoutsComponent() {
    const [blackouts, setBlackouts] = useState<PtoBlackout[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [blackoutToDelete, setBlackoutToDelete] = useState<PtoBlackout | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Form data and resources
    const [formData, setFormData] = useState<FormData>({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        position_id: '',
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
    });

    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [ptoTypes, setPtoTypes] = useState<PtoType[]>([]);
    const [selectedHoliday, setSelectedHoliday] = useState<string>('');
    const [formErrors, setFormErrors] = useState<any>({});

    const fetchBlackouts = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/pto-blackouts/list');
            const responseData = response.data.blackouts || response.data;
            setBlackouts(Array.isArray(responseData) ? responseData : []);
        } catch (error) {
            console.error('Error fetching Blackouts:', error);
            toast.error('Failed to load Blackouts. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchFormResources = useCallback(async () => {
        try {
            const response = await axios.get('/api/pto-blackouts/form-resources');
            const data = response.data;
            setDepartments(data.departments || []);
            setPositions(data.positions || []);
            setUsers(data.users || []);
            setHolidays(data.holidays || []);
            setPtoTypes(data.ptoTypes || []);
        } catch (error) {
            console.error('Error fetching form resources:', error);
        }
    }, []);

    useEffect(() => {
        fetchBlackouts();
    }, [fetchBlackouts]);

    const filteredBlackouts = blackouts.filter(blackout => {
        const matchesSearch = blackout.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            blackout.description?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterType === 'all') return matchesSearch;
        if (filterType === 'active') return matchesSearch && blackout.is_active;
        if (filterType === 'company_wide') return matchesSearch && blackout.is_company_wide;
        if (filterType === 'holidays') return matchesSearch && blackout.is_holiday;
        if (filterType === 'strict') return matchesSearch && blackout.is_strict;

        return matchesSearch;
    });

    const handleCreate = async () => {
        setShowCreateForm(true);
        await fetchFormResources();
    };

    const handleEdit = (id: number) => {
        window.location.href = `/pto-blackouts/${id}/edit`;
    };

    const handleView = (id: number) => {
        window.location.href = `/pto-blackouts/${id}`;
    };

    const handleDelete = useCallback((blackout: PtoBlackout) => {
        setBlackoutToDelete(blackout);
        setShowDeleteAlert(true);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!blackoutToDelete) return;

        try {
            await axios.delete(`/api/pto-blackouts/${blackoutToDelete.id}`);
            await fetchBlackouts();
            toast.success(`Blackout "${blackoutToDelete.name}" deleted successfully.`);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete blackout.');
        } finally {
            setShowDeleteAlert(false);
            setBlackoutToDelete(null);
        }
    }, [blackoutToDelete, fetchBlackouts]);

    const toggleStatus = useCallback(async (blackout: PtoBlackout) => {
        try {
            await axios.post(`/api/pto-blackouts/${blackout.id}/toggle-status`);
            await fetchBlackouts();
            toast.success(`Blackout "${blackout.name}" status updated.`);
        } catch (error) {
            toast.error('Failed to update blackout status.');
        }
    }, [fetchBlackouts]);

    // Form handling functions
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setFormErrors({});

        try {
            await axios.post('/api/pto-blackouts', formData);
            toast.success('Blackout created successfully!');
            setShowCreateForm(false);
            resetForm();
            await fetchBlackouts();
        } catch (error: any) {
            if (error.response?.status === 422) {
                setFormErrors(error.response.data.errors);
            } else {
                toast.error('Failed to create blackout.');
            }
        } finally {
            setProcessing(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            start_date: '',
            end_date: '',
            position_id: '',
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
        });
        setSelectedHoliday('');
        setFormErrors({});
    };

    const handleHolidaySelect = (holidayId: string) => {
        if (!holidayId) return;

        const holiday = holidays.find(h => h.id.toString() === holidayId);
        if (holiday) {
            setFormData({
                ...formData,
                name: holiday.name,
                start_date: holiday.date,
                end_date: holiday.date,
                is_holiday: true,
                is_company_wide: true,
                restriction_type: 'full_block'
            });
        }
    };

    const handleDepartmentChange = (deptId: number) => {
        const newDepartmentIds = formData.department_ids.includes(deptId)
            ? formData.department_ids.filter(id => id !== deptId)
            : [...formData.department_ids, deptId];

        setFormData({...formData, department_ids: newDepartmentIds});
    };

    const handleUserChange = (userId: number) => {
        const newUserIds = formData.user_ids.includes(userId)
            ? formData.user_ids.filter(id => id !== userId)
            : [...formData.user_ids, userId];

        setFormData({...formData, user_ids: newUserIds});
    };

    const handlePtoTypeChange = (ptoTypeId: number) => {
        const newPtoTypeIds = formData.pto_type_ids.includes(ptoTypeId)
            ? formData.pto_type_ids.filter(id => id !== ptoTypeId)
            : [...formData.pto_type_ids, ptoTypeId];

        setFormData({...formData, pto_type_ids: newPtoTypeIds});
    };

    const getRestrictionBadge = (type: PtoBlackout['restriction_type']) => {
        const badges = {
            full_block: 'bg-red-100 text-red-800',
            limit_requests: 'bg-yellow-100 text-yellow-800',
            warning_only: 'bg-blue-100 text-blue-800'
        };

        const labels = {
            full_block: 'Full Block',
            limit_requests: 'Limited',
            warning_only: 'Warning'
        };

        return (
            <Badge className={cn("text-xs", badges[type])}>
                {labels[type]}
            </Badge>
        );
    };

    const getStatusBadge = (isActive: boolean) => (
        <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
                "text-xs",
                isActive
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
            )}
        >
            {isActive ? 'Active' : 'Inactive'}
        </Badge>
    );

    if (showCreateForm) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setShowCreateForm(false);
                                resetForm();
                            }}
                            className="p-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Create PTO Blackout</h2>
                            <p className="text-sm text-gray-600 mt-1">Set up time-off restrictions and blackout periods</p>
                        </div>
                    </div>
                </div>

                {/* Create Form */}
                <Card className="border border-gray-200">
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Quick Holiday Selection */}
                            {holidays.length > 0 && (
                                <div className="bg-blue-50 p-4 rounded-md">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Quick Setup from Holiday
                                    </label>
                                    <select
                                        value={selectedHoliday}
                                        onChange={(e) => {
                                            setSelectedHoliday(e.target.value);
                                            handleHolidaySelect(e.target.value);
                                        }}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="">Select a holiday to auto-fill...</option>
                                        {holidays.map(holiday => (
                                            <option key={holiday.id} value={holiday.id.toString()}>
                                                {holiday.name} - {holiday.date}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Basic Information */}
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Blackout Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        required
                                    />
                                    {formErrors.name && <div className="text-red-600 text-sm mt-1">{formErrors.name}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        rows={3}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    {formErrors.description && <div className="text-red-600 text-sm mt-1">{formErrors.description}</div>}
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        required
                                    />
                                    {formErrors.start_date && <div className="text-red-600 text-sm mt-1">{formErrors.start_date}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        End Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        required
                                    />
                                    {formErrors.end_date && <div className="text-red-600 text-sm mt-1">{formErrors.end_date}</div>}
                                </div>
                            </div>

                            {/* Restriction Settings */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">Restriction Settings</h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Restriction Type *
                                    </label>
                                    <select
                                        value={formData.restriction_type}
                                        onChange={(e) => setFormData({...formData, restriction_type: e.target.value as FormData['restriction_type']})}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="full_block">Full Block - No PTO allowed</option>
                                        <option value="limit_requests">Limit Requests - Maximum number allowed</option>
                                        <option value="warning_only">Warning Only - Allow with notification</option>
                                    </select>
                                    {formErrors.restriction_type && <div className="text-red-600 text-sm mt-1">{formErrors.restriction_type}</div>}
                                </div>

                                {formData.restriction_type === 'limit_requests' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Maximum Requests Allowed
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.max_requests_allowed}
                                            onChange={(e) => setFormData({...formData, max_requests_allowed: e.target.value})}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        {formErrors.max_requests_allowed && <div className="text-red-600 text-sm mt-1">{formErrors.max_requests_allowed}</div>}
                                    </div>
                                )}

                                {/* Checkboxes */}
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_strict}
                                            onChange={(e) => setFormData({...formData, is_strict: e.target.checked})}
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            Strict Blackout (Auto-deny requests)
                                        </span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.allow_emergency_override}
                                            onChange={(e) => setFormData({...formData, allow_emergency_override: e.target.checked})}
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            Allow Emergency Override
                                        </span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_holiday}
                                            onChange={(e) => setFormData({...formData, is_holiday: e.target.checked})}
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            Mark as Holiday
                                        </span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            Active
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Scope Selection */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">Apply To</h3>

                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_company_wide}
                                        onChange={(e) => setFormData({...formData, is_company_wide: e.target.checked})}
                                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm font-semibold text-gray-700">
                                        Company Wide (applies to all employees)
                                    </span>
                                </label>

                                {!formData.is_company_wide && (
                                    <div className="space-y-6 pl-6">
                                        {/* Position Selection */}
                                        {positions.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Position
                                                </label>
                                                <select
                                                    value={formData.position_id}
                                                    onChange={(e) => setFormData({...formData, position_id: e.target.value})}
                                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                >
                                                    <option value="">Select a position...</option>
                                                    {positions.map(position => (
                                                        <option key={position.id} value={position.id.toString()}>
                                                            {position.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Department Selection */}
                                        {departments.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Departments
                                                </label>
                                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-3 rounded-md">
                                                    {departments.map(department => (
                                                        <label key={department.id} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.department_ids.includes(department.id)}
                                                                onChange={() => handleDepartmentChange(department.id)}
                                                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">
                                                                {department.name}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* User Selection */}
                                        {users.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Specific Users
                                                </label>
                                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border p-3 rounded-md">
                                                    {users.map(user => (
                                                        <label key={user.id} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.user_ids.includes(user.id)}
                                                                onChange={() => handleUserChange(user.id)}
                                                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">
                                                                {user.name} ({user.email})
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* PTO Type Restrictions */}
                            {ptoTypes.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Restrict Specific PTO Types (leave empty for all types)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 border p-3 rounded-md">
                                        {ptoTypes.map(ptoType => (
                                            <label key={ptoType.id} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.pto_type_ids.includes(ptoType.id)}
                                                    onChange={() => handlePtoTypeChange(ptoType.id)}
                                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">
                                                    {ptoType.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-3 pt-6 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        resetForm();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-gray-900 hover:bg-gray-800"
                                >
                                    {processing ? 'Creating...' : 'Create Blackout'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Blackout Periods</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage holidays and blackout periods</p>
                </div>
                <Button onClick={handleCreate} className="bg-gray-900 hover:bg-gray-800">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Blackout
                </Button>
            </div>

            {/* Search and Filters */}
            <Card className="border border-gray-200">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search blackouts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-400" />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as FilterType)}
                                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Blackouts</option>
                                <option value="active">Active Only</option>
                                <option value="company_wide">Company Wide</option>
                                <option value="holidays">Holidays</option>
                                <option value="strict">Strict Blackouts</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Blackouts List */}
            <Card className="border border-gray-200">
                <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                    <CardTitle className="text-lg font-medium">Current Blackouts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredBlackouts.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No blackouts found</h3>
                            <p className="text-gray-500 mb-4">
                                {searchTerm || filterType !== 'all'
                                    ? 'No Blackouts match your search criteria.'
                                    : 'No PTO Blackouts have been created yet.'
                                }
                            </p>
                            {(!searchTerm && filterType === 'all') && (
                                <Button onClick={handleCreate} className="bg-gray-900 hover:bg-gray-800">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Your First Blackout
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {filteredBlackouts.map((blackout) => (
                                <div key={blackout.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    {blackout.name}
                                                </h3>
                                                {blackout.is_holiday && (
                                                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                                                        Holiday
                                                    </Badge>
                                                )}
                                                {getStatusBadge(blackout.is_active)}
                                            </div>

                                            {blackout.description && (
                                                <p className="text-sm text-gray-600 mb-3">
                                                    {blackout.description}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {blackout.formatted_date_range}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {getRestrictionBadge(blackout.restriction_type)}
                                                    {blackout.is_strict && (
                                                        <Badge className="bg-red-100 text-red-800 text-xs">
                                                            Strict
                                                        </Badge>
                                                    )}
                                                    {blackout.allow_emergency_override && (
                                                        <Badge className="bg-green-100 text-green-800 text-xs">
                                                            Emergency Override
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-2 text-sm text-gray-500">
                                                {blackout.is_company_wide ? (
                                                    <Badge className="bg-orange-100 text-orange-800 text-xs">
                                                        Company Wide
                                                    </Badge>
                                                ) : (
                                                    <div className="flex gap-2 flex-wrap">
                                                        {blackout.position && (
                                                            <span>Position: {blackout.position.name}</span>
                                                        )}
                                                        {blackout.departments?.length > 0 && (
                                                            <span>Departments: {blackout.departments.length}</span>
                                                        )}
                                                        {blackout.users?.length > 0 && (
                                                            <span>Users: {blackout.users.length}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 ml-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleView(blackout.id)}
                                                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(blackout.id)}
                                                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleStatus(blackout)}
                                                className={cn(
                                                    "h-8 w-8 p-0",
                                                    blackout.is_active
                                                        ? 'text-red-500 hover:text-red-600'
                                                        : 'text-green-500 hover:text-green-600'
                                                )}
                                            >
                                                {blackout.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(blackout)}
                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Alert Dialog */}
            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                        This will permanently delete the blackout "{blackoutToDelete?.name}". This action cannot be undone.
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
