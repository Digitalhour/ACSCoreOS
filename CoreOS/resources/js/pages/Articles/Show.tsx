import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link, router} from '@inertiajs/react';
import {ArrowLeft, Edit, Trash2} from 'lucide-react';
import 'quill/dist/quill.snow.css';

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

interface Props {
    article: Article;
}

export default function ArticlesShow({ article }: Props) {
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
    ];

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this article?')) {
            router.delete(`/articles/${article.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={article.title} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <Link
                        href="/articles"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Articles
                    </Link>

                    <div className="flex items-center gap-2">
                        <Link
                            href={`/articles/${article.id}/edit`}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Edit className="h-4 w-4" />
                            Edit
                        </Link>
                        <button
                            onClick={handleDelete}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </button>
                    </div>
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border overflow-hidden rounded-xl border bg-white dark:bg-gray-800">
                    <div className="p-8">
                        <div className="mb-6">
                            <div className="mb-4 flex items-center gap-4">
                                <span
                                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                                        article.status === 'published'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                                    }`}
                                >
                                    {article.status}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Slug: {article.slug}
                                </span>
                            </div>

                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {article.title}
                            </h1>

                            {article.excerpt && (
                                <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                                    {article.excerpt}
                                </p>
                            )}
                        </div>

                        <div className="mb-6 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>By {article.user.name}</span>
                            <span>•</span>
                            <span>
                                Created {new Date(article.created_at).toLocaleDateString()}
                            </span>
                            {article.published_at && (
                                <>
                                    <span>•</span>
                                    <span>
                                        Published {new Date(article.published_at).toLocaleDateString()}
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                            <div
                                className="quill-content prose prose-gray max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-ul:list-disc prose-ol:list-decimal prose-li:list-item [&_ul]:list-disc [&_ol]:list-decimal [&_li]:list-item [&_ul]:ml-6 [&_ol]:ml-6 [&_li]:ml-0"
                                dangerouslySetInnerHTML={{ __html: article.content }}
                            />
                        </div>

                        <style >{`
                            .quill-content ul {
                                list-style-type: disc;
                                margin-left: 1.5rem;
                                padding-left: 0;
                            }
                            .quill-content ol {
                                list-style-type: decimal;
                                margin-left: 1.5rem;
                                padding-left: 0;
                            }
                            .quill-content li {
                                display: list-item;
                                margin-bottom: 0.5rem;
                            }
                            .quill-content ul ul {
                                list-style-type: circle;
                                margin-top: 0.5rem;
                            }
                            .quill-content ul ul ul {
                                list-style-type: square;
                            }
                        `}</style>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
