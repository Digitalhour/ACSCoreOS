import {useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link, router} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardFooter, CardHeader} from '@/components/ui/card';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Calendar, Clock, MessageCircle, Plus, Search} from 'lucide-react';
import {usePermission} from '@/hooks/usePermission';
import {BlogPermissionsEnum} from "@/types/permissions";

interface User {
    id: number;
    name: string;
    email: string;
    avatar: string;
}

interface BlogArticle {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    featured_image: string | null;
    status: 'draft' | 'published' | 'archived';
    user: User;
    published_at: string;
    created_at: string;
    reading_time: number;
    approved_comments_count: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedData {
    data: BlogArticle[];
    links?: PaginationLink[];
    meta?: {
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
    };
    current_page?: number;
    last_page?: number;
    total?: number;
    per_page?: number;
}

interface Props {
    articles: PaginatedData;
    filters: {
        search?: string;
        author?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'blog',
        href: '/blog',
    },
];

export default function BlogIndex({ articles, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const { hasPermission, hasRole, hasAnyRole } = usePermission();
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/blog', { search }, { preserveState: true });
    };

    const clearSearch = () => {
        setSearch('');
        router.get('/blog', {}, { preserveState: true });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Company Blog" />

            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Company Blog</h1>
                            <p className="text-muted-foreground mt-2">
                                Stay updated with the latest news and insights from our team
                            </p>
                        </div>

                        {hasPermission(BlogPermissionsEnum.Create) && (
                        <Link href="/blog/create">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                New Article
                            </Button>
                        </Link>
                            )}
                    </div>

                    {/* Search Bar */}
                    <div className="flex gap-4">
                        <form onSubmit={handleSearch} className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search articles..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </form>

                        {filters.search && (
                            <Button variant="outline" onClick={clearSearch}>
                                Clear Search
                            </Button>
                        )}
                    </div>
                </div>

                {/* Articles Grid */}
                {articles.data.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {articles.data.map((article) => (
                            <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                {article.featured_image && (
                                    <div className="aspect-video overflow-hidden">
                                        <img
                                            src={article.featured_image}
                                            alt={article.title}
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                )}

                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                        <Calendar className="h-4 w-4" />
                                        {formatDate(article.published_at)}
                                        <Clock className="h-4 w-4 ml-2" />
                                        {article.reading_time} min read
                                    </div>

                                    <Link href={`/blog/${article.slug}`}>
                                        <h3 className="text-xl font-semibold hover:text-primary transition-colors line-clamp-2">
                                            {article.title}
                                        </h3>
                                    </Link>
                                </CardHeader>

                                <CardContent className="pb-4">
                                    <p className="text-muted-foreground line-clamp-3 mb-4">
                                        {article.excerpt}
                                    </p>

                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={article.user.avatar} />
                                            <AvatarFallback>
                                                {article.user.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {article.user.name}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="pt-0">
                                    <div className="flex items-center justify-between w-full">
                                        <Link href={`/blog/${article.slug}`}>
                                            <Button variant="outline" size="sm">
                                                Read More
                                            </Button>
                                        </Link>

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <MessageCircle className="h-4 w-4" />
                                            {article.approved_comments_count}
                                        </div>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-muted-foreground">
                            {filters.search ? (
                                <div>
                                    <h3 className="text-lg font-medium mb-2">No articles found</h3>
                                    <p>Try adjusting your search terms or clear the search to see all articles.</p>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-lg font-medium mb-2">No articles yet</h3>
                                    <p>Be the first to share something with the team!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {(articles.meta?.last_page ?? articles.last_page ?? 1) > 1 && (
                    <div className="flex justify-center mt-8">
                        <div className="flex gap-2">
                            {articles.links?.map((link, index) => (
                                <div key={index}>
                                    {link.url ? (
                                        <Link
                                            href={link.url}
                                            preserveState
                                            className={`px-3 py-2 text-sm rounded-md transition-colors ${
                                                link.active
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-background border hover:bg-muted'
                                            }`}
                                        >
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        </Link>
                                    ) : (
                                        <span
                                            className="px-3 py-2 text-sm rounded-md text-muted-foreground"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )}
                                </div>
                            )) ?? null}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
