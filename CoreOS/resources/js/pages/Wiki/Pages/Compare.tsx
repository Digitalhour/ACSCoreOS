import React, {useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {Head, Link} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {ArrowLeft, ArrowLeftRight, Calendar, FileText, TrendingDown, TrendingUp, User} from 'lucide-react';
import {type BreadcrumbItem} from '@/types';

interface User {
    id: number;
    name: string;
    email: string;
}

interface WikiPageVersion {
    id: number;
    version_number: number;
    name: string;
    content: string;
    excerpt: string;
    change_summary: string;
    user: User;
    created_at: string;
    word_count: number;
}

interface WikiPage {
    id: number;
    name: string;
    slug: string;
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

interface ContentDiff {
    added: string[];
    removed: string[];
    word_count_diff: number;
}

interface Props {
    book: WikiBook;
    chapter: WikiChapter;
    page: WikiPage;
    fromVersion: WikiPageVersion;
    toVersion: WikiPageVersion;
    availableVersions: WikiPageVersion[];
    diff: ContentDiff;
}

export default function WikiPageCompare({
                                            book,
                                            chapter,
                                            page,
                                            fromVersion,
                                            toVersion,
                                            availableVersions,
                                            diff
                                        }: Props) {
    const [selectedFromVersion, setSelectedFromVersion] = useState(fromVersion.version_number.toString());
    const [selectedToVersion, setSelectedToVersion] = useState(toVersion.version_number.toString());

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Wiki', href: '/wiki' },
        { title: book.name, href: `/wiki/books/${book.slug}` },
        { title: chapter.name, href: `/wiki/${book.slug}/${chapter.slug}` },
        { title: page.name, href: `/wiki/${book.slug}/${chapter.slug}/${page.slug}` },
        { title: 'Versions', href: `/wiki/${book.slug}/${chapter.slug}/${page.slug}/versions` },
        { title: 'Compare', href: `/wiki/${book.slug}/${chapter.slug}/${page.slug}/versions/compare` }
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

    const handleVersionChange = () => {
        const newUrl = `/wiki/${book.slug}/${chapter.slug}/${page.slug}/versions/compare?from=${selectedFromVersion}&to=${selectedToVersion}`;
        window.location.href = newUrl;
    };

    const renderContentWithHighlights = (content: string, isFromVersion: boolean) => {
        let highlightedContent = content;

        if (isFromVersion) {
            // Highlight removed content in red
            diff.removed.forEach(removedLine => {
                if (removedLine.trim()) {
                    const regex = new RegExp(removedLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    highlightedContent = highlightedContent.replace(regex, `<mark class="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">${removedLine}</mark>`);
                }
            });
        } else {
            // Highlight added content in green
            diff.added.forEach(addedLine => {
                if (addedLine.trim()) {
                    const regex = new RegExp(addedLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    highlightedContent = highlightedContent.replace(regex, `<mark class="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">${addedLine}</mark>`);
                }
            });
        }

        return highlightedContent;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${page.name} - Compare Versions`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link
                                href={`/wiki/${book.slug}/${chapter.slug}/${page.slug}/versions`}
                                className="flex items-center text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back to Versions
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <ArrowLeftRight className="h-8 w-8" />
                            Compare Versions
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            {page.name}
                        </p>
                    </div>
                </div>

                {/* Version Selectors */}
                <Card>
                    <CardHeader>
                        <CardTitle>Select Versions to Compare</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-sm font-medium mb-2 block">From Version</label>
                                <Select value={selectedFromVersion} onValueChange={setSelectedFromVersion}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableVersions.map(version => (
                                            <SelectItem key={version.id} value={version.version_number.toString()}>
                                                v{version.version_number} - {formatDate(version.created_at)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <ArrowLeftRight className="h-4 w-4 text-muted-foreground mt-6" />

                            <div className="flex-1">
                                <label className="text-sm font-medium mb-2 block">To Version</label>
                                <Select value={selectedToVersion} onValueChange={setSelectedToVersion}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableVersions.map(version => (
                                            <SelectItem key={version.id} value={version.version_number.toString()}>
                                                v{version.version_number} - {formatDate(version.created_at)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleVersionChange}
                                disabled={selectedFromVersion === selectedToVersion}
                                className="mt-6"
                            >
                                Compare
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Comparison Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Comparison Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 border rounded-lg">
                                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <div className="text-2xl font-bold">{diff.added.length}</div>
                                <div className="text-sm text-green-600">Lines Added</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <div className="text-2xl font-bold">{diff.removed.length}</div>
                                <div className="text-sm text-red-600">Lines Removed</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                {diff.word_count_diff >= 0 ? (
                                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                                ) : (
                                    <TrendingDown className="h-8 w-8 mx-auto mb-2 text-red-600" />
                                )}
                                <div className="text-2xl font-bold">
                                    {diff.word_count_diff >= 0 ? '+' : ''}{diff.word_count_diff}
                                </div>
                                <div className="text-sm text-muted-foreground">Word Difference</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Side-by-side Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* From Version */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Badge variant="secondary">v{fromVersion.version_number}</Badge>
                                    From Version
                                </CardTitle>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    {fromVersion.user.name}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(fromVersion.created_at)}
                                </div>
                                {fromVersion.change_summary && (
                                    <div>
                                        <strong>Summary:</strong> {fromVersion.change_summary}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Title</h4>
                                    <p className="text-sm p-2 bg-muted rounded">{fromVersion.name}</p>
                                </div>
                                {fromVersion.excerpt && (
                                    <div>
                                        <h4 className="font-medium mb-2">Excerpt</h4>
                                        <p className="text-sm p-2 bg-muted rounded">{fromVersion.excerpt}</p>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-medium mb-2">Content</h4>
                                    <div
                                        className="prose prose-sm max-w-none p-4 border rounded-lg max-h-96 overflow-y-auto"
                                        dangerouslySetInnerHTML={{
                                            __html: renderContentWithHighlights(fromVersion.content, true)
                                        }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* To Version */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Badge variant="default">v{toVersion.version_number}</Badge>
                                    To Version
                                </CardTitle>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    {toVersion.user.name}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(toVersion.created_at)}
                                </div>
                                {toVersion.change_summary && (
                                    <div>
                                        <strong>Summary:</strong> {toVersion.change_summary}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Title</h4>
                                    <p className="text-sm p-2 bg-muted rounded">{toVersion.name}</p>
                                </div>
                                {toVersion.excerpt && (
                                    <div>
                                        <h4 className="font-medium mb-2">Excerpt</h4>
                                        <p className="text-sm p-2 bg-muted rounded">{toVersion.excerpt}</p>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-medium mb-2">Content</h4>
                                    <div
                                        className="prose prose-sm max-w-none p-4 border rounded-lg max-h-96 overflow-y-auto"
                                        dangerouslySetInnerHTML={{
                                            __html: renderContentWithHighlights(toVersion.content, false)
                                        }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Legend */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center gap-8 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 border border-red-300 rounded"></div>
                                <span>Removed content</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 border border-green-300 rounded"></div>
                                <span>Added content</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
