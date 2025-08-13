import {useState} from 'react';
import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {Checkbox} from '@/components/ui/checkbox';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {
    Archive,
    Building2,
    Calendar,
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
    Search,
    Trash2,
    Upload,
    User,
    Users,
    Video,
    X
} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {BreadcrumbItem} from "@/types";
import {usePermission} from "@/hooks/usePermission";

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

interface DocumentData {
    id: number;
    name: string;
    original_filename: string;
    description?: string;
    file_type: string;
    file_size: string;
    download_count: number;
    uploader: string;
    tags: Array<{
        id: number;
        name: string;
        color: string;
    }>;
    created_at: string;
    folder_id?: number;
    assignment_type?: string;
    assignment_ids?: number[];
    download_url?: string;
    view_url?: string;
}

interface CurrentFolder {
    id: number;
    name: string;
    description?: string;
    full_path: string;
    creator: string;
    created_at: string;
    assignment_type: string;
    assigned_entities: {
        type: string;
        entities: Array<{ id: number; name: string; }>;
    };
    tags: Array<{
        id: number;
        name: string;
        color: string;
    }>;
}

interface Breadcrumb {
    id: number;
    name: string;
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
    documents: DocumentData[];
    breadcrumbs: Breadcrumb[];
    currentFolder?: CurrentFolder;
    tags: Tag[];
    availableFolders: Array<{id: number; name: string; full_path: string}>;
    availableTags: Array<{id: number; name: string; color: string}>;
    departments: Array<{id: number; name: string}>;
    users: Array<{id: number; name: string; email: string}>;
    filters: {
        parent_id?: number;
        search?: string;
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

const formatFileSize = (size: string | number): string => {
    if (typeof size === 'string') return size;
    const units = ['B', 'KB', 'MB', 'GB'];
    let fileSize = size;
    let unitIndex = 0;
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
        fileSize /= 1024;
        unitIndex++;
    }
    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
};

// Quick Upload Component (enhanced from original)
function QuickUpload({
                         currentFolder,
                         availableTags,
                         departments,
                         users,
                         onClose
                     }: {
    currentFolder: CurrentFolder,
    availableTags: any[],
    departments: any[],
    users: any[],
    onClose: () => void
}) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);
    const [assignmentType, setAssignmentType] = useState('company_wide');
    const [assignmentIds, setAssignmentIds] = useState<number[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleFileSelect = (files: FileList | null) => {
        if (!files) return;
        const newFiles = Array.from(files).filter(file => file.size <= 100 * 1024 * 1024);
        setSelectedFiles(prev => [...prev, ...newFiles]);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = () => {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        const formData = new FormData();

        selectedFiles.forEach(file => {
            formData.append('files[]', file);
        });

        formData.append('folder_id', currentFolder.id.toString());
        formData.append('assignment_type', assignmentType);

        if (assignmentIds.length > 0) {
            assignmentIds.forEach((id, index) => {
                formData.append(`assignment_ids[${index}]`, id.toString());
            });
        }

        if (selectedTags.length > 0) {
            selectedTags.forEach((id, index) => {
                formData.append(`tag_ids[${index}]`, id.toString());
            });
        }

        router.post(route('documents.store'), formData, {
            forceFormData: true,
            onSuccess: () => {
                setSelectedFiles([]);
                setSelectedTags([]);
                setAssignmentIds([]);
                setAssignmentType('company_wide');
                onClose();
            },
            onError: (errors) => {
                console.error('Upload errors:', errors);
                alert('Upload failed. Please check console for details.');
            },
            onFinish: () => setUploading(false)
        });
    };

    const getAssignmentOptions = () => {
        switch (assignmentType) {
            case 'department': return departments;
            case 'user':
            case 'hierarchy': return users;
            default: return [];
        }
    };

    return (
        <div className="space-y-4">
            {/* File Upload */}
            <div className="space-y-3">
                <Label>Select Files</Label>
                <div
                    className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                        dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                        "hover:border-primary hover:bg-primary/5"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="text-sm font-medium mb-1">Drop files here</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                        or click to select files from your computer
                    </p>
                    <Input
                        type="file"
                        multiple
                        className="hidden"
                        id="upload-files"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.zip,.rar"
                    />
                    <Button variant="outline" asChild>
                        <label htmlFor="upload-files" className="cursor-pointer">
                            Select Files
                        </label>
                    </Button>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        <Label className="text-sm font-medium">Selected Files ({selectedFiles.length})</Label>
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center gap-2">
                                    <File className="h-4 w-4" />
                                    <span className="text-sm truncate">{file.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatFileSize(file.size)}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(index)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Access Control */}
            <div className="space-y-3">
                <Label>Access Level</Label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { value: 'company_wide', label: 'Company Wide', icon: Globe },
                        { value: 'department', label: 'Department', icon: Building2 },
                        { value: 'user', label: 'Specific Users', icon: User },
                        { value: 'hierarchy', label: 'User Hierarchy', icon: Users },
                    ].map(({ value, label, icon: Icon }) => (
                        <div
                            key={value}
                            className={cn(
                                "border rounded p-2 cursor-pointer transition-colors flex items-center gap-2",
                                assignmentType === value ? "border-primary bg-primary/5" : "border-muted"
                            )}
                            onClick={() => setAssignmentType(value)}
                        >
                            <Icon className="h-3 w-3" />
                            <span className="text-xs">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Assignment Selection */}
            {assignmentType !== 'company_wide' && (
                <div className="space-y-2">
                    <Label>
                        Select {assignmentType === 'department' ? 'Departments' : 'Users'}
                    </Label>
                    <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                        {getAssignmentOptions().map((option) => (
                            <div key={option.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`assign-${option.id}`}
                                    checked={assignmentIds.includes(option.id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setAssignmentIds(prev => [...prev, option.id]);
                                        } else {
                                            setAssignmentIds(prev => prev.filter(id => id !== option.id));
                                        }
                                    }}
                                />
                                <Label htmlFor={`assign-${option.id}`} className="text-xs cursor-pointer">
                                    {option.name}
                                    {'email' in option && (
                                        <span className="text-muted-foreground ml-1">({option.email})</span>
                                    )}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tags */}
            {availableTags.length > 0 && (
                <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-1">
                        {availableTags.map((tag) => (
                            <Badge
                                key={tag.id}
                                variant={selectedTags.includes(tag.id) ? "default" : "secondary"}
                                className="cursor-pointer text-xs"
                                style={{
                                    backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                                    color: selectedTags.includes(tag.id) ? 'white' : undefined
                                }}
                                onClick={() => {
                                    if (selectedTags.includes(tag.id)) {
                                        setSelectedTags(prev => prev.filter(id => id !== tag.id));
                                    } else {
                                        setSelectedTags(prev => [...prev, tag.id]);
                                    }
                                }}
                            >
                                {tag.name}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="w-full"
            >
                {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`}
            </Button>
        </div>
    );
}

export default function FoldersIndex({
                                         folders,
                                         documents,
                                         breadcrumbs,
                                         currentFolder,
                                         tags,
                                         availableFolders,
                                         availableTags,
                                         departments,
                                         users,
                                         filters
                                     }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedTags, setSelectedTags] = useState(
        filters.tag_ids ? filters.tag_ids.split(',').map(Number) : []
    );
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const { hasPermission, hasRole, hasAnyRole } = usePermission();
    // Build breadcrumbs for AppLayout
    const appBreadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Company Documents',
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

    const totalItems = folders.length + documents.length;

    return (
        <AppLayout breadcrumbs={appBreadcrumbs}>
            <Head title={currentFolder ? `Folder: ${currentFolder.name}` : "Folder Management"} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {currentFolder ? currentFolder.name : 'Company Documents'}
                        </h1>
                        <p className="text-muted-foreground">
                            {currentFolder
                                ? `${currentFolder.full_path} • ${folders.length} folders, ${documents.length} documents`
                                : 'Organize company documents into folders and manage access'
                            }
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {/* Upload Documents - only show when inside a folder */}
                        {currentFolder && (
                            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload Documents
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Upload Documents to {currentFolder.name}</DialogTitle>
                                        <DialogDescription>
                                            Select files to upload to this folder. You can set access permissions and add tags.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <QuickUpload
                                        currentFolder={currentFolder}
                                        availableTags={availableTags}
                                        departments={departments}
                                        users={users}
                                        onClose={() => setUploadModalOpen(false)}
                                    />
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* Create Folder */}
                        {hasPermission('documents-create') && (
                        <Button variant="outline" asChild>
                            <Link href={route('folders.create', { parent_id: filters.parent_id })}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Folder
                            </Link>
                        </Button>
                            )}

                    </div>
                </div>



                {/* Current Folder Info */}
                {currentFolder && (
                    <Card>
                        <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-md bg-primary/10 p-2">
                                        <Folder className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{currentFolder.name}</h3>
                                        {currentFolder.description && (
                                            <p className="text-sm text-muted-foreground">{currentFolder.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                            <span>Created by {currentFolder.creator}</span>
                                            <span>{formatDate(currentFolder.created_at)}</span>
                                            <span>{getAssignmentLabel(currentFolder.assignment_type)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" asChild>
                                        <Link href={route('folders.edit', currentFolder.id)}>
                                            <Edit className="h-3 w-3 mr-1" />
                                            Edit
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                            {currentFolder.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {currentFolder.tags.map((tag) => (
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
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {/* Search */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Search</label>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search folders and documents..."
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
                                                {tag.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}


                {/* Content Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {totalItems} item{totalItems !== 1 ? 's' : ''} • {folders.length} folders, {documents.length} documents
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Folders */}
                        {folders.map((folder) => {
                            const AssignmentIcon = getAssignmentIcon(folder.assignment_type);

                            return (
                                <Card key={`folder-${folder.id}`} className="hover:shadow-md transition-shadow">
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

                        {/* Documents */}
                        {documents.map((document) => {
                            const FileIcon = getFileIcon(document.file_type);

                            return (
                                <Card key={`document-${document.id}`} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="rounded-md bg-muted p-2">
                                                    <FileIcon className="h-5 w-5" />
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
                                        {/* File Info */}
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <File className="h-4 w-4 text-muted-foreground" />
                                                <span>{document.file_size}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Download className="h-4 w-4 text-muted-foreground" />
                                                <span>{document.download_count}</span>
                                            </div>
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
                                                <User className="h-3 w-3" />
                                                <span className="line-clamp-1">{document.uploader}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{formatDate(document.created_at)}</span>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="flex-1" asChild>
                                                <Link href={route('documents.show', document.id)}>
                                                    <Eye className="mr-1 h-3 w-3" />
                                                    View
                                                </Link>
                                            </Button>
                                            {document.download_url && (
                                                <Button size="sm" asChild>
                                                    <a href={document.download_url}>
                                                        <Download className="h-3 w-3" />
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {totalItems === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Folder className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">
                                    {currentFolder ? 'Empty Folder' : 'No folders found'}
                                </h3>
                                <p className="text-muted-foreground text-center mb-4">
                                    {filters.search || filters.tag_ids
                                        ? "Try adjusting your filters to see more results."
                                        : currentFolder
                                            ? `This folder doesn't contain any items yet.`
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
                                        <Button variant="outline" onClick={() => setUploadModalOpen(true)}>
                                            <Upload className="mr-2 h-4 w-4" />
                                            Upload Documents
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Document Preview Modal */}
                {/*<Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>*/}
                {/*    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">*/}
                {/*        <DialogHeader>*/}
                {/*            <DialogTitle>Document Preview</DialogTitle>*/}
                {/*            <DialogDescription>*/}
                {/*                {previewDocument ? `Preview of ${previewDocument.name}` : 'Document preview'}*/}
                {/*            </DialogDescription>*/}
                {/*        </DialogHeader>*/}
                {/*        {previewDocument && (*/}
                {/*            <DocumentPreview*/}
                {/*                document={previewDocument}*/}
                {/*                onClose={() => setPreviewDocument(null)}*/}
                {/*            />*/}
                {/*        )}*/}
                {/*    </DialogContent>*/}
                {/*</Dialog>*/}

                {/*/!* Document Edit Modal *!/*/}
                {/*<Dialog open={!!editDocument} onOpenChange={() => setEditDocument(null)}>*/}
                {/*    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">*/}
                {/*        <DialogHeader>*/}
                {/*            <DialogTitle>Edit Document</DialogTitle>*/}
                {/*            <DialogDescription>*/}
                {/*                Update document settings and permissions*/}
                {/*            </DialogDescription>*/}
                {/*        </DialogHeader>*/}
                {/*        {editDocument && (*/}
                {/*            <DocumentEdit*/}
                {/*                document={editDocument}*/}
                {/*                availableFolders={availableFolders}*/}
                {/*                availableTags={availableTags}*/}
                {/*                departments={departments}*/}
                {/*                users={users}*/}
                {/*                onClose={() => setEditDocument(null)}*/}
                {/*            />*/}
                {/*        )}*/}
                {/*    </DialogContent>*/}
                {/*</Dialog>*/}
            </div>
        </AppLayout>
    );
}
