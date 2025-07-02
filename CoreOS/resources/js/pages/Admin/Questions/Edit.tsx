// resources/js/pages/Admin/Questions/Edit.tsx
import React, {useState} from 'react';
import {Head, Link, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft, HelpCircle, Plus, X} from 'lucide-react';

interface Lesson {
    id: number;
    title: string;
    module: {
        id: number;
        title: string;
    };
}

interface Quiz {
    id: number;
    title: string;
    lesson: Lesson;
}

interface Question {
    id: number;
    type: string;
    question: string;
    options: string[] | null;
    correct_answers: string[];
    explanation: string | null;
    points: number;
    order: number;
}

interface Props {
    quiz: Quiz;
    question: Question;
}

export default function EditQuestion({ quiz, question }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        type: question.type,
        question: question.question,
        options: question.options || ['', '', '', ''],
        correct_answers: question.correct_answers,
        explanation: question.explanation || '',
        points: question.points,
        order: question.order
    });

    const [newOption, setNewOption] = useState('');

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
            title: quiz.lesson.module.title,
            href: `/admin/modules/${quiz.lesson.module.id}`,
        },
        {
            title: quiz.lesson.title,
            href: `/admin/modules/${quiz.lesson.module.id}/lessons/${quiz.lesson.id}`,
        },
        {
            title: quiz.title,
            href: `/admin/lessons/${quiz.lesson.id}/quizzes/${quiz.id}`,
        },
        {
            title: 'Edit Question',
            href: `/admin/quizzes/${quiz.id}/questions/${question.id}/edit`,
        },
    ];

    const questionTypes = [
        { value: 'multiple_choice', label: 'Multiple Choice' },
        { value: 'true_false', label: 'True/False' },
        { value: 'short_answer', label: 'Short Answer' }
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let formData = { ...data };

        if (data.type === 'multiple_choice') {
            formData.options = data.options.filter(option => option.trim() !== '');
        } else if (data.type === 'true_false') {
            formData.options = ['True', 'False'];
        } else {
            formData.options = null;
        }

        put(route('admin.quizzes.questions.update', [quiz.id, question.id]), {
            data: formData
        });
    };

    const addOption = () => {
        if (newOption.trim()) {
            setData('options', [...data.options, newOption.trim()]);
            setNewOption('');
        }
    };

    const removeOption = (index: number) => {
        const newOptions = data.options.filter((_, i) => i !== index);
        setData('options', newOptions);

        // Remove from correct answers if it was selected
        const removedOption = data.options[index];
        setData('correct_answers', data.correct_answers.filter(answer => answer !== removedOption));
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...data.options];
        const oldValue = newOptions[index];
        newOptions[index] = value;
        setData('options', newOptions);

        // Update correct answers if this option was selected
        if (data.correct_answers.includes(oldValue)) {
            const updatedAnswers = data.correct_answers.map(answer =>
                answer === oldValue ? value : answer
            );
            setData('correct_answers', updatedAnswers);
        }
    };

    const toggleCorrectAnswer = (answer: string) => {
        if (data.type === 'multiple_choice') {
            // For multiple choice, allow multiple correct answers
            const isSelected = data.correct_answers.includes(answer);
            if (isSelected) {
                setData('correct_answers', data.correct_answers.filter(a => a !== answer));
            } else {
                setData('correct_answers', [...data.correct_answers, answer]);
            }
        } else if (data.type === 'true_false') {
            // For true/false, only one answer
            setData('correct_answers', [answer]);
        }
    };

    const addCorrectAnswer = () => {
        if (data.type === 'short_answer') {
            const answer = prompt('Enter a correct answer:');
            if (answer && answer.trim()) {
                setData('correct_answers', [...data.correct_answers, answer.trim()]);
            }
        }
    };

    const removeCorrectAnswer = (index: number) => {
        setData('correct_answers', data.correct_answers.filter((_, i) => i !== index));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Question - ${quiz.title}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center mb-6">
                    <Link
                        href={route('admin.lessons.quizzes.show', [quiz.lesson.id, quiz.id])}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center">
                        <HelpCircle className="w-6 h-6 text-purple-500 mr-2" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Question</h1>
                    </div>
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border bg-sidebar dark:bg-sidebar rounded-xl border p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Question Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Question Type
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {questionTypes.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => {
                                            setData('type', type.value);
                                            setData('correct_answers', []);
                                            if (type.value !== 'multiple_choice') {
                                                setData('options', []);
                                            }
                                        }}
                                        className={`p-3 border-2 rounded-lg transition duration-200 ${
                                            data.type === type.value
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Question Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Question *
                            </label>
                            <textarea
                                value={data.question}
                                onChange={(e) => setData('question', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                required
                            />
                            {errors.question && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.question}</p>}
                        </div>

                        {/* Options for Multiple Choice */}
                        {data.type === 'multiple_choice' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Answer Options
                                </label>

                                <div className="space-y-3">
                                    {data.options.map((option, index) => (
                                        <div key={index} className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={data.correct_answers.includes(option)}
                                                onChange={() => toggleCorrectAnswer(option)}
                                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
                                                title="Mark as correct answer"
                                            />
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => updateOption(index, e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                                placeholder={`Option ${index + 1}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeOption(index)}
                                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition duration-200"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}

                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="text"
                                            value={newOption}
                                            onChange={(e) => setNewOption(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            placeholder="Add new option"
                                        />
                                        <button
                                            type="button"
                                            onClick={addOption}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition duration-200"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* True/False Options */}
                        {data.type === 'true_false' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Correct Answer
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="true_false_answer"
                                            value="true"
                                            checked={data.correct_answers.includes('true')}
                                            onChange={() => toggleCorrectAnswer('true')}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">True</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="true_false_answer"
                                            value="false"
                                            checked={data.correct_answers.includes('false')}
                                            onChange={() => toggleCorrectAnswer('false')}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">False</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Short Answer Correct Answers */}
                        {data.type === 'short_answer' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Correct Answers
                                </label>

                                <div className="space-y-2">
                                    {data.correct_answers.map((answer, index) => (
                                        <div key={index} className="flex items-center space-x-3">
                                            <input
                                                type="text"
                                                value={answer}
                                                onChange={(e) => {
                                                    const newAnswers = [...data.correct_answers];
                                                    newAnswers[index] = e.target.value;
                                                    setData('correct_answers', newAnswers);
                                                }}
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeCorrectAnswer(index)}
                                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition duration-200"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={addCorrectAnswer}
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition duration-200 flex items-center"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Correct Answer
                                    </button>
                                </div>

                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                    Add multiple acceptable answers. Answers are case-insensitive.
                                </p>
                            </div>
                        )}

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
                                placeholder="Explain why this is the correct answer"
                            />
                            {errors.explanation && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.explanation}</p>}
                        </div>

                        {/* Points and Order */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Points
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={data.points}
                                    onChange={(e) => setData('points', parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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

                        {/* Submit Buttons */}
                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <Link
                                href={route('admin.lessons.quizzes.show', [quiz.lesson.id, quiz.id])}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition duration-200"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing || data.correct_answers.length === 0}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
