import React, {useState} from 'react';
import {Head, router, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import {Switch} from '@/components/ui/switch';
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {toast} from 'sonner';
import {
    Activity,
    Ban,
    BarChart,
    Bell,
    BookOpen,
    BookOpenText,
    Bot,
    BotMessageSquareIcon,
    Building,
    Calendar,
    CalendarDays,
    CalendarRange,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Clock,
    Code,
    Cog,
    Database,
    DollarSign,
    Download,
    Edit,
    ExternalLink,
    Files,
    FileText,
    Folder,
    GraduationCap,
    Home,
    Image,
    ImageUp,
    LayoutDashboard,
    LayoutList,
    Mail,
    Map,
    Menu,
    MessageCircle,
    MessageSquare,
    Minus,
    MoreHorizontal,
    Package,
    PenTool,
    Phone,
    Plus,
    Power,
    Save,
    Search,
    Settings,
    Shield,
    ShieldCheck,
    ShipWheel,
    Smartphone,
    ThumbsUp,
    Trash,
    Trash2,
    TrendingUp,
    Upload,
    User,
    UserCheck,
    UserPlus,
    Users,
    Warehouse,
} from 'lucide-react';

interface NavigationItem {
    id: number;
    title: string;
    href: string;
    icon?: string;
    description?: string;
    parent_id?: number;
    type: 'header' | 'category' | 'footer';
    sort_order: number;
    is_active: boolean;
    roles?: string[];
    permissions?: string[];
    children?: NavigationItem[];
    parent?: NavigationItem;
}

interface Role {
    id: number;
    name: string;
    description?: string;
}

interface Permission {
    id: number;
    name: string;
    description?: string;
}

interface Props {
    navigationItems: {
        header?: NavigationItem[];
        category?: NavigationItem[];
        footer?: NavigationItem[];
    };
    roles: Role[];
    permissions: Permission[];
    availableIcons: string[];
}

type NavigationFormData = {
    title: string;
    href: string;
    icon: string;
    description: string;
    parent_id: string;
    type: 'header' | 'category' | 'footer';
    sort_order: number;
    is_active: boolean;
    roles: string[];
    permissions: string[];
};



const iconMap: Record<string, LucideIcon> = {
    Activity,
    Ban,
    BarChart,
    Bell,
    BookOpen,
    BookOpenText,
    Bot,
    BotMessageSquareIcon,
    Building,
    Calendar,
    CalendarDays,
    CalendarRange,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Clock,
    Code,
    Cog,
    Database,
    DollarSign,
    Download,
    Edit,
    ExternalLink,
    Files,
    FileText,
    Folder,
    GraduationCap,
    Home,
    Image,
    ImageUp,
    LayoutDashboard,
    LayoutList,
    Mail,
    Map,
    Menu,
    MessageCircle,
    MessageSquare,
    Minus,
    MoreHorizontal,
    Package,
    PenTool,
    Phone,
    Plus,
    Power,
    Save,
    Search,
    Settings,
    Shield,
    ShieldCheck,
    ShipWheel,
    Smartphone,
    ThumbsUp,
    Trash,
    Trash2,
    TrendingUp,
    Upload,
    User,
    UserCheck,
    UserPlus,
    Users,
    Warehouse,
};
const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = iconMap[iconName];
    if (!IconComponent) return <span className="text-xs text-muted-foreground">{iconName}</span>;
    return <IconComponent className="w-4 h-4" />;
};
export default function NavigationManagement({
                                                 navigationItems,
                                                 roles,
                                                 permissions,
                                                 availableIcons,
                                             }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm<NavigationFormData>({
        title: '',
        href: '',
        icon: '',
        description: '',
        parent_id: '',
        type: 'category',
        sort_order: 0,
        is_active: true,
        roles: [],
        permissions: [],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = {
            ...data,
            parent_id: data.parent_id || null,
            roles: data.roles.length > 0 ? data.roles : null,
            permissions: data.permissions.length > 0 ? data.permissions : null,
        };

        if (editingItem) {
            put(`/dev-ops/navigation/${editingItem.id}`, {
                onSuccess: () => {
                    setDialogOpen(false);
                    reset();
                    setEditingItem(null);
                    toast.success('Navigation item updated successfully!');
                },
                onError: () => {
                    toast.error('Failed to update navigation item');
                },
            });
        } else {
            post('/dev-ops/navigation', {
                onSuccess: () => {
                    setDialogOpen(false);
                    reset();
                    toast.success('Navigation item created successfully!');
                },
                onError: () => {
                    toast.error('Failed to create navigation item');
                },
            });
        }
    };

    const handleEdit = (item: NavigationItem) => {
        setEditingItem(item);
        setData({
            title: item.title,
            href: item.href,
            icon: item.icon || '',
            description: item.description || '',
            parent_id: item.parent_id?.toString() || '',
            type: item.type,
            sort_order: item.sort_order,
            is_active: item.is_active,
            roles: item.roles || [],
            permissions: item.permissions || [],
        });
        setDialogOpen(true);
    };

    const handleDelete = (item: NavigationItem) => {
        router.delete(`/dev-ops/navigation/${item.id}`, {
            onSuccess: () => {
                toast.success('Navigation item deleted successfully!');
            },
            onError: () => {
                toast.error('Failed to delete navigation item');
            },
        });
    };

    const handleToggleActive = (item: NavigationItem) => {
        router.post(`/dev-ops/navigation/${item.id}/toggle-active`, {}, {
            onSuccess: () => {
                toast.success(`Navigation item ${item.is_active ? 'deactivated' : 'activated'} successfully!`);
            },
        });
    };



    const openCreateDialog = (type: 'header' | 'category' | 'footer') => {
        reset();
        setEditingItem(null);
        setData('type', type);
        setDialogOpen(true);
    };

    const getAvailableParents = (type: string) => {
        if (type !== 'category') return [];
        return navigationItems.category?.filter(item => !item.parent_id) || [];
    };

    const renderNavigationTable = (items: NavigationItem[], type: string) => {
        if (!items || items.length === 0) {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    No {type} navigation items found
                </div>
            );
        }

        // Filter to only show top-level items (no parent_id)
        // Children will be rendered through their parent's children array
        const topLevelItems = items.filter(item => !item.parent_id);

        return (
            <Table >
                <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Icon</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className={"overflow-auto"}>
                    {topLevelItems.map((item) => (
                        <React.Fragment key={item.id}>
                            <TableRow>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {item.icon && (
                                            <div className="w-4 h-4 text-muted-foreground flex-shrink-0">
                                                {renderIcon(item.icon)}
                                            </div>
                                        )}
                                        <span className="truncate">{item.title}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 min-w-0">
                                        <code className="text-xs bg-muted px-1 rounded truncate max-w-[150px]">
                                            {item.href}
                                        </code>
                                        {item.href !== '#' && (
                                            <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {item.icon && renderIcon(item.icon)}
                                        <Badge variant="outline" className="truncate">{item.icon || 'None'}</Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {item.parent ? (
                                        <Badge variant="secondary" className="truncate">{item.parent.title}</Badge>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">{item.sort_order}</TableCell>
                                <TableCell>
                                    {item.roles && item.roles.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                                            {item.roles.slice(0, 2).map((role) => (
                                                <Badge key={role} variant="outline" className="text-xs truncate">
                                                    {role}
                                                </Badge>
                                            ))}
                                            {item.roles.length > 2 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{item.roles.length - 2}
                                                </Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">All users</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {item.permissions && item.permissions.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                                            {item.permissions.slice(0, 2).map((permission) => (
                                                <Badge key={permission} variant="outline" className="text-xs truncate">
                                                    {permission}
                                                </Badge>
                                            ))}
                                            {item.permissions.length > 2 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{item.permissions.length - 2}
                                                </Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">None</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={item.is_active}
                                        onCheckedChange={() => handleToggleActive(item)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onSelect={(e) => e.preventDefault()}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Navigation Item</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete "{item.title}"? This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(item)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            {/* Render children */}
                            {item.children?.map((child) => (
                                <TableRow key={child.id} className="bg-muted/20">
                                    <TableCell className="font-medium pl-8">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-muted-foreground">↳</span>
                                            {child.icon && (
                                                <div className="w-4 h-4 text-muted-foreground flex-shrink-0">
                                                    {renderIcon(child.icon)}
                                                </div>
                                            )}
                                            <span className="truncate">{child.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 min-w-0">
                                            <code className="text-xs bg-muted px-1 rounded truncate max-w-[150px]">
                                                {child.href}
                                            </code>
                                            {child.href !== '#' && (
                                                <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {child.icon && renderIcon(child.icon)}
                                            <Badge variant="outline" className="truncate">{child.icon || 'None'}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="truncate">{item.title}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">{child.sort_order}</TableCell>
                                    <TableCell>
                                        {child.roles && child.roles.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 max-w-[140px]">
                                                {child.roles.slice(0, 2).map((role) => (
                                                    <Badge key={role} variant="outline" className="text-xs truncate">
                                                        {role}
                                                    </Badge>
                                                ))}
                                                {child.roles.length > 2 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{child.roles.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">All users</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {child.permissions && child.permissions.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 max-w-[140px]">
                                                {child.permissions.slice(0, 2).map((permission) => (
                                                    <Badge key={permission} variant="outline" className="text-xs truncate">
                                                        {permission}
                                                    </Badge>
                                                ))}
                                                {child.permissions.length > 2 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{child.permissions.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">None</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={child.is_active}
                                            onCheckedChange={() => handleToggleActive(child)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(child)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onSelect={(e) => e.preventDefault()}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Navigation Item</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete "{child.title}"? This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(child)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        );
    };

    return (
        <AppLayout>
            <Head title="Navigation Management" />

            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Navigation Management</h1>
                        <p className="text-muted-foreground">
                            Manage your application's navigation menu items, roles, and permissions.
                        </p>
                    </div>
                    <div className="flex gap-2">

                    </div>
                </div>

                <Tabs defaultValue="header" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="header">Header Navigation</TabsTrigger>
                        <TabsTrigger value="category">Category Navigation</TabsTrigger>
                        <TabsTrigger value="footer">Footer Navigation</TabsTrigger>
                    </TabsList>

                    <TabsContent value="header" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Header Navigation Items</CardTitle>
                                    <CardDescription>
                                        Items displayed in the main navigation header
                                    </CardDescription>
                                </div>
                                <Button onClick={() => openCreateDialog('header')} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Header Item
                                </Button>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <div >
                                    {renderNavigationTable(navigationItems.header || [], 'header')}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="category" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Category Navigation Items</CardTitle>
                                    <CardDescription>
                                        Collapsible categories and their sub-items in the sidebar
                                    </CardDescription>
                                </div>
                                <Button onClick={() => openCreateDialog('category')} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Category Item
                                </Button>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <div >
                                    {renderNavigationTable(navigationItems.category || [], 'category')}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="footer" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Footer Navigation Items</CardTitle>
                                    <CardDescription>
                                        Items displayed at the bottom of the sidebar
                                    </CardDescription>
                                </div>
                                <Button onClick={() => openCreateDialog('footer')} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Footer Item
                                </Button>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <div >
                                    {renderNavigationTable(navigationItems.footer || [], 'footer')}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Create/Edit Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingItem ? 'Edit Navigation Item' : 'Create Navigation Item'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingItem
                                    ? 'Update the navigation item details below.'
                                    : 'Fill in the details to create a new navigation item.'}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title *</Label>
                                    <Input
                                        id="title"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        placeholder="Navigation item title"
                                    />
                                    {errors.title && (
                                        <p className="text-sm text-destructive">{errors.title}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="href">URL *</Label>
                                    <Input
                                        id="href"
                                        value={data.href}
                                        onChange={(e) => setData('href', e.target.value)}
                                        placeholder="/example-page or # for categories"
                                    />
                                    {errors.href && (
                                        <p className="text-sm text-destructive">{errors.href}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="icon">Icon</Label>
                                    <Select value={data.icon || "none"} onValueChange={(value) => setData('icon', value === "none" ? "" : value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an icon">
                                                {data.icon && (
                                                    <div className="flex items-center gap-2">
                                                        {renderIcon(data.icon)}
                                                        <span>{data.icon}</span>
                                                    </div>
                                                )}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                <span>No Icon</span>
                                            </SelectItem>
                                            {availableIcons.map((icon) => (
                                                <SelectItem key={icon} value={icon}>
                                                    <div className="flex items-center gap-2">
                                                        {renderIcon(icon)}
                                                        <span>{icon}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sort_order">Sort Order *</Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        value={data.sort_order}
                                        onChange={(e) => setData('sort_order', parseInt(e.target.value) || 0)}
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Type *</Label>
                                    <Select
                                        value={data.type}
                                        onValueChange={(value) => setData('type', value as 'header' | 'category' | 'footer')}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="header">Header</SelectItem>
                                            <SelectItem value="category">Category</SelectItem>
                                            <SelectItem value="footer">Footer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {data.type === 'category' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="parent_id">Parent Category</Label>
                                        <Select
                                            value={data.parent_id || "none"}
                                            onValueChange={(value) => setData('parent_id', value === "none" ? "" : value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select parent (optional)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No Parent</SelectItem>
                                                {getAvailableParents(data.type).map((parent) => (
                                                    <SelectItem key={parent.id} value={parent.id.toString()}>
                                                        {parent.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Optional description"
                                    rows={2}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Roles (leave empty for all users)</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                                    {roles.map((role) => (
                                        <div key={role.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`role-${role.id}`}
                                                checked={data.roles.includes(role.name)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setData('roles', [...data.roles, role.name]);
                                                    } else {
                                                        setData('roles', data.roles.filter(r => r !== role.name));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`role-${role.id}`} className="text-sm">
                                                {role.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Permissions (leave empty for no restrictions)</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                                    {permissions.map((permission) => (
                                        <div key={permission.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`permission-${permission.id}`}
                                                checked={data.permissions.includes(permission.name)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setData('permissions', [...data.permissions, permission.name]);
                                                    } else {
                                                        setData('permissions', data.permissions.filter(p => p !== permission.name));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`permission-${permission.id}`} className="text-sm">
                                                {permission.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => setData('is_active', !!checked)}
                                />
                                <Label htmlFor="is_active">Active</Label>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setDialogOpen(false);
                                        reset();
                                        setEditingItem(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing
                                        ? 'Saving...'
                                        : editingItem
                                            ? 'Update Item'
                                            : 'Create Item'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
