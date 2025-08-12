import {useState} from 'react';
import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Separator} from '@/components/ui/separator';
import {
    Archive,
    Calendar,
    Download,
    Eye,
    File,
    FileSpreadsheet,
    FileText,
    Filter,
    Folder,
    Image,
    Plus,
    Search,
    User,
    Video
} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {BreadcrumbItem} from "@/types";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Documents',
        href: '/documents',
    },
];
interface Document {
    id: number;
    name: string;
    original_filename: string;
    description?: string;
    file_type: string;
    file_size: number;
    folder: {
        id: number;
        name: string;
        full_path: string;
    };
    uploader: {
        id: number;
        name: string;
    };
    tags: Array<{
        id: number;
        name: string;
        color: string;
    }>;
    download_count: number;
    created_at: string;
}

interface FolderOption {
    id: number;
    name: string;
    full_path: string;
    parent_id?: number;
}

interface Tag {
    id: number;
    name: string;
    color: string;
    documents_count: number;
    folders_count: number;
}

interface Props {
    documents: {
        data: Document[];
        links?: any[];
        meta?: any;
    };
    folders: FolderOption[];
    tags: Tag[];
    fileTypes: string[];
    filters: {
        folder_id?: number;
        search?: string;
        file_type?: string;
        tag_ids?: string;
    };
}

const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (['pdf', 'doc', 'docx', 'txt'].includes(type)) return FileText;
    if (['xls', 'xlsx', 'csv'].includes(type)) return FileSpreadsheet;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(type)) return Image;
    if (['mp4', 'avi', 'mov'].includes(type)) return Video;
    if (['zip', 'rar', '7z'].includes(type)) return Archive;
    return File;
};

const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export default function DocumentsIndex({ documents, folders, tags, fileTypes, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedFolder, setSelectedFolder] = useState(filters.folder_id?.toString() || 'all');
    const [selectedFileType, setSelectedFileType] = useState(filters.file_type || 'all');
    const [selectedTags, setSelectedTags] = useState(
        filters.tag_ids ? filters.tag_ids.split(',').map(Number) : []
    );

    // Ensure we have valid data arrays
    const safeFolders = Array.isArray(folders) ? folders.filter(f => f && f.id && String(f.id).trim()) : [];
    const safeFileTypes = Array.isArray(fileTypes) ? fileTypes.filter(t => t && String(t).trim()) : [];
    const safeTags = Array.isArray(tags) ? tags.filter(t => t && t.id && String(t.id).trim()) : [];

    const handleSearch = () => {
        const params: any = {};
        if (searchTerm) params.search = searchTerm;
        if (selectedFolder && selectedFolder !== 'all') params.folder_id = selectedFolder;
        if (selectedFileType && selectedFileType !== 'all') params.file_type = selectedFileType;
        if (selectedTags.length > 0) params.tag_ids = selectedTags.join(',');

        router.get(route('documents.index'), params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedFolder('all');
        setSelectedFileType('all');
        setSelectedTags([]);
        router.get(route('documents.index'));
    };

    const toggleTag = (tagId: number) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const selectedFolderName = selectedFolder && selectedFolder !== 'all'
        ? safeFolders.find(f => f.id.toString() === selectedFolder)?.full_path
        : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Document Management" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
                        <p className="text-muted-foreground">
                            Manage and organize your company documents
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild>
                            <Link href={route('folders.index')}>
                                <Folder className="mr-2 h-4 w-4" />
                                Manage Folders
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={route('documents.create')}>
                                <Plus className="mr-2 h-4 w-4" />
                                Upload Documents
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {/* Search */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search documents..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                            </div>

                            {/* Folder */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Folder</label>
                                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All folders" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All folders</SelectItem>
                                        {safeFolders.map((folder) => (
                                            <SelectItem key={folder.id} value={folder.id.toString()}>
                                                {folder.full_path}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* File Type */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">File Type</label>
                                <Select value={selectedFileType} onValueChange={setSelectedFileType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All types</SelectItem>
                                        {safeFileTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type.toUpperCase()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Actions */}
                            <div className="flex items-end gap-2">
                                <Button onClick={handleSearch}>Apply</Button>
                                <Button variant="outline" onClick={clearFilters}>Clear</Button>
                            </div>
                        </div>

                        {/* Tags */}
                        {safeTags.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {safeTags.map((tag) => (
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
                                            {tag.name} ({tag.documents_count})
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Active Filters */}
                        {(selectedFolderName || (selectedFileType && selectedFileType !== 'all') || selectedTags.length > 0 || searchTerm) && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Active Filters</label>
                                <div className="flex flex-wrap gap-2">
                                    {searchTerm && (
                                        <Badge variant="outline">Search: {searchTerm}</Badge>
                                    )}
                                    {selectedFolderName && (
                                        <Badge variant="outline">Folder: {selectedFolderName}</Badge>
                                    )}
                                    {selectedFileType && selectedFileType !== 'all' && (
                                        <Badge variant="outline">Type: {selectedFileType.toUpperCase()}</Badge>
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

                {/* Documents Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {documents?.meta?.total || documents?.data?.length || 0} document{(documents?.meta?.total || documents?.data?.length || 0) !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {(documents?.data || []).map((document) => {
                            const FileIcon = getFileIcon(document.file_type);

                            return (
                                <Card key={document.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-md bg-muted p-2">
                                                    <FileIcon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-base line-clamp-1">
                                                        {document.name}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">
                                                        {document.original_filename}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {/* Folder Path */}
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Folder className="h-3 w-3" />
                                            <span className="line-clamp-1">{document.folder.full_path}</span>
                                        </div>

                                        {/* Tags */}
                                        {document.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {document.tags.slice(0, 3).map((tag) => (
                                                    <Badge
                                                        key={tag.id}
                                                        variant="secondary"
                                                        className="text-xs"
                                                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                                                    >
                                                        {tag.name}
                                                    </Badge>
                                                ))}
                                                {document.tags.length > 3 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        +{document.tags.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        {/* Meta Info */}
                                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <File className="h-3 w-3" />
                                                <span>{formatFileSize(document.file_size)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Download className="h-3 w-3" />
                                                <span>{document.download_count}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                <span className="line-clamp-1">{document.uploader.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{formatDate(document.created_at)}</span>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" asChild className="flex-1">
                                                <Link href={route('documents.show', document.id)}>
                                                    <Eye className="mr-1 h-3 w-3" />
                                                    View
                                                </Link>
                                            </Button>
                                            <Button size="sm" asChild className="flex-1">
                                                <Link href={route('documents.download', document.id)}>
                                                    <Download className="mr-1 h-3 w-3" />
                                                    Download
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {(!documents?.data || documents.data.length === 0) && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <File className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                                <p className="text-muted-foreground text-center mb-4">
                                    {filters.search || filters.folder_id || filters.file_type || filters.tag_ids
                                        ? "Try adjusting your filters to see more results."
                                        : "Get started by uploading your first document."}
                                </p>
                                <Button asChild>
                                    <Link href={route('documents.create')}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Upload Document
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pagination */}
                    {documents?.meta?.last_page > 1 && (
                        <div className="flex justify-center">
                            <div className="flex gap-2">
                                {(documents?.links || []).map((link, index) => (
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
