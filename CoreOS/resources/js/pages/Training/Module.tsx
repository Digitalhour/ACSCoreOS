import React from 'react';
import {Head, Link} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Award, CheckCircle, Lock, PlayCircle, Shapes} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Progress} from '@/components/ui/progress';

interface Module {
    id: number;
    title: string;
    description: string;
    allow_retakes: boolean;
    test: any | null;
}

interface Lesson {
    id: number;
    title: string;
    description: string;
    is_completed: boolean;
    can_access: boolean;
    has_quiz: boolean;
    quiz_attempts?: number;
    quiz_best_score?: number;
    contents: any[];
}

interface Props {
    module: Module;
    lessons: Lesson[];
    progress: number;
    testAvailable: boolean;
    testAttempts: number;
    testBestScore: number | null;
}

export default function TrainingModule({ module, lessons, progress, testAvailable, testAttempts, testBestScore }: Props) {
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
    ];

    const canTakeTest = testAvailable && (testAttempts === 0 || module.allow_retakes);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={module.title} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Module Header */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl mb-2">{module.title}</CardTitle>
                                <CardDescription>{module.description}</CardDescription>
                            </div>

                            <div className="text-center">
                                <div className="text-3xl font-bold">{progress}%</div>
                                <div className="text-sm text-muted-foreground">Complete</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Progress value={progress} className="h-3" />
                    </CardContent>
                </Card>

                {/* Lessons */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Lessons</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {lessons.map((lesson, index) => (
                                <LessonItem
                                    key={lesson.id}
                                    lesson={lesson}
                                    module={module}
                                    index={index + 1}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Module Test */}
                {module.test && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Final Test</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center">
                                    <Award className="w-8 h-8 text-yellow-500 mr-3" />
                                    <div>
                                        <h4 className="font-medium">{module.test.title}</h4>
                                        <p className="text-sm text-muted-foreground">{module.test.description}</p>

                                        {testBestScore && (
                                            <Badge variant="secondary" className="mt-1">
                                                Best Score: {testBestScore}% ({testAttempts} attempts)
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {canTakeTest ? (
                                    <Button asChild>
                                        <Link href={route('training.test', module.id)}>
                                            {testAttempts > 0 ? 'Retake Test' : 'Start Test'}
                                        </Link>
                                    </Button>
                                ) : testAttempts > 0 && !module.allow_retakes ? (
                                    <div className="flex items-center text-muted-foreground">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Test Completed
                                    </div>
                                ) : (
                                    <div className="flex items-center text-muted-foreground">
                                        <Lock className="w-4 h-4 mr-2" />
                                        Complete all lessons first
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

function LessonItem({ lesson, module, index }: { lesson: Lesson; module: Module; index: number }) {
    return (
        <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center mr-3">
                    {lesson.is_completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                        <span className="text-sm font-medium text-muted-foreground">{index}</span>
                    )}
                </div>

                <div>
                    <h4 className="font-medium">{lesson.title}</h4>
                    <p className="text-sm text-muted-foreground">{lesson.description}</p>

                    <div className="flex items-center mt-1 space-x-4">
                        <Badge variant="outline" className="text-xs">
                            {lesson.contents.length} content items
                        </Badge>

                        {lesson.has_quiz && (
                            <Badge variant="secondary" className="text-xs">
                                <Shapes className="w-3 h-3 mr-1" />
                                Quiz
                                {lesson.quiz_best_score && (
                                    <span className="ml-1">({lesson.quiz_best_score}%)</span>
                                )}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {lesson.can_access ? (
                <Button asChild>
                    <Link href={route('training.lesson', [module.id, lesson.id])}>
                        {lesson.is_completed ? (
                            <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Review
                            </>
                        ) : (
                            <>
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Start
                            </>
                        )}
                    </Link>
                </Button>
            ) : (
                <div className="flex items-center text-muted-foreground">
                    <Lock className="w-4 h-4 mr-2" />
                    Locked
                </div>
            )}
        </div>
    );
}
