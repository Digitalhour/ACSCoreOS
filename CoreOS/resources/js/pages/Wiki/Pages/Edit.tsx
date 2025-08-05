import React, {useRef, useState} from 'react';
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
import {ImageIcon, Trash2, Upload, X} from 'lucide-react';
import SunEditorComponent from '@/components/ui/sun-editor';
import {type BreadcrumbItem} from '@/types';

interface Template {
    name: string;
    html: string;
    featured_image?: string | null;
}

interface WikiPage {
    id: number;
    name: string;
    slug: string;
    content: string;
    excerpt: string;
    featured_image: string;
    featured_image_url: string | null;
    status: string;
    version: number;
}

interface WikiChapter {
    id: number;
    name: string;
    slug: string;
}

interface WikiBook {
    id: number;
    name: string;
    slug: string;
}

interface Props {
    book: WikiBook;
    chapter: WikiChapter;
    page: WikiPage;
    templates: Template[];
}

interface FormData {
    name: string;
    content: string;
    excerpt: string;
    featured_image: File | null;
    status: 'draft' | 'published';
    change_summary: string;
    remove_featured_image: boolean;
    _method: string;
}

export default function WikiPageEdit({ book, chapter, page, templates }: Props) {
    const [imagePreview, setImagePreview] = useState<string | null>(
        page.featured_image_url || null
    );
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Wiki', href: '/wiki' },
        { title: book.name, href: `/wiki/books/${book.slug}` },
        { title: chapter.name, href: `/wiki/${book.slug}/${chapter.slug}` },
        { title: page.name, href: `/wiki/${book.slug}/${chapter.slug}/${page.slug}` },
        { title: 'Edit', href: `/wiki/${book.slug}/${chapter.slug}/${page.slug}/edit` }
    ];

    const form = useForm('FormData',{
        name: page.name,
        content: page.content,
        excerpt: page.excerpt || '',
        featured_image: null,
        status: page.status as 'draft' | 'published',
        change_summary: '',
        remove_featured_image: false,
        _method: 'PUT'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        form.post(`/wiki/${book.slug}/${chapter.slug}/${page.slug}`, {
            forceFormData: true,
        });
    };

    const handleDelete = () => {
        router.delete(`/wiki/${book.slug}/${chapter.slug}/${page.slug}`, {
            onSuccess: () => {
                // Redirect handled by controller
            }
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setData('featured_image', file);
            form.setData('remove_featured_image', false);

            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        form.setData('featured_image', null);
        form.setData('remove_featured_image', true);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const resetToOriginal = () => {
        form.setData('featured_image', null);
        form.setData('remove_featured_image', false);
        setImagePreview(page.featured_image_url || null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleTemplateChange = (templateName: string) => {
        setSelectedTemplate(templateName);
        const template = templates.find(t => t.name === templateName);
        if (template) {
            form.setData('content', template.html);
            if (template.featured_image) {
                setImagePreview(template.featured_image);
            }
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${page.name}`} />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Edit Page: {page.name}</h1>
                    <p className="text-muted-foreground">Version {page.version}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Page Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">Page Name *</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={form.data.name}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setData('name', e.target.value)}
                                            placeholder="Enter page name..."
                                            className={form.errors.name ? 'border-destructive' : ''}
                                        />
                                        {form.errors.name && (
                                            <p className="text-sm text-destructive mt-1">{form.errors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="excerpt">Excerpt</Label>
                                        <Textarea
                                            id="excerpt"
                                            value={form.data.excerpt}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => form.setData('excerpt', e.target.value)}
                                            placeholder="Brief description of the page content..."
                                            rows={3}
                                            className={form.errors.excerpt ? 'border-destructive' : ''}
                                        />
                                        {form.errors.excerpt && (
                                            <p className="text-sm text-destructive mt-1">{form.errors.excerpt}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Page Content</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <SunEditorComponent
                                        value={form.data.content}
                                        onChange={(content: string) => form.setData('content', content)}
                                        onTemplateChange={handleTemplateChange}
                                        templates={templates}
                                        height="500px"
                                    />
                                    {form.errors.content && (
                                        <p className="text-sm text-destructive mt-2">{form.errors.content}</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Publishing</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
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

                                    <div>
                                        <Label htmlFor="change_summary">Change Summary *</Label>
                                        <Input
                                            id="change_summary"
                                            type="text"
                                            value={form.data.change_summary}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setData('change_summary', e.target.value)}
                                            placeholder="Describe your changes..."
                                            className={form.errors.change_summary ? 'border-destructive' : ''}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Required for tracking changes in version history
                                        </p>
                                        {form.errors.change_summary && (
                                            <p className="text-sm text-destructive mt-1">{form.errors.change_summary}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Featured Image</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {imagePreview ? (
                                        <div className="relative">
                                            <img
                                                src={imagePreview}
                                                alt="Featured image preview"
                                                className="w-full h-auto rounded-lg"
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
                                            {form.data.featured_image && (
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
                                            <p className="text-muted-foreground mb-2">Click to upload featured image</p>
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

                                    {form.errors.featured_image && (
                                        <p className="text-sm text-destructive mt-2">{form.errors.featured_image}</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <div className="flex gap-2">
                            <Button type="submit" disabled={form.processing || !form.data.change_summary}>
                                {form.processing ? 'Updating...' : 'Update Page'}
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
                                    Delete Page
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Page</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete "{page.name}"? This action cannot be undone.
                                        All versions and history will be permanently deleted.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDelete}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        Delete Page
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </form>

                {selectedTemplate && (
                    <Alert>
                        <AlertDescription>
                            Applied template: {selectedTemplate}
                        </AlertDescription>
                    </Alert>
                )}

                <Alert>
                    <AlertDescription>
                        Saving changes will create a new version and preserve the previous version in history.
                    </AlertDescription>
                </Alert>
            </div>
        </AppLayout>
    );
}
