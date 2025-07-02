// resources/js/pages/admin/modules/edit.tsx
import React, {useState} from 'react';
import {Head, Link, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Info, Settings, X} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Checkbox} from "@/components/ui/checkbox";
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from "@/components/ui/badge";
import {Label} from "@/components/ui/label";
import {Separator} from '@/components/ui/separator';

interface Module {
    thumbnail_url: string | undefined;
    id: number;
    title: string;
    description: string;
    thumbnail: string | null;
    sequential_lessons: boolean;
    quiz_required: boolean;
    test_required: boolean;
    passing_score: number;
    allow_retakes: boolean;
    is_active: boolean;
    order: number;
    thumb_url: string | null;
}

interface Props {
    module: Module;
}

export default function EditModule({ module }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        title: module.title,
        description: module.description || '',
        thumbnail: null as File | null,
        thumb_url: module.thumb_url,
        sequential_lessons: module.sequential_lessons,
        quiz_required: module.quiz_required,
        test_required: module.test_required,
        passing_score: module.passing_score,
        allow_retakes: module.allow_retakes,
        is_active: module.is_active,
        order: module.order,
        _method: 'PUT'
    });

    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Admin', href: '/admin' },
        { title: 'Training Modules', href: '/admin/modules' },
        { title: module.title, href: `/admin/modules/${module.id}` },
        { title: 'Edit Module', href: `/admin/modules/${module.id}/edit` },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.modules.update', module.id));
    };

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setData('thumbnail', file || null);

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setThumbnailPreview(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setThumbnailPreview(null);
        }
    };

    const removeThumbnail = () => {
        setData('thumbnail', null);
        setThumbnailPreview(null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Module - ${module.title}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <h1 className="text-2xl font-bold tracking-tight">Edit Module: {module.title}</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href={route('admin.modules.show', module.id)}>
                                Cancel
                            </Link>
                        </Button>
                        <Button asChild variant="default">
                            <Link href={route('training.module', module.id)}>
                                Preview Module
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardContent className="p-6">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Basic Information */}
                                    <div>
                                        <h3 className="text-lg font-medium mb-4">Basic Information</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="title">Title *</Label>
                                                <Input
                                                    id="title"
                                                    type="text"
                                                    value={data.title}
                                                    onChange={(e) => setData('title', e.target.value)}
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
                                                />
                                                {errors.description && <p className="text-destructive text-sm mt-1">{errors.description}</p>}
                                            </div>
                                            <Label>Thumbnail</Label>
                                            <div className={""}>
                                                {/* Current Thumbnail */}
                                                {module.thumbnail && !thumbnailPreview && (
                                                    <div className="mb-4">
                                                        <div className="relative inline-block">
                                                            <img
                                                                src={module.thumbnail_url}
                                                                alt="Current thumbnail"
                                                                className="w-32 h-32 object-cover rounded-lg border"
                                                            />
                                                            <Badge className="absolute top-2 right-2" variant="secondary">
                                                                Current
                                                            </Badge>
                                                        </div>

                                                    </div>
                                                )}

                                                {/* New Thumbnail Preview */}
                                                {thumbnailPreview && (
                                                    <div className="mb-4">
                                                        <div className="relative inline-block">
                                                            <img
                                                                src={thumbnailPreview}
                                                                alt="New thumbnail"
                                                                className="w-32 h-32 object-cover rounded-lg border"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={removeThumbnail}
                                                                className="absolute top-2 right-2 w-6 h-6 p-0"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </Button>
                                                            <Badge className="absolute bottom-2 left-2" variant="default">
                                                                New
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-2">New thumbnail (will replace current)</p>
                                                    </div>
                                                )}

                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleThumbnailChange}
                                                />
                                                {errors.thumbnail && <p className="text-destructive text-sm mt-1">{errors.thumbnail}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Module Settings */}
                                    <div>
                                        <div className="flex items-center mb-4">
                                            <Settings className="w-5 h-5 text-muted-foreground mr-2" />
                                            <h3 className="text-lg font-medium">Module Settings</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="passing_score">Passing Score (%)</Label>
                                                <Input
                                                    id="passing_score"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={data.passing_score}
                                                    onChange={(e) => setData('passing_score', parseInt(e.target.value))}
                                                />
                                                {errors.passing_score && <p className="text-destructive text-sm mt-1">{errors.passing_score}</p>}
                                            </div>

                                            <div>
                                                <Label htmlFor="order">Display Order</Label>
                                                <Input
                                                    id="order"
                                                    type="number"
                                                    min="0"
                                                    value={data.order}
                                                    onChange={(e) => setData('order', parseInt(e.target.value))}
                                                />
                                                {errors.order && <p className="text-destructive text-sm mt-1">{errors.order}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="sequential_lessons"
                                                        checked={data.sequential_lessons}
                                                        onCheckedChange={(checked) => setData('sequential_lessons', !!checked)}
                                                    />
                                                    <Label htmlFor="sequential_lessons" className="text-sm">
                                                        Sequential lessons (enforce lesson order)
                                                    </Label>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="quiz_required"
                                                        checked={data.quiz_required}
                                                        onCheckedChange={(checked) => setData('quiz_required', !!checked)}
                                                    />
                                                    <Label htmlFor="quiz_required" className="text-sm">
                                                        Quizzes required for completion
                                                    </Label>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="test_required"
                                                        checked={data.test_required}
                                                        onCheckedChange={(checked) => setData('test_required', !!checked)}
                                                    />
                                                    <Label htmlFor="test_required" className="text-sm">
                                                        Final test required for completion
                                                    </Label>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="allow_retakes"
                                                        checked={data.allow_retakes}
                                                        onCheckedChange={(checked) => setData('allow_retakes', !!checked)}
                                                    />
                                                    <Label htmlFor="allow_retakes" className="text-sm">
                                                        Allow assessment retakes
                                                    </Label>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="is_active"
                                                        checked={data.is_active}
                                                        onCheckedChange={(checked) => setData('is_active', !!checked)}
                                                    />
                                                    <Label htmlFor="is_active" className="text-sm">
                                                        Module is active
                                                    </Label>
                                                </div>
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
                                            {processing ? 'Updating...' : 'Update Module'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Current Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Current Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Status</span>
                                        <Badge variant={module.is_active ? "default" : "destructive"}>
                                            {module.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Navigation</span>
                                        <Badge variant={module.sequential_lessons ? "secondary" : "default"}>
                                            {module.sequential_lessons ? 'Sequential' : 'Free'}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Passing Score</span>
                                        <span className="text-sm font-medium">{module.passing_score}%</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Edit Tips */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Info className="w-5 h-5 text-primary mr-2" />
                                    Edit Tips
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 text-sm text-muted-foreground">
                                    <div>
                                        <h4 className="font-medium text-foreground mb-1">Changing Navigation Mode</h4>
                                        <p>Switching between sequential and free navigation affects how students access lessons. Consider existing student progress.</p>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-foreground mb-1">Assessment Requirements</h4>
                                        <p>Making quizzes or tests required will affect completion criteria for all enrolled students.</p>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-foreground mb-1">Module Status</h4>
                                        <p>Deactivating the module will hide it from students but preserve existing enrollments and progress.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>


                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
