import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Label} from '@/components/ui/label';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
    Archive,
    Building2,
    Download,
    Edit,
    ExternalLink,
    Eye,
    File,
    FileSpreadsheet,
    FileText,
    Folder,
    Globe,
    Image,
    Trash2,
    User,
    Users,
    Video
} from 'lucide-react';
import type {BreadcrumbItem} from "@/types";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Documents',
        href: route('documents.index'),
    },
    // {
    //     title: document.original_filename,
    //     href: '/document',
    // },
];


interface DocumentData {
    id: number;
    name: string;
    original_filename: string;
    description?: string;
    file_type: string;
    file_size: string;
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
    last_accessed_at?: string;
    created_at: string;
    updated_at: string;
    assigned_entities: {
        type: string;
        entities: Array<{ id: number; name: string; }>;
    };
    download_url: string;
    view_url: string;
}

interface Props {
    document: DocumentData;
    folderPath: Array<{
        id: number;
        name: string;
    }>;
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

const FilePreview = ({ document }: { document: DocumentData }) => {
    const fileType = document.file_type.toLowerCase();
    const viewUrl = document.view_url;
    const downloadUrl = document.download_url;

    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileType)) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Image Preview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <img
                            src={viewUrl}
                            alt={document.name}
                            className="max-w-full h-auto rounded-lg border mx-auto block"
                            style={{ maxHeight: '500px' }}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'block';
                            }}
                        />
                        <div className="hidden text-center py-12">
                            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Unable to preview image</p>
                            <Button className="mt-4" asChild>
                                <Link href={downloadUrl}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Image
                                </Link>
                            </Button>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="bg-white/90"
                                asChild
                            >
                                <Link href={viewUrl} target="_blank">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Full Size
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // PDF files
    if (fileType === 'pdf') {
       return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF Preview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Debug info */}
                        <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
                            Debug: {viewUrl}
                        </div>

                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                            {/* Use object tag as the primary PDF viewer */}
                            <object
                                data={viewUrl}
                                type="application/pdf"
                                className="w-full"
                                style={{ height: '800px' }}
                            >
                                {/* Fallback to iframe if object tag is not supported */}
                                <iframe
                                    src={viewUrl}
                                    type="application/pdf"
                                    internalid={document.id.toString()}
                                    allow="fullscreen *"
                                    className="w-full border-0"
                                    style={{ height: '800px' }}
                                    title={document.name}
                                    name={document.id.toString()}
                                    onLoad={() => {
                                        console.log('PDF iframe loaded successfully');
                                    }}
                                    onError={(e) => {
                                        console.log('PDF iframe failed to load', e);
                                    }}
                                />
                            </object>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button asChild>
                                <Link href={viewUrl} target="_blank">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open in New Tab
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={downloadUrl}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                </Link>
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                            <strong>View Options:</strong> The PDF is displayed inline above. If you experience any issues, use "Open in New Tab" for the best viewing experience or download the file directly.
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Text files
    if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'php', 'py'].includes(fileType)) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Text Preview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <iframe
                            src={viewUrl}
                            className="w-full border rounded-lg bg-muted"
                            style={{ height: '400px' }}
                            title={document.name}
                        />
                        <div className="flex gap-2">
                            <Button asChild>
                                <Link href={viewUrl} target="_blank">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Full Content
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={downloadUrl}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download File
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // CSV files
    if (fileType === 'csv') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        CSV Preview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                            <iframe
                                src={viewUrl}
                                className="w-full border-0"
                                style={{ height: '400px' }}
                                title={document.name}
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button asChild>
                                <Link href={viewUrl} target="_blank">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View as Text
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={downloadUrl}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download CSV
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Video files
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(fileType)) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Video Preview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <video
                            controls
                            className="w-full rounded-lg border"
                            style={{ maxHeight: '400px' }}
                        >
                            <source src={viewUrl} type={`video/${fileType}`} />
                            Your browser does not support the video tag.
                        </video>
                        <div className="flex gap-2">
                            <Button asChild>
                                <Link href={viewUrl} target="_blank">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open Video
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={downloadUrl}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Video
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Default preview for other file types
    const FileIcon = getFileIcon(document.file_type);
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileIcon className="h-4 w-4" />
                    File Preview
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="rounded-full bg-muted p-6">
                        <FileIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-medium">{document.original_filename}</h3>
                        <p className="text-sm text-muted-foreground">
                            {document.file_type.toUpperCase()} • {document.file_size}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileType) && (
                            <Button variant="outline" asChild>
                                <Link href={viewUrl} target="_blank">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Quick View
                                </Link>
                            </Button>
                        )}
                        <Button asChild>
                            <Link href={downloadUrl}>
                                <Download className="h-4 w-4 mr-2" />
                                Download File
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
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
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function DocumentsShow({ document }: Props) {
    const FileIcon = getFileIcon(document.file_type);
    const AssignmentIcon = getAssignmentIcon(document.assigned_entities.type);

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete "${document.name}"?`)) {
            router.delete(route('documents.destroy', document.id));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Document: ${document.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">

                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <div className="rounded-md bg-muted p-2">
                                <FileIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">{document.name}</h1>
                                <p className="text-muted-foreground">
                                    {document.original_filename}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild>
                            <Link href={document.download_url}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('documents.edit', document.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </Button>
                        <Button variant="outline" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* File Preview */}
                        <FilePreview document={document} />

                        {/* Description */}
                        {document.description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Description</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{document.description}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* File Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>File Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-medium">File Type</Label>
                                        <p className="text-muted-foreground">{document.file_type.toUpperCase()}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">File Size</Label>
                                        <p className="text-muted-foreground">{document.file_size}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Downloads</Label>
                                        <p className="text-muted-foreground">{document.download_count}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Last Accessed</Label>
                                        <p className="text-muted-foreground">
                                            {document.last_accessed_at
                                                ? formatDate(document.last_accessed_at)
                                                : 'Never'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tags */}
                        {document.tags.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Tags</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {document.tags.map((tag) => (
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
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Location */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Folder className="h-4 w-4" />
                                    Location
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Link
                                        href={route('folders.show', document.folder.id)}
                                        className="flex items-center gap-2 text-sm hover:underline"
                                    >
                                        <Folder className="h-3 w-3" />
                                        {document.folder.full_path}
                                    </Link>
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
                                            {getAssignmentLabel(document.assigned_entities.type)}
                                        </p>
                                    </div>

                                    {document.assigned_entities.entities.length > 0 && (
                                        <div>
                                            <Label className="text-sm font-medium">Assigned To</Label>
                                            <div className="mt-1 space-y-1">
                                                {document.assigned_entities.entities.map((entity) => (
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

                        {/* Upload Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Upload Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-sm font-medium">Uploaded By</Label>
                                        <p className="text-muted-foreground text-sm">{document.uploader.name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Upload Date</Label>
                                        <p className="text-muted-foreground text-sm">
                                            {formatDate(document.created_at)}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium">Last Modified</Label>
                                        <p className="text-muted-foreground text-sm">
                                            {formatDate(document.updated_at)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button size="sm" className="w-full" asChild>
                                    <Link href={document.download_url}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Download File
                                    </Link>
                                </Button>
                                <Button size="sm" variant="outline" className="w-full" asChild>
                                    <Link href={document.view_url} target="_blank">
                                        <Eye className="mr-2 h-4 w-4" />
                                        View in New Tab
                                    </Link>
                                </Button>
                                <Button size="sm" variant="outline" className="w-full" asChild>
                                    <Link href={route('folders.show', document.folder.id)}>
                                        <Folder className="mr-2 h-4 w-4" />
                                        View Folder
                                    </Link>
                                </Button>
                                <Button size="sm" variant="outline" className="w-full" asChild>
                                    <Link href={route('documents.edit', document.id)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Document
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
