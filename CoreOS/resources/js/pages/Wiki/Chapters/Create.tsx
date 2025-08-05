import React from 'react';
import AppLayout from '@/layouts/app-layout';
import {Head, useForm} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {type BreadcrumbItem} from '@/types';

interface WikiBook {
    id: number;
    name: string;
    slug: string;
}

interface Props {
    book: WikiBook;
}

interface FormData {
    name: string;
    description: string;
    status: 'draft' | 'published';
}

export default function WikiChapterCreate({ book }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Wiki', href: '/wiki' },
        { title: book.name, href: `/wiki/books/${book.slug}` },
        { title: 'Create Chapter', href: `/wiki/${book.slug}/chapters/create` }
    ];

    const { data, setData, post, processing, errors } = useForm<FormData>({
        name: '',
        description: '',
        status: 'draft'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/wiki/${book.slug}/chapters`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Chapter" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Create New Chapter</h1>
                    <p className="text-muted-foreground">in {book.name}</p>
                </div>

                <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Chapter Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="name">Chapter Name *</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData('name', e.target.value)}
                                    placeholder="Enter chapter name..."
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive mt-1">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('description', e.target.value)}
                                    placeholder="Describe what this chapter covers..."
                                    rows={4}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive mt-1">{errors.description}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={data.status}
                                    onValueChange={(value: 'draft' | 'published') => setData('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && (
                                    <p className="text-sm text-destructive mt-1">{errors.status}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-2">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Chapter'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.history.back()}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>

                {data.status === 'published' && (
                    <Alert className="max-w-2xl">
                        <AlertDescription>
                            Publishing this chapter will make it visible to all users immediately.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </AppLayout>
    );
}
