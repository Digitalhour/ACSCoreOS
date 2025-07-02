import React, {useEffect, useState} from 'react';
import {Head, Link} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {CheckCircle, FileText, Headphones, Image, Play, Shapes} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import axios from 'axios';

interface Module {
    id: number;
    title: string;
}

interface Lesson {
    id: number;
    title: string;
    description: string;
    has_quiz: boolean;
    quiz_attempts?: number;
    quiz_best_score?: number;
    contents: LessonContent[];
}

interface LessonContent {
    id: number;
    type: string;
    title: string;
    description: string;
    file_url: string | null;
    file_path: string | null;
    thumbnail: string | null;
    formatted_duration: string | null;
    is_completed: boolean;
}

interface Props {
    module: Module;
    lesson: Lesson;
}

export default function TrainingLesson({ module, lesson }: Props) {
    const [activeContentId, setActiveContentId] = useState(lesson.contents[0]?.id);
    const [completedContent, setCompletedContent] = useState(new Set());

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
    ];

    useEffect(() => {
        // Initialize completed content from lesson data
        const completed = new Set();
        lesson.contents.forEach(content => {
            if (content.is_completed) {
                completed.add(content.id);
            }
        });
        setCompletedContent(completed);
    }, [lesson]);

    const handleContentComplete = async (contentId: number) => {
        try {
            await axios.post(route('training.content.complete', contentId), {
                time_spent: 0
            });

            setCompletedContent(prev => new Set([...prev, contentId]));
        } catch (error) {
            console.error('Error marking content as complete:', error);
        }
    };

    const activeContent = lesson.contents.find(c => c.id === activeContentId);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={lesson.title} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-2 rounded-xl p-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Content Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-4">
                            <CardHeader>
                                <CardTitle className="text-lg">In This Lesson</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {lesson.contents.map((content) => (
                                    <ContentItem
                                        key={content.id}
                                        content={content}
                                        isActive={activeContentId === content.id}
                                        isCompleted={completedContent.has(content.id)}
                                        onClick={() => setActiveContentId(content.id)}
                                    />
                                ))}

                                {lesson.has_quiz && (
                                    <div className="pt-4 border-t">
                                        <Button variant="outline" asChild className="w-full">
                                            <Link href={route('training.quiz', [module.id, lesson.id])}>
                                                <Shapes className="w-4 h-4 mr-2" />
                                                {lesson.quiz_attempts && lesson.quiz_attempts > 0 ? 'Retake Quiz' : 'Take Quiz'}
                                                {lesson.quiz_best_score && (
                                                    <Badge variant="secondary" className="ml-2">
                                                        {lesson.quiz_best_score}%
                                                    </Badge>
                                                )}
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3">
                        <Card>
                            <CardContent className="p-6">
                                {activeContent ? (
                                    <ContentViewer
                                        content={activeContent}
                                        isCompleted={completedContent.has(activeContent.id)}
                                        onComplete={() => handleContentComplete(activeContent.id)}
                                    />
                                ) : (
                                    <div className="text-center text-muted-foreground py-12">
                                        Select content from the sidebar to begin
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function ContentItem({ content, isActive, isCompleted, onClick }: {
    content: LessonContent;
    isActive: boolean;
    isCompleted: boolean;
    onClick: () => void;
}) {
    const getIcon = () => {
        switch (content.type) {
            case 'video':
                return <Play className="w-4 h-4" />;
            case 'document':
                return <FileText className="w-4 h-4" />;
            case 'slideshow':
                return <Image className="w-4 h-4" />;
            case 'audio':
                return <Headphones className="w-4 h-4" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <Button
            variant={isActive ? "default" : "ghost"}
            onClick={onClick}
            className="w-full justify-start h-auto p-3"
        >
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center text-left">
                    <div className="mr-3">
                        {getIcon()}
                    </div>
                    <div>
                        <div className="font-medium text-sm">
                            {content.title}
                        </div>
                        {content.formatted_duration && (
                            <div className="text-xs text-muted-foreground">{content.formatted_duration}</div>
                        )}
                    </div>
                </div>

                {isCompleted && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                )}
            </div>
        </Button>
    );
}

function ContentViewer({ content, isCompleted, onComplete }: {
    content: LessonContent;
    isCompleted: boolean;
    onComplete: () => void;
}) {
    const renderContent = () => {
        switch (content.type) {
            case 'video':
                return (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <video
                            controls
                            className="w-full h-full"
                            poster={content.thumbnail ? `/storage/${content.thumbnail}` : undefined}
                            onEnded={!isCompleted ? onComplete : undefined}
                        >
                            <source src={content.file_url || `/storage/${content.file_path}`} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );

            case 'document':
                return (
                    <div className="border rounded-lg">
                        <iframe
                            src={content.file_url || `/storage/${content.file_path}`}
                            className="w-full h-96"
                            title={content.title}
                        />
                    </div>
                );

            case 'slideshow':
                return (
                    <div className="border rounded-lg">
                        <iframe
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(content.file_url || `/storage/${content.file_path}`)}&embedded=true`}
                            className="w-full h-[44rem]"
                            title={content.title}
                        />
                    </div>
                );

            case 'audio':
                return (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Headphones className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <audio
                                controls
                                className="w-full max-w-md mx-auto"
                                onEnded={!isCompleted ? onComplete : undefined}
                            >
                                <source src={content.file_url || `/storage/${content.file_path}`} type="audio/mpeg" />
                                Your browser does not support the audio tag.
                            </audio>
                        </CardContent>
                    </Card>
                );

            default:
                return (
                    <div className="text-center text-muted-foreground py-12">
                        Content type not supported
                    </div>
                );
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-xl font-bold">{content.title}</h1>
                    {content.description && (
                        <p className="text-muted-foreground mt-1">{content.description}</p>
                    )}
                </div>

                {!isCompleted ? (
                    <Button onClick={onComplete} variant="default">
                        Mark Complete
                    </Button>
                ) : (
                    <Card className="p-4">
                        <div className="flex items-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            <span className="font-medium">Content completed!</span>
                        </div>
                    </Card>
                )}
            </div>

            {renderContent()}
        </div>
    );
}
