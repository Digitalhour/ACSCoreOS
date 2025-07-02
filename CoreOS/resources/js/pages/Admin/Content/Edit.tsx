// resources/js/pages/Admin/Content/Edit.tsx
import React from 'react';
import {Head, Link, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft, ExternalLink, FileText, Headphones, Image, Video} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Label} from "@/components/ui/label";
import {Separator} from '@/components/ui/separator';

interface Lesson {
    id: number;
    title: string;
    module: {
        id: number;
        title: string;
    };
}

interface LessonContent {
    id: number;
    type: string;
    title: string;
    description: string;
    file_path: string;
    file_url: string;
    order: number;
    metadata: any;
}

interface Props {
    lesson: Lesson;
    content: LessonContent;
}

export default function EditContent({ lesson, content }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        title: content.title,
        description: content.description || '',
        order: content.order
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
            title: 'Edit Content',
            href: `/admin/lessons/${lesson.id}/contents/${content.id}/edit`,
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.lessons.contents.update', [lesson.id, content.id]));
    };

    const getContentIcon = (type: string) => {
        switch (type) {
            case 'video': return Video;
            case 'document': return FileText;
            case 'slideshow': return Image;
            case 'audio': return Headphones;
            default: return FileText;
        }
    };

    const getContentTypeName = (type: string) => {
        switch (type) {
            case 'video': return 'Video';
            case 'document': return 'Document';
            case 'slideshow': return 'Slideshow';
            case 'audio': return 'Audio';
            default: return 'Content';
        }
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return 'Unknown size';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const IconComponent = getContentIcon(content.type);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Content - ${content.title}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center">
                    <Button asChild variant="ghost" size="sm" className="mr-4">
                        <Link href={route('admin.modules.lessons.show', [lesson.module.id, lesson.id])}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Edit Content</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Content Information</CardTitle>
                                <CardDescription>Update the details for this content item</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="title">Title *</Label>
                                            <Input
                                                id="title"
                                                type="text"
                                                value={data.title}
                                                onChange={(e) => setData('title', e.target.value)}
                                                placeholder="Enter content title"
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
                                                placeholder="Enter content description"
                                            />
                                            {errors.description && <p className="text-destructive text-sm mt-1">{errors.description}</p>}
                                        </div>

                                        <div>
                                            <Label htmlFor="order">Order</Label>
                                            <Input
                                                id="order"
                                                type="number"
                                                min="0"
                                                value={data.order}
                                                onChange={(e) => setData('order', parseInt(e.target.value) || 0)}
                                            />
                                            {errors.order && <p className="text-destructive text-sm mt-1">{errors.order}</p>}
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Determines the display order of content items.
                                            </p>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Submit Buttons */}
                                    <div className="flex justify-end gap-4">
                                        <Button asChild variant="outline">
                                            <Link href={route('admin.modules.lessons.show', [lesson.module.id, lesson.id])}>
                                                Cancel
                                            </Link>
                                        </Button>
                                        <Button type="submit" disabled={processing}>
                                            {processing ? 'Updating...' : 'Update Content'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar - Current File Info */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Current File</CardTitle>
                                <CardDescription>Information about the uploaded file</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <IconComponent className="w-8 h-8 text-primary mr-3" />
                                        <div>
                                            <p className="font-medium">{getContentTypeName(content.type)}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {content.metadata?.original_name || 'Unknown filename'}
                                            </p>
                                        </div>
                                    </div>

                                    {content.metadata?.size && (
                                        <div>
                                            <Label className="text-muted-foreground">File Size</Label>
                                            <p className="mt-1">{formatFileSize(content.metadata.size)}</p>
                                        </div>
                                    )}

                                    {content.metadata?.mime_type && (
                                        <div>
                                            <Label className="text-muted-foreground">Type</Label>
                                            <p className="mt-1">{content.metadata.mime_type}</p>
                                        </div>
                                    )}

                                    {content.type === 'video' && content.file_url && (
                                        <div>
                                            <Label className="text-muted-foreground mb-2 block">Preview</Label>
                                            <video
                                                src={content.file_url}
                                                controls
                                                className="w-full rounded-lg border"
                                                style={{ maxHeight: '200px' }}
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                        </div>
                                    )}

                                    {content.type === 'audio' && content.file_url && (
                                        <div>
                                            <Label className="text-muted-foreground mb-2 block">Preview</Label>
                                            <audio
                                                src={content.file_url}
                                                controls
                                                className="w-full"
                                            >
                                                Your browser does not support the audio tag.
                                            </audio>
                                        </div>
                                    )}

                                    <Separator />

                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            To replace this file, you'll need to delete this content and create a new one.
                                        </p>
                                    </div>

                                    {content.file_url && (
                                        <div>
                                            <Button asChild variant="outline" size="sm" className="w-full">
                                                <a
                                                    href={content.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <IconComponent className="w-4 h-4 mr-2" />
                                                    View File
                                                    <ExternalLink className="w-3 h-3 ml-2" />
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
