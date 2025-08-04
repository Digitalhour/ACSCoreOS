import {useRef, useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link, useForm} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Eye, ImageIcon, Save, X} from 'lucide-react';
import SunEditorComponent from '@/components/ui/sun-editor';

interface BlogArticle {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    featured_image: string | null;
    status: 'draft' | 'published' | 'archived';
    published_at: string | null;
}

interface Template {
    name: string;
    slug: string;
    html: string;
    featured_image?: string | null;
}

interface Props {
    article?: BlogArticle;
    templates: Template[];
}

export default function BlogCreateEdit({ article, templates }: Props) {
    const isEditing = !!article;
    const [imagePreview, setImagePreview] = useState<string | null>(
        article?.featured_image || null
    );
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'blog',
            href: '/blog',
        },
        {
            title: isEditing ? 'Edit Article' : 'Create Article',
            href: isEditing ? `/blog/${article?.slug}/edit` : '/blog/create',
        },
    ];

    const form = useForm({
        title: article?.title || '',
        slug: article?.slug || '',
        excerpt: article?.excerpt || '',
        content: article?.content || '',
        featured_image: null as File | null,
        status: article?.status || 'draft',
        published_at: article?.published_at || '',
        _method: isEditing ? 'put' : '',
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (isEditing && article) {
            form.post(`/blog/${article.slug}`, {
                forceFormData: true,
            });
        } else {
            form.post('/blog', {
                forceFormData: true,
            });
        }
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

    const handleTemplateChange = async (templateName: string) => {
        setSelectedTemplate(templateName);

        const template = templates.find(t => t.name === templateName);

        if (template?.featured_image) {
            try {
                // Fetch the template image and convert to File object
                const response = await fetch(template.featured_image);
                const blob = await response.blob();
                const fileName = `template-${template.slug}.jpg`;
                const file = new File([blob], fileName, { type: blob.type });

                // Set the form data so it gets uploaded
                form.setData('featured_image', file);
                setImagePreview(template.featured_image);

                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } catch (error) {
                console.error('Failed to fetch template image:', error);
                setImagePreview(template.featured_image);
            }
        }
    };

    const generateSlug = (title: string): string => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        form.setData('title', title);

        if (!isEditing || !form.data.slug) {
            form.setData('slug', generateSlug(title));
        }
    };

    const handleSaveAsDraft = () => {
        form.setData('status', 'draft');
        const formElement = document.querySelector('form');
        if (formElement) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            formElement.dispatchEvent(submitEvent);
        }
    };

    const handlePublish = () => {
        form.setData('status', 'published');

        if (!form.data.published_at) {
            const now = new Date();
            const localISOTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            form.setData('published_at', localISOTime);
        }

        const formElement = document.querySelector('form');
        if (formElement) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            formElement.dispatchEvent(submitEvent);
        }
    };

    const getWordCount = (content: string): number => {
        return content.split(/\s+/).filter(word => word.length > 0).length;
    };

    const getReadingTime = (wordCount: number): number => {
        return Math.max(1, Math.ceil(wordCount / 200));
    };

    const wordCount = getWordCount(form.data.content);
    const readingTime = getReadingTime(wordCount);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEditing ? `Edit: ${article?.title}` : 'Create New Article'} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-2 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div>
                            <h1 className="text-3xl font-bold">
                                {isEditing ? 'Edit Announcement' : 'Create New Company Announcement'}
                            </h1>
                            {isEditing && article && (
                                <Badge variant="secondary" className="mt-2">
                                    {article.status}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Main content */}
                    <div className="space-y-6">
                        {/* Title */}
                        <div>
                            <div>
                                <div>Article Details</div>
                            </div>
                            <div className="grid lg:grid-cols-2 gap-2">
                                <div>
                                    <Label htmlFor="title">Title *</Label>
                                    <Input
                                        id="title"
                                        value={form.data.title}
                                        onChange={handleTitleChange}
                                        placeholder="Enter article title..."
                                        className={form.errors.title ? 'border-destructive' : ''}
                                    />
                                    {form.errors.title && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.title}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="slug">
                                        URL Slug
                                        <br />
                                        Preview: /blog/{form.data.slug || 'article-slug'}
                                    </Label>
                                    <Input
                                        id="slug"
                                        value={form.data.slug}
                                        onChange={(e) => form.setData('slug', e.target.value)}
                                        placeholder="article-url-slug"
                                        className={form.errors.slug ? 'border-destructive' : ''}
                                    />
                                    {form.errors.slug && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.slug}</p>
                                    )}
                                </div>

                                <div className="lg:col-span-2">
                                    <Label htmlFor="excerpt">Excerpt</Label>
                                    <Textarea
                                        id="excerpt"
                                        value={form.data.excerpt}
                                        onChange={(e) => form.setData('excerpt', e.target.value)}
                                        placeholder="Brief description of the article..."
                                        rows={3}
                                        className={form.errors.excerpt ? 'border-destructive' : ''}
                                    />
                                    {form.errors.excerpt && (
                                        <p className="text-sm text-destructive mt-1">{form.errors.excerpt}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {form.data.excerpt.length}/500 characters
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Featured Image */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Featured Image</CardTitle>
                                {selectedTemplate && (
                                    <p className="text-sm text-muted-foreground">
                                        Template "{selectedTemplate}" image preview applied
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent>
                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="Featured image preview"
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
                                        <p className="text-muted-foreground mb-2">Click to upload featured image</p>
                                        <p className="text-sm text-muted-foreground">PNG, JPG up to 2MB</p>
                                        {templates.length > 0 && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Or select a template below to see preview
                                            </p>
                                        )}
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

                        {/* Content */}
                        <div>
                            <div>
                                <div>Content *</div>
                                {templates.length > 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Select a template to auto-populate content and see image preview
                                    </p>
                                )}
                            </div>
                            <div>
                                <SunEditorComponent
                                    value={form.data.content || ''}
                                    onChange={(content: string) => form.setData('content', content)}
                                    onTemplateChange={handleTemplateChange}
                                    templates={templates}
                                    placeholder="Write your article content here..."
                                    height="900px"
                                />
                                {form.errors.content && (
                                    <p className="text-sm text-destructive mt-1">{form.errors.content}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                        {/* Publishing Options */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Publishing</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Status</Label>
                                    <RadioGroup
                                        value={form.data.status}
                                        onValueChange={(value: 'draft' | 'published' | 'archived') =>
                                            form.setData('status', value)
                                        }
                                        className="mt-2"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="draft" id="draft" />
                                            <Label htmlFor="draft">Draft</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="published" id="published" />
                                            <Label htmlFor="published">Published</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {form.data.status === 'published' && (
                                    <div>
                                        <Label htmlFor="published_at">Publish Date</Label>
                                        <Input
                                            id="published_at"
                                            type="datetime-local"
                                            value={form.data.published_at}
                                            onChange={(e) => form.setData('published_at', e.target.value)}
                                            className="mt-1"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Leave empty to publish immediately
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleSaveAsDraft}
                                    disabled={form.processing}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save as Draft
                                </Button>

                                <Button
                                    type="button"
                                    className="w-full"
                                    onClick={handlePublish}
                                    disabled={form.processing || !form.data.title || !form.data.content}
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    {isEditing ? 'Update & Publish' : 'Publish'}
                                </Button>

                                {isEditing && article && (
                                    <Link href={`/blog/${article.slug}`}>
                                        <Button variant="ghost" className="w-full">
                                            <Eye className="h-4 w-4 mr-2" />
                                            Preview Article
                                        </Button>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>

                        {/* Article Stats */}
                        {form.data.content && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Article Stats</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Words:</span>
                                        <span>{wordCount}</span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span>Characters:</span>
                                        <span>{form.data.content.length}</span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span>Reading time:</span>
                                        <span>{readingTime} min</span>
                                    </div>

                                    {selectedTemplate && (
                                        <div className="flex justify-between text-sm">
                                            <span>Template:</span>
                                            <span className="text-xs font-medium">{selectedTemplate}</span>
                                        </div>
                                    )}

                                    {templates.length > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span>Available Templates:</span>
                                            <span className="text-xs">{templates.length}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
