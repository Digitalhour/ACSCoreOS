import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

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
    position_id?: number;
    department_ids: number[];
    user_ids: number[];
    is_company_wide: boolean;
    is_holiday: boolean;
    is_strict: boolean;
    allow_emergency_override: boolean;
    restriction_type: 'full_block' | 'limit_requests' | 'warning_only';
    max_requests_allowed?: number;
    pto_type_ids: number[];
    is_active: boolean;
}

interface Props {
    blackout?: PtoBlackout;
    departments: Department[];
    positions: Position[];
    users: User[];
    holidays: Holiday[];
    ptoTypes: PtoType[];
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

export default function CreateEdit({
                                       blackout,
                                       departments = [],
                                       positions = [],
                                       users = [],
                                       holidays = [],
                                       ptoTypes = []
                                   }: Props) {
    const isEditing = !!blackout;

    const { data, setData, post, put, processing, errors } = useForm<FormData>({
        name: blackout?.name || '',
        description: blackout?.description || '',
        start_date: blackout?.start_date || '',
        end_date: blackout?.end_date || '',
        position_id: blackout?.position_id?.toString() || '',
        department_ids: blackout?.department_ids || [],
        user_ids: blackout?.user_ids || [],
        is_company_wide: blackout?.is_company_wide || false,
        is_holiday: blackout?.is_holiday || false,
        is_strict: blackout?.is_strict || false,
        allow_emergency_override: blackout?.allow_emergency_override || false,
        restriction_type: blackout?.restriction_type || 'full_block',
        max_requests_allowed: blackout?.max_requests_allowed?.toString() || '',
        pto_type_ids: blackout?.pto_type_ids || [],
        is_active: blackout?.is_active ?? true,
    });

    const [selectedHoliday, setSelectedHoliday] = useState<string>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditing && blackout) {
            put(route('pto-blackouts.update', blackout.id));
        } else {
            post(route('pto-blackouts.store'));
        }
    };

    const handleHolidaySelect = (holidayId: string) => {
        if (!holidayId) return;

        const holiday = holidays.find(h => h.id.toString() === holidayId);
        if (holiday) {
            setData({
                ...data,
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
        const newDepartmentIds = data.department_ids.includes(deptId)
            ? data.department_ids.filter(id => id !== deptId)
            : [...data.department_ids, deptId];

        setData('department_ids', newDepartmentIds);
    };

    const handleUserChange = (userId: number) => {
        const newUserIds = data.user_ids.includes(userId)
            ? data.user_ids.filter(id => id !== userId)
            : [...data.user_ids, userId];

        setData('user_ids', newUserIds);
    };

    const handlePtoTypeChange = (ptoTypeId: number) => {
        const newPtoTypeIds = data.pto_type_ids.includes(ptoTypeId)
            ? data.pto_type_ids.filter(id => id !== ptoTypeId)
            : [...data.pto_type_ids, ptoTypeId];

        setData('pto_type_ids', newPtoTypeIds);
    };

    return (
        <AppLayout>
            <Head title={isEditing ? 'Edit PTO Blackout' : 'Create PTO Blackout'} />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <div className="mb-6">
                                <h1 className="text-2xl font-semibold text-gray-900">
                                    {isEditing ? 'Edit PTO Blackout' : 'Create PTO Blackout'}
                                </h1>
                                <p className="text-gray-600">
                                    Set up time-off restrictions and blackout periods
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Quick Holiday Selection */}
                                {!isEditing && holidays.length > 0 && (
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
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            required
                                        />
                                        {errors.name && <div className="text-red-600 text-sm mt-1">{errors.name}</div>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Description
                                        </label>
                                        <textarea
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            rows={3}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        {errors.description && <div className="text-red-600 text-sm mt-1">{errors.description}</div>}
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
                                            value={data.start_date}
                                            onChange={(e) => setData('start_date', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            required
                                        />
                                        {errors.start_date && <div className="text-red-600 text-sm mt-1">{errors.start_date}</div>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            End Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={data.end_date}
                                            onChange={(e) => setData('end_date', e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            required
                                        />
                                        {errors.end_date && <div className="text-red-600 text-sm mt-1">{errors.end_date}</div>}
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
                                            value={data.restriction_type}
                                            onChange={(e) => setData('restriction_type', e.target.value as FormData['restriction_type'])}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        >
                                            <option value="full_block">Full Block - No PTO allowed</option>
                                            <option value="limit_requests">Limit Requests - Maximum number allowed</option>
                                            <option value="warning_only">Warning Only - Allow with notification</option>
                                        </select>
                                        {errors.restriction_type && <div className="text-red-600 text-sm mt-1">{errors.restriction_type}</div>}
                                    </div>

                                    {data.restriction_type === 'limit_requests' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Maximum Requests Allowed
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={data.max_requests_allowed}
                                                onChange={(e) => setData('max_requests_allowed', e.target.value)}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            {errors.max_requests_allowed && <div className="text-red-600 text-sm mt-1">{errors.max_requests_allowed}</div>}
                                        </div>
                                    )}

                                    {/* Checkboxes */}
                                    <div className="space-y-3">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={data.is_strict}
                                                onChange={(e) => setData('is_strict', e.target.checked)}
                                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">
                                                Strict Blackout (Auto-deny requests)
                                            </span>
                                        </label>

                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={data.allow_emergency_override}
                                                onChange={(e) => setData('allow_emergency_override', e.target.checked)}
                                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">
                                                Allow Emergency Override
                                            </span>
                                        </label>

                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={data.is_holiday}
                                                onChange={(e) => setData('is_holiday', e.target.checked)}
                                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">
                                                Mark as Holiday
                                            </span>
                                        </label>

                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={data.is_active}
                                                onChange={(e) => setData('is_active', e.target.checked)}
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
                                            checked={data.is_company_wide}
                                            onChange={(e) => setData('is_company_wide', e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm font-semibold text-gray-700">
                                            Company Wide (applies to all employees)
                                        </span>
                                    </label>

                                    {!data.is_company_wide && (
                                        <div className="space-y-6 pl-6">
                                            {/* Position Selection */}
                                            {positions.length > 0 && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        Position
                                                    </label>
                                                    <select
                                                        value={data.position_id}
                                                        onChange={(e) => setData('position_id', e.target.value)}
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
                                                                    checked={data.department_ids.includes(department.id)}
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
                                                                    checked={data.user_ids.includes(user.id)}
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
                                                        checked={data.pto_type_ids.includes(ptoType.id)}
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
                                    <button
                                        type="button"
                                        onClick={() => router.visit(route('pto-blackouts.index'))}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                                    >
                                        {processing ? 'Saving...' : (isEditing ? 'Update Blackout' : 'Create Blackout')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
