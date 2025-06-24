import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link, useForm} from '@inertiajs/react';
import {ArrowLeft, Save} from 'lucide-react';
import {FormEvent} from 'react';
import QuillEditor from '@/components/ui/quill-editor';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    status: 'draft' | 'published';
    user: User;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

type ArticleFormData = {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    status: 'draft' | 'published';
}

interface Props {
    article: Article;
}

export default function ArticlesEdit({ article }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Articles',
            href: '/articles',
        },
        {
            title: article.title,
            href: `/articles/${article.id}`,
        },
        {
            title: 'Edit',
            href: `/articles/${article.id}/edit`,
        },
    ];

    const { data, setData, put, processing, errors } = useForm<ArticleFormData>({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || '',
        content: article.content,
        status: article.status,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        put(`/articles/${article.id}`);
    };

    const generateSlug = () => {
        if (data.title) {
            const slug = data.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            setData('slug', slug);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${article.title}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <Link
                        href={`/articles/${article.id}`}
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Article
                    </Link>
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border bg-white dark:bg-gray-800">
                    <form onSubmit={handleSubmit} className="p-8">
                        <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
                            Edit Article
                        </h1>

                        <div className="space-y-6">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    onBlur={generateSlug}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                                {errors.title && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Slug
                                </label>
                                <input
                                    type="text"
                                    id="slug"
                                    value={data.slug}
                                    onChange={(e) => setData('slug', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                {errors.slug && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.slug}</p>
                                )}
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    URL-friendly version of the title
                                </p>
                            </div>

                            <div>
                                <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Excerpt
                                </label>
                                <textarea
                                    id="excerpt"
                                    rows={3}
                                    value={data.excerpt}
                                    onChange={(e) => setData('excerpt', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                {errors.excerpt && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.excerpt}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Content
                                </label>
                                <div className="mt-1">
                                    <QuillEditor
                                        value={data.content}
                                        onChange={(value) => setData('content', value)}
                                        placeholder="Write your article content..."
                                        error={errors.content}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Status
                                </label>
                                <select
                                    id="status"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value as 'draft' | 'published')}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                </select>
                                {errors.status && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.status}</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-end gap-4">
                            <Link
                                href={`/articles/${article.id}`}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                {processing ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
