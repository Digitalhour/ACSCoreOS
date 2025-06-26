// Documennts - Edit.tsx

import {useState} from 'react';

import {Head, Link, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Building2, ChevronLeft, File, Globe, Save, User, Users} from 'lucide-react';
import {cn} from '@/lib/utils';

interface DocumentData {
    id: number;
    name: string;
    original_filename: string;
    description?: string;
    file_type: string;
    folder_id: number;
    assignment_type: string;
    assignment_ids: number[];
    tags: Array<{
        id: number;
        name: string;
        color: string;
    }>;
}

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
    document: DocumentData;
    folders: FolderOption[];
    tags: Tag[];
    departments: Department[];
    users: User[];
}

export default function DocumentsEdit({ document, folders, tags, departments, users }: Props) {
    const [selectedTags, setSelectedTags] = useState<number[]>(
        document.tags.map(tag => tag.id)
    );

    // Ensure we have valid data arrays
    const safeFolders = Array.isArray(folders) ? folders.filter(f => f && f.id && String(f.id).trim()) : [];
    const safeTags = Array.isArray(tags) ? tags.filter(t => t && t.id && String(t.id).trim()) : [];
    const safeDepartments = Array.isArray(departments) ? departments.filter(d => d && d.id && String(d.id).trim()) : [];
    const safeUsers = Array.isArray(users) ? users.filter(u => u && u.id && String(u.id).trim()) : [];

    const { data, setData, put, processing, errors } = useForm({
        name: document.name,
        description: document.description || '',
        folder_id: document.folder_id.toString(),
        assignment_type: document.assignment_type,
        assignment_ids: document.assignment_ids || [],
        tag_ids: document.tags.map(tag => tag.id),
    });

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

        // Update form data with current selections
        setData('tag_ids', selectedTags);

        put(route('documents.update', document.id));
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
            <Head title={`Edit Document: ${document.name}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('documents.show', document.id)}>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back to Document
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-muted p-2">
                            <File className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Edit Document</h1>
                            <p className="text-muted-foreground">
                                {document.original_filename}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>
                                Update the document details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Document Name *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Enter document name"
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">{errors.name}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Enter document description (optional)"
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive">{errors.description}</p>
                                )}
                            </div>

                            {/* Folder Selection */}
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
                            </div>
                        </CardContent>
                    </Card>

                    {/* Access Control */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Access Control</CardTitle>
                            <CardDescription>
                                Configure who can access this document
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Assignment Type */}
                            <div className="space-y-3">
                                <Label>Access Level *</Label>
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                    {[
                                        { value: 'company_wide', label: 'Company Wide', icon: Globe, description: 'Everyone in the company' },
                                        { value: 'department', label: 'Department', icon: Building2, description: 'Specific departments' },
                                        { value: 'user', label: 'Specific Users', icon: User, description: 'Individual users' },
                                        { value: 'hierarchy', label: 'User Hierarchy', icon: Users, description: 'Users and their reports' },
                                    ].map(({ value, label, icon: Icon, description }) => (
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
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon className="h-4 w-4" />
                                                <span className="text-sm font-medium">{label}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{description}</p>
                                        </div>
                                    ))}
                                </div>
                                {errors.assignment_type && (
                                    <p className="text-sm text-destructive">{errors.assignment_type}</p>
                                )}
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
                                                    className="text-sm font-normal cursor-pointer flex-1"
                                                >
                                                    <div>
                                                        <p>{option.name}</p>
                                                        {'email' in option && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {option.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.assignment_ids && (
                                        <p className="text-sm text-destructive">{errors.assignment_ids}</p>
                                    )}
                                </div>
                            )}

                            {/* Access Level Info */}
                            <Alert>
                                <AlertDescription>
                                    {data.assignment_type === 'company_wide' &&
                                        "This document will be accessible to all users in your organization."
                                    }
                                    {data.assignment_type === 'department' &&
                                        "Only users in the selected departments will have access to this document."
                                    }
                                    {data.assignment_type === 'user' &&
                                        "Only the specifically selected users will have access to this document."
                                    }
                                    {data.assignment_type === 'hierarchy' &&
                                        "The selected users and all their direct reports will have access to this document."
                                    }
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Tags */}
                    {safeTags.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Tags</CardTitle>
                                <CardDescription>
                                    Add tags to help organize and find this document
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
                                    disabled={processing || !data.name.trim()}
                                    className="flex-1"
                                >
                                    {processing ? (
                                        <>
                                            <Save className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={route('documents.show', document.id)}>
                                        Cancel
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}
