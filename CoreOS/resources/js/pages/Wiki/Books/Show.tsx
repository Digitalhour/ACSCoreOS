import React from 'react';
import AppLayout from '@/layouts/app-layout';
import {Head, Link} from '@inertiajs/react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Book, Calendar, Edit, FileText, Plus, User} from 'lucide-react';
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
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={book.name} />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h1 className="text-3xl font-bold">{book.name}</h1>
                            <Badge variant={book.status === 'published' ? 'default' : 'secondary'}>
                                {book.status}
                            </Badge>
                        </div>
                        {book.description && (
                            <p className="text-muted-foreground text-lg">{book.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {book.user.name}
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(book.published_at || book.created_at)}
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

                {/* Cover Image */}
                {book.cover_image_url && (
                    <div className="w-full max-w-md mx-auto">
                        <img
                            src={book.cover_image_url}
                            alt={book.name}
                            className="w-full h-auto rounded-lg shadow-md"
                        />
                    </div>
                )}

                {/* Chapters */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Chapters</h2>

                    {book.chapters.length === 0 ? (
                        <div className="text-center py-12">
                            <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No chapters yet</h3>
                            <p className="text-muted-foreground mb-4">
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
                        <div className="space-y-4">
                            {book.chapters.map((chapter: WikiChapter) => (
                                <Card key={chapter.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-xl">
                                                    <Link
                                                        href={`/wiki/${book.slug}/${chapter.slug}`}
                                                        className="hover:text-primary"
                                                    >
                                                        {chapter.name}
                                                    </Link>
                                                </CardTitle>
                                                {chapter.description && (
                                                    <p className="text-muted-foreground mt-1">
                                                        {chapter.description}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge variant={chapter.status === 'published' ? 'default' : 'secondary'}>
                                                {chapter.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {chapter.pages.length > 0 ? (
                                            <div className="space-y-2">
                                                <h4 className="font-medium text-sm text-muted-foreground mb-3">
                                                    {chapter.pages.length} pages
                                                </h4>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {chapter.pages.slice(0, 4).map((page: WikiPage) => (
                                                        <Link
                                                            key={page.id}
                                                            href={`/wiki/${book.slug}/${chapter.slug}/${page.slug}`}
                                                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-sm"
                                                        >
                                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                                            <span className="truncate">{page.name}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                                {chapter.pages.length > 4 && (
                                                    <p className="text-sm text-muted-foreground">
                                                        +{chapter.pages.length - 4} more pages
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-muted-foreground">
                                                <p className="text-sm">No pages yet</p>
                                                <Link
                                                    href={`/wiki/${book.slug}/${chapter.slug}/pages/create`}
                                                    className="text-primary hover:underline text-sm"
                                                >
                                                    Create first page
                                                </Link>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
