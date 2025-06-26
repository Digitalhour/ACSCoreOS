import {useState} from 'react';
import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {Calendar, Edit, Eye, File, Folder, Plus, Search, Tag, Trash2, User} from 'lucide-react';

interface TagData {
    id: number;
    name: string;
    color: string;
    description?: string;
    creator: {
        id: number;
        name: string;
    };
    documents_count: number;
    folders_count: number;
    created_at: string;
}

interface Props {
    tags: {
        data: TagData[];
        links: any[];
        meta: any;
    };
    filters: {
        search?: string;
    };
}

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export default function TagsIndex({ tags, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleSearch = () => {
        const params: any = {};
        if (searchTerm) params.search = searchTerm;

        router.get(route('tags.index'), params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        router.get(route('tags.index'));
    };

    const handleDelete = (tag: TagData) => {
        if (tag.documents_count > 0 || tag.folders_count > 0) {
            alert('Cannot delete tag that is currently in use by documents or folders.');
            return;
        }

        if (confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
            router.delete(route('tags.destroy', tag.id));
        }
    };

    return (
        <AppLayout>
            <Head title="Tags Management" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
                        <p className="text-muted-foreground">
                            Manage tags for organizing documents and folders
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild>
                            <Link href={route('tags.create')}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Tag
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            Search Tags
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search tags by name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                            </div>
                            <Button onClick={handleSearch}>Search</Button>
                            <Button variant="outline" onClick={clearFilters}>Clear</Button>
                        </div>

                        {searchTerm && (
                            <div className="mt-3">
                                <Badge variant="outline">Search: {searchTerm}</Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tags List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {tags.meta.total} tag{tags.meta.total !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tags.data.map((tag) => (
                            <Card key={tag.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div
                                                className="rounded-full w-4 h-4 border-2 border-white shadow-sm"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-lg line-clamp-1">
                                                    {tag.name}
                                                </CardTitle>
                                                {tag.description && (
                                                    <CardDescription className="text-sm line-clamp-2">
                                                        {tag.description}
                                                    </CardDescription>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Usage Stats */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <File className="h-4 w-4 text-muted-foreground" />
                                            <span>{tag.documents_count} documents</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Folder className="h-4 w-4 text-muted-foreground" />
                                            <span>{tag.folders_count} folders</span>
                                        </div>
                                    </div>

                                    {/* Total Usage */}
                                    <div className="text-center p-2 bg-muted rounded-lg">
                                        <div className="text-lg font-semibold">
                                            {tag.documents_count + tag.folders_count}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Total Usage
                                        </div>
                                    </div>

                                    {/* Meta Info */}
                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span className="line-clamp-1">{tag.creator.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>{formatDate(tag.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Color Preview */}
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-muted-foreground">Color:</span>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-4 h-4 rounded border"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <code className="text-xs px-1 py-0.5 bg-muted rounded">
                                                {tag.color}
                                            </code>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" asChild className="flex-1">
                                            <Link href={route('tags.show', tag.id)}>
                                                <Eye className="mr-1 h-3 w-3" />
                                                View
                                            </Link>
                                        </Button>
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href={route('tags.edit', tag.id)}>
                                                <Edit className="h-3 w-3" />
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete(tag)}
                                            disabled={tag.documents_count > 0 || tag.folders_count > 0}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {/* Usage Warning */}
                                    {(tag.documents_count > 0 || tag.folders_count > 0) && (
                                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                            <strong>Note:</strong> This tag is currently in use and cannot be deleted.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Empty State */}
                    {tags.data.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No tags found</h3>
                                <p className="text-muted-foreground text-center mb-4">
                                    {filters.search
                                        ? "Try adjusting your search to see more results."
                                        : "Get started by creating your first tag."}
                                </p>
                                <Button asChild>
                                    <Link href={route('tags.create')}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Tag
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pagination */}
                    {tags.meta.last_page > 1 && (
                        <div className="flex justify-center">
                            <div className="flex gap-2">
                                {tags.links.map((link, index) => (
                                    <Button
                                        key={index}
                                        variant={link.active ? "default" : "outline"}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
