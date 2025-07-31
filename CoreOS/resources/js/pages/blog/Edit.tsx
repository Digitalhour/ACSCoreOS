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
import {Eye, Save} from 'lucide-react';
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
    created_at: string;
    updated_at: string;
}

interface Props {
    article: BlogArticle;
}

export default function BlogEdit({ article }: Props) {
    const [imagePreview, setImagePreview] = useState<string | null>(
        article.featured_image ? `/storage/${article.featured_image}` : null
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'blog',
            href: '/blog',
        },
        {
            title: article.title,
            href: `/blog/${article.slug}`,
        },
        {
            title: 'Edit',
            href: `/blog/${article.slug}/edit`,
        },
    ];

    const form = useForm({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || '',
        content: article.content,
        featured_image: null as File | null,
        status: article.status,
        published_at: article.published_at ? article.published_at.slice(0, 16) : '',
        _method: 'PUT'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        form.post(`/blog/${article.slug}`, {
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
        setImagePreview(article.featured_image ? `/storage/${article.featured_image}` : null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        form.setData('title', title);
    };

    const handleSaveAsDraft = () => {
        form.setData('status', 'draft');
        handleSubmit(new Event('submit') as any);
    };

    const handlePublish = () => {
        form.setData('status', 'published');
        if (!form.data.published_at) {
            form.setData('published_at', new Date().toISOString().slice(0, 16));
        }
        handleSubmit(new Event('submit') as any);
    };

    const handleArchive = () => {
        form.setData('status', 'archived');
        handleSubmit(new Event('submit') as any);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit: ${article.title}`} />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        {/*<Link*/}
                        {/*    href={`/blog/${article.slug}`}*/}
                        {/*    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"*/}
                        {/*>*/}
                        {/*    <ArrowLeft className="h-4 w-4" />*/}
                        {/*    Back to Article*/}
                        {/*</Link>*/}
                        <div>
                            <h1 className="text-3xl font-bold">Edit Article</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                                    {article.status}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    Last updated: {new Date(article.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Link href={`/blog/${article.slug}`}>
                        <Button variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            View Article
                        </Button>
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Title */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Article Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                                    <Label htmlFor="slug">URL Slug</Label>
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
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Preview: /blog/{form.data.slug}
                                    </p>
                                </div>

                                <div>
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
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {form.data.excerpt.length}/500 characters
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Featured Image */}
                        {/*<Card>*/}
                        {/*    <CardHeader>*/}
                        {/*        <CardTitle>Featured Image</CardTitle>*/}
                        {/*    </CardHeader>*/}
                        {/*    <CardContent>*/}
                        {/*        {imagePreview ? (*/}
                        {/*            <div className="relative">*/}
                        {/*                <img*/}
                        {/*                    src={imagePreview}*/}
                        {/*                    alt="Featured image preview"*/}
                        {/*                    className="w-full h-48 object-cover rounded-lg"*/}
                        {/*                />*/}
                        {/*                <Button*/}
                        {/*                    type="button"*/}
                        {/*                    variant="destructive"*/}
                        {/*                    size="sm"*/}
                        {/*                    className="absolute top-2 right-2"*/}
                        {/*                    onClick={removeImage}*/}
                        {/*                >*/}
                        {/*                    <X className="h-4 w-4" />*/}
                        {/*                </Button>*/}
                        {/*                <Button*/}
                        {/*                    type="button"*/}
                        {/*                    variant="secondary"*/}
                        {/*                    size="sm"*/}
                        {/*                    className="absolute bottom-2 right-2"*/}
                        {/*                    onClick={() => fileInputRef.current?.click()}*/}
                        {/*                >*/}
                        {/*                    <Upload className="h-4 w-4 mr-2" />*/}
                        {/*                    Change Image*/}
                        {/*                </Button>*/}
                        {/*            </div>*/}
                        {/*        ) : (*/}
                        {/*            <div*/}
                        {/*                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"*/}
                        {/*                onClick={() => fileInputRef.current?.click()}*/}
                        {/*            >*/}
                        {/*                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />*/}
                        {/*                <p className="text-muted-foreground mb-2">Click to upload featured image</p>*/}
                        {/*                <p className="text-sm text-muted-foreground">PNG, JPG up to 2MB</p>*/}
                        {/*            </div>*/}
                        {/*        )}*/}

                        {/*        <input*/}
                        {/*            ref={fileInputRef}*/}
                        {/*            type="file"*/}
                        {/*            accept="image/*"*/}
                        {/*            onChange={handleImageChange}*/}
                        {/*            className="hidden"*/}
                        {/*        />*/}

                        {/*        {form.errors.featured_image && (*/}
                        {/*            <p className="text-sm text-destructive mt-2">{form.errors.featured_image}</p>*/}
                        {/*        )}*/}
                        {/*    </CardContent>*/}
                        {/*</Card>*/}

                        {/* Content */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Content *</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SunEditorComponent
                                    value={form.data.content}
                                    onChange={(content) => form.setData('content', content)}
                                    placeholder="Write your article content here..."
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
                                        onValueChange={(value) => form.setData('status', value as any)}
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
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="archived" id="archived" />
                                            <Label htmlFor="archived">Archived</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {(form.data.status === 'published' || article.published_at) && (
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
                                            Leave empty to use current date/time when publishing
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
                                    type="submit"
                                    className="w-full"
                                    disabled={form.processing || !form.data.title || !form.data.content}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {form.processing ? 'Saving...' : 'Save Changes'}
                                </Button>

                                {article.status !== 'draft' && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleSaveAsDraft}
                                        disabled={form.processing}
                                    >
                                        Save as Draft
                                    </Button>
                                )}

                                {article.status !== 'published' && (
                                    <Button
                                        type="button"
                                        variant="default"
                                        className="w-full"
                                        onClick={handlePublish}
                                        disabled={form.processing || !form.data.title || !form.data.content}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Publish Article
                                    </Button>
                                )}

                                {article.status !== 'archived' && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleArchive}
                                        disabled={form.processing}
                                    >
                                        Archive Article
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Article Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Article Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>Created:</span>
                                    <span>{new Date(article.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Last updated:</span>
                                    <span>{new Date(article.updated_at).toLocaleDateString()}</span>
                                </div>
                                {article.published_at && (
                                    <div className="flex justify-between text-sm">
                                        <span>Published:</span>
                                        <span>{new Date(article.published_at).toLocaleDateString()}</span>
                                    </div>
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
                                        <span>{form.data.content.split(/\s+/).filter(w => w.length > 0).length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Characters:</span>
                                        <span>{form.data.content.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Reading time:</span>
                                        <span>
                                            {Math.max(1, Math.ceil(form.data.content.split(/\s+/).length / 200))} min
                                        </span>
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
