// resources/js/pages/Admin/Quizzes/Show.tsx
import React from 'react';
import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft, Check, Edit, HelpCircle, Plus, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';

interface Lesson {
    id: number;
    title: string;
    module: {
        id: number;
        title: string;
    };
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

interface Quiz {
    id: number;
    title: string;
    description: string | null;
    time_limit: number | null;
    passing_score: number;
    randomize_questions: boolean;
    show_results_immediately: boolean;
    questions: Question[];
}

interface Props {
    lesson: Lesson;
    quiz: Quiz;
}

export default function AdminQuizShow({ lesson, quiz }: Props) {
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
            title: lesson.module.title,
            href: `/admin/modules/${lesson.module.id}`,
        },
        {
            title: lesson.title,
            href: `/admin/modules/${lesson.module.id}/lessons/${lesson.id}`,
        },
        {
            title: quiz.title,
            href: `/admin/lessons/${lesson.id}/quizzes/${quiz.id}`,
        },
    ];

    const handleDeleteQuestion = (question: Question) => {
        if (confirm(`Are you sure you want to delete this question? This action cannot be undone.`)) {
            router.delete(route('admin.quizzes.questions.destroy', [quiz.id, question.id]));
        }
    };

    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${quiz.title} - Quiz Management`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" asChild className="mr-4">
                            <Link href={route('admin.modules.lessons.show', [lesson.module.id, lesson.id])}>
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        </Button>
                        <div className="flex items-center">
                            <HelpCircle className="w-6 h-6 mr-2" />
                            <h1 className="text-2xl font-bold">{quiz.title}</h1>
                        </div>
                    </div>

                    <Button asChild>
                        <Link href={route('admin.lessons.quizzes.edit', [lesson.id, quiz.id])}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Quiz
                        </Link>
                    </Button>
                </div>

                <div className="space-y-6">
                    {/* Quiz Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quiz Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-sm font-medium text-muted-foreground">Passing Score</Label>
                                    <p className="font-medium">{quiz.passing_score}%</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm font-medium text-muted-foreground">Time Limit</Label>
                                    <p className="font-medium">{quiz.time_limit ? `${quiz.time_limit} minutes` : 'No limit'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm font-medium text-muted-foreground">Question Order</Label>
                                    <p className="font-medium">{quiz.randomize_questions ? 'Randomized' : 'Fixed'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm font-medium text-muted-foreground">Results</Label>
                                    <p className="font-medium">{quiz.show_results_immediately ? 'Show immediately' : 'Hidden'}</p>
                                </div>
                                {quiz.description && (
                                    <div className="md:col-span-4 space-y-1">
                                        <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                                        <p className="font-medium">{quiz.description}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Questions */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>
                                        Questions ({quiz.questions.length})
                                    </CardTitle>
                                    <CardDescription>
                                        Total Points: {totalPoints}
                                    </CardDescription>
                                </div>
                                <Button asChild>
                                    <Link href={route('admin.quizzes.questions.create', quiz.id)}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Question
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {quiz.questions.length > 0 ? (
                                <div className="space-y-4">
                                    {quiz.questions.map((question, index) => (
                                        <QuestionCard
                                            key={question.id}
                                            question={question}
                                            index={index + 1}
                                            quiz={quiz}
                                            onDelete={() => handleDeleteQuestion(question)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                    <h4 className="text-lg font-medium mb-2">No questions yet</h4>
                                    <p className="text-muted-foreground mb-4">Add your first question to this quiz.</p>
                                    <Button asChild>
                                        <Link href={route('admin.quizzes.questions.create', quiz.id)}>
                                            Add Question
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

function QuestionCard({ question, index, quiz, onDelete }: {
    question: Question;
    index: number;
    quiz: Quiz;
    onDelete: () => void;
}) {
    const getQuestionTypeLabel = (type: string) => {
        switch (type) {
            case 'multiple_choice':
                return 'Multiple Choice';
            case 'true_false':
                return 'True/False';
            case 'short_answer':
                return 'Short Answer';
            default:
                return type;
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center mb-2">
                            <Badge variant="outline" className="mr-3">
                                {index}
                            </Badge>
                            <Badge variant="secondary" className="mr-2">
                                {getQuestionTypeLabel(question.type)}
                            </Badge>
                            <Badge variant="outline">
                                {question.points} {question.points === 1 ? 'point' : 'points'}
                            </Badge>
                        </div>

                        <h4 className="font-medium mb-3">
                            {question.question}
                        </h4>

                        {question.type === 'multiple_choice' && question.options && (
                            <div className="mb-3">
                                <div className="space-y-2">
                                    {question.options.map((option, idx) => (
                                        <div key={idx} className="flex items-center text-sm">
                                            <div className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center ${
                                                question.correct_answers.includes(option)
                                                    ? 'border-green-500 bg-green-500'
                                                    : 'border-border'
                                            }`}>
                                                {question.correct_answers.includes(option) && (
                                                    <Check className="w-2 h-2 text-white" />
                                                )}
                                            </div>
                                            <span className={question.correct_answers.includes(option) ? 'font-medium text-green-600' : 'text-muted-foreground'}>
                                                {option}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {question.type === 'true_false' && (
                            <div className="mb-3">
                                <p className="text-sm font-medium text-green-600">
                                    Correct Answer: {question.correct_answers[0]}
                                </p>
                            </div>
                        )}

                        {question.type === 'short_answer' && (
                            <div className="mb-3">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Correct Answers:</strong> {question.correct_answers.join(', ')}
                                </p>
                            </div>
                        )}

                        {question.explanation && (
                            <Card className="mt-3">
                                <CardContent className="pt-3">
                                    <p className="text-sm">
                                        <strong>Explanation:</strong> {question.explanation}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={route('admin.quizzes.questions.edit', [quiz.id, question.id])}>
                                <Edit className="w-4 h-4" />
                            </Link>
                        </Button>

                        <Button variant="ghost" size="icon" onClick={onDelete}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }) {
    return (
        <label className={`text-sm font-medium ${className || ''}`} {...props}>
            {children}
        </label>
    );
}
