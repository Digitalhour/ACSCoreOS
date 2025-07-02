// resources/js/pages/admin/lessons/create.tsx
import React from 'react';
import {Head, Link, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft, BookOpen, Info} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Separator} from '@/components/ui/separator';

interface Module {
    id: number;
    title: string;
    sequential_lessons: boolean;
}

interface Props {
    module: Module;
}

export default function CreateLesson({ module }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        order: 0,
        is_active: true
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
            title: 'Create Lesson',
            href: `/admin/modules/${module.id}/lessons/create`,
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.modules.lessons.store', module.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Create Lesson - ${module.title}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center">
                    <Button asChild variant="ghost" size="sm" className="mr-4">
                        <Link href={route('admin.modules.show', module.id)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div className="flex items-center">
                        <BookOpen className="w-6 h-6 text-primary mr-2" />
                        <h1 className="text-2xl font-bold tracking-tight">Create New Lesson</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Lesson Information</CardTitle>
                                <CardDescription>Create a new lesson with content, quizzes, and activities</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Basic Information */}
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="title">Lesson Title *</Label>
                                            <Input
                                                id="title"
                                                type="text"
                                                value={data.title}
                                                onChange={(e) => setData('title', e.target.value)}
                                                placeholder="Enter lesson title"
                                                required
                                            />
                                            {errors.title && <p className="text-destructive text-sm mt-1">{errors.title}</p>}
                                        </div>

                                        <div>
                                            <Label htmlFor="description">Description</Label>
                                            <Textarea
                                                id="description"
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                rows={4}
                                                placeholder="Enter lesson description (optional)"
                                            />
                                            {errors.description && <p className="text-destructive text-sm mt-1">{errors.description}</p>}
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Provide a brief overview of what students will learn in this lesson.
                                            </p>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Lesson Settings */}
                                    <div>
                                        <h3 className="text-lg font-medium mb-4">Lesson Settings</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <Label htmlFor="order">Order</Label>
                                                <Input
                                                    id="order"
                                                    type="number"
                                                    min="0"
                                                    value={data.order}
                                                    onChange={(e) => setData('order', parseInt(e.target.value) || 0)}
                                                    placeholder="0"
                                                />
                                                {errors.order && <p className="text-destructive text-sm mt-1">{errors.order}</p>}
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {module.sequential_lessons
                                                        ? "Determines the order students must follow (sequential mode enabled)"
                                                        : "Visual ordering for lesson display (free navigation mode)"
                                                    }
                                                </p>
                                            </div>

                                            <div>
                                                <Label>Status</Label>
                                                <RadioGroup
                                                    value={data.is_active.toString()}
                                                    onValueChange={(value) => setData('is_active', value === 'true')}
                                                    className="mt-2"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="true" id="active" />
                                                        <Label htmlFor="active">Active</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="false" id="inactive" />
                                                        <Label htmlFor="inactive">Inactive</Label>
                                                    </div>
                                                </RadioGroup>
                                                {errors.is_active && <p className="text-destructive text-sm mt-1">{errors.is_active}</p>}
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Inactive lessons are hidden from students.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Submit Buttons */}
                                    <div className="flex justify-end gap-4">
                                        <Button asChild variant="outline">
                                            <Link href={route('admin.modules.show', module.id)}>
                                                Cancel
                                            </Link>
                                        </Button>
                                        <Button type="submit" disabled={processing}>
                                            {processing ? 'Creating...' : 'Create Lesson'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar - Help & Information */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Module Context */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Module Context</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-muted-foreground">Module</Label>
                                        <p className="font-medium">{module.title}</p>
                                    </div>

                                    <div>
                                        <Label className="text-muted-foreground">Navigation Mode</Label>
                                        <div className="mt-1">
                                            <Badge variant={module.sequential_lessons ? "secondary" : "default"}>
                                                {module.sequential_lessons ? "Sequential" : "Free Navigation"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Help Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Info className="w-5 h-5 text-primary mr-2" />
                                    Lesson Creation Tips
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 text-sm text-muted-foreground">
                                    <div>
                                        <h4 className="font-medium text-foreground mb-1">Title Best Practices</h4>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Keep titles clear and descriptive</li>
                                            <li>Use action words when appropriate</li>
                                            <li>Aim for 3-8 words for best readability</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-foreground mb-1">Description Guidelines</h4>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Explain what students will learn</li>
                                            <li>Mention key concepts or skills</li>
                                            <li>Keep it concise but informative</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-foreground mb-1">Lesson Ordering</h4>
                                        <ul className="list-disc list-inside space-y-1">
                                            {module.sequential_lessons ? (
                                                <>
                                                    <li>Order affects student progression</li>
                                                    <li>Students must complete lessons in sequence</li>
                                                    <li>Consider prerequisite knowledge</li>
                                                </>
                                            ) : (
                                                <>
                                                    <li>Order is for visual organization only</li>
                                                    <li>Students can access lessons freely</li>
                                                    <li>Group related topics together</li>
                                                </>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Next Steps */}
                        <Card>
                            <CardHeader>
                                <CardTitle>After Creating Lesson</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm text-muted-foreground">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                                            1
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">Add Content</p>
                                            <p>Upload videos, documents, or other learning materials</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                                            2
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">Create Quiz (Optional)</p>
                                            <p>Test student understanding with assessments</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                                            3
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">Preview & Test</p>
                                            <p>Preview the lesson as a student would see it</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Links</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Button asChild variant="ghost" className="w-full justify-start">
                                        <Link href={route('admin.modules.show', module.id)}>
                                            <BookOpen className="w-4 h-4 mr-2" />
                                            Back to Module
                                        </Link>
                                    </Button>

                                    <Button asChild variant="ghost" className="w-full justify-start">
                                        <Link href={route('training.module', module.id)}>
                                            <Info className="w-4 h-4 mr-2" />
                                            Preview Module
                                        </Link>
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
