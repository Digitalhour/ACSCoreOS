import React, {useEffect, useState} from 'react';
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {CheckCircle, Clock} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Progress} from '@/components/ui/progress';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Alert, AlertDescription} from '@/components/ui/alert';

interface Module {
    id: number;
    title: string;
}

interface Lesson {
    id: number;
    title: string;
}

interface Quiz {
    id: number;
    title: string;
    time_limit: number | null;
    passing_score: number;
}

interface Question {
    id: number;
    type: string;
    question: string;
    options: string[] | null;
    points: number;
}

interface Props {
    module: Module;
    lesson: Lesson;
    quiz: Quiz;
    questions: Question[];
    attempt_number: number;
}

export default function TrainingQuiz({ module, lesson, quiz, questions, attempt_number }: Props) {
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [timeRemaining, setTimeRemaining] = useState(quiz.time_limit ? quiz.time_limit * 60 : null);
    const [startedAt] = useState(new Date());
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            title: lesson.title,
            href: `/training/modules/${module.id}/lessons/${lesson.id}`,
        },
        {
            title: 'Quiz',
            href: `/training/modules/${module.id}/lessons/${lesson.id}/quiz`,
        },
    ];

    // Timer effect
    useEffect(() => {
        if (!timeRemaining) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev && prev <= 1) {
                    handleSubmit();
                    return 0;
                }
                return prev ? prev - 1 : 0;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining]);

    const handleAnswerChange = (questionId: number, answer: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;

        setIsSubmitting(true);

        try {
            await router.post(route('training.quiz.submit', [module.id, lesson.id]), {
                answers,
                started_at: startedAt.toISOString(),
                time_spent: Math.floor((new Date().getTime() - startedAt.getTime()) / 1000)
            });
        } catch (error) {
            console.error('Error submitting quiz:', error);
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const answeredCount = Object.keys(answers).length;
    const allAnswered = answeredCount === questions.length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${lesson.title} - Quiz`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Quiz Navigation Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-4">
                            <CardHeader>
                                <CardTitle className="text-lg">{quiz.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {timeRemaining && (
                                    <Alert>
                                        <Clock className="w-4 h-4" />
                                        <AlertDescription>
                                            Time: {formatTime(timeRemaining)}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div>
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Progress: {answeredCount}/{questions.length}
                                    </div>
                                    <Progress value={(answeredCount / questions.length) * 100} />
                                </div>

                                <div className="space-y-2">
                                    {questions.map((question, index) => (
                                        <Button
                                            key={question.id}
                                            variant={
                                                currentQuestionIndex === index
                                                    ? "default"
                                                    : answers[question.id]
                                                        ? "secondary"
                                                        : "outline"
                                            }
                                            onClick={() => setCurrentQuestionIndex(index)}
                                            className="w-full justify-between"
                                            size="sm"
                                        >
                                            <span>Question {index + 1}</span>
                                            {answers[question.id] && (
                                                <CheckCircle className="w-4 h-4" />
                                            )}
                                        </Button>
                                    ))}
                                </div>

                                <div className="pt-4 border-t">
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={!allAnswered || isSubmitting}
                                        className="w-full"
                                        variant={allAnswered ? "default" : "secondary"}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                                    </Button>

                                    {!allAnswered && (
                                        <p className="text-xs text-destructive mt-2 text-center">
                                            Answer all questions to submit
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Question Area */}
                    <div className="lg:col-span-3">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>
                                        Question {currentQuestionIndex + 1} of {questions.length}
                                    </CardTitle>
                                    <Badge variant="outline">
                                        Attempt #{attempt_number}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <QuestionComponent
                                    question={currentQuestion}
                                    answer={answers[currentQuestion.id]}
                                    onChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                                />

                                <div className="flex justify-between mt-8">
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                        disabled={currentQuestionIndex === 0}
                                    >
                                        Previous
                                    </Button>

                                    <Button
                                        onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                                        disabled={isLastQuestion}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function QuestionComponent({ question, answer, onChange }: {
    question: Question;
    answer: string;
    onChange: (answer: string) => void;
}) {
    const renderQuestionInput = () => {
        switch (question.type) {
            case 'multiple_choice':
                return (
                    <RadioGroup
                        value={answer || ""}
                        onValueChange={onChange}
                    >
                        {question.options?.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`option-${index}`} />
                                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                                    {option}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                );

            case 'true_false':
                return (
                    <RadioGroup
                        value={answer || ""}
                        onValueChange={onChange}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="true" />
                            <Label htmlFor="true" className="cursor-pointer">True</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="false" />
                            <Label htmlFor="false" className="cursor-pointer">False</Label>
                        </div>
                    </RadioGroup>
                );

            case 'short_answer':
                return (
                    <Textarea
                        value={answer || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Enter your answer..."
                        rows={4}
                    />
                );

            default:
                return <div className="text-destructive">Unknown question type</div>;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium mb-4">
                    {question.question}
                </h3>
                {renderQuestionInput()}
            </div>

            {question.points > 1 && (
                <Badge variant="outline">
                    {question.points} points
                </Badge>
            )}
        </div>
    );
}
