import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link, router} from '@inertiajs/react';
import {Edit, Eye, Plus, Trash2} from 'lucide-react';

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

interface PaginatedArticles {
    data: Article[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

interface Props {
    articles: PaginatedArticles;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Articles',
        href: '/articles',
    },
];

export default function ArticlesIndex({ articles }: Props) {
    const handleDelete = (article: Article) => {
        if (confirm('Are you sure you want to delete this article?')) {
            router.delete(`/articles/${article.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Articles" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Articles</h1>
                    <Link
                        href="/articles/create"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        New Article
                    </Link>
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border bg-white dark:bg-gray-800">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Title
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Author
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Published
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Actions
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                            {articles.data.map((article) => (
                                <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {article.title}
                                            </div>
                                            {article.excerpt && (
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {article.excerpt.substring(0, 60)}...
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                                    article.status === 'published'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                                                }`}
                                            >
                                                {article.status}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                        {article.user.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {article.published_at
                                            ? new Date(article.published_at).toLocaleDateString()
                                            : 'Not published'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/articles/${article.id}`}
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={`/articles/${article.id}/edit`}
                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(article)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {articles.data.length === 0 && (
                        <div className="py-12 text-center">
                            <p className="text-gray-500 dark:text-gray-400">No articles found.</p>
                        </div>
                    )}
                </div>

                {articles.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            Showing {((articles.current_page - 1) * articles.per_page) + 1} to{' '}
                            {Math.min(articles.current_page * articles.per_page, articles.total)} of{' '}
                            {articles.total} results
                        </div>
                        <div className="flex items-center gap-2">
                            {articles.links.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.url || '#'}
                                    className={`rounded px-3 py-1 text-sm ${
                                        link.active
                                            ? 'bg-blue-600 text-white'
                                            : link.url
                                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                                : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
