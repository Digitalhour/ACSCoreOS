// resources/js/pages/Training/QuizResult.tsx
import React from 'react';
import {Head, Link} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowRight, Award, Check, CheckCircle, RotateCcw, XCircle} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';

interface Module {
    id: number;
    title: string;
    allow_retakes: boolean;
}

interface Lesson {
    id: number;
    title: string;
}

interface Quiz {
    id: number;
    title: string;
    passing_score: number;
}

interface Question {
    id: number;
    type: string;
    question: string;
    options: string[] | null;
    correct_answers: string[];
    explanation: string | null;
    points: number;
}

interface GradeResult {
    id: number;
    score: number;
    total_points: number;
    earned_points: number;
    passed: boolean;
    attempt_number: number;
    answers: Record<string, string>;
}

interface Props {
    module: Module;
    lesson: Lesson;
    quiz: Quiz;
    result: GradeResult;
    questions: Question[];
    show_results: boolean;
}

export default function QuizResult({ module, lesson, quiz, result, questions, show_results }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Training Modules', href: '/training' },
        { title: module.title, href: `/training/modules/${module.id}` },
        { title: lesson.title, href: `/training/modules/${module.id}/lessons/${lesson.id}` },
        { title: 'Quiz Results', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Quiz Results - ${quiz.title}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Results Header */}
                <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                        result.passed
                            ? 'bg-green-100 dark:bg-green-900/20'
                            : 'bg-red-100 dark:bg-red-900/20'
                    }`}>
                        {result.passed ? (
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        ) : (
                            <XCircle className="w-10 h-10 text-red-600" />
                        )}
                    </div>

                    <h1 className="text-3xl font-bold mb-2">
                        {result.passed ? 'Congratulations!' : 'Keep Trying!'}
                    </h1>

                    <p className="text-lg text-muted-foreground mb-4">
                        {result.passed
                            ? `You passed the quiz with a score of ${result.score}%`
                            : `You scored ${result.score}%. You need ${quiz.passing_score}% to pass.`
                        }
                    </p>

                    <div className="flex justify-center space-x-8 text-sm">
                        <div className="text-center">
                            <div className="font-semibold text-2xl">{result.score}%</div>
                            <div className="text-muted-foreground">Final Score</div>
                        </div>
                        <div className="text-center">
                            <div className="font-semibold text-2xl">{result.earned_points}/{result.total_points}</div>
                            <div className="text-muted-foreground">Points Earned</div>
                        </div>
                        <div className="text-center">
                            <div className="font-semibold text-2xl">{result.attempt_number}</div>
                            <div className="text-muted-foreground">Attempt</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center space-x-4 mb-8">
                    {!result.passed && module.allow_retakes && (
                        <Button asChild>
                            <Link href={route('training.quiz', [module.id, lesson.id])}>
                                <RotateCcw className="w-5 h-5 mr-2" />
                                Retake Quiz
                            </Link>
                        </Button>
                    )}

                    <Button variant="outline" asChild>
                        <Link href={route('training.lesson', [module.id, lesson.id])}>
                            Back to Lesson
                        </Link>
                    </Button>

                    <Button asChild>
                        <Link href={route('training.module', module.id)}>
                            Continue Module
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Link>
                    </Button>
                </div>

                {/* Question Review */}
                {show_results ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Question Review</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {questions.map((question, index) => {
                                    const userAnswer = result.answers[question.id.toString()];
                                    const isCorrect = question.correct_answers.includes(userAnswer);

                                    return (
                                        <Card key={question.id}>
                                            <CardContent className="pt-6">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center">
                                                        <Badge variant="outline" className="mr-3">
                                                            {index + 1}
                                                        </Badge>
                                                        <h3 className="font-medium">{question.question}</h3>
                                                    </div>
                                                    <div className="flex items-center ml-4">
                                                        {isCorrect ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-600" />
                                                        )}
                                                        <Badge variant="outline" className="ml-2">
                                                            {question.points} {question.points === 1 ? 'point' : 'points'}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Multiple Choice Options */}
                                                {question.type === 'multiple_choice' && question.options && (
                                                    <div className="space-y-2 mb-3">
                                                        {question.options.map((option, idx) => {
                                                            const isUserAnswer = userAnswer === option;
                                                            const isCorrectAnswer = question.correct_answers.includes(option);

                                                            return (
                                                                <div key={idx} className={`flex items-center p-3 rounded-lg border-2 ${
                                                                    isCorrectAnswer
                                                                        ? 'border-green-200 bg-green-50'
                                                                        : isUserAnswer && !isCorrectAnswer
                                                                            ? 'border-red-200 bg-red-50'
                                                                            : 'border-border bg-muted/50'
                                                                }`}>
                                                                    <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                                                                        isCorrectAnswer
                                                                            ? 'border-green-500 bg-green-500'
                                                                            : isUserAnswer
                                                                                ? 'border-red-500 bg-red-500'
                                                                                : 'border-border'
                                                                    }`}>
                                                                        {(isCorrectAnswer || isUserAnswer) && (
                                                                            <Check className={`w-2 h-2 text-white`} />
                                                                        )}
                                                                    </div>
                                                                    <span>{option}</span>
                                                                    {isUserAnswer && (
                                                                        <Badge variant="outline" className="ml-auto">
                                                                            Your answer
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* True/False */}
                                                {question.type === 'true_false' && (
                                                    <div className="mb-3 space-y-2">
                                                        <p className="text-sm text-muted-foreground">
                                                            <strong>Your answer:</strong> <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{userAnswer}</span>
                                                        </p>
                                                        <p className="text-sm text-green-600">
                                                            <strong>Correct answer:</strong> {question.correct_answers[0]}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Short Answer */}
                                                {question.type === 'short_answer' && (
                                                    <div className="mb-3 space-y-2">
                                                        <p className="text-sm text-muted-foreground">
                                                            <strong>Your answer:</strong> <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{userAnswer}</span>
                                                        </p>
                                                        <p className="text-sm text-green-600">
                                                            <strong>Accepted answers:</strong> {question.correct_answers.join(', ')}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Explanation */}
                                                {question.explanation && (
                                                    <Card>
                                                        <CardContent className="pt-3">
                                                            <p className="text-sm">
                                                                <strong>Explanation:</strong> {question.explanation}
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="text-center py-8">
                            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <CardTitle className="mb-2">Quiz Complete</CardTitle>
                            <p className="text-muted-foreground">Your instructor has chosen not to show detailed results at this time.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
