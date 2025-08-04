import {useRef, useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, useForm} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Switch} from '@/components/ui/switch';
import {ImageIcon, Save, X} from 'lucide-react';
import SunEditorComponent from '@/components/ui/sun-editor';

interface FormData {
    name: string;
    slug: string;
    description: string;
    content: string;
    featured_image: File | null;
    category: string;
    is_active: boolean;
    sort_order: number;
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
        title: 'Create Template',
        href: '/admin/blog-templates/create',
    },
];

export default function BlogTemplatesCreate() {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormData>({
        name: '',
        slug: '',
        description: '',
        content: '',
        featured_image: null,
        category: 'general',
        is_active: true,
        sort_order: 0,
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        form.post('/admin/blog-templates', {
            forceFormData: true,
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setData('featured_image', file);

            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setImagePreview(e.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        form.setData('featured_image', null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const generateSlug = (name: string): string => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        form.setData('name', name);

        if (!form.data.slug) {
            form.setData('slug', generateSlug(name));
        }
    };

    const predefinedCategories = [
        'general',
        'newsletter',
        'brief',
        'article',
        'announcement',
        'update'
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Template" />

            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Create New Template</h1>
                        <p className="text-muted-foreground mt-2">
                            Create a reusable template for blog articles
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid lg:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="name">Template Name *</Label>
                                        <Input
                                            id="name"
                                            value={form.data.name}
                                            onChange={handleNameChange}
                                            placeholder="e.g., Newsletter Template"
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
                                </div>

                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={form.data.description}
                                        onChange={(e) => form.setData('description', e.target.value)}
                                        placeholder="Brief description of this template..."
                                        rows={3}
                                        className={form.errors.description ? 'border-destructive' : ''}
                                    />
                                    {form.errors.description && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.description}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {form.data.description.length}/1000 characters
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Featured Image */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Preview Image</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="Template preview"
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
                                        <p className="text-muted-foreground mb-2">Click to upload preview image</p>
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
                                <p className="text-sm text-muted-foreground">
                                    Design your template layout and content
                                </p>
                            </CardHeader>
                            <CardContent>
                                <SunEditorComponent
                                    value={form.data.content || ''}
                                    onChange={(content: string) => form.setData('content', content)}
                                    placeholder="Design your template here..."
                                    height="600px"
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
                                <CardTitle>Template Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="category">Category *</Label>
                                    <select
                                        id="category"
                                        value={form.data.category}
                                        onChange={(e) => form.setData('category', e.target.value)}
                                        className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {predefinedCategories.map((category) => (
                                            <option key={category} value={category}>
                                                {category.charAt(0).toUpperCase() + category.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                    {form.errors.category && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.category}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="sort_order">Sort Order</Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        min="0"
                                        value={form.data.sort_order}
                                        onChange={(e) => form.setData('sort_order', parseInt(e.target.value) || 0)}
                                        className={form.errors.sort_order ? 'border-destructive' : ''}
                                    />
                                    {form.errors.sort_order && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.sort_order}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Lower numbers appear first
                                    </p>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="is_active"
                                        checked={form.data.is_active}
                                        onCheckedChange={(checked) => form.setData('is_active', checked)}
                                    />
                                    <Label htmlFor="is_active">Active Template</Label>
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
                                    {form.processing ? 'Creating...' : 'Create Template'}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Template Stats */}
                        {form.data.content && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Template Stats</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Characters:</span>
                                        <span>{form.data.content.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Words:</span>
                                        <span>{form.data.content.split(/\s+/).filter(w => w.length > 0).length}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
