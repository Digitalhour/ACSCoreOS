// resources/js/pages/Admin/Quizzes/Edit.tsx
import React from 'react';
import {Head, Link, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft, HelpCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';

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
    description: string;
    time_limit: number | null;
    passing_score: number;
    randomize_questions: boolean;
    show_results_immediately: boolean;
}

interface Props {
    lesson: Lesson;
    quiz: Quiz;
}

export default function EditQuiz({ lesson, quiz }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        title: quiz.title,
        description: quiz.description || '',
        time_limit: quiz.time_limit,
        passing_score: quiz.passing_score,
        randomize_questions: quiz.randomize_questions,
        show_results_immediately: quiz.show_results_immediately
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
        {
            title: 'Edit',
            href: `/admin/lessons/${lesson.id}/quizzes/${quiz.id}/edit`,
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.lessons.quizzes.update', [lesson.id, quiz.id]));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Quiz - ${quiz.title}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center mb-6">
                    <Button variant="ghost" size="icon" asChild className="mr-4">
                        <Link href={route('admin.lessons.quizzes.show', [lesson.id, quiz.id])}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div className="flex items-center">
                        <HelpCircle className="w-6 h-6 mr-2" />
                        <h1 className="text-2xl font-bold">Edit Quiz</h1>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Quiz Information</CardTitle>
                        <CardDescription>Update the settings for your quiz</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Quiz Title *</Label>
                                    <Input
                                        id="title"
                                        type="text"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        required
                                    />
                                    {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={3}
                                    />
                                    {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                <h3 className="text-lg font-medium mb-4">Quiz Settings</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                                        <Input
                                            id="time_limit"
                                            type="number"
                                            min="1"
                                            value={data.time_limit || ''}
                                            onChange={(e) => setData('time_limit', e.target.value ? parseInt(e.target.value) : null)}
                                            placeholder="No time limit"
                                        />
                                        {errors.time_limit && <p className="text-sm text-destructive">{errors.time_limit}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="passing_score">Passing Score (%)</Label>
                                        <Input
                                            id="passing_score"
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={data.passing_score}
                                            onChange={(e) => setData('passing_score', parseInt(e.target.value) || 70)}
                                        />
                                        {errors.passing_score && <p className="text-sm text-destructive">{errors.passing_score}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    <div className="space-y-3">
                                        <Label>Question Order</Label>
                                        <RadioGroup
                                            value={data.randomize_questions ? "true" : "false"}
                                            onValueChange={(value) => setData('randomize_questions', value === "true")}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="false" id="fixed" />
                                                <Label htmlFor="fixed">Fixed Order</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="true" id="randomize" />
                                                <Label htmlFor="randomize">Randomize Questions</Label>
                                            </div>
                                        </RadioGroup>
                                        {errors.randomize_questions && <p className="text-sm text-destructive">{errors.randomize_questions}</p>}
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Results Display</Label>
                                        <RadioGroup
                                            value={data.show_results_immediately ? "true" : "false"}
                                            onValueChange={(value) => setData('show_results_immediately', value === "true")}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="true" id="show" />
                                                <Label htmlFor="show">Show Results Immediately</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="false" id="hide" />
                                                <Label htmlFor="hide">Hide Results</Label>
                                            </div>
                                        </RadioGroup>
                                        {errors.show_results_immediately && <p className="text-sm text-destructive">{errors.show_results_immediately}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4 pt-6 border-t">
                                <Button variant="outline" asChild>
                                    <Link href={route('admin.lessons.quizzes.show', [lesson.id, quiz.id])}>
                                        Cancel
                                    </Link>
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Updating...' : 'Update Quiz'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
