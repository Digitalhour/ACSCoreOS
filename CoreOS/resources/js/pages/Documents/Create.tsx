// Documennts - Create.tsx
import {useState} from 'react';
import {Head, Link, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Building2, ChevronLeft, File, Globe, Upload, User, Users, X} from 'lucide-react';
import {cn} from '@/lib/utils';

interface FolderOption {
    id: number;
    name: string;
    full_path: string;
}

interface Tag {
    id: number;
    name: string;
    color: string;
}

interface Department {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface Props {
    folders: FolderOption[];
    tags: Tag[];
    departments: Department[];
    users: User[];
    preselected_folder_id?: number;
}

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

export default function DocumentsCreate({ folders, tags, departments, users, preselected_folder_id }: Props) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);

    // Ensure we have valid data arrays
    const safeFolders = Array.isArray(folders) ? folders.filter(f => f && f.id && String(f.id).trim()) : [];
    const safeTags = Array.isArray(tags) ? tags.filter(t => t && t.id && String(t.id).trim()) : [];
    const safeDepartments = Array.isArray(departments) ? departments.filter(d => d && d.id && String(d.id).trim()) : [];
    const safeUsers = Array.isArray(users) ? users.filter(u => u && u.id && String(u.id).trim()) : [];

    const { data, setData, post, processing, errors, progress } = useForm({
        files: [] as File[],
        folder_id: preselected_folder_id ? preselected_folder_id.toString() : 'none',
        assignment_type: 'company_wide',
        assignment_ids: [] as number[],
        tag_ids: [] as number[],
    });

    const handleFileSelect = (files: FileList | null) => {
        if (!files) return;

        const newFiles = Array.from(files);
        const validFiles = newFiles.filter(file => {
            // Add file validation logic here
            const maxSize = 100 * 1024 * 1024; // 100MB
            return file.size <= maxSize;
        });

        setSelectedFiles(prev => [...prev, ...validFiles]);
        setData('files', [...selectedFiles, ...validFiles]);
    };

    const removeFile = (index: number) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
        setData('files', newFiles);
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

    const toggleTag = (tagId: number) => {
        const newSelectedTags = selectedTags.includes(tagId)
            ? selectedTags.filter(id => id !== tagId)
            : [...selectedTags, tagId];

        setSelectedTags(newSelectedTags);
        setData('tag_ids', newSelectedTags);
    };

    const handleAssignmentTypeChange = (type: string) => {
        setData('assignment_type', type);
        setData('assignment_ids', []);
    };

    const handleAssignmentIdChange = (id: number, checked: boolean) => {
        const currentIds = data.assignment_ids || [];
        const newIds = checked
            ? [...currentIds, id]
            : currentIds.filter(existingId => existingId !== id);

        setData('assignment_ids', newIds);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedFiles.length === 0 || data.folder_id === 'none') {
            return;
        }

        // Update form data with current selections
        setData('tag_ids', selectedTags);

        post(route('documents.store'), {
            forceFormData: true,
        });
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

    const getAssignmentOptions = () => {
        switch (data.assignment_type) {
            case 'department':
                return safeDepartments;
            case 'user':
            case 'hierarchy':
                return safeUsers;
            default:
                return [];
        }
    };

    return (
        <AppLayout>
            <Head title="Upload Documents" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('documents.index')}>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back to Documents
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Upload Documents</h1>
                        <p className="text-muted-foreground">
                            Upload documents to your organization's document library
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* File Upload */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Files</CardTitle>
                            <CardDescription>
                                Choose files to upload. Maximum file size: 100MB per file.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Drop Zone */}
                            <div
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                                    dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                                    "hover:border-primary hover:bg-primary/5"
                                )}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Drop files here</h3>
                                <p className="text-muted-foreground mb-4">
                                    or click to select files from your computer
                                </p>
                                <Input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    id="file-upload"
                                    onChange={(e) => handleFileSelect(e.target.files)}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.zip,.rar"
                                />
                                <Button type="button" variant="outline" asChild>
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        Select Files
                                    </label>
                                </Button>
                            </div>

                            {/* File List */}
                            {selectedFiles.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Selected Files ({selectedFiles.length})</Label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {selectedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <File className="h-4 w-4 text-muted-foreground" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatFileSize(file.size)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFile(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {errors.files && (
                                <Alert variant="destructive">
                                    <AlertDescription>{errors.files}</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* Folder Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Destination Folder</CardTitle>
                            <CardDescription>
                                Choose which folder to upload the documents to
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="folder">Folder *</Label>
                                <Select
                                    value={data.folder_id}
                                    onValueChange={(value) => setData('folder_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a folder" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select a folder</SelectItem>
                                        {safeFolders.map((folder) => (
                                            <SelectItem key={folder.id} value={folder.id.toString()}>
                                                {folder.full_path}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.folder_id && (
                                    <p className="text-sm text-destructive">{errors.folder_id}</p>
                                )}
                                {data.folder_id === 'none' && (
                                    <p className="text-sm text-muted-foreground">Please select a folder to upload documents to.</p>
                                )}
                                {preselected_folder_id && data.folder_id !== 'none' && (
                                    <p className="text-sm text-muted-foreground">
                                        Uploading to: {safeFolders.find(f => f.id.toString() === data.folder_id)?.full_path}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Access Control */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Access Control</CardTitle>
                            <CardDescription>
                                Configure who can access these documents
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Assignment Type */}
                            <div className="space-y-3">
                                <Label>Access Level *</Label>
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                    {[
                                        { value: 'company_wide', label: 'Company Wide', icon: Globe },
                                        { value: 'department', label: 'Department', icon: Building2 },
                                        { value: 'user', label: 'Specific Users', icon: User },
                                        { value: 'hierarchy', label: 'User Hierarchy', icon: Users },
                                    ].map(({ value, label, icon: Icon }) => (
                                        <div
                                            key={value}
                                            className={cn(
                                                "border rounded-lg p-3 cursor-pointer transition-colors",
                                                data.assignment_type === value
                                                    ? "border-primary bg-primary/5"
                                                    : "border-muted hover:border-primary/50"
                                            )}
                                            onClick={() => handleAssignmentTypeChange(value)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4" />
                                                <span className="text-sm font-medium">{label}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Assignment Selection */}
                            {data.assignment_type !== 'company_wide' && (
                                <div className="space-y-3">
                                    <Label>
                                        Select {data.assignment_type === 'department' ? 'Departments' : 'Users'} *
                                    </Label>
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3 md:grid-cols-2">
                                        {getAssignmentOptions().map((option) => (
                                            <div key={option.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`assignment-${option.id}`}
                                                    checked={data.assignment_ids?.includes(option.id)}
                                                    onCheckedChange={(checked) =>
                                                        handleAssignmentIdChange(option.id, checked as boolean)
                                                    }
                                                />
                                                <Label
                                                    htmlFor={`assignment-${option.id}`}
                                                    className="text-sm font-normal cursor-pointer"
                                                >
                                                    {option.name}
                                                    {'email' in option && (
                                                        <span className="text-muted-foreground ml-1">
                                                            ({option.email})
                                                        </span>
                                                    )}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.assignment_ids && (
                                        <p className="text-sm text-destructive">{errors.assignment_ids}</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tags */}
                    {safeTags.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Tags</CardTitle>
                                <CardDescription>
                                    Add tags to help organize and find these documents
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {safeTags.map((tag) => (
                                        <Badge
                                            key={tag.id}
                                            variant={selectedTags.includes(tag.id) ? "default" : "secondary"}
                                            className="cursor-pointer transition-colors"
                                            style={{
                                                backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                                                color: selectedTags.includes(tag.id) ? 'white' : undefined
                                            }}
                                            onClick={() => toggleTag(tag.id)}
                                        >
                                            {tag.name}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Submit */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex gap-4">
                                <Button
                                    type="submit"
                                    disabled={processing || selectedFiles.length === 0 || data.folder_id === 'none'}
                                    className="flex-1"
                                >
                                    {processing ? (
                                        <>
                                            <Upload className="mr-2 h-4 w-4 animate-spin" />
                                            {progress && (
                                                <span>Uploading... {Math.round(progress.percentage || 0)}%</span>
                                            )}
                                            {!progress && <span>Processing...</span>}
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" />
                                            Upload {selectedFiles.length} Document{selectedFiles.length !== 1 ? 's' : ''}
                                        </>
                                    )}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={route('documents.index')}>
                                        Cancel
                                    </Link>
                                </Button>
                            </div>

                            {/* Upload Progress */}
                            {progress && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                                        <span>Uploading...</span>
                                        <span>{Math.round(progress.percentage || 0)}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${progress.percentage || 0}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}
