import React, {useRef, useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link, useForm} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Switch} from '@/components/ui/switch';
import {Eye, ImageIcon, Save, X} from 'lucide-react';
import SunEditorComponent from '@/components/ui/sun-editor';

interface BlogTemplate {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    content: string;
    featured_image: string | null;
    category: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

interface Props {
    template: BlogTemplate;
}

export default function BlogTemplateEdit({ template }: Props) {
    const form = useForm({
        name: template?.name || '',
        slug: template?.slug || '',
        description: template?.description || '',
        content: template?.content || '',
        featured_image: null as File | null,
        category: template?.category || '',
        is_active: template?.is_active || false,
        sort_order: template?.sort_order || 0,
        _method: 'PUT'
    });

    const [imagePreview, setImagePreview] = useState<string | null>(
        template?.featured_image ? `/storage/${template.featured_image}` : null
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!template) {
        return (
            <AppLayout breadcrumbs={[]}>
                <Head title="Template Not Found" />
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-destructive mb-4">Template Not Found</h1>
                        <p className="text-muted-foreground mb-4">The template you're trying to edit doesn't exist.</p>
                        <Link href="/admin/blog-templates">
                            <Button>Back to Templates</Button>
                        </Link>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Admin',
            href: '/admin',
        },
        {
            title: 'Blog Templates',
            href: '/admin/blog-templates',
        },
        {
            title: template.name,
            href: `/admin/blog-templates/${template.slug}`,
        },
        {
            title: 'Edit',
            href: `/admin/blog-templates/${template.slug}/edit`,
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/admin/blog-templates/${template.slug}`, {
            forceFormData: true,
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setData('featured_image', file);

            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        form.setData('featured_image', null);
        setImagePreview(template?.featured_image ? `/storage/${template.featured_image}` : null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        form.setData('name', name);

        // Auto-generate slug if it matches the current slug pattern
        if (!form.data.slug || form.data.slug === generateSlug(template.name)) {
            form.setData('slug', generateSlug(name));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Template: ${template.name}`} />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">Edit Template</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                    {template.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge variant="outline">{template.category}</Badge>
                                <span className="text-sm text-muted-foreground">
                                    Last updated: {new Date(template.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Link href={`/admin/blog-templates/${template.slug}`}>
                        <Button variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View Template
                        </Button>
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Template Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="name">Template Name *</Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={handleNameChange}
                                        placeholder="Enter template name..."
                                        className={form.errors.name ? 'border-destructive' : ''}
                                    />
                                    {form.errors.name && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="slug">URL Slug</Label>
                                    <Input
                                        id="slug"
                                        value={form.data.slug}
                                        onChange={(e) => form.setData('slug', e.target.value)}
                                        placeholder="template-url-slug"
                                        className={form.errors.slug ? 'border-destructive' : ''}
                                    />
                                    {form.errors.slug && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.slug}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="category">Category *</Label>
                                    <Input
                                        id="category"
                                        value={form.data.category}
                                        onChange={(e) => form.setData('category', e.target.value)}
                                        placeholder="e.g., Business, Technology, News"
                                        className={form.errors.category ? 'border-destructive' : ''}
                                    />
                                    {form.errors.category && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.category}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={form.data.description}
                                        onChange={(e) => form.setData('description', e.target.value)}
                                        placeholder="Brief description of the template..."
                                        rows={3}
                                        className={form.errors.description ? 'border-destructive' : ''}
                                    />
                                    {form.errors.description && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.description}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {form.data.description.length}/1000 characters
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Featured Image */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Image</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="Template image preview"
                                            className="w-full h-48 object-cover rounded-lg"
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
                                    </div>
                                ) : (
                                    <div
                                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground mb-2">Click to upload template image</p>
                                        <p className="text-sm text-muted-foreground">PNG, JPG up to 2MB</p>
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

                        {/* Template Content */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Content *</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SunEditorComponent
                                    value={form.data.content}
                                    onChange={(content) => form.setData('content', content)}
                                    placeholder="Enter template HTML content..."
                                    height="500px"
                                />
                                {form.errors.content && (
                                    <p className="text-sm text-destructive mt-1">{form.errors.content}</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Template Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="is_active">Active</Label>
                                    <Switch
                                        id="is_active"
                                        checked={form.data.is_active}
                                        onCheckedChange={(checked) => form.setData('is_active', checked)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="sort_order">Sort Order</Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        value={form.data.sort_order}
                                        onChange={(e) => form.setData('sort_order', parseInt(e.target.value) || 0)}
                                        min="0"
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Lower numbers appear first
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={form.processing || !form.data.name || !form.data.content}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {form.processing ? 'Saving...' : 'Save Template'}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Template Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>Created:</span>
                                    <span>{new Date(template.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Last updated:</span>
                                    <span>{new Date(template.updated_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Status:</span>
                                    <span>{template.is_active ? 'Active' : 'Inactive'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Category:</span>
                                    <span>{template.category}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
