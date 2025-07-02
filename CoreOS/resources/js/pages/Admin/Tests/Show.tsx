import React from 'react';
import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft, Award, Clock, Edit, Eye, Plus, Trash2} from 'lucide-react';

interface Module {
    id: number;
    title: string;
}

interface Question {
    id: number;
    type: string;
    question: string;
    points: number;
    order: number;
}

interface Test {
    id: number;
    title: string;
    description: string;
    time_limit: number | null;
    passing_score: number;
    randomize_questions: boolean;
    show_results_immediately: boolean;
    questions: Question[];
}

interface Props {
    module: Module;
    test: Test;
}

export default function AdminTestShow({ module, test }: Props) {
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
    ];

    const handleDeleteQuestion = (question: Question) => {
        if (confirm(`Are you sure you want to delete this question? This action cannot be undone.`)) {
            router.delete(route('admin.tests.questions.destroy', [test.id, question.id]));
        }
    };

    const totalPoints = test.questions.reduce((sum, question) => sum + question.points, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${test.title} - Admin`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <Link
                            href={route('admin.modules.show', module.id)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center">
                            <Award className="w-6 h-6 text-yellow-500 mr-2" />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{test.title}</h1>
                        </div>
                    </div>

                    <div className="flex space-x-2">
                        <Link
                            href={route('training.test', module.id)}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition duration-200 flex items-center"
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview Test
                        </Link>

                        <Link
                            href={route('admin.modules.tests.edit', [module.id, test.id])}
                            className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition duration-200 flex items-center"
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Test
                        </Link>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Test Info */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border bg-sidebar dark:bg-sidebar rounded-xl border p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Test Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                                <p className="text-gray-900 dark:text-gray-100">{test.title}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Limit</label>
                                <p className="text-gray-900 dark:text-gray-100 flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {test.time_limit ? `${test.time_limit} minutes` : 'No limit'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Passing Score</label>
                                <p className="text-gray-900 dark:text-gray-100">{test.passing_score}%</p>
                            </div>
                            {test.description && (
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                    <p className="text-gray-900 dark:text-gray-100">{test.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {test.randomize_questions && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                                    Randomized Questions
                                </span>
                            )}
                            {test.show_results_immediately && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                                    Immediate Results
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border bg-sidebar dark:bg-sidebar rounded-xl border p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Questions</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {test.questions.length} questions • {totalPoints} total points
                                </p>
                            </div>
                            <Link
                                href={route('admin.tests.questions.create', test.id)}
                                className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition duration-200 flex items-center"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Question
                            </Link>
                        </div>

                        {test.questions && test.questions.length > 0 ? (
                            <div className="space-y-3">
                                {test.questions.map((question, index) => (
                                    <div key={question.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center mb-2">
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 mr-2">
                                                        Question {index + 1}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 mr-2">
                                                        {question.type.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {question.points} point{question.points !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                                    {question.question}
                                                </p>
                                            </div>

                                            <div className="flex items-center space-x-2 ml-4">
                                                <Link
                                                    href={route('admin.tests.questions.edit', [test.id, question.id])}
                                                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition duration-200"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>

                                                <button
                                                    onClick={() => handleDeleteQuestion(question)}
                                                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition duration-200"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No questions yet</h4>
                                <p className="text-gray-500 dark:text-gray-400 mb-4">Add your first question to this test.</p>
                                <Link
                                    href={route('admin.tests.questions.create', test.id)}
                                    className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
                                >
                                    Add Question
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
