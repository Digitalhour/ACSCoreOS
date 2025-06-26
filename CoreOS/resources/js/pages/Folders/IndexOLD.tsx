import {useState} from 'react';
import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {
    Building2,
    Calendar,
    ChevronRight,
    Edit,
    Eye,
    File,
    Filter,
    Folder,
    Globe,
    Home,
    Plus,
    Search,
    Trash2,
    Upload,
    User,
    Users
} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {BreadcrumbItem} from "@/types";

interface FolderData {
    id: number;
    name: string;
    description?: string;
    parent_id?: number;
    assignment_type: string;
    children_count: number;
    documents_count: number;
    creator: string;
    tags: Array<{
        id: number;
        name: string;
        color: string;
    }>;
    created_at: string;
    assigned_entities: {
        type: string;
        entities: Array<{ id: number; name: string; }>;
    };
}

interface Breadcrumb {
    id: number;
    name: string;
}

interface CurrentFolder {
    id: number;
    name: string;
    full_path: string;
}

interface Tag {
    id: number;
    name: string;
    color: string;
    documents_count: number;
    folders_count: number;
}

interface Props {
    folders: FolderData[];
    breadcrumbs: Breadcrumb[];
    currentFolder?: CurrentFolder;
    tags: Tag[];
    filters: {
        parent_id?: number;
        search?: string;
        tag_ids?: string;
    };
}

const getAssignmentIcon = (type: string) => {
    switch (type) {
        case 'company_wide': return Globe;
        case 'department': return Building2;
        case 'user': return User;
        case 'hierarchy': return Users;
        default: return Globe;
    }
};

const getAssignmentLabel = (type: string) => {
    switch (type) {
        case 'company_wide': return 'Company Wide';
        case 'department': return 'Department';
        case 'user': return 'Specific Users';
        case 'hierarchy': return 'User Hierarchy';
        default: return 'Unknown';
    }
};

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export default function FoldersIndex({ folders, breadcrumbs, currentFolder, tags, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedTags, setSelectedTags] = useState(
        filters.tag_ids ? filters.tag_ids.split(',').map(Number) : []
    );

    // Build breadcrumbs for AppLayout
    const appBreadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Folders',
            href: route('folders.index'),
        },
        ...(currentFolder ? [
            {
                title: currentFolder.name,
                href: route('folders.index', { parent_id: currentFolder.id }),
            }
        ] : [])
    ];

    const handleSearch = () => {
        const params: any = {};
        if (searchTerm) params.search = searchTerm;
        if (filters.parent_id) params.parent_id = filters.parent_id;
        if (selectedTags.length > 0) params.tag_ids = selectedTags.join(',');

        router.get(route('folders.index'), params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedTags([]);
        const params: any = {};
        if (filters.parent_id) params.parent_id = filters.parent_id;
        router.get(route('folders.index'), params);
    };

    const toggleTag = (tagId: number) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const navigateToFolder = (folderId: number) => {
        router.get(route('folders.index', { parent_id: folderId }));
    };

    const navigateToBreadcrumb = (folderId?: number) => {
        if (folderId) {
            router.get(route('folders.index', { parent_id: folderId }));
        } else {
            router.get(route('folders.index'));
        }
    };

    return (
        <AppLayout breadcrumbs={appBreadcrumbs}>
            <Head title={currentFolder ? `Folder: ${currentFolder.name}` : "Folder Management"} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {currentFolder ? currentFolder.name : 'Folders'}
                        </h1>
                        <p className="text-muted-foreground">
                            {currentFolder
                                ? `Viewing contents of: ${currentFolder.full_path}`
                                : 'Organize your documents into folders and manage access'
                            }
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {/* Upload button - only show when inside a folder */}
                        {currentFolder && (
                            <Button asChild>
                                <Link href={route('documents.create', { folder_id: currentFolder.id })}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Documents
                                </Link>
                            </Button>
                        )}
                        {/* View Documents button */}
                        <Button variant="outline" asChild>
                            <Link href={route('documents.index', currentFolder ? { folder_id: currentFolder.id } : {})}>
                                <File className="mr-2 h-4 w-4" />
                                View Documents
                            </Link>
                        </Button>
                        {/* Create Folder button */}
                        <Button asChild>
                            <Link href={route('folders.create', { parent_id: filters.parent_id })}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Folder
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Breadcrumbs Navigation */}
                <Card>
                    <CardContent className="py-3">
                        <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1"
                                onClick={() => navigateToBreadcrumb()}
                            >
                                <Home className="h-4 w-4" />
                            </Button>
                            {breadcrumbs.map((breadcrumb, index) => (
                                <div key={breadcrumb.id} className="flex items-center">
                                    <ChevronRight className="h-4 w-4 mx-1" />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto p-1 font-medium"
                                        onClick={() => navigateToBreadcrumb(breadcrumb.id)}
                                    >
                                        {breadcrumb.name}
                                    </Button>
                                </div>
                            ))}
                        </nav>
                    </CardContent>
                </Card>

                {/* Quick Actions for Current Folder */}
                {currentFolder && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Folder className="h-4 w-4" />
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                <Button asChild>
                                    <Link href={route('documents.create', { folder_id: currentFolder.id })}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload Documents
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={route('folders.create', { parent_id: currentFolder.id })}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Subfolder
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={route('documents.index', { folder_id: currentFolder.id })}>
                                        <File className="mr-2 h-4 w-4" />
                                        View All Documents
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={route('folders.show', currentFolder.id)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Folder Details
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {/* Search */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search folders..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-end gap-2">
                                <Button onClick={handleSearch}>Apply</Button>
                                <Button variant="outline" onClick={clearFilters}>Clear</Button>
                            </div>
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <Badge
                                            key={tag.id}
                                            variant={selectedTags.includes(tag.id) ? "default" : "secondary"}
                                            className={cn(
                                                "cursor-pointer transition-colors",
                                                selectedTags.includes(tag.id) && "text-white"
                                            )}
                                            style={{
                                                backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined
                                            }}
                                            onClick={() => toggleTag(tag.id)}
                                        >
                                            {tag.name} ({tag.folders_count})
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Active Filters */}
                        {(searchTerm || selectedTags.length > 0) && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Active Filters</label>
                                <div className="flex flex-wrap gap-2">
                                    {searchTerm && (
                                        <Badge variant="outline">Search: {searchTerm}</Badge>
                                    )}
                                    {selectedTags.length > 0 && (
                                        <Badge variant="outline">
                                            {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Folders Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {folders.length} folder{folders.length !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {folders.map((folder) => {
                            const AssignmentIcon = getAssignmentIcon(folder.assignment_type);

                            return (
                                <Card key={folder.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="rounded-md bg-primary/10 p-2">
                                                    <Folder className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-lg line-clamp-1">
                                                        {folder.name}
                                                    </CardTitle>
                                                    {folder.description && (
                                                        <CardDescription className="text-sm line-clamp-2">
                                                            {folder.description}
                                                        </CardDescription>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {/* Stats */}
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Folder className="h-4 w-4 text-muted-foreground" />
                                                <span>{folder.children_count} folders</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <File className="h-4 w-4 text-muted-foreground" />
                                                <span>{folder.documents_count} documents</span>
                                            </div>
                                        </div>

                                        {/* Access Control */}
                                        <div className="flex items-center gap-2 text-sm">
                                            <AssignmentIcon className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">
                                                {getAssignmentLabel(folder.assignment_type)}
                                            </span>
                                            {folder.assigned_entities.entities.length > 0 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {folder.assigned_entities.entities.length}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Tags */}
                                        {folder.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {folder.tags.slice(0, 3).map((tag) => (
                                                    <Badge
                                                        key={tag.id}
                                                        variant="secondary"
                                                        className="text-xs"
                                                        style={{
                                                            backgroundColor: tag.color + '20',
                                                            color: tag.color
                                                        }}
                                                    >
                                                        {tag.name}
                                                    </Badge>
                                                ))}
                                                {folder.tags.length > 3 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        +{folder.tags.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        {/* Meta Info */}
                                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                <span className="line-clamp-1">{folder.creator}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{formatDate(folder.created_at)}</span>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => navigateToFolder(folder.id)}
                                            >
                                                <Eye className="mr-1 h-3 w-3" />
                                                Open
                                            </Button>
                                            <Button size="sm" variant="outline" asChild>
                                                <Link href={route('folders.edit', folder.id)}>
                                                    <Edit className="h-3 w-3" />
                                                </Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this folder?')) {
                                                        router.delete(route('folders.destroy', folder.id));
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {folders.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Folder className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">
                                    {currentFolder ? 'No subfolders found' : 'No folders found'}
                                </h3>
                                <p className="text-muted-foreground text-center mb-4">
                                    {filters.search || filters.tag_ids
                                        ? "Try adjusting your filters to see more results."
                                        : currentFolder
                                            ? `This folder doesn't contain any subfolders yet.`
                                            : "Get started by creating your first folder."}
                                </p>
                                <div className="flex gap-2">
                                    <Button asChild>
                                        <Link href={route('folders.create', { parent_id: filters.parent_id })}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create {currentFolder ? 'Sub' : ''}Folder
                                        </Link>
                                    </Button>
                                    {currentFolder && (
                                        <Button variant="outline" asChild>
                                            <Link href={route('documents.create', { folder_id: currentFolder.id })}>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Upload Documents
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
