import React from 'react';
import {Head, Link, usePage} from '@inertiajs/react';
import {Plus, Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent} from '@/components/ui/card';
import Feed from '@/components/Feed';

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
}

interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    status: 'draft' | 'published';
    user: User;
    published_at?: string;
    created_at: string;
    updated_at: string;
    reactions_count?: number;
    comments_count?: number;
    reactions_summary?: any[];
    user_reaction?: any;
}

interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    data: Article[];
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

interface Props {
    articles: PaginationData;
}

export default function Index({ articles }: Props) {
    const { auth } = usePage().props as any;

    return (
        <>
            <Head title="Articles" />

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Articles</h1>
                        <p className="text-muted-foreground">
                            Discover and share knowledge with your community
                        </p>
                    </div>

                    {auth.user && (
                        <Button asChild>
                            <Link href="/articles/create" className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Write Article
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Search and filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search articles..."
                                    className="pl-10"
                                />
                            </div>
                            <Button variant="outline">
                                Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Feed */}
                <Feed articles={articles.data} />

                {/* Pagination */}
                {articles.last_page > 1 && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                    Showing {((articles.current_page - 1) * articles.per_page) + 1} to{' '}
                                    {Math.min(articles.current_page * articles.per_page, articles.total)} of{' '}
                                    {articles.total} articles
                                </div>

                                <div className="flex items-center gap-2">
                                    {articles.links.map((link, index) => {
                                        if (!link.url) {
                                            return (
                                                <Button
                                                    key={index}
                                                    variant="outline"
                                                    size="sm"
                                                    disabled
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            );
                                        }

                                        return (
                                            <Button
                                                key={index}
                                                variant={link.active ? "default" : "outline"}
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={link.url}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
