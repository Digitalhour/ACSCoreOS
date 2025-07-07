import React from 'react';
import {Head, Link, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft, Plus, Trash2} from 'lucide-react';

interface Module {
    id: number;
    title: string;
}

interface Test {
    id: number;
    title: string;
    module: Module;
}

interface Question {
    id: number;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    question: string;
    options: string[] | null;
    correct_answers: string[];
    explanation: string | null;
    points: number;
    order: number;
}

interface Props {
    test: Test;
    question: Question;
}

export default function EditTestQuestion({ test, question }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        type: question.type,
        question: question.question,
        options: question.options || [''],
        correct_answers: question.correct_answers,
        explanation: question.explanation || '',
        points: question.points,
        order: question.order
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
            title: test.module.title,
            href: `/admin/modules/${test.module.id}`,
        },
        {
            title: test.title,
            href: `/admin/modules/${test.module.id}/tests/${test.id}`,
        },
        {
            title: 'Edit Question',
            href: `/admin/tests/${test.id}/questions/${question.id}/edit`,
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.tests.questions.update', [test.id, question.id]));
    };

    const handleTypeChange = (newType: string) => {
        setData(prevData => {
            let newData = { ...prevData, type: newType as any };

            if (newType === 'true_false') {
                newData.options = ['True', 'False'];
                newData.correct_answers = ['True'];
            } else if (newType === 'multiple_choice') {
                newData.options = ['', '', '', ''];
                newData.correct_answers = [''];
            } else if (newType === 'short_answer') {
                newData.options = [];
                newData.correct_answers = [''];
            }

            return newData;
        });
    };

    const addOption = () => {
        setData('options', [...data.options, '']);
    };

    const removeOption = (index: number) => {
        const newOptions = data.options.filter((_, i) => i !== index);
        setData('options', newOptions);

        // Remove from correct answers if it was selected
        const newCorrectAnswers = data.correct_answers.filter(answer => answer !== data.options[index]);
        setData('correct_answers', newCorrectAnswers);
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...data.options];
        newOptions[index] = value;
        setData('options', newOptions);
    };

    const toggleCorrectAnswer = (answer: string) => {
        if (data.type === 'multiple_choice') {
            // Multiple selection allowed
            const newCorrectAnswers = data.correct_answers.includes(answer)
                ? data.correct_answers.filter(a => a !== answer)
                : [...data.correct_answers, answer];
            setData('correct_answers', newCorrectAnswers);
        } else {
            // Single selection
            setData('correct_answers', [answer]);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Question - ${test.title}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center mb-6">
                    <Link
                        href={route('admin.modules.tests.show', [test.module.id, test.id])}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Question</h1>
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border bg-sidebar dark:bg-sidebar rounded-xl border p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Question Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Question Type *
                            </label>
                            <select
                                value={data.type}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="true_false">True/False</option>
                                <option value="short_answer">Short Answer</option>
                            </select>
                            {errors.type && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.type}</p>}
                        </div>

                        {/* Question Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Question *
                            </label>
                            <textarea
                                value={data.question}
                                onChange={(e) => setData('question', e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                placeholder="Enter your question"
                                required
                            />
                            {errors.question && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.question}</p>}
                        </div>

                        {/* Options for Multiple Choice and True/False */}
                        {(data.type === 'multiple_choice' || data.type === 'true_false') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Answer Options *
                                </label>
                                <div className="space-y-3">
                                    {data.options.map((option, index) => (
                                        <div key={index} className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={data.correct_answers.includes(option)}
                                                onChange={() => toggleCorrectAnswer(option)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                                                disabled={data.type === 'true_false'}
                                            />
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => updateOption(index, e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                                placeholder={`Option ${index + 1}`}
                                                disabled={data.type === 'true_false'}
                                                required
                                            />
                                            {data.type === 'multiple_choice' && data.options.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeOption(index)}
                                                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {data.type === 'multiple_choice' && (
                                        <button
                                            type="button"
                                            onClick={addOption}
                                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Add Option</span>
                                        </button>
                                    )}
                                </div>
                                {errors.options && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.options}</p>}
                            </div>
                        )}

                        {/* Correct Answer for Short Answer */}
                        {data.type === 'short_answer' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Correct Answer *
                                </label>
                                <input
                                    type="text"
                                    value={data.correct_answers[0] || ''}
                                    onChange={(e) => setData('correct_answers', [e.target.value])}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    placeholder="Enter the correct answer"
                                    required
                                />
                                {errors.correct_answers && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.correct_answers}</p>}
                            </div>
                        )}

                        {/* Additional Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Points *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={data.points}
                                    onChange={(e) => setData('points', parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    required
                                />
                                {errors.points && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.points}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Order
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={data.order}
                                    onChange={(e) => setData('order', parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                />
                                {errors.order && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.order}</p>}
                            </div>
                        </div>

                        {/* Explanation */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Explanation (Optional)
                            </label>
                            <textarea
                                value={data.explanation}
                                onChange={(e) => setData('explanation', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                placeholder="Provide an explanation for the correct answer"
                            />
                            {errors.explanation && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.explanation}</p>}
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <Link
                                href={route('admin.modules.tests.show', [test.module.id, test.id])}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition duration-200"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition duration-200 disabled:opacity-50"
                            >
                                {processing ? 'Updating...' : 'Update Question'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
