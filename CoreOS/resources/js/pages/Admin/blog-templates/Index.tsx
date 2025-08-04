import {useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link, router} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {Edit, Eye, Image, MoreHorizontal, Plus, Search, Trash2} from 'lucide-react';

interface BlogTemplate {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    category: string;
    featured_image: string | null;
    preview_url: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedData {
    data: BlogTemplate[];
    links?: PaginationLink[];
    meta?: {
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
    };
}

interface Props {
    templates: PaginatedData;
    categories: string[];
    filters: {
        search?: string;
        category?: string;
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
    {
        title: 'Blog Templates',
        href: '/admin/blog-templates',
    },
];

export default function BlogTemplatesIndex({ templates, categories, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [categoryFilter, setCategoryFilter] = useState(filters.category || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/blog-templates', {
            search,
            category: categoryFilter === 'all' ? '' : categoryFilter,
            status: statusFilter === 'all' ? '' : statusFilter
        }, { preserveState: true });
    };

    const handleCategoryFilter = (category: string) => {
        setCategoryFilter(category);
        router.get('/admin/blog-templates', {
            search,
            category: category === 'all' ? '' : category,
            status: statusFilter === 'all' ? '' : statusFilter
        }, { preserveState: true });
    };

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        router.get('/admin/blog-templates', {
            search,
            category: categoryFilter === 'all' ? '' : categoryFilter,
            status: status === 'all' ? '' : status
        }, { preserveState: true });
    };

    const clearFilters = () => {
        setSearch('');
        setCategoryFilter('all');
        setStatusFilter('all');
        router.get('/admin/blog-templates', {}, { preserveState: true });
    };

    const handleDelete = (template: BlogTemplate) => {
        if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
            router.delete(`/admin/blog-templates/${template.slug}`);
        }
    };

    const toggleStatus = (template: BlogTemplate) => {
        router.put(`/admin/blog-templates/${template.slug}`, {
            ...template,
            is_active: !template.is_active
        }, { preserveState: true });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (isActive: boolean) => {
        return isActive ?
            <Badge variant="default">Active</Badge> :
            <Badge variant="secondary">Inactive</Badge>;
    };

    const getCategoryBadge = (category: string) => {
        const colors = {
            newsletter: 'bg-blue-100 text-blue-800',
            brief: 'bg-green-100 text-green-800',
            article: 'bg-purple-100 text-purple-800',
            general: 'bg-gray-100 text-gray-800'
        };

        return (
            <Badge variant="outline" className={colors[category as keyof typeof colors] || colors.general}>
                {category}
            </Badge>
        );
    };

    const TemplateActions = ({ template }: { template: BlogTemplate }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <Link href={`/admin/blog-templates/${template.slug}`}>
                    <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                    </DropdownMenuItem>
                </Link>
                <Link href={`/admin/blog-templates/${template.slug}/edit`}>
                    <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={() => toggleStatus(template)}>
                    {template.is_active ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => handleDelete(template)}
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
            <Head title="Blog Templates" />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Blog Templates</h1>
                            <p className="text-muted-foreground mt-2">
                                Manage blog article templates and layouts
                            </p>
                        </div>

                        <Link href="/admin/blog-templates/create">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                New Template
                            </Button>
                        </Link>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <form onSubmit={handleSearch} className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search templates..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </form>

                        <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category.charAt(0).toUpperCase() + category.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={handleStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        {(filters.search || filters.category || filters.status) && (
                            <Button variant="outline" onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-card p-4 rounded-lg border">
                            <div className="text-2xl font-bold">{templates.meta?.total ?? templates.data.length}</div>
                            <div className="text-sm text-muted-foreground">Total Templates</div>
                        </div>
                        <div className="bg-card p-4 rounded-lg border">
                            <div className="text-2xl font-bold text-green-600">
                                {templates.data.filter(t => t.is_active).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Active</div>
                        </div>
                        <div className="bg-card p-4 rounded-lg border">
                            <div className="text-2xl font-bold text-gray-600">
                                {templates.data.filter(t => !t.is_active).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Inactive</div>
                        </div>
                        <div className="bg-card p-4 rounded-lg border">
                            <div className="text-2xl font-bold text-blue-600">
                                {categories.length}
                            </div>
                            <div className="text-sm text-muted-foreground">Categories</div>
                        </div>
                    </div>
                </div>

                {/* Templates Table */}
                {templates.data.length > 0 ? (
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Template</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Sort Order</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead className="w-[70px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.data.map((template) => (
                                    <TableRow key={template.id}>
                                        <TableCell>
                                            <div className="flex items-start gap-3">
                                                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                                    {template.preview_url ? (
                                                        <img
                                                            src={template.preview_url}
                                                            alt={template.name}
                                                            className="w-full h-full object-cover rounded"
                                                        />
                                                    ) : (
                                                        <Image className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div>
                                                    <Link
                                                        href={`/admin/blog-templates/${template.slug}`}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {template.name}
                                                    </Link>
                                                    {template.description && (
                                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                            {template.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getCategoryBadge(template.category)}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(template.is_active)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{template.sort_order}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-muted-foreground">
                                                {formatDate(template.updated_at)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <TemplateActions template={template} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-12 border rounded-lg">
                        <div className="text-muted-foreground">
                            {filters.search || filters.category || filters.status ? (
                                <div>
                                    <h3 className="text-lg font-medium mb-2">No templates found</h3>
                                    <p>Try adjusting your filters or search terms.</p>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-lg font-medium mb-2">No templates yet</h3>
                                    <p>Create your first blog template to get started.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {(templates.meta?.last_page ?? 1) > 1 && (
                    <div className="flex justify-center mt-8">
                        <div className="flex gap-2">
                            {templates.links?.map((link, index) => (
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
