import React from 'react';
import {Head, Link, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft} from 'lucide-react';

interface Module {
    id: number;
    title: string;
}

interface Test {
    id: number;
    title: string;
    description: string | null;
    time_limit: number | null;
    passing_score: number;
    randomize_questions: boolean;
    show_results_immediately: boolean;
}

interface Props {
    module: Module;
    test: Test;
}

export default function EditTest({ module, test }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        title: test.title,
        description: test.description || '',
        time_limit: test.time_limit,
        passing_score: test.passing_score,
        randomize_questions: test.randomize_questions,
        show_results_immediately: test.show_results_immediately
    });

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Admin',
            href: '/admin',
        },
        {
            title: 'Training Modules',
            href: '/admin/modules',
        },
        {
            title: module.title,
            href: `/admin/modules/${module.id}`,
        },
        {
            title: test.title,
            href: `/admin/modules/${module.id}/tests/${test.id}`,
        },
        {
            title: 'Edit Test',
            href: `/admin/modules/${module.id}/tests/${test.id}/edit`,
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.modules.tests.update', [module.id, test.id]));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Test - ${test.title}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center mb-6">
                    <Link
                        href={route('admin.modules.tests.show', [module.id, test.id])}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Test - {test.title}</h1>
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border bg-sidebar dark:bg-sidebar rounded-xl border p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Test Title *
                                </label>
                                <input
                                    type="text"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    placeholder="Enter test title"
                                    required
                                />
                                {errors.title && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.title}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    placeholder="Enter test description"
                                />
                                {errors.description && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.description}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Time Limit (minutes)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={data.time_limit || ''}
                                    onChange={(e) => setData('time_limit', e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    placeholder="No time limit"
                                />
                                {errors.time_limit && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.time_limit}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Passing Score (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={data.passing_score}
                                    onChange={(e) => setData('passing_score', parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                />
                                {errors.passing_score && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.passing_score}</p>}
                            </div>
                        </div>

                        {/* Settings */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Test Settings</h3>

                            <div className="space-y-4">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="randomize_questions"
                                        checked={data.randomize_questions}
                                        onChange={(e) => setData('randomize_questions', e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                                    />
                                    <label htmlFor="randomize_questions" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        Randomize question order
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="show_results_immediately"
                                        checked={data.show_results_immediately}
                                        onChange={(e) => setData('show_results_immediately', e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                                    />
                                    <label htmlFor="show_results_immediately" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        Show results immediately after completion
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <Link
                                href={route('admin.modules.tests.show', [module.id, test.id])}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition duration-200"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition duration-200 disabled:opacity-50"
                            >
                                {processing ? 'Updating...' : 'Update Test'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
