import React from 'react';
import AppLayout from '@/layouts/app-layout';
import {Head, Link} from '@inertiajs/react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Calendar, Edit, Eye, FileText, Plus, User} from 'lucide-react';
import {type BreadcrumbItem} from '@/types';
import {usePermission} from "@/hooks/usePermission";
import {WikiPermissionsEnum} from "@/types/permissions";

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
    view_count: number;
    sort_order: number;
    created_at: string;
}

interface WikiChapter {
    id: number;
    name: string;
    slug: string;
    description: string;
    status: string;
    user: User;
    pages: WikiPage[];
    created_at: string;
}

interface WikiBook {
    id: number;
    name: string;
    slug: string;
}

interface Props {
    book: WikiBook;
    chapter: WikiChapter;
}

export default function WikiChapterShow({ book, chapter }: Props) {
    const { hasPermission, hasRole, hasAnyRole } = usePermission();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Wiki', href: '/wiki' },
        { title: book.name, href: `/wiki/books/${book.slug}` },
        { title: chapter.name, href: `/wiki/${book.slug}/${chapter.slug}` }
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={chapter.name} />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h1 className="text-3xl font-bold">{chapter.name}</h1>
                            <Badge variant={chapter.status === 'published' ? 'default' : 'secondary'}>
                                {chapter.status}
                            </Badge>
                        </div>
                        {chapter.description && (
                            <p className="text-muted-foreground text-lg">{chapter.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {chapter.user.name}
                            </div>
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
                    {hasPermission('wiki-create') && (
                    <div className="flex gap-2">
                        <Link
                            href={`/wiki/${book.slug}/${chapter.slug}/edit`}
                            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Chapter
                        </Link>
                        <Link
                            href={`/wiki/${book.slug}/${chapter.slug}/pages/create`}
                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Page
                        </Link>
                    </div>
                        )}
                </div>

                {/* Pages Section */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Pages</h2>

                    {chapter.pages.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No pages yet</h3>
                            {hasPermission(WikiPermissionsEnum.Create) && (
                                <>
                            <p className="text-muted-foreground mb-4">
                                Create your first page to start adding content to this chapter.
                            </p>
                            <Link
                                href={`/wiki/${book.slug}/${chapter.slug}/pages/create`}
                                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create First Page
                            </Link>
                                </>
                        )}
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {chapter.pages.map((page: WikiPage) => (
                                <Card key={page.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-lg">
                                                <Link
                                                    href={`/wiki/${book.slug}/${chapter.slug}/${page.slug}`}
                                                    className="hover:text-primary line-clamp-2"
                                                >
                                                    {page.name}
                                                </Link>
                                            </CardTitle>
                                            <Badge
                                                variant={page.status === 'published' ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {page.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {page.excerpt && (
                                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                                {page.excerpt}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Eye className="h-3 w-3" />
                                                {page.view_count}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(page.created_at)}
                                            </div>
                                        </div>
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
