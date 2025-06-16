import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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

interface Props {
    blackouts: PtoBlackout[];
}

type FilterType = 'all' | 'active' | 'company_wide' | 'holidays' | 'strict';

export default function Index({ blackouts }: Props) {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterType, setFilterType] = useState<FilterType>('all');

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

    const handleDelete = (id: number, name: string): void => {
        if (confirm(`Are you sure you want to delete "${name}"?`)) {
            router.delete(route('pto-blackouts.destroy', id));
        }
    };

    const toggleStatus = (id: number): void => {
        router.post(route('api.pto-blackouts.toggle-status', id));
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
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[type]}`}>
                {labels[type]}
            </span>
        );
    };

    const getStatusBadge = (isActive: boolean) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
            {isActive ? 'Active' : 'Inactive'}
        </span>
    );

    return (
        <AppLayout>
            <Head title="PTO Blackouts" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900">PTO Blackouts</h1>
                                    <p className="text-gray-600">Manage time-off restrictions and blackout periods</p>
                                </div>
                                <Link
                                    href={route('pto-blackouts.create')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                                >
                                    Create Blackout
                                </Link>
                            </div>

                            {/* Search and Filters */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Search blackouts..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                                    className="border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="all">All Blackouts</option>
                                    <option value="active">Active Only</option>
                                    <option value="company_wide">Company Wide</option>
                                    <option value="holidays">Holidays</option>
                                    <option value="strict">Strict Blackouts</option>
                                </select>
                            </div>

                            {/* Blackouts Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name & Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date Range
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Scope
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredBlackouts.map((blackout) => (
                                        <tr key={blackout.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {blackout.name}
                                                        {blackout.is_holiday && (
                                                            <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                                                    Holiday
                                                                </span>
                                                        )}
                                                    </div>
                                                    {blackout.description && (
                                                        <div className="text-sm text-gray-500 mt-1">
                                                            {blackout.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {blackout.formatted_date_range}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {blackout.is_company_wide ? (
                                                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                                                                Company Wide
                                                            </span>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {blackout.position && (
                                                                <div className="text-xs text-gray-600">
                                                                    Position: {blackout.position.name}
                                                                </div>
                                                            )}
                                                            {blackout.departments?.length > 0 && (
                                                                <div className="text-xs text-gray-600">
                                                                    Departments: {blackout.departments.length}
                                                                </div>
                                                            )}
                                                            {blackout.users?.length > 0 && (
                                                                <div className="text-xs text-gray-600">
                                                                    Users: {blackout.users.length}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="space-y-1">
                                                    {getRestrictionBadge(blackout.restriction_type)}
                                                    {blackout.is_strict && (
                                                        <div>
                                                                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                                                    Strict
                                                                </span>
                                                        </div>
                                                    )}
                                                    {blackout.allow_emergency_override && (
                                                        <div>
                                                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                                                    Emergency Override
                                                                </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(blackout.is_active)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <Link
                                                        href={route('pto-blackouts.show', blackout.id)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        View
                                                    </Link>
                                                    <Link
                                                        href={route('pto-blackouts.edit', blackout.id)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => toggleStatus(blackout.id)}
                                                        className={`${blackout.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                                                    >
                                                        {blackout.is_active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(blackout.id, blackout.name)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredBlackouts.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-gray-500">
                                        {searchTerm || filterType !== 'all'
                                            ? 'No blackouts match your search criteria.'
                                            : 'No PTO blackouts have been created yet.'
                                        }
                                    </div>
                                    {(!searchTerm && filterType === 'all') && (
                                        <Link
                                            href={route('pto-blackouts.create')}
                                            className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                                        >
                                            Create Your First Blackout
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
