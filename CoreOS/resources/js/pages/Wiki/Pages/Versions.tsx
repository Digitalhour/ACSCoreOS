import React, {useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {Head, Link, router} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {Clock, Eye, History, RotateCcw, User} from 'lucide-react';
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
    updated_at: string;
}

interface WikiPage {
    id: number;
    name: string;
    slug: string;
    status: string;
    version: number;
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

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedVersions {
    data: WikiPageVersion[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: PaginationLink[];
}

interface Props {
    book: WikiBook;
    chapter: WikiChapter;
    page: WikiPage;
    versions: PaginatedVersions;
}

export default function WikiPageVersions({ book, chapter, page, versions }: Props) {
    const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Wiki', href: '/wiki' },
        { title: book.name, href: `/wiki/books/${book.slug}` },
        { title: chapter.name, href: `/wiki/${book.slug}/${chapter.slug}` },
        { title: page.name, href: `/wiki/${book.slug}/${chapter.slug}/${page.slug}` },
        { title: 'Versions', href: `/wiki/${book.slug}/${chapter.slug}/${page.slug}/versions` }
    ];

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleRestore = (versionId: number, versionNumber: number) => {
        setRestoringVersion(versionId);
        router.post(`/wiki/${book.slug}/${chapter.slug}/${page.slug}/versions/${versionId}/restore`, {}, {
            onFinish: () => setRestoringVersion(null),
            onSuccess: () => {
                // Redirect handled by controller
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${page.name} - Version History`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <History className="h-8 w-8" />
                            Version History
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            {page.name}
                        </p>
                    </div>

                    <div className="text-right">
                        <div className="text-sm text-muted-foreground">Current Version</div>
                        <Badge variant="default" className="text-base px-3 py-1">
                            v{page.version}
                        </Badge>
                    </div>
                </div>

                {/* Versions Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Versions ({versions.total})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Change Summary</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {versions.data.map((version) => (
                                    <TableRow key={version.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={version.version_number === page.version ? "default" : "secondary"}
                                                >
                                                    v{version.version_number}
                                                </Badge>
                                                {version.version_number === page.version && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Current
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-md">
                                                {version.change_summary || (
                                                    <span className="text-muted-foreground italic">
                                                        No summary provided
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                {version.user.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                {formatDate(version.created_at)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link href={`/wiki/${book.slug}/${chapter.slug}/${page.slug}/versions/${version.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>

                                                {version.version_number !== versions.data[0]?.version_number && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link href={`/wiki/${book.slug}/${chapter.slug}/${page.slug}/versions/compare?from=${version.version_number}&to=${versions.data[0]?.version_number}`}>
                                                            Compare
                                                        </Link>
                                                    </Button>
                                                )}

                                                {version.version_number !== page.version && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={restoringVersion === version.id}
                                                            >
                                                                <RotateCcw className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Restore Version</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to restore to version {version.version_number}?
                                                                    This will create a new version with the content from version {version.version_number}.
                                                                    <br /><br />
                                                                    <strong>Change Summary:</strong> {version.change_summary || 'No summary provided'}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleRestore(version.id, version.version_number)}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    Restore Version
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {versions.last_page > 1 && (
                            <div className="flex items-center justify-between mt-6">
                                <div className="text-sm text-muted-foreground">
                                    Showing {((versions.current_page - 1) * versions.per_page) + 1} to{' '}
                                    {Math.min(versions.current_page * versions.per_page, versions.total)} of{' '}
                                    {versions.total} versions
                                </div>
                                <div className="flex items-center gap-2">
                                    {versions.links.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? "default" : "outline"}
                                            size="sm"
                                            disabled={!link.url}
                                            asChild={!!link.url}
                                        >
                                            {link.url ? (
                                                <Link href={link.url}>
                                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                                </Link>
                                            ) : (
                                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
