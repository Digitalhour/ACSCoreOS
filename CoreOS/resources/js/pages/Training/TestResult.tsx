import React from 'react';
import {Head, Link} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft, Award, CheckCircle, RotateCcw, XCircle} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';

interface Module {
    id: number;
    title: string;
    allow_retakes: boolean;
}

interface Test {
    id: number;
    title: string;
    description: string;
    passing_score: number;
    show_results_immediately: boolean;
}

interface Question {
    id: number;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    question: string;
    options: string[] | null;
    correct_answers: string[];
    explanation: string | null;
    points: number;
}

interface Result {
    id: number;
    score: number;
    total_points: number;
    earned_points: number;
    passed: boolean;
    attempt_number: number;
    answers: Record<string, any>;
    started_at: string;
    completed_at: string;
}

interface Props {
    module: Module;
    test: Test;
    result: Result;
    questions: Question[];
    show_results: boolean;
}

export default function TestResult({ module, test, result, questions, show_results }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Training Modules',
            href: '/training',
        },
        {
            title: module.title,
            href: `/training/modules/${module.id}`,
        },
        {
            title: 'Test Results',
            href: '#',
        },
    ];

    const getScoreColor = (score: number, passing: number) => {
        if (score >= passing) {
            return 'text-green-600';
        }
        return 'text-red-600';
    };

    const getStatusBadge = (passed: boolean) => {
        if (passed) {
            return (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Passed
                </Badge>
            );
        }
        return (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
                <XCircle className="w-4 h-4 mr-1" />
                Failed
            </Badge>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${test.title} - Results`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center mb-6">
                    <Button variant="ghost" size="icon" asChild className="mr-4">
                        <Link href={route('training.module', module.id)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Test Results</h1>
                </div>

                {/* Results Summary */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl mb-2">{test.title}</CardTitle>
                                <CardDescription>Attempt #{result.attempt_number}</CardDescription>
                            </div>
                            {getStatusBadge(result.passed)}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <div className="text-center">
                                <div className={`text-4xl font-bold ${getScoreColor(result.score, test.passing_score)}`}>
                                    {result.score}%
                                </div>
                                <div className="text-sm text-muted-foreground">Final Score</div>
                            </div>

                            <div className="text-center">
                                <div className="text-4xl font-bold">
                                    {result.earned_points}
                                </div>
                                <div className="text-sm text-muted-foreground">Points Earned</div>
                            </div>

                            <div className="text-center">
                                <div className="text-4xl font-bold">
                                    {result.total_points}
                                </div>
                                <div className="text-sm text-muted-foreground">Total Points</div>
                            </div>

                            <div className="text-center">
                                <div className="text-4xl font-bold">
                                    {test.passing_score}%
                                </div>
                                <div className="text-sm text-muted-foreground">Passing Score</div>
                            </div>
                        </div>

                        <div className="flex justify-center space-x-4">
                            <Button asChild>
                                <Link href={route('training.module', module.id)}>
                                    Back to Module
                                </Link>
                            </Button>

                            {module.allow_retakes && (
                                <Button variant="outline" asChild>
                                    <Link href={route('training.test', module.id)}>
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Retake Test
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Question Review */}
                {show_results ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Question Review</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {questions.map((question, index) => (
                                    <QuestionReview
                                        key={question.id}
                                        question={question}
                                        userAnswer={result.answers[question.id]}
                                        index={index + 1}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="text-center py-8">
                            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <CardTitle className="mb-2">Results Recorded</CardTitle>
                            <p className="text-muted-foreground">
                                Your test has been submitted and your score has been recorded. Detailed results are not available for this test.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

function QuestionReview({ question, userAnswer, index }: { question: Question; userAnswer: any; index: number }) {
    const isCorrect = checkAnswer(question, userAnswer);

    return (
        <Card className={`${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                        <Badge variant="outline" className="mr-2">Question {index}</Badge>
                        {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                        )}
                    </div>
                    <Badge variant="outline">{question.points} points</Badge>
                </div>

                <h4 className="font-medium mb-4">{question.question}</h4>

                {question.type === 'multiple_choice' && question.options && (
                    <div className="space-y-2 mb-4">
                        {question.options.map((option, optionIndex) => {
                            const isUserChoice = Array.isArray(userAnswer) ? userAnswer.includes(option) : userAnswer === option;
                            const isCorrectChoice = question.correct_answers.includes(option);

                            return (
                                <div
                                    key={optionIndex}
                                    className={`p-3 rounded-lg border ${
                                        isCorrectChoice
                                            ? 'border-green-200 bg-green-50'
                                            : isUserChoice
                                                ? 'border-red-200 bg-red-50'
                                                : 'border-border'
                                    }`}
                                >
                                    <div className="flex items-center">
                                        {isUserChoice && (
                                            <Badge variant="outline" className="mr-2">Your answer</Badge>
                                        )}
                                        {isCorrectChoice && (
                                            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                        )}
                                        <span className={isCorrectChoice ? 'text-green-700' : ''}>
                                            {option}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {question.type === 'true_false' && (
                    <div className="space-y-2 mb-4">
                        {['True', 'False'].map((option) => {
                            const isUserChoice = userAnswer === option;
                            const isCorrectChoice = question.correct_answers.includes(option);

                            return (
                                <div
                                    key={option}
                                    className={`p-3 rounded-lg border ${
                                        isCorrectChoice
                                            ? 'border-green-200 bg-green-50'
                                            : isUserChoice
                                                ? 'border-red-200 bg-red-50'
                                                : 'border-border'
                                    }`}
                                >
                                    <div className="flex items-center">
                                        {isUserChoice && (
                                            <Badge variant="outline" className="mr-2">Your answer</Badge>
                                        )}
                                        {isCorrectChoice && (
                                            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                        )}
                                        <span className={isCorrectChoice ? 'text-green-700' : ''}>
                                            {option}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {question.type === 'short_answer' && (
                    <div className="space-y-2 mb-4">
                        <Card>
                            <CardContent className="pt-3">
                                <Badge variant="outline" className="mr-2">Your answer</Badge>
                                <span>{userAnswer || 'No answer provided'}</span>
                            </CardContent>
                        </Card>
                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="pt-3">
                                <div className="flex items-center">
                                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                    <Badge variant="outline" className="mr-2">Correct answer</Badge>
                                    <span className="text-green-700">{question.correct_answers[0]}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {question.explanation && (
                    <Card>
                        <CardContent className="pt-4">
                            <h5 className="text-sm font-medium mb-2">Explanation:</h5>
                            <p className="text-sm text-muted-foreground">{question.explanation}</p>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
        </Card>
    );
}

function checkAnswer(question: Question, userAnswer: any): boolean {
    if (!userAnswer) return false;

    if (question.type === 'multiple_choice') {
        if (Array.isArray(userAnswer)) {
            return userAnswer.length === question.correct_answers.length &&
                userAnswer.every(answer => question.correct_answers.includes(answer));
        }
        return question.correct_answers.includes(userAnswer);
    }

    if (question.type === 'true_false') {
        return question.correct_answers.includes(userAnswer);
    }

    if (question.type === 'short_answer') {
        return question.correct_answers.some(correct =>
            correct.toLowerCase().trim() === userAnswer.toLowerCase().trim()
        );
    }

    return false;
}
