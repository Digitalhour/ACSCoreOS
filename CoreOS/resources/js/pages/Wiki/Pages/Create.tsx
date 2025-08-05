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
import {Upload, X} from 'lucide-react';
import SunEditorComponent from '@/components/ui/sun-editor';
import {type BreadcrumbItem} from '@/types';

interface Template {
    name: string;
    html: string;
    featured_image?: string | null;
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
    templates: Template[];
}

interface FormData {
    name: string;
    content: string;
    excerpt: string;
    featured_image: string;
    status: 'draft' | 'published';
    change_summary: string;
}

export default function WikiPageCreate({ book, chapter, templates }: Props) {
    const [featuredImagePreview, setFeaturedImagePreview] = useState<string>('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Wiki', href: '/wiki' },
        { title: book.name, href: `/wiki/books/${book.slug}` },
        { title: chapter.name, href: `/wiki/${book.slug}/${chapter.slug}` },
        { title: 'Create Page', href: `/wiki/${book.slug}/${chapter.slug}/pages/create` }
    ];

    const { data, setData, post, processing, errors } = useForm<FormData>({
        name: '',
        content: '',
        excerpt: '',
        featured_image: '',
        status: 'draft',
        change_summary: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/wiki/${book.slug}/${chapter.slug}/pages`);
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
                    setData('featured_image', response.props.upload.path);
                    setFeaturedImagePreview(response.props.upload.url);
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

    const removeFeaturedImage = () => {
        setData('featured_image', '');
        setFeaturedImagePreview('');
    };

    const handleTemplateChange = (templateName: string) => {
        setSelectedTemplate(templateName);
        const template = templates.find(t => t.name === templateName);
        if (template && template.featured_image) {
            setData('featured_image', template.featured_image);
            setFeaturedImagePreview(template.featured_image);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Page" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Create New Page</h1>
                    <p className="text-muted-foreground">in {chapter.name}</p>
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
                                            value={data.name}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData('name', e.target.value)}
                                            placeholder="Enter page name..."
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-destructive mt-1">{errors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="excerpt">Excerpt</Label>
                                        <Textarea
                                            id="excerpt"
                                            value={data.excerpt}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('excerpt', e.target.value)}
                                            placeholder="Brief description of the page content..."
                                            rows={3}
                                        />
                                        {errors.excerpt && (
                                            <p className="text-sm text-destructive mt-1">{errors.excerpt}</p>
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
                                        value={data.content}
                                        onChange={(content: string) => setData('content', content)}
                                        onTemplateChange={handleTemplateChange}
                                        templates={templates}
                                        height="500px"
                                    />
                                    {errors.content && (
                                        <p className="text-sm text-destructive mt-2">{errors.content}</p>
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
                                    </div>

                                    <div>
                                        <Label htmlFor="change_summary">Change Summary</Label>
                                        <Input
                                            id="change_summary"
                                            type="text"
                                            value={data.change_summary}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData('change_summary', e.target.value)}
                                            placeholder="Initial version"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Featured Image</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {featuredImagePreview ? (
                                        <div className="relative mb-4">
                                            <img
                                                src={featuredImagePreview}
                                                alt="Featured image preview"
                                                className="w-full h-auto rounded-lg"
                                            />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="absolute top-2 right-2"
                                                onClick={removeFeaturedImage}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                                            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Upload featured image
                                            </p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                id="featured-upload"
                                            />
                                            <Label
                                                htmlFor="featured-upload"
                                                className="cursor-pointer inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                                            >
                                                {uploadingImage ? 'Uploading...' : 'Choose File'}
                                            </Label>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button type="submit" disabled={processing || uploadingImage}>
                            {processing ? 'Creating...' : 'Create Page'}
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

                {selectedTemplate && (
                    <Alert>
                        <AlertDescription>
                            Using template: {selectedTemplate}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </AppLayout>
    );
}
