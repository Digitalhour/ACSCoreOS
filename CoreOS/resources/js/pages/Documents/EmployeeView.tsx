// Documents - EmployeeView.tsx
import {Head} from '@inertiajs/react';
import {useEffect, useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Label} from '@/components/ui/label';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {Download, ExternalLink, Eye, File, FileSpreadsheet, FileText, Image, User, Video} from 'lucide-react';
import type {BreadcrumbItem} from "@/types";

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
    created_at: string;
    download_url: string;
    view_url: string;
}

interface FolderPathItem {
    id: number;
    name: string;
}

interface Props {
    document: DocumentData;
    folderPath: FolderPathItem[];
}

const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (['pdf', 'doc', 'docx', 'txt'].includes(type)) return FileText;
    if (['xls', 'xlsx', 'csv'].includes(type)) return FileSpreadsheet;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(type)) return Image;
    if (['mp4', 'avi', 'mov'].includes(type)) return Video;
    return File;
};

const PreviewSkeleton = () => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-32" />
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <Skeleton className="w-full h-96" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        </CardContent>
    </Card>
);

const FilePreview = ({ document }: { document: DocumentData }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [csvContent, setCsvContent] = useState<string>('');
    const [csvError, setCsvError] = useState<string>('');

    const fileType = document.file_type.toLowerCase();
    const viewUrl = document.view_url;
    const downloadUrl = document.download_url;

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        if (fileType === 'csv') {
            fetchCsvContent();
        }

        return () => clearTimeout(timer);
    }, [fileType, viewUrl]);

    const fetchCsvContent = async () => {
        try {
            const response = await fetch(viewUrl);
            if (response.ok) {
                const text = await response.text();
                setCsvContent(text);
            } else {
                setCsvError('Unable to load CSV content');
            }
        } catch (error) {
            console.error('Error fetching CSV:', error);
            setCsvError('Error loading CSV content');
        }
    };

    if (isLoading) {
        return <PreviewSkeleton />;
    }

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
                                <a href={downloadUrl} download>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Image
                                </a>
                            </Button>
                        </div>
                        <div className="absolute top-2 right-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="bg-white/90"
                                asChild
                            >
                                <a href={viewUrl} target="_blank">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Full Size
                                </a>
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
            <div>

                    <div >
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                            <object
                                data={viewUrl}
                                type="application/pdf"
                                className="w-full"
                                style={{ height: '800px' }}
                            >
                                <iframe
                                    src={viewUrl}
                                    allow="fullscreen"
                                    className="w-full border-0"
                                    style={{ height: '800px' }}
                                    title={document.name}
                                    onLoad={() => {
                                        console.log('PDF iframe loaded successfully');
                                    }}
                                    onError={(e) => {
                                        console.log('PDF iframe failed to load', e);
                                    }}
                                />
                            </object>
                        </div>

                        <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                            <strong>View Options:</strong> The PDF is displayed inline above. If you experience any issues, use "Open in New Tab" for the best viewing experience or download the file directly.
                        </div>
                    </div>

            </div>
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
                        <div className="flex gap-2 justify-center">
                            <Button asChild>
                                <a href={viewUrl} target="_blank">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Full Content
                                </a>
                            </Button>
                            <Button variant="outline" asChild>
                                <a href={downloadUrl} download>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download File
                                </a>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // CSV files - Fixed to display content instead of downloading
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
                        {csvError ? (
                            <div className="border rounded-lg p-8 text-center bg-gray-50">
                                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground mb-4">{csvError}</p>
                                <Button asChild>
                                    <a href={downloadUrl} download>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download CSV
                                    </a>
                                </Button>
                            </div>
                        ) : csvContent ? (
                            <div className="border rounded-lg overflow-hidden bg-gray-50">
                                <div className="p-4 max-h-96 overflow-auto">
                                    <pre className="text-sm whitespace-pre-wrap font-mono">
                                        {csvContent.split('\n').slice(0, 50).join('\n')}
                                        {csvContent.split('\n').length > 50 && '\n... (showing first 50 rows)'}
                                    </pre>
                                </div>
                            </div>
                        ) : (
                            <div className="border rounded-lg p-8 text-center bg-gray-50">
                                <Skeleton className="h-48 w-full" />
                            </div>
                        )}

                        <div className="flex gap-2 justify-center flex-wrap">
                            <Button variant="outline" asChild>
                                <a href={viewUrl} target="_blank">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Raw Data
                                </a>
                            </Button>
                            <Button asChild>
                                <a href={downloadUrl} download>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download CSV
                                </a>
                            </Button>
                        </div>

                        {csvContent && (
                            <div className="text-xs text-muted-foreground bg-green-50 p-3 rounded border-l-4 border-green-400">
                                <strong>CSV Preview:</strong> Showing content preview above. Use "Download CSV" to get the complete file.
                            </div>
                        )}
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
                        <div className="flex gap-2 justify-center">
                            <Button asChild>
                                <a href={viewUrl} target="_blank">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open Video
                                </a>
                            </Button>
                            <Button variant="outline" asChild>
                                <a href={downloadUrl} download>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Video
                                </a>
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
                                <a href={viewUrl} target="_blank">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Quick View
                                </a>
                            </Button>
                        )}
                        <Button asChild>
                            <a href={downloadUrl} download>
                                <Download className="h-4 w-4 mr-2" />
                                Download File
                            </a>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
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

export default function EmployeeView({ document, folderPath }: Props) {
    const [isPageLoading, setIsPageLoading] = useState(true);
    const FileIcon = getFileIcon(document.file_type);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsPageLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    // Build breadcrumbs for AppLayout
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'My Documents',
            href: route('employee.folders.index'),
        },
        // Add folder hierarchy from folderPath
        ...folderPath.map((folder) => ({
            title: folder.name,
            href: route('employee.folders.index', { parent_id: folder.id }),
        })),
        // Add current document
        {
            title: document.name,
            href: route('employee.documents.view', document.id),
        }
    ];

    if (isPageLoading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Loading Document..." />
                <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                    {/* Header Skeleton */}
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-20" />
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-md" />
                                <div className="space-y-2">
                                    <Skeleton className="h-8 w-64" />
                                    <Skeleton className="h-5 w-48" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-24" />
                            <Skeleton className="h-10 w-20" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                        {/* Main Content Skeleton */}
                        <div className="lg:col-span-3 space-y-6">
                            <PreviewSkeleton />
                        </div>

                        {/* Sidebar Skeleton */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <Skeleton className="h-6 w-24" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Document: ${document.name}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
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
                        <Button variant="outline" asChild>
                            <a href={document.view_url} target="_blank">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open
                            </a>
                        </Button>
                        <Button asChild>
                            <a href={document.download_url} download>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
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
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Upload Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Document Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
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
                </div>
            </div>
        </AppLayout>
    );
}
