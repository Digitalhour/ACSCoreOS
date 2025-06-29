import {useState} from 'react';
import {Head, Link, router, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
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
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
            from: number | null;
            to: number | null;
        };
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
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTag, setEditingTag] = useState<TagData | null>(null);

    // Defensive checks for data structure
    const tagsData = tags?.data || [];
    const tagsMeta = tags?.meta || { total: 0, last_page: 1 };
    const tagsLinks = tags?.links || [];

    // Form for creating tags
    const createForm = useForm({
        name: '',
        color: '#3B82F6',
        description: '',
    });

    // Form for editing tags
    const editForm = useForm({
        name: '',
        color: '#3B82F6',
        description: '',
    });

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

    const handleCreateTag = (e: React.FormEvent) => {
        e.preventDefault();

        createForm.post(route('tags.store'), {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            },
        });
    };

    const handleEditTag = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingTag) return;

        editForm.put(route('tags.update', editingTag.id), {
            onSuccess: () => {
                setShowEditModal(false);
                setEditingTag(null);
                editForm.reset();
            },
        });
    };

    const openCreateModal = () => {
        createForm.reset();
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        createForm.reset();
    };

    const openEditModal = (tag: TagData) => {
        setEditingTag(tag);
        editForm.setData({
            name: tag.name,
            color: tag.color,
            description: tag.description || '',
        });
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingTag(null);
        editForm.reset();
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
                        <Button onClick={openCreateModal}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Tag
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
                            {tagsMeta.total} tag{tagsMeta.total !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tagsData.map((tag) => (
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
                                            <span>{tag.documents_count || 0} documents</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Folder className="h-4 w-4 text-muted-foreground" />
                                            <span>{tag.folders_count || 0} folders</span>
                                        </div>
                                    </div>

                                    {/* Total Usage */}
                                    <div className="text-center p-2 bg-muted rounded-lg">
                                        <div className="text-lg font-semibold">
                                            {(tag.documents_count || 0) + (tag.folders_count || 0)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Total Usage
                                        </div>
                                    </div>

                                    {/* Meta Info */}
                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span className="line-clamp-1">{tag.creator?.name || 'Unknown'}</span>
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
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditModal(tag)}
                                        >
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete(tag)}
                                            disabled={(tag.documents_count || 0) > 0 || (tag.folders_count || 0) > 0}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {/* Usage Warning */}
                                    {((tag.documents_count || 0) > 0 || (tag.folders_count || 0) > 0) && (
                                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                            <strong>Note:</strong> This tag is currently in use and cannot be deleted.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Empty State */}
                    {tagsData.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No tags found</h3>
                                <p className="text-muted-foreground text-center mb-4">
                                    {filters.search
                                        ? "Try adjusting your search to see more results."
                                        : "Get started by creating your first tag."}
                                </p>
                                <Button onClick={openCreateModal}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Tag
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pagination */}
                    {tagsMeta.last_page > 1 && (
                        <div className="flex justify-center">
                            <div className="flex gap-2">
                                {tagsLinks.map((link, index) => (
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

                {/* Create Tag Modal */}
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Tag className="h-5 w-5" />
                                Create New Tag
                            </DialogTitle>
                            <DialogDescription>
                                Create a new tag to organize your documents and folders.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateTag} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-name">Tag Name *</Label>
                                <Input
                                    id="create-name"
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    placeholder="Enter tag name..."
                                    className={createForm.errors.name ? 'border-red-500' : ''}
                                />
                                {createForm.errors.name && (
                                    <p className="text-sm text-red-500">{createForm.errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="create-color">Color *</Label>
                                <div className="flex gap-3 items-center">
                                    <Input
                                        id="create-color"
                                        type="color"
                                        value={createForm.data.color}
                                        onChange={(e) => createForm.setData('color', e.target.value)}
                                        className="w-20 h-10 p-1 border rounded cursor-pointer"
                                    />
                                    <Input
                                        value={createForm.data.color}
                                        onChange={(e) => createForm.setData('color', e.target.value)}
                                        placeholder="#3B82F6"
                                        className={`flex-1 ${createForm.errors.color ? 'border-red-500' : ''}`}
                                    />
                                    <div
                                        className="w-10 h-10 rounded border-2 border-gray-300"
                                        style={{ backgroundColor: createForm.data.color }}
                                    />
                                </div>
                                {createForm.errors.color && (
                                    <p className="text-sm text-red-500">{createForm.errors.color}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="create-description">Description</Label>
                                <Textarea
                                    id="create-description"
                                    value={createForm.data.description}
                                    onChange={(e) => createForm.setData('description', e.target.value)}
                                    placeholder="Optional description..."
                                    rows={3}
                                    className={createForm.errors.description ? 'border-red-500' : ''}
                                />
                                {createForm.errors.description && (
                                    <p className="text-sm text-red-500">{createForm.errors.description}</p>
                                )}
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeCreateModal}
                                    disabled={createForm.processing}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createForm.processing}>
                                    {createForm.processing ? 'Creating...' : 'Create Tag'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Tag Modal */}
                <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Edit className="h-5 w-5" />
                                Edit Tag
                            </DialogTitle>
                            <DialogDescription>
                                Update the tag information.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEditTag} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Tag Name *</Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    placeholder="Enter tag name..."
                                    className={editForm.errors.name ? 'border-red-500' : ''}
                                />
                                {editForm.errors.name && (
                                    <p className="text-sm text-red-500">{editForm.errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-color">Color *</Label>
                                <div className="flex gap-3 items-center">
                                    <Input
                                        id="edit-color"
                                        type="color"
                                        value={editForm.data.color}
                                        onChange={(e) => editForm.setData('color', e.target.value)}
                                        className="w-20 h-10 p-1 border rounded cursor-pointer"
                                    />
                                    <Input
                                        value={editForm.data.color}
                                        onChange={(e) => editForm.setData('color', e.target.value)}
                                        placeholder="#3B82F6"
                                        className={`flex-1 ${editForm.errors.color ? 'border-red-500' : ''}`}
                                    />
                                    <div
                                        className="w-10 h-10 rounded border-2 border-gray-300"
                                        style={{ backgroundColor: editForm.data.color }}
                                    />
                                </div>
                                {editForm.errors.color && (
                                    <p className="text-sm text-red-500">{editForm.errors.color}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                    placeholder="Optional description..."
                                    rows={3}
                                    className={editForm.errors.description ? 'border-red-500' : ''}
                                />
                                {editForm.errors.description && (
                                    <p className="text-sm text-red-500">{editForm.errors.description}</p>
                                )}
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeEditModal}
                                    disabled={editForm.processing}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    {editForm.processing ? 'Updating...' : 'Update Tag'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
