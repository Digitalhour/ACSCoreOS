import React, {useState} from 'react';
import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import {
    Archive,
    Code,
    Download,
    Eye,
    File,
    FileAudio,
    FileSpreadsheet,
    FileStack,
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

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
                {/* Header */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        {currentFolder && (
                            <div className="flex items-center gap-3">
                                <div className="rounded-md bg-primary/10 p-2">
                                    <FileStack className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle>{currentFolder.name}</CardTitle>
                                    {currentFolder.description && (
                                        <CardDescription>{currentFolder.description}</CardDescription>
                                    )}
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
                            </div>


                            )}
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


                </div>



                {/* Folders Table */}
                {folders.length > 0 && (
                    <div className="space-y-4">

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Contents</TableHead>
                                        <TableHead>Tags</TableHead>
                                        <TableHead>Created By</TableHead>
                                        <TableHead>Created</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {folders.map((folder) => (
                                        <TableRow
                                            key={folder.id}
                                            className="hover:bg-muted/50 cursor-pointer"
                                            onClick={() => router.visit(route('employee.folders.index', { parent_id: folder.id }))}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded-lg  p-2">
                                                        <FileStack  className="h-4 w-4 " />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium">{folder.name}</div>
                                                        {folder.description && (
                                                            <div className="text-sm text-muted-foreground line-clamp-1">
                                                                {folder.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>{folder.documents_count} Documents</div>
                                                    <div className="text-muted-foreground">{folder.children_count} folders</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {folder.tags.slice(0, 2).map((tag) => (
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
                                                    {folder.tags.length > 2 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{folder.tags.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{folder.creator}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{formatDate(folder.created_at)}</div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* Documents Table */}
                {documents.length > 0 && (
                    <div className="space-y-4">

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type & Size</TableHead>
                                        <TableHead>Tags</TableHead>
                                        <TableHead>Uploaded By</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.map((document) => {
                                        const FileIcon = getFileIcon(document.file_type);
                                        return (

                                            <TableRow key={document.id} className="hover:bg-muted/50"
                                            onClick={() => router.visit(route('employee.documents.view', document.id))}
                                            >


                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="rounded-lg bg-gray-100 p-2">
                                                            <FileIcon className="h-4 w-4 text-gray-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium truncate" title={document.name}>
                                                                {document.name}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground truncate" title={document.original_filename}>
                                                                {document.original_filename}
                                                            </div>
                                                            {document.description && (
                                                                <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                                                    {document.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
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
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
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
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{document.uploader}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <div>{formatDate(document.created_at)}</div>
                                                        {document.download_count > 0 && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Downloaded {document.download_count} times
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <Link href={route('employee.documents.view', document.id)}>
                                                                <Eye className="h-4 w-4 mr-1" />
                                                                View
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <a href={document.download_url} download>
                                                                <Download className="h-4 w-4 mr-1" />
                                                                Download
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </TableCell>

                                            </TableRow>

                                        );
                                    })}
                                </TableBody>
                            </Table>
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
