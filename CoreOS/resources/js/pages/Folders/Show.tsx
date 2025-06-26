import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Label} from '@/components/ui/label';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
    Archive,
    Building2,
    ChevronLeft,
    Download,
    Edit,
    Eye,
    File,
    FileSpreadsheet,
    FileText,
    Folder,
    Globe,
    Image,
    Plus,
    Trash2,
    Upload,
    User,
    Users,
    Video
} from 'lucide-react';

interface FolderData {
    id: number;
    name: string;
    description?: string;
    full_path: string;
    parent_id?: number;
    assignment_type: string;
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

interface ChildFolder {
    id: number;
    name: string;
    description?: string;
    children_count: number;
    documents_count: number;
    created_at: string;
}

interface Document {
    id: number;
    name: string;
    original_filename: string;
    file_type: string;
    file_size: string;
    download_count: number;
    uploader: string;
    created_at: string;
}

interface Props {
    folder: FolderData;
    childFolders: ChildFolder[];
    documents: Document[];
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

export default function FoldersShow({ folder, childFolders, documents }: Props) {
    const AssignmentIcon = getAssignmentIcon(folder.assigned_entities.type);

    const handleDelete = () => {
        if (childFolders.length > 0 || documents.length > 0) {
            alert('Cannot delete folder that contains subfolders or documents.');
            return;
        }

        if (confirm(`Are you sure you want to delete "${folder.name}"?`)) {
            router.delete(route('folders.destroy', folder.id));
        }
    };

    return (
        <AppLayout>
            <Head title={`Folder: ${folder.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('folders.index', folder.parent_id ? { parent_id: folder.parent_id } : {})}>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back to Folders
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <div className="rounded-md bg-primary/10 p-2">
                                <Folder className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">{folder.name}</h1>
                                <p className="text-muted-foreground">
                                    {folder.full_path}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild>
                            <Link href={route('documents.create', { folder_id: folder.id })}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Documents
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('folders.create', { parent_id: folder.id })}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Subfolder
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('folders.edit', folder.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </Button>
                        <Button variant="outline" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Description */}
                        {folder.description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Description</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{folder.description}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Subfolders */}
                        {childFolders.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Folder className="h-4 w-4" />
                                        Subfolders ({childFolders.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {childFolders.map((childFolder) => (
                                            <Card key={childFolder.id} className="hover:shadow-md transition-shadow cursor-pointer">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="rounded-md bg-primary/10 p-2">
                                                            <Folder className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-medium line-clamp-1">{childFolder.name}</h3>
                                                            {childFolder.description && (
                                                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                                    {childFolder.description}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                                <span>{childFolder.children_count} folders</span>
                                                                <span>{childFolder.documents_count} documents</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 mt-3">
                                                        <Button size="sm" variant="outline" className="flex-1" asChild>
                                                            <Link href={route('folders.show', childFolder.id)}>
                                                                <Eye className="mr-1 h-3 w-3" />
                                                                Open
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Documents */}
                        {documents.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <File className="h-4 w-4" />
                                        Documents ({documents.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {documents.map((document) => {
                                            const FileIcon = getFileIcon(document.file_type);

                                            return (
                                                <Card key={document.id} className="hover:shadow-md transition-shadow">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="rounded-md bg-muted p-2">
                                                                <FileIcon className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-medium line-clamp-1">{document.name}</h3>
                                                                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                                                    {document.original_filename}
                                                                </p>
                                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                                    <span>{document.file_size}</span>
                                                                    <span>{document.download_count} downloads</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 mt-3">
                                                            <Button size="sm" variant="outline" className="flex-1" asChild>
                                                                <Link href={route('documents.show', document.id)}>
                                                                    <Eye className="mr-1 h-3 w-3" />
                                                                    View
                                                                </Link>
                                                            </Button>
                                                            <Button size="sm" variant="outline" asChild>
                                                                <Link href={route('documents.download', document.id)}>
                                                                    <Download className="h-3 w-3" />
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Empty State */}
                        {childFolders.length === 0 && documents.length === 0 && (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Folder className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Empty Folder</h3>
                                    <p className="text-muted-foreground text-center mb-4">
                                        This folder doesn't contain any subfolders or documents yet.
                                    </p>
                                    <div className="flex gap-2">
                                        <Button asChild>
                                            <Link href={route('documents.create', { folder_id: folder.id })}>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Upload Documents
                                            </Link>
                                        </Button>
                                        <Button variant="outline" asChild>
                                            <Link href={route('folders.create', { parent_id: folder.id })}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create Subfolder
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Folder Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Folder className="h-4 w-4" />
                                    Folder Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-sm font-medium">Created By</Label>
                                        <p className="text-muted-foreground text-sm">{folder.creator}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Created Date</Label>
                                        <p className="text-muted-foreground text-sm">
                                            {formatDate(folder.created_at)}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Subfolders</Label>
                                        <p className="text-muted-foreground text-sm">{childFolders.length}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Documents</Label>
                                        <p className="text-muted-foreground text-sm">{documents.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Access Control */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AssignmentIcon className="h-4 w-4" />
                                    Access Control
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-sm font-medium">Access Level</Label>
                                        <p className="text-muted-foreground text-sm">
                                            {getAssignmentLabel(folder.assigned_entities.type)}
                                        </p>
                                    </div>

                                    {folder.assigned_entities.entities.length > 0 && (
                                        <div>
                                            <Label className="text-sm font-medium">Assigned To</Label>
                                            <div className="mt-1 space-y-1">
                                                {folder.assigned_entities.entities.map((entity) => (
                                                    <p key={entity.id} className="text-muted-foreground text-sm">
                                                        {entity.name}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tags */}
                        {folder.tags.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Tags</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {folder.tags.map((tag) => (
                                            <Badge
                                                key={tag.id}
                                                style={{
                                                    backgroundColor: tag.color + '20',
                                                    color: tag.color,
                                                    borderColor: tag.color
                                                }}
                                                className="border"
                                            >
                                                {tag.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button size="sm" className="w-full" asChild>
                                    <Link href={route('documents.create', { folder_id: folder.id })}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload Documents
                                    </Link>
                                </Button>
                                <Button size="sm" variant="outline" className="w-full" asChild>
                                    <Link href={route('folders.create', { parent_id: folder.id })}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Subfolder
                                    </Link>
                                </Button>
                                <Button size="sm" variant="outline" className="w-full" asChild>
                                    <Link href={route('folders.edit', folder.id)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Folder
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
