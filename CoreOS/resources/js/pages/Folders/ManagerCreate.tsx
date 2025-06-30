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
import {Folder, FolderPlus, Users} from 'lucide-react';
import {BreadcrumbItem} from '@/types';

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

interface Subordinate {
    id: number;
    name: string;
    email: string;
}

interface Manager {
    id: number;
    name: string;
    email: string;
}

interface Props {
    folders: FolderOption[];
    tags: Tag[];
    subordinates: Subordinate[];
    manager: Manager;
    parent_id?: number;
}

export default function ManagerCreate({ folders, tags, subordinates, manager, parent_id }: Props) {
    const [selectedTags, setSelectedTags] = useState<number[]>([]);

    // Ensure we have valid data arrays
    const safeFolders = Array.isArray(folders) ? folders.filter(f =>
        f && f.id && f.id > 0 && f.name && String(f.id).trim() !== ''
    ) : [];
    const safeTags = Array.isArray(tags) ? tags.filter(t =>
        t && t.id && t.id > 0 && t.name && String(t.id).trim() !== ''
    ) : [];
    const safeSubordinates = Array.isArray(subordinates) ? subordinates.filter(s =>
        s && s.id && s.id > 0 && s.name && s.email && String(s.id).trim() !== ''
    ) : [];

    // All users that can be assigned (manager + subordinates)
    const assignableUsers = [
        {
            id: manager.id,
            name: manager.name + ' (You)',
            email: manager.email,
        },
        ...safeSubordinates
    ];

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        parent_id: parent_id ? parent_id.toString() : 'none',
        assignment_type: 'hierarchy', // Always hierarchy for manager folders
        assignment_ids: [manager.id] as number[], // Include manager by default
        tag_ids: [] as number[],
    });

    const toggleTag = (tagId: number) => {
        const newSelectedTags = selectedTags.includes(tagId)
            ? selectedTags.filter(id => id !== tagId)
            : [...selectedTags, tagId];

        setSelectedTags(newSelectedTags);
        setData('tag_ids', newSelectedTags);
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

        // Ensure manager is always included
        const assignmentIds = data.assignment_ids.includes(manager.id)
            ? data.assignment_ids
            : [...data.assignment_ids, manager.id];

        // Update form data with current selections
        setData(prev => ({
            ...prev,
            tag_ids: selectedTags,
            assignment_ids: assignmentIds,
        }));

        post(route('manager.folders.store'));
    };

    const parentFolder = parent_id && safeFolders.length > 0 ? safeFolders.find(f => f.id === parent_id) : null;
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Your Documents',
            href: route('employee.folders.index'),
        },
        {
            title: 'Create Team Folder',
            href: route('employee.folders.index'),
        }
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Team Folder" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Create Team Folder
                        </h1>
                        <p className="text-muted-foreground">
                            Create a new folder for your team to organize documents
                        </p>
                </div>

                {parentFolder && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Parent Folder</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <Folder className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium">{parentFolder.name}</p>
                                    <p className="text-sm text-muted-foreground">{parentFolder.full_path}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}






                <form onSubmit={handleSubmit} className="space-y-6 grid grid-cols-2 gap-4">
                    {/* Parent Folder Info */}

                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Folder Information</CardTitle>
                            <CardDescription>
                                Enter the basic details for your new team folder
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Folder Name *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Enter folder name"
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
                                    placeholder="Enter folder description (optional)"
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive">{errors.description}</p>
                                )}
                            </div>

                            {/* Parent Folder Selection (if not set via URL) */}
                            {!parent_id && (
                                <div className="space-y-2">
                                    <Label htmlFor="parent">Parent Folder</Label>
                                    <Select
                                        value={data.parent_id}
                                        onValueChange={(value) => setData('parent_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select parent folder (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No parent (root folder)</SelectItem>
                                            {safeFolders.length > 0 ? (
                                                safeFolders.map((folder) => (
                                                    <SelectItem key={folder.id} value={folder.id.toString()}>
                                                        {folder.full_path}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="no-folders" disabled>
                                                    No folders available - create your first folder at root level
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {errors.parent_id && (
                                        <p className="text-sm text-destructive">{errors.parent_id}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        You can only create folders inside folders you created yourself.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Team Access */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Team Access</CardTitle>
                            <CardDescription>
                                Choose which team members should have access to this folder
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Access Level Info */}
                            <Alert>
                                <Users className="h-4 w-4" />
                                <AlertDescription>
                                    This folder will use hierarchy access. Selected team members, their managers, and their direct reports will automatically have access.
                                </AlertDescription>
                            </Alert>

                            {/* Team Member Selection */}
                            <div className="space-y-3">
                                <Label>Select Team Members *</Label>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3 md:grid-cols-2">
                                    {assignableUsers.map((user) => (
                                        <div key={user.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`assignment-${user.id}`}
                                                checked={data.assignment_ids?.includes(user.id)}
                                                onCheckedChange={(checked) =>
                                                    handleAssignmentIdChange(user.id, checked as boolean)
                                                }
                                                disabled={user.id === manager.id} // Manager is always included
                                            />
                                            <Label
                                                htmlFor={`assignment-${user.id}`}
                                                className="text-sm font-normal cursor-pointer flex-1"
                                            >
                                                <div>
                                                    <p className={user.id === manager.id ? 'font-medium' : ''}>{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                                {errors.assignment_ids && (
                                    <p className="text-sm text-destructive">{errors.assignment_ids}</p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                    * You are automatically included and cannot be removed
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tags */}
                    {safeTags.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Tags</CardTitle>
                                <CardDescription>
                                    Add tags to help organize and categorize this folder
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {safeTags.filter(tag => tag && tag.id).map((tag) => (
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
                                    {selectedTags.length > 0 && (
                                        <div className="text-sm text-muted-foreground">
                                            {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Submit Actions */}
                    <Card>
                        <CardContent className="">
                            <div className="flex gap-4">
                                <Button
                                    type="submit"
                                    disabled={processing || !data.name.trim()}
                                    className="flex-1"
                                >
                                    {processing ? (
                                        <>
                                            <FolderPlus className="mr-2 h-4 w-4 animate-spin" />
                                            Creating Folder...
                                        </>
                                    ) : (
                                        <>
                                            <FolderPlus className="mr-2 h-4 w-4" />
                                            Create Team Folder
                                        </>
                                    )}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={route('employee.folders.index', parent_id ? { parent_id } : {})}>
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
