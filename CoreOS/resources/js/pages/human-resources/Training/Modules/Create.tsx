import React, {useState} from 'react';
import {Head, Link, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Checkbox} from "@/components/ui/checkbox";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Label} from "@/components/ui/label";
import {Separator} from '@/components/ui/separator';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },

    {
        title: 'Training Dashboard',
        href: route('admin.reports.index'),
    },
    {
        title: 'Create Module',
        href: route('admin.modules.create'),
    },
];

export default function CreateModule() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        thumbnail: null as File | null,
        sequential_lessons: true as boolean,
        quiz_required: false as boolean,
        test_required: false as boolean,
        passing_score: 70,
        allow_retakes: true as boolean,
        is_active: true as boolean,
        order: 0
    });

    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.modules.store'));
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Module" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center">
                    <Button asChild variant="ghost" size="sm" className="mr-4">
                        <Link href={route('admin.modules.index')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Create New Module</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Module Information</CardTitle>
                        <CardDescription>Create a new training module with lessons, quizzes, and assessments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <Label htmlFor="title">Title *</Label>
                                    <Input
                                        id="title"
                                        type="text"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        placeholder="Enter module title"
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
                                        rows={4}
                                        placeholder="Enter module description"
                                    />
                                    {errors.description && <p className="text-destructive text-sm mt-1">{errors.description}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <Label>Thumbnail</Label>
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleThumbnailChange}
                                            />
                                        </div>
                                        {thumbnailPreview && (
                                            <img
                                                src={thumbnailPreview}
                                                alt="Thumbnail preview"
                                                className="w-20 h-20 object-cover rounded-lg border"
                                            />
                                        )}
                                    </div>
                                    {errors.thumbnail && <p className="text-destructive text-sm mt-1">{errors.thumbnail}</p>}
                                </div>
                            </div>

                            <Separator />

                            {/* Settings */}
                            <div>
                                <h3 className="text-lg font-medium mb-4">Module Settings</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <Label htmlFor="order">Order</Label>
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
                                    <Link href={route('admin.modules.index')}>
                                        Cancel
                                    </Link>
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Creating...' : 'Create Module'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
