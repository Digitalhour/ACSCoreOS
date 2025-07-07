// resources/js/pages/admin/lessons/Show.tsx
import React from 'react';
import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {
    ArrowLeft,
    Edit,
    Eye,
    FileText,
    Headphones,
    HelpCircle as QuizIcon,
    Image,
    Play,
    Plus,
    Trash2
} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Label} from "@/components/ui/label";

interface Module {
    id: number;
    title: string;
}

interface Quiz {
    id: number;
    title: string;
    time_limit: number | null;
    passing_score: number;
    questions: Question[];
}

interface Question {
    id: number;
}

interface LessonContent {
    id: number;
    title: string;
    type: string;
    formatted_duration?: string;
}

interface Lesson {
    id: number;
    title: string;
    description: string;
    is_active: boolean;
    contents: LessonContent[];
    quiz: Quiz | null;
}

interface Props {
    module: Module;
    lesson: Lesson;
}

export default function AdminLessonShow({ module, lesson }: Props) {
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
            title: lesson.title,
            href: `/admin/modules/${module.id}/lessons/${lesson.id}`,
        },
    ];

    const handleDeleteContent = (content: LessonContent) => {
        if (confirm(`Are you sure you want to delete "${content.title}"? This action cannot be undone.`)) {
            router.delete(route('admin.content.destroy', content.id));
        }
    };

    const handleDeleteQuiz = () => {
        if (lesson.quiz && confirm(`Are you sure you want to delete the quiz? This action cannot be undone.`)) {
            router.delete(route('admin.lessons.quizzes.destroy', [lesson.id, lesson.quiz.id]));
        }
    };

    const getContentIcon = (type: string) => {
        switch (type) {
            case 'video': return Play;
            case 'document': return FileText;
            case 'slideshow': return Image;
            case 'audio': return Headphones;
            default: return FileText;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${lesson.title} - Admin`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Button asChild variant="ghost" size="sm" className="mr-4">
                            <Link href={route('admin.modules.show', module.id)}>
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
                    </div>

                    <div className="flex gap-2">
                        <Button asChild variant="default">
                            <Link href={route('training.lesson', [module.id, lesson.id])}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                            </Link>
                        </Button>

                        <Button asChild variant="outline">
                            <Link href={route('admin.modules.lessons.edit', [module.id, lesson.id])}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Lesson
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Lesson Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Lesson Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Title</Label>
                                    <p className="mt-1">{lesson.title}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="mt-1">
                                        <Badge variant={lesson.is_active ? "default" : "destructive"}>
                                            {lesson.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>
                                {lesson.description && (
                                    <div className="md:col-span-2">
                                        <Label className="text-muted-foreground">Description</Label>
                                        <p className="mt-1">{lesson.description}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lesson Content */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Content</CardTitle>
                                <Button asChild variant="default">
                                    <Link href={route('admin.lessons.contents.create', lesson.id)}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Content
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {lesson.contents && lesson.contents.length > 0 ? (
                                <div className="space-y-4">
                                    {lesson.contents.map((content) => {
                                        const IconComponent = getContentIcon(content.type);
                                        return (
                                            <Card key={content.id} className="border">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <IconComponent className="w-5 h-5 text-muted-foreground mr-3" />
                                                            <div>
                                                                <h4 className="font-medium">{content.title}</h4>
                                                                <p className="text-sm text-muted-foreground capitalize">{content.type}</p>
                                                                {content.formatted_duration && (
                                                                    <p className="text-xs text-muted-foreground">{content.formatted_duration}</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <Button asChild variant="ghost" size="sm">
                                                                <Link href={route('admin.lessons.contents.edit', [lesson.id, content.id])}>
                                                                    <Edit className="w-4 h-4" />
                                                                </Link>
                                                            </Button>

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteContent(content)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <h4 className="text-lg font-medium mb-2">No content yet</h4>
                                    <p className="text-muted-foreground mb-4">Add your first piece of content to this lesson.</p>
                                    <Button asChild variant="default">
                                        <Link href={route('admin.lessons.contents.create', lesson.id)}>
                                            Add Content
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quiz Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Quiz</CardTitle>
                                {!lesson.quiz && (
                                    <Button asChild variant="default">
                                        <Link href={route('admin.lessons.quizzes.create', lesson.id)}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create Quiz
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {lesson.quiz ? (
                                <Card className="border">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <QuizIcon className="w-5 h-5 text-primary mr-3" />
                                                <div>
                                                    <h4 className="font-medium">{lesson.quiz.title}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {lesson.quiz.questions.length} questions
                                                        {lesson.quiz.time_limit && ` • ${lesson.quiz.time_limit} minutes`}
                                                        • {lesson.quiz.passing_score}% passing score
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={route('admin.lessons.quizzes.show', [lesson.id, lesson.quiz.id])}>
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                </Button>

                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={route('admin.lessons.quizzes.edit', [lesson.id, lesson.quiz.id])}>
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleDeleteQuiz}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="text-center py-8">
                                    <QuizIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <h4 className="text-lg font-medium mb-2">No quiz yet</h4>
                                    <p className="text-muted-foreground mb-4">Add a quiz to test students' understanding of this lesson.</p>
                                    <Button asChild variant="default">
                                        <Link href={route('admin.lessons.quizzes.create', lesson.id)}>
                                            Create Quiz
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
