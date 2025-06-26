import React, {useState} from 'react';
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {
    Archive,
    Clock,
    Code,
    Download,
    Eye,
    File,
    FileAudio,
    FileSpreadsheet,
    FileText,
    FileVideo,
    Folder,
    Image,
    Presentation,
    Search
} from 'lucide-react';
import {cn, formatDistanceToNow} from '@/lib/utils';

interface FolderData {
    id: number;
    name: string;
    description?: string;
    children_count: number;
    documents_count: number;
    creator: string;
    tags: Array<{
        id: number;
        name: string;
        color: string;
    }>;
    created_at: string;
}

interface DocumentData {
    id: number;
    name: string;
    original_filename: string;
    description?: string;
    file_type: string;
    file_size: string;
    uploader: string;
    tags: Array<{
        id: number;
        name: string;
        color: string;
    }>;
    created_at: string;
    download_count: number;
    download_url: string;
    view_url: string;
}

interface BreadcrumbData {
    id: number;
    name: string;
}

interface CurrentFolder {
    id: number;
    name: string;
    description?: string;
    full_path: string;
    creator: string;
    created_at: string;
    tags: Array<{
        id: number;
        name: string;
        color: string;
    }>;
}

interface Props {
    folders: FolderData[];
    documents: DocumentData[];
    breadcrumbs: BreadcrumbData[];
    currentFolder?: CurrentFolder;
    filters: {
        parent_id?: number;
        search?: string;
    };
}

export default function EmployeeIndex({ folders, documents, breadcrumbs, currentFolder, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    // Build breadcrumbs for AppLayout
    const appBreadcrumbs: BreadcrumbItem[] = [
        {
            title: 'My Documents',
            href: route('employee.folders.index'),
        },
        ...breadcrumbs.map((breadcrumb) => ({
            title: breadcrumb.name,
            href: route('employee.folders.index', { parent_id: breadcrumb.id }),
        })),
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('employee.folders.index'), {
            parent_id: filters.parent_id,
            search: searchTerm || undefined,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const getFileIcon = (fileType: string) => {
        const type = fileType.toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(type)) {
            return Image;
        }
        if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(type)) {
            return FileVideo;
        }
        if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(type)) {
            return FileAudio;
        }
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(type)) {
            return Archive;
        }
        if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'php', 'py', 'java', 'cpp'].includes(type)) {
            return Code;
        }
        if (['xls', 'xlsx', 'csv'].includes(type)) {
            return FileSpreadsheet;
        }
        if (['ppt', 'pptx'].includes(type)) {
            return Presentation;
        }
        if (['pdf', 'doc', 'docx', 'txt'].includes(type)) {
            return FileText;
        }

        return File;
    };

    const getFileTypeColor = (fileType: string) => {
        const type = fileType.toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(type)) {
            return 'bg-green-100 text-green-800';
        }
        if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(type)) {
            return 'bg-purple-100 text-purple-800';
        }
        if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(type)) {
            return 'bg-blue-100 text-blue-800';
        }
        if (['pdf'].includes(type)) {
            return 'bg-red-100 text-red-800';
        }
        if (['doc', 'docx'].includes(type)) {
            return 'bg-blue-100 text-blue-800';
        }
        if (['xls', 'xlsx'].includes(type)) {
            return 'bg-green-100 text-green-800';
        }
        if (['ppt', 'pptx'].includes(type)) {
            return 'bg-orange-100 text-orange-800';
        }

        return 'bg-gray-100 text-gray-800';
    };

    const formatFileSize = (size: string) => {
        return size;
    };

    const formatDate = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return 'Unknown';
        }
    };

    return (
        <AppLayout breadcrumbs={appBreadcrumbs}>
            <Head title="My Documents" />

            <div className="space-y-6">
                {/* Header */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">My Documents</h1>
                            <p className="text-muted-foreground">
                                Browse and access your available documents and folders
                            </p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search documents and folders..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button type="submit" variant="outline">
                            Search
                        </Button>
                    </form>
                </div>

                {/* Current Folder Info */}
                {currentFolder && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="rounded-md bg-primary/10 p-2">
                                    <Folder className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle>{currentFolder.name}</CardTitle>
                                    {currentFolder.description && (
                                        <CardDescription>{currentFolder.description}</CardDescription>
                                    )}
                                </div>
                            </div>
                            {currentFolder.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-2">
                                    {currentFolder.tags.map((tag) => (
                                        <Badge
                                            key={tag.id}
                                            variant="secondary"
                                            style={{
                                                backgroundColor: tag.color + '20',
                                                color: tag.color,
                                                borderColor: tag.color + '40'
                                            }}
                                        >
                                            {tag.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </CardHeader>
                    </Card>
                )}

                {/* Folders Grid */}
                {folders.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Folders</h2>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {folders.map((folder) => (
                                <Card
                                    key={folder.id}
                                    className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1"
                                    onClick={() => router.visit(route('employee.folders.index', { parent_id: folder.id }))}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="rounded-lg bg-blue-100 p-2 group-hover:bg-blue-200 transition-colors">
                                                <Folder className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium truncate">{folder.name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {folder.children_count} folders, {folder.documents_count} documents
                                                </p>
                                            </div>
                                        </div>

                                        {folder.description && (
                                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                                {folder.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>By {folder.creator}</span>
                                            <span>{formatDate(folder.created_at)}</span>
                                        </div>

                                        {folder.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-3">
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
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Documents Grid */}
                {documents.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Documents</h2>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {documents.map((document) => {
                                const FileIcon = getFileIcon(document.file_type);
                                return (
                                    <Card key={document.id} className="group transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-gray-200 transition-colors">
                                                    <FileIcon className="h-5 w-5 text-gray-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium truncate" title={document.name}>
                                                        {document.name}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground truncate" title={document.original_filename}>
                                                        {document.original_filename}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mb-3">
                                                <Badge
                                                    variant="secondary"
                                                    className={cn("text-xs", getFileTypeColor(document.file_type))}
                                                >
                                                    {document.file_type.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {document.file_size}
                                                </span>
                                            </div>

                                            {document.description && (
                                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                                    {document.description}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                                <span>By {document.uploader}</span>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{formatDate(document.created_at)}</span>
                                                </div>
                                            </div>

                                            {document.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {document.tags.slice(0, 2).map((tag) => (
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
                                                    {document.tags.length > 2 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{document.tags.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    asChild
                                                >
                                                    <a href={document.view_url} target="_blank" rel="noopener noreferrer">
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    asChild
                                                >
                                                    <a href={document.download_url} download>
                                                        <Download className="h-4 w-4 mr-1" />
                                                        Download
                                                    </a>
                                                </Button>
                                            </div>

                                            {document.download_count > 0 && (
                                                <div className="text-xs text-muted-foreground mt-2 text-center">
                                                    Downloaded {document.download_count} times
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {folders.length === 0 && documents.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="rounded-full bg-muted p-3 mb-4">
                                <Folder className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">No content found</h3>
                            <p className="text-muted-foreground text-center max-w-md">
                                {filters.search
                                    ? "No folders or documents match your search criteria. Try adjusting your search terms."
                                    : "This folder is empty or you don't have access to any content here."
                                }
                            </p>
                            {filters.search && (
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => {
                                        setSearchTerm('');
                                        router.get(route('employee.folders.index'), {
                                            parent_id: filters.parent_id,
                                        });
                                    }}
                                >
                                    Clear Search
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
