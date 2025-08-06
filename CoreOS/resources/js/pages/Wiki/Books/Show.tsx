import React from 'react';
import AppLayout from '@/layouts/app-layout';
import {Head, Link} from '@inertiajs/react';
import {Badge} from '@/components/ui/badge';
import {Book, Calendar, CircleSmall, Edit, FileText, Plus, User} from 'lucide-react';
import {type BreadcrumbItem} from '@/types';

interface User {
    id: number;
    name: string;
    email: string;
}

interface WikiPage {
    id: number;
    name: string;
    slug: string;
    excerpt: string;
    status: string;
    sort_order: number;
    view_count: number;
    created_at: string;
}

interface WikiChapter {
    id: number;
    name: string;
    slug: string;
    description: string;
    status: string;
    sort_order: number;
    pages: WikiPage[];
    created_at: string;
}

interface WikiBook {
    id: number;
    name: string;
    slug: string;
    description: string;
    cover_image_url: string | null;
    status: string;
    user: User;
    chapters: WikiChapter[];
    published_at: string;
    created_at: string;
}

interface Props {
    book: WikiBook;
}

export default function WikiBookShow({ book }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Wiki', href: '/wiki' },
        { title: book.name, href: `/wiki/books/${book.slug}` }
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Get published pages for a chapter
    const getPublishedPages = (pages: WikiPage[]) => {
        return pages.filter(page => page.status === 'published');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={book.name} />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <Book className="h-8 w-8 text-primary" />
                            <h1 className="text-3xl font-bold tracking-tight">{book.name}</h1>
                            <Badge variant={book.status === 'published' ? 'default' : 'secondary'}>
                                {book.status}
                            </Badge>
                        </div>
                        {book.description && (
                            <p className="text-muted-foreground text-lg mb-4">{book.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {book.user.name}
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(book.published_at || book.created_at)}
                            </div>
                            <div className="flex items-center gap-1">
                                <Book className="h-4 w-4" />
                                {book.chapters.length} chapters
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`/wiki/books/${book.slug}/edit`}
                            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Book
                        </Link>
                        <Link
                            href={`/wiki/${book.slug}/chapters/create`}
                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Chapter
                        </Link>
                    </div>
                </div>

                {/* Chapters Grid */}
                {book.chapters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Book className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">No chapters yet</h3>
                        <p className="text-muted-foreground mt-2 mb-4">
                            Create your first chapter to start organizing content.
                        </p>
                        <Link
                            href={`/wiki/${book.slug}/chapters/create`}
                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create First Chapter
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {book.chapters.map((chapter: WikiChapter) => {
                            const publishedPages = getPublishedPages(chapter.pages);

                            return (
                                <div key={chapter.id} className="group hover:shadow-lg transition-shadow duration-200 border rounded-md p-4 flex flex-col h-full">
                                    <div className="pb-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                            <div className="text-lg font-semibold">
                                                <Link
                                                    href={`/wiki/${book.slug}/${chapter.slug}`}
                                                    className="hover:text-primary transition-colors"
                                                >
                                                    {chapter.name}
                                                </Link>
                                            </div>
                                            <Badge variant={chapter.status === 'published' ? 'default' : 'secondary'} className="ml-auto">
                                                {chapter.status}
                                            </Badge>
                                        </div>
                                        {chapter.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {chapter.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="pt-0 flex-1">
                                        {/* Pages List */}
                                        {publishedPages.length > 0 ? (
                                            <div className="space-y-1">
                                                {publishedPages.slice(0, 6).map((page: WikiPage) => (
                                                    <Link
                                                        key={page.id}
                                                        href={`/wiki/${book.slug}/${chapter.slug}/${page.slug}`}
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 rounded-md transition-colors group"
                                                    >
                                                        <CircleSmall className={"h-3 w-3"} />
                                                        <span className="flex-1 truncate">{page.name}</span>
                                                    </Link>
                                                ))}
                                                {publishedPages.length > 6 && (
                                                    <Link
                                                        href={`/wiki/${book.slug}/${chapter.slug}`}
                                                        className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-md transition-colors border-t"
                                                    >
                                                        see all pages ({publishedPages.length})
                                                    </Link>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Link
                                                    href={`/wiki/${book.slug}/${chapter.slug}/pages/create`}
                                                    className="text-primary hover:underline text-sm"
                                                >
                                                    No pages yet
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer - Always at bottom */}
                                    <div className="pt-4 border-t mt-auto">
                                        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <FileText className="h-4 w-4" />
                                                {chapter.pages.length} pages
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                {formatDate(chapter.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Quick Actions */}
                {/*<div className="flex justify-center pt-6 border-t">*/}
                {/*    <Link*/}
                {/*        href={`/wiki/${book.slug}/chapters/create`}*/}
                {/*        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"*/}
                {/*    >*/}
                {/*        <Plus className="mr-2 h-4 w-4" />*/}
                {/*        Add New Chapter*/}
                {/*    </Link>*/}
                {/*</div>*/}
            </div>
        </AppLayout>
    );
}
