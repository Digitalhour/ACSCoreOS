import React, {useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {Head, router, useForm} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {Trash2, Upload, X} from 'lucide-react';
import {type BreadcrumbItem} from '@/types';

interface WikiBook {
    id: number;
    name: string;
    slug: string;
    description: string;
    cover_image: string;
    cover_image_url: string | null;
    status: string;
}

interface Props {
    book: WikiBook;
}

interface FormData {
    name: string;
    description: string;
    cover_image: string;
    status: 'draft' | 'published';
}

export default function WikiBookEdit({ book }: Props) {
    const [coverImagePreview, setCoverImagePreview] = useState<string>(book.cover_image_url || '');
    const [uploadingImage, setUploadingImage] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Wiki', href: '/wiki' },
        { title: book.name, href: `/wiki/books/${book.slug}` },
        { title: 'Edit', href: `/wiki/books/${book.slug}/edit` }
    ];

    const { data, setData, put, processing, errors } = useForm('FormData',{
        name: book.name,
        description: book.description || '',
        cover_image: book.cover_image || '',
        status: book.status as 'draft' | 'published'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/wiki/books/${book.slug}`);
    };

    const handleDelete = () => {
        router.delete(`/wiki/books/${book.slug}`, {
            onSuccess: () => {
                // Redirect handled by controller
            }
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('image', file);

        router.post('/wiki/upload-image', formData, {
            onSuccess: (response: any) => {
                if (response.props?.upload) {
                    setData('cover_image', response.props.upload.path);
                    setCoverImagePreview(response.props.upload.url);
                }
            },
            onError: (errors) => {
                console.error('Failed to upload image:', errors);
            },
            onFinish: () => {
                setUploadingImage(false);
            }
        });
    };

    const removeCoverImage = () => {
        setData('cover_image', '');
        setCoverImagePreview('');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${book.name}`} />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
                <h1 className="text-3xl font-bold">Edit Book: {book.name}</h1>

                <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="name">Book Name *</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData('name', e.target.value)}
                                    placeholder="Enter book name..."
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
                                    placeholder="Describe what this book covers..."
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Cover Image</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {coverImagePreview ? (
                                <div className="relative mb-4">
                                    <img
                                        src={coverImagePreview}
                                        alt="Cover preview"
                                        className="w-full max-w-md h-auto rounded-lg"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-2 right-2"
                                        onClick={removeCoverImage}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Upload a cover image
                                    </p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        id="cover-upload"
                                    />
                                    <Label
                                        htmlFor="cover-upload"
                                        className="cursor-pointer inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                                    >
                                        {uploadingImage ? 'Uploading...' : 'Choose File'}
                                    </Label>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-between">
                        <div className="flex gap-2">
                            <Button type="submit" disabled={processing || uploadingImage}>
                                {processing ? 'Updating...' : 'Update Book'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.history.back()}
                            >
                                Cancel
                            </Button>
                        </div>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Book
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Book</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete "{book.name}"? This action cannot be undone.
                                        All chapters and pages within this book will also be permanently deleted.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDelete}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        Delete Book
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </form>

                {data.status === 'published' && book.status === 'draft' && (
                    <Alert className="max-w-2xl">
                        <AlertDescription>
                            Publishing this book will make it visible to all users immediately.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </AppLayout>
    );
}
