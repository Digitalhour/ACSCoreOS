import {useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link, router} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Edit, Eye, MessageCircle, MoreHorizontal, Plus, Search, Trash2} from 'lucide-react';

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
    status: 'draft' | 'published' | 'archived';
    user: User;
    published_at: string | null;
    created_at: string;
    updated_at: string;
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
    // Laravel also sometimes puts pagination data at root level
    current_page?: number;
    last_page?: number;
    total?: number;
    per_page?: number;
}

interface Props {
    articles: PaginatedData;
    filters: {
        search?: string;
        status?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin',
        href: '/admin',
    },
    {
        title: 'Blog Management',
        href: '/admin/blog',
    },
];

export default function BlogManage({ articles, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/blog', { search, status: statusFilter === 'all' ? '' : statusFilter }, { preserveState: true });
    };

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        router.get('/admin/blog', {
            search,
            status: status === 'all' ? '' : status
        }, { preserveState: true });
    };

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
        router.get('/admin/blog', {}, { preserveState: true });
    };

    const handleDelete = (article: BlogArticle) => {
        if (confirm(`Are you sure you want to delete "${article.title}"?`)) {
            router.delete(`/blog/${article.slug}`);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published':
                return <Badge variant="default">Published</Badge>;
            case 'draft':
                return <Badge variant="secondary">Draft</Badge>;
            case 'archived':
                return <Badge variant="outline">Archived</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const ArticleActions = ({ article }: { article: BlogArticle }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <Link href={`/blog/${article.slug}`}>
                    <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                    </DropdownMenuItem>
                </Link>
                <Link href={`/blog/${article.slug}/edit`}>
                    <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => handleDelete(article)}
                    className="text-destructive"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Blog Management" />

            <div className="container px-4 py-4">
                {/* Header */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Blog Management</h1>
                            <p className="text-muted-foreground mt-2">
                                Manage all blog articles and content
                            </p>
                        </div>
                        <div className={'flex justify-end gap-4'}>

                        <Link href="/blog/create">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                New Article
                            </Button>
                        </Link>
                        <Link href="/admin/blog-templates">
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Article Templates
                                </Button>
                        </Link>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
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

                        <Select value={statusFilter} onValueChange={handleStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>

                        {(filters.search || filters.status) && (
                            <Button variant="outline" onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-card p-4 rounded-lg border">
                            <div className="text-2xl font-bold">{articles.meta?.total ?? articles.total ?? articles.data.length}</div>
                            <div className="text-sm text-muted-foreground">Total Articles</div>
                        </div>
                        <div className="bg-card p-4 rounded-lg border">
                            <div className="text-2xl font-bold text-green-600">
                                {articles.data.filter(a => a.status === 'published').length}
                            </div>
                            <div className="text-sm text-muted-foreground">Published</div>
                        </div>
                        <div className="bg-card p-4 rounded-lg border">
                            <div className="text-2xl font-bold text-yellow-600">
                                {articles.data.filter(a => a.status === 'draft').length}
                            </div>
                            <div className="text-sm text-muted-foreground">Drafts</div>
                        </div>
                        <div className="bg-card p-4 rounded-lg border">
                            <div className="text-2xl font-bold text-blue-600">
                                {articles.data.reduce((sum, a) => sum + a.approved_comments_count, 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Comments</div>
                        </div>
                    </div>
                </div>

                {/* Articles Table */}
                {articles.data.length > 0 ? (
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Article</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Published</TableHead>
                                    <TableHead>Comments</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead className="w-[70px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {articles.data.map((article) => (
                                    <TableRow key={article.id}>
                                        <TableCell>
                                            <div >
                                                <Link
                                                    href={`/blog/${article.slug}`}
                                                    className="font-medium hover:underline line-clamp-1"
                                                >
                                                    {article.title}
                                                </Link>
                                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1  ">
                                                    {article.excerpt}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={article.user.avatar} />
                                                    <AvatarFallback>
                                                        {article.user.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{article.user.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(article.status)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {formatDate(article.published_at)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <MessageCircle className="h-4 w-4" />
                                                {article.approved_comments_count}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-muted-foreground">
                                                {formatDate(article.updated_at)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <ArticleActions article={article} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-12 border rounded-lg">
                        <div className="text-muted-foreground">
                            {filters.search || filters.status ? (
                                <div>
                                    <h3 className="text-lg font-medium mb-2">No articles found</h3>
                                    <p>Try adjusting your filters or search terms.</p>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-lg font-medium mb-2">No articles yet</h3>
                                    <p>Create your first blog article to get started.</p>
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
