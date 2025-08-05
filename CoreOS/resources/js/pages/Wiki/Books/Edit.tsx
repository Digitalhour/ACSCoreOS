import React, {useRef, useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {Head, router, useForm, usePage} from '@inertiajs/react';
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
import {ImageIcon, Trash2, Upload, X} from 'lucide-react';
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
    cover_image: File | null;
    status: 'draft' | 'published';
    remove_cover_image: boolean;
    _method: string;
}

export default function WikiBookEdit({ book }: Props) {
    const [imagePreview, setImagePreview] = useState<string | null>(
        book.cover_image_url || null
    );
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { flash } = usePage<any>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Wiki', href: '/wiki' },
        { title: book.name, href: `/wiki/books/${book.slug}` },
        { title: 'Edit', href: `/wiki/books/${book.slug}/edit` }
    ];

    const form = useForm<FormData>({
        name: book.name,
        description: book.description || '',
        cover_image: null,
        status: book.status as 'draft' | 'published',
        remove_cover_image: false,
        _method: 'PUT'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        form.post(`/wiki/books/${book.slug}`, {
            forceFormData: true,
        });
    };

    const handleDelete = () => {
        router.delete(`/wiki/books/${book.slug}`, {
            onSuccess: () => {
                // Redirect handled by controller
            }
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setData('cover_image', file);
            form.setData('remove_cover_image', false);

            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        form.setData('cover_image', null);
        form.setData('remove_cover_image', true);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const resetToOriginal = () => {
        form.setData('cover_image', null);
        form.setData('remove_cover_image', false);
        setImagePreview(book.cover_image_url || null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
                                    value={form.data.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setData('name', e.target.value)}
                                    placeholder="Enter book name..."
                                    className={form.errors.name ? 'border-destructive' : ''}
                                />
                                {form.errors.name && (
                                    <p className="text-sm text-destructive mt-1">{form.errors.name}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={form.data.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => form.setData('description', e.target.value)}
                                    placeholder="Describe what this book covers..."
                                    rows={4}
                                    className={form.errors.description ? 'border-destructive' : ''}
                                />
                                {form.errors.description && (
                                    <p className="text-sm text-destructive mt-1">{form.errors.description}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(value: 'draft' | 'published') => form.setData('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                                {form.errors.status && (
                                    <p className="text-sm text-destructive mt-1">{form.errors.status}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Cover Image</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {imagePreview ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Cover preview"
                                        className="w-full max-w-md h-auto rounded-lg"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-2 right-2"
                                        onClick={removeImage}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="absolute bottom-2 right-2"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Change Image
                                    </Button>
                                    {form.data.cover_image && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="absolute bottom-2 left-2"
                                            onClick={resetToOriginal}
                                        >
                                            Reset
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground mb-2">Click to upload cover image</p>
                                    <p className="text-sm text-muted-foreground">PNG, JPG, WEBP up to 5MB</p>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />

                            {form.errors.cover_image && (
                                <p className="text-sm text-destructive mt-2">{form.errors.cover_image}</p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-between">
                        <div className="flex gap-2">
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Updating...' : 'Update Book'}
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

                {form.data.status === 'published' && book.status === 'draft' && (
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
