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
}

interface Props {
    article?: BlogArticle;
}

export default function BlogCreateEdit({ article }: Props) {
    const isEditing = !!article;
    const [imagePreview, setImagePreview] = useState<string | null>(
        article?.featured_image ? `/storage/${article.featured_image}` : null
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'blog',
            href: '/blog',
        },
        {
            title: isEditing ? 'Edit Article' : 'Create Article',
            href: isEditing ? `/blog/${article.slug}/edit` : '/blog/create',
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
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditing) {
            form.post(`/blog/${article.slug}`, {
                forceFormData: true,
                _method: 'put',
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
                setImagePreview(e.target?.result as string);
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

        if (!isEditing || !form.data.slug) {
            form.setData('slug', generateSlug(title));
        }
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEditing ? `Edit: ${article.title}` : 'Create New Article'} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-2 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div>
                            <h1 className="text-3xl font-bold">
                                {isEditing ? 'Edit Announcement' : 'Create New Company Announcement'}
                            </h1>
                            {isEditing && (
                                <Badge variant="secondary" className="mt-2">
                                    {article.status}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="">
                    {/* Main content */}
                    <div className="space-y-6">
                        {/* Title */}
                        <div>
                            <div>
                                <div>Article Details</div>
                            </div>
                            <div className="grid lg:grid-cols-2 gap-2 ">
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
                                    <Label htmlFor="slug">URL Slug
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

                                <div className={""}>
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

                        {/*/!* Featured Image *!/*/}
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
                        <div>
                            <div>
                                <div>Content *</div>
                            </div>
                            <div>
                                <SunEditorComponent
                                    value={form.data.content || ''}
                                    onChange={(content) => form.setData('content', content)}
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
                    <div className="grid grid-cols-2 gap-4 mt-2 space-y-6">
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

                                {isEditing && (
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
                                        <span>
                                            {typeof form.data.content === 'string'
                                                ? form.data.content.split(/\s+/).filter(w => w.length > 0).length
                                                : 0}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span>Characters:</span>
                                        <span>
                                            {typeof form.data.content === 'string' ? form.data.content.length : 0}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span>Reading time:</span>
                                        <span>
                                            {Math.max(1, Math.ceil((typeof form.data.content === 'string' ? form.data.content.split(/\s+/).length : 0) / 200))} min
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
