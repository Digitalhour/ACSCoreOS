import React, {useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {Head, Link} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Edit, History, Paperclip, User} from 'lucide-react';
import {type BreadcrumbItem} from '@/types';

interface User {
    id: number;
    name: string;
    email: string;
}

interface WikiPageVersion {
    id: number;
    version_number: number;
    change_summary: string;
    user: User;
    created_at: string;
}

interface WikiAttachment {
    id: number;
    name: string;
    original_name: string;
    file_size_formatted: string;
    mime_type: string;
    is_image: boolean;
    download_count: number;
    user: User;
    created_at: string;
}

interface WikiPage {
    id: number;
    name: string;
    slug: string;
    content: string;
    excerpt: string;
    featured_image_url: string | null;
    status: string;
    user: User;
    reading_time: number;
    view_count: number;
    version: number;
    published_at: string;
    created_at: string;
    versions: WikiPageVersion[];
    attachments: WikiAttachment[];
}

interface WikiChapter {
    id: number;
    name: string;
    slug: string;
}

interface WikiBook {
    id: number;
    name: string;
    slug: string;
}

interface Props {
    book: WikiBook;
    chapter: WikiChapter;
    page: WikiPage;
}

export default function WikiPageShow({ book, chapter, page }: Props) {
    const [attachments, setAttachments] = useState<WikiAttachment[]>(page.attachments || []);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Wiki', href: '/wiki' },
        { title: book.name, href: `/wiki/books/${book.slug}` },
        { title: chapter.name, href: `/wiki/${book.slug}/${chapter.slug}` },
        { title: page.name, href: `/wiki/${book.slug}/${chapter.slug}/${page.slug}` }
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={page.name} />
            <div className="flex flex-1 flex-col gap-6 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">{page.name}</h1>

                    </div>
                    <div className="flex gap-2">
                        <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                            {page.status}
                        </Badge>
                        <Link
                            href={`/wiki/${book.slug}/${chapter.slug}/${page.slug}/versions`}
                            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            <History className="mr-2 h-4 w-4" />
                            History
                        </Link>
                        <Link
                            href={`/wiki/${book.slug}/${chapter.slug}/${page.slug}/edit`}
                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Page
                        </Link>
                    </div>
                </div>

                {/* Featured Image */}
                {page.featured_image_url && (
                    <div className="w-full max-w-xl mx-auto">
                        <img
                            src={page.featured_image_url}
                            alt={page.name}
                            className="w-full h-auto rounded-lg shadow-md"
                        />
                    </div>
                )}

                {/* Main Content */}
                <Tabs defaultValue="content" className="w-full">
                    <TabsList>
                        <TabsTrigger value="content">Content</TabsTrigger>
                        {attachments.length > 0 && (
                            <TabsTrigger value="attachments">
                                <Paperclip className="mr-1 h-4 w-4" />
                                Attachments ({attachments.length})
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="content">
                        <Card>
                            <CardContent className="prose prose-slate dark:prose-invert max-w-none p-6">
                                <div dangerouslySetInnerHTML={{ __html: page.content }} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {attachments.length > 0 && (
                        <TabsContent value="attachments">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Attachments</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {attachments.map((attachment: WikiAttachment) => (
                                        <div
                                            key={attachment.id}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Paperclip className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium">{attachment.original_name}</p>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span>{attachment.file_size_formatted}</span>
                                                        <span>•</span>
                                                        <span>{attachment.download_count} downloads</span>
                                                        <span>•</span>
                                                        <span>{formatDate(attachment.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => window.open(`/wiki/attachments/${attachment.id}/download`, '_blank')}
                                            >
                                                Download
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>

                {/* Footer with version info */}
                <Separator />

                <div className="text-sm text-muted-foreground text-center">

                    Version {page.version} • Last updated {formatDate(page.created_at)} by {page.user.name}
                </div>
            </div>
        </AppLayout>
    );
}
