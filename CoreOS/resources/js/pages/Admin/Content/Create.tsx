import React, {useRef, useState} from 'react';
import {Head, Link, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft, FileText, Headphones, Image, Upload, Video, X} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Label} from "@/components/ui/label";
import {Progress} from "@/components/ui/progress";
import {Separator} from '@/components/ui/separator';
import {cn} from '@/lib/utils';

interface Lesson {
    id: number;
    title: string;
    module: {
        id: number;
        title: string;
    };
}

interface Props {
    lesson: Lesson;
}

export default function CreateContent({ lesson }: Props) {
    const { data, setData, post, processing, errors, progress } = useForm<{
        type: string;
        title: string;
        description: string;
        file: File | null;
        order: number;
    }>({
        type: 'video',
        title: '',
        description: '',
        file: null,
        order: 0,
    });


    const [dragActive, setDragActive] = useState(false);
    const [filePreview, setFilePreview] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            title: 'Add Content',
            href: `/admin/lessons/${lesson.id}/contents/create`,
        },
    ];

    const contentTypes = [
        { value: 'video', label: 'Video', icon: Video, accept: '.mp4,.avi,.mov,.wmv' },
        { value: 'document', label: 'Document', icon: FileText, accept: '.pdf,.doc,.docx,.ppt,.pptx' },
        { value: 'slideshow', label: 'Slideshow', icon: Image, accept: '.pdf,.ppt,.pptx' },
        { value: 'audio', label: 'Audio', icon: Headphones, accept: '.mp3,.wav,.aac,.ogg' }
    ];

    const selectedType = contentTypes.find(type => type.value === data.type);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.lessons.contents.store', lesson.id));
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (file: File) => {
        setData('file', file);

        // Create preview for supported file types
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setFilePreview({ type: 'image', url: e.target?.result });
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            const url = URL.createObjectURL(file);
            setFilePreview({ type: 'video', url });
        } else {
            setFilePreview({ type: 'file', name: file.name, size: file.size });
        }

        // Auto-set title if not already set
        if (!data.title) {
            const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
            setData('title', nameWithoutExtension);
        }
    };

    const removeFile = () => {
        setData('file', null);
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Add Content - ${lesson.title}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center">
                    <Button asChild variant="ghost" size="sm" className="mr-4">
                        <Link href={route('admin.modules.lessons.show', [lesson.module.id, lesson.id])}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Add Content to {lesson.title}</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Upload Content</CardTitle>
                        <CardDescription>Add videos, documents, slideshows, or audio files to your lesson</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Content Type Selection */}
                            <div>
                                <Label className="text-base font-medium mb-3 block">Content Type</Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {contentTypes.map((type) => (
                                        <Button
                                            key={type.value}
                                            type="button"
                                            variant={data.type === type.value ? "default" : "outline"}
                                            onClick={() => setData('type', type.value)}
                                            className="h-auto p-4 flex-col"
                                        >
                                            <type.icon className="w-6 h-6 mb-2" />
                                            <div className="text-sm font-medium">{type.label}</div>
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* File Upload */}
                            <div>
                                <Label className="text-base font-medium mb-3 block">Upload File</Label>

                                {!data.file ? (
                                    <div
                                        className={cn(
                                            "relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer",
                                            dragActive
                                                ? "border-primary bg-primary/5"
                                                : "border-muted-foreground/25 hover:border-muted-foreground/50"
                                        )}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                    >
                                        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <div className="text-lg font-medium mb-2">
                                            Drop your {selectedType?.label.toLowerCase()} file here
                                        </div>
                                        <div className="text-sm text-muted-foreground mb-4">
                                            or click to browse
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept={selectedType?.accept}
                                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="text-xs text-muted-foreground">
                                            Supported formats: {selectedType?.accept}
                                        </div>
                                    </div>
                                ) : (
                                    <Card className="border">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    {filePreview?.type === 'image' && (
                                                        <img
                                                            src={filePreview.url}
                                                            alt="Preview"
                                                            className="w-32 h-32 object-cover rounded-lg mb-3"
                                                        />
                                                    )}

                                                    {filePreview?.type === 'video' && (
                                                        <video
                                                            src={filePreview.url}
                                                            controls
                                                            className="w-64 h-36 rounded-lg mb-3"
                                                        />
                                                    )}

                                                    <div className="font-medium">
                                                        {data.file.name}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {formatFileSize(data.file.size)}
                                                    </div>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={removeFile}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <X className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {errors.file && <p className="text-destructive text-sm mt-1">{errors.file}</p>}
                            </div>

                            {/* Upload Progress */}
                            {progress && (
                                <div>
                                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                                        <span>Uploading...</span>
                                        <span>{progress.percentage}%</span>
                                    </div>
                                    <Progress value={progress.percentage} className="w-full" />
                                </div>
                            )}

                            <Separator />

                            {/* Content Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
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

                                <div className="md:col-span-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={3}
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
                                <Button
                                    type="submit"
                                    disabled={processing || !data.file}
                                >
                                    {processing ? 'Uploading...' : 'Upload Content'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
