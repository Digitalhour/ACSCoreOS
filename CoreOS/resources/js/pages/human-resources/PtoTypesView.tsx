import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import HrLayout from '@/layouts/settings/hr-layout';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Textarea} from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import {cn} from '@/lib/utils';
import {type BreadcrumbItem} from '@/types';
import {Head} from '@inertiajs/react';
import axios from 'axios';
import {
    Check,
    Edit,
    Eye,
    EyeOff,
    Gavel,
    Info,
    Loader2,
    Plus,
    Save,
    Search,
    Settings2,
    Trash2,
    Users
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'PTO Dashboard', href: '/admin' },
    { title: 'PTO Types', href: '/admin/pto-types' },
];

// --- Interface Definitions ---
interface User {
    id: number;
    name: string;
    email: string;
}

interface PtoType {
    id: number;
    name: string;
    code: string;
    description?: string;
    color: string;
    multi_level_approval: boolean;
    disable_hierarchy_approval: boolean;
    specific_approvers?: number[];
    approver_users?: User[];
    uses_balance: boolean;
    carryover_allowed: boolean;
    negative_allowed: boolean;
    affects_schedule: boolean;
    show_in_department_calendar: boolean;
    is_active: boolean;
    sort_order: number;
    usage_stats?: {
        policies_count: number;
        requests_count: number;
        active_requests_count: number;
        users_with_balance_count: number;
    };
}

interface FormData {
    name: string;
    code: string;
    description: string;
    color: string;
    multi_level_approval: boolean;
    disable_hierarchy_approval: boolean;
    specific_approvers: number[];
    uses_balance: boolean;
    carryover_allowed: boolean;
    negative_allowed: boolean;
    affects_schedule: boolean;
    show_in_department_calendar: boolean;
    is_active: boolean;
    sort_order: number;
}

const initialFormData: FormData = {
    name: '',
    code: '',
    description: '',
    color: '#3B82F6',
    multi_level_approval: false,
    disable_hierarchy_approval: false,
    specific_approvers: [],
    uses_balance: true,
    carryover_allowed: false,
    negative_allowed: false,
    affects_schedule: true,
    show_in_department_calendar: true,
    is_active: true,
    sort_order: 0,
};

// --- User Selector Component ---
interface UserSelectorProps {
    users: User[];
    selectedUserIds: number[];
    onChange: (selectedIds: number[]) => void;
    disabled?: boolean;
}

function UserSelector({ users, selectedUserIds, onChange, disabled }: UserSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSelect = (userId: number) => {
        const newSelectedIds = selectedUserIds.includes(userId)
            ? selectedUserIds.filter((id) => id !== userId)
            : [...selectedUserIds, userId];
        onChange(newSelectedIds);
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    return (
        <div className={cn("space-y-2", disabled && "opacity-50")}>
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    disabled={disabled}
                />
            </div>
            <div className="max-h-60 overflow-y-auto rounded-md border">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                        <div
                            key={user.id}
                            onClick={() => !disabled && handleSelect(user.id)}
                            className={cn(
                                "flex cursor-pointer items-center justify-between p-3 text-sm hover:bg-muted/50",
                                disabled && "cursor-not-allowed"
                            )}
                        >
                            <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                            <div
                                className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-full border border-primary",
                                    selectedUserIds.includes(user.id) ? "bg-primary text-primary-foreground" : "bg-transparent"
                                )}
                            >
                                {selectedUserIds.includes(user.id) && <Check className="h-4 w-4" />}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">No users found.</div>
                )}
            </div>
        </div>
    );
}

// --- PTO Type Row Component ---
interface PtoTypeRowProps {
    ptoType: PtoType;
    onEdit: (ptoType: PtoType) => void;
    onDelete: (ptoType: PtoType) => void;
    onToggleActive: (ptoType: PtoType) => void;
}

function PtoTypeRow({ ptoType, onEdit, onDelete, onToggleActive }: PtoTypeRowProps) {
    return (
        <TableRow className={cn(ptoType.is_active ? "bg-green-50" : "bg-gray-50")}>
            <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: ptoType.color }} />
                    <div>
                        <div className="flex items-center gap-2">
                            {ptoType.name}
                            <Badge variant={ptoType.is_active ? "default" : "secondary"} className={cn(
                                ptoType.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            )}>
                                {ptoType.is_active ? "Active" : "Inactive"}
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{ptoType.code}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-wrap gap-1">
                    <Badge variant={ptoType.multi_level_approval ? "secondary" : "outline"}>
                        {ptoType.multi_level_approval ? "Multi-level" : "Manager Only"}
                    </Badge>
                    {ptoType.disable_hierarchy_approval && <Badge variant="destructive">Hierarchy Disabled</Badge>}
                    {(ptoType.approver_users?.length || 0) > 0 && (
                        <Badge variant="default" className="gap-1">
                            <Users className="h-3 w-3" />
                            {ptoType.approver_users?.length}
                        </Badge>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-wrap gap-1">
                    {ptoType.uses_balance && <Badge variant="outline">Uses Balance</Badge>}
                    {ptoType.carryover_allowed && <Badge variant="outline">Carryover</Badge>}
                    {ptoType.negative_allowed && <Badge variant="outline">Negative OK</Badge>}
                    {ptoType.affects_schedule && <Badge variant="outline">Affects Schedule</Badge>}
                    {ptoType.show_in_department_calendar && <Badge variant="outline">Department Calendar</Badge>}
                </div>
            </TableCell>
            <TableCell>
                <Badge variant={ptoType.is_active ? 'default' : 'secondary'} className={cn(
                    ptoType.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800',
                    'hover:bg-current'
                )}>
                    {ptoType.is_active ? 'Active' : 'Inactive'}
                </Badge>
            </TableCell>
            <TableCell>
                {ptoType.usage_stats && (
                    <div className="text-sm text-muted-foreground">
                        {ptoType.usage_stats.requests_count} requests
                        {ptoType.usage_stats.policies_count > 0 && (
                            <div>{ptoType.usage_stats.policies_count} policies</div>
                        )}
                    </div>
                )}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onToggleActive(ptoType)}
                        title={ptoType.is_active ? "Deactivate" : "Activate"}
                    >
                        {ptoType.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(ptoType)}
                        title="Edit"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => onDelete(ptoType)}
                        disabled={ptoType.usage_stats && (ptoType.usage_stats.requests_count > 0 || ptoType.usage_stats.policies_count > 0)}
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}

// --- Main View Component ---
export default function PtoTypesView() {
    const [ptoTypes, setPtoTypes] = useState<PtoType[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPtoType, setCurrentPtoType] = useState<PtoType | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [ptoTypeToDelete, setPtoTypeToDelete] = useState<PtoType | null>(null);

    // Filter active and inactive PTO types
    const activePtoTypes = useMemo(() =>
        ptoTypes.filter(pt => pt.is_active === true), [ptoTypes]
    );

    const inactivePtoTypes = useMemo(() =>
        ptoTypes.filter(pt => pt.is_active === false), [ptoTypes]
    );

    const fetchPtoTypes = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/pto-types?with_stats=true');
            const responseData = response.data.data || response.data;

            // Ensure proper boolean conversion for is_active
            const processedData = Array.isArray(responseData) ? responseData.map(item => ({
                ...item,
                is_active: Boolean(item.is_active),
                multi_level_approval: Boolean(item.multi_level_approval),
                disable_hierarchy_approval: Boolean(item.disable_hierarchy_approval),
                uses_balance: Boolean(item.uses_balance),
                carryover_allowed: Boolean(item.carryover_allowed),
                negative_allowed: Boolean(item.negative_allowed),
                affects_schedule: Boolean(item.affects_schedule),
                show_in_department_calendar: Boolean(item.show_in_department_calendar),
            })) : [];

            console.log('Processed PTO Types:', processedData);
            console.log('Active count:', processedData.filter(pt => pt.is_active).length);
            console.log('Inactive count:', processedData.filter(pt => !pt.is_active).length);

            setPtoTypes(processedData);
        } catch (error) {
            console.error('Error fetching PTO types:', error);
            toast.error('Failed to load PTO types. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await axios.get('/api/users/list');
            setUsers(response.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users for selection.');
        }
    }, []);

    useEffect(() => {
        fetchPtoTypes();
        fetchUsers();
    }, [fetchPtoTypes, fetchUsers]);

    const handleChange = useCallback((field: keyof FormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    const resetForm = useCallback(() => {
        setFormData(initialFormData);
        setIsEditing(false);
        setCurrentPtoType(null);
        setShowFormModal(false);
    }, []);

    const handleCreate = useCallback(() => {
        setFormData(initialFormData);
        setIsEditing(false);
        setCurrentPtoType(null);
        setShowFormModal(true);
    }, []);

    const handleEdit = useCallback((ptoType: PtoType) => {
        setCurrentPtoType(ptoType);
        setFormData({
            name: ptoType.name,
            code: ptoType.code || '',
            description: ptoType.description || '',
            color: ptoType.color,
            multi_level_approval: ptoType.multi_level_approval,
            disable_hierarchy_approval: ptoType.disable_hierarchy_approval,
            specific_approvers: ptoType.specific_approvers || [],
            uses_balance: ptoType.uses_balance,
            carryover_allowed: ptoType.carryover_allowed,
            negative_allowed: ptoType.negative_allowed,
            affects_schedule: ptoType.affects_schedule,
            show_in_department_calendar: ptoType.show_in_department_calendar,
            is_active: ptoType.is_active,
            sort_order: ptoType.sort_order,
        });
        setIsEditing(true);
        setShowFormModal(true);
    }, []);

    const handleDelete = useCallback((ptoType: PtoType) => {
        setPtoTypeToDelete(ptoType);
        setShowDeleteAlert(true);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!ptoTypeToDelete) return;
        try {
            await axios.delete(`/api/pto-types/${ptoTypeToDelete.id}`);
            await fetchPtoTypes();
            toast.success(`PTO type "${ptoTypeToDelete.name}" deleted successfully.`);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete PTO type.');
        } finally {
            setShowDeleteAlert(false);
            setPtoTypeToDelete(null);
        }
    }, [ptoTypeToDelete, fetchPtoTypes]);

    const toggleActive = useCallback(async (ptoType: PtoType) => {
        try {
            await axios.patch(`/api/pto-types/${ptoType.id}/toggle-active`);
            await fetchPtoTypes();
            toast.success(`PTO type "${ptoType.name}" status updated.`);
        } catch (error) {
            toast.error('Failed to update PTO type status.');
        }
    }, [fetchPtoTypes]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('PTO type name is required.');
            return;
        }

        setSubmitting(true);
        const url = isEditing ? `/api/pto-types/${currentPtoType!.id}` : '/api/pto-types';
        const method = isEditing ? 'put' : 'post';

        try {
            const response = await axios[method](url, formData);
            toast.success(response.data.message);
            await fetchPtoTypes();
            resetForm();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save PTO type.', {
                description: error.response?.data?.details,
            });
        } finally {
            setSubmitting(false);
        }
    }, [formData, isEditing, currentPtoType, resetForm, fetchPtoTypes]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage PTO Types" />

            <HrLayout>
                <div className="flex flex-1 flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">Manage PTO Types</h1>
                        <Button onClick={handleCreate} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add PTO Type
                        </Button>
                    </div>

                    <Card>
                        <CardContent className="p-6">
                            {loading ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : ptoTypes.length === 0 ? (
                                <div className="py-12 text-center">
                                    <h3 className="text-lg font-medium">No PTO Types Found</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">Get started by creating a new PTO type.</p>
                                    <Button onClick={handleCreate} className="mt-4 gap-2">
                                        <Plus className="h-4 w-4" /> Add PTO Type
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Summary Stats */}
                                    <div className="flex gap-4 rounded-lg bg-muted/30 p-4">
                                        <div className="text-sm">
                                            <span className="font-medium">Total:</span> {ptoTypes.length}
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-medium text-green-700">Active:</span> {activePtoTypes.length}
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-medium text-gray-600">Inactive:</span> {inactivePtoTypes.length}
                                        </div>
                                    </div>

                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name & Status</TableHead>
                                                    <TableHead>Approval Rules</TableHead>
                                                    <TableHead>Properties</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Usage</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {/* Active PTO Types */}
                                                {activePtoTypes.length > 0 && (
                                                    <>
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="bg-green-100 p-3 font-semibold text-green-800">
                                                                Active PTO Types ({activePtoTypes.length})
                                                            </TableCell>
                                                        </TableRow>
                                                        {activePtoTypes.map((ptoType) => (
                                                            <PtoTypeRow
                                                                key={ptoType.id}
                                                                ptoType={ptoType}
                                                                onEdit={handleEdit}
                                                                onDelete={handleDelete}
                                                                onToggleActive={toggleActive}
                                                            />
                                                        ))}
                                                    </>
                                                )}

                                                {/* Inactive PTO Types */}
                                                {inactivePtoTypes.length > 0 && (
                                                    <>
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="bg-gray-100 p-3 font-semibold text-gray-700">
                                                                Inactive PTO Types ({inactivePtoTypes.length})
                                                            </TableCell>
                                                        </TableRow>
                                                        {inactivePtoTypes.map((ptoType) => (
                                                            <PtoTypeRow
                                                                key={ptoType.id}
                                                                ptoType={ptoType}
                                                                onEdit={handleEdit}
                                                                onDelete={handleDelete}
                                                                onToggleActive={toggleActive}
                                                            />
                                                        ))}
                                                    </>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Form Modal */}
                <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
                    <DialogContent className="max-h-[95vh] max-w-7xl min-w-6xl overflow-y-auto p-0">
                        <form onSubmit={handleSubmit}>
                            <div className="p-6">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl">{isEditing ? 'Edit PTO Type' : 'Create New PTO Type'}</DialogTitle>
                                    <DialogDescription>
                                        {isEditing ? `Update the details for "${currentPtoType?.name}".` : 'Fill out the form to add a new PTO type.'}
                                    </DialogDescription>
                                </DialogHeader>
                            </div>

                            <div className="grid grid-cols-1 gap-x-8 border-t px-6 py-8 lg:grid-cols-5">
                                {/* Left Column */}
                                <div className="space-y-8 lg:col-span-3">
                                    {/* Basic Info */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                                                <Info className="h-5 w-5 text-secondary-foreground" />
                                            </div>
                                            <h3 className="text-lg font-semibold">Basic Information</h3>
                                        </div>
                                        <div className="space-y-4 rounded-md border p-4">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                <div className="space-y-2 sm:col-span-2">
                                                    <Label htmlFor="modal-name">Name <span className="text-red-500">*</span></Label>
                                                    <Input id="modal-name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g., Vacation" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="modal-code">Code</Label>
                                                    <Input id="modal-code" value={formData.code} onChange={(e) => handleChange('code', e.target.value.toUpperCase())} maxLength={10} placeholder="e.g., VAC" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="modal-description">Description</Label>
                                                <Textarea id="modal-description" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows={3} placeholder="Briefly describe when this PTO type should be used..." />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Approval Rules */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                                                <Gavel className="h-5 w-5 text-secondary-foreground" />
                                            </div>
                                            <h3 className="text-lg font-semibold">Approval Rules</h3>
                                        </div>
                                        <div className="space-y-4 rounded-md border p-4">
                                            <div className="flex items-center justify-between rounded-lg border p-3">
                                                <div>
                                                    <Label htmlFor="modal-multi_level_approval">Multi-level Approval</Label>
                                                    <p className="text-xs text-muted-foreground">Use a tiered approval workflow instead of manager-only.</p>
                                                </div>
                                                <Switch id="modal-multi_level_approval" checked={formData.multi_level_approval} onCheckedChange={(c) => handleChange('multi_level_approval', c)} />
                                            </div>

                                            {formData.multi_level_approval && (
                                                <div className="space-y-4 rounded-lg bg-muted/30 p-4">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor="modal-disable_hierarchy_approval">Skip Direct Manager</Label>
                                                        <Switch id="modal-disable_hierarchy_approval" checked={formData.disable_hierarchy_approval} onCheckedChange={(c) => handleChange('disable_hierarchy_approval', c)} />
                                                    </div>
                                                    <div className="space-y-2 pt-2">
                                                        <Label className="font-semibold">Add Specific Approvers</Label>
                                                        <p className="text-sm text-muted-foreground">Force specific users into the approval chain.</p>
                                                        <UserSelector users={users} selectedUserIds={formData.specific_approvers} onChange={(ids) => handleChange('specific_approvers', ids)} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="mt-8 space-y-8 lg:col-span-2 lg:mt-0">
                                    {/* Properties */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                                                <Settings2 className="h-5 w-5 text-secondary-foreground" />
                                            </div>
                                            <h3 className="text-lg font-semibold">Properties</h3>
                                        </div>
                                        <div className="space-y-1 rounded-md border p-2">
                                            <SettingToggle id="modal-is_active" label="PTO Type is Active" description="Inactive types cannot be requested." checked={formData.is_active} onCheckedChange={(c) => handleChange('is_active', c)} />
                                            <SettingToggle id="modal-uses_balance" label="Track Balance" description="Requests will deduct from an assigned policy." checked={formData.uses_balance} onCheckedChange={(c) => handleChange('uses_balance', c)} />
                                            <SettingToggle id="modal-carryover_allowed" label="Allow Carryover" description="Allow remaining balance to roll over." checked={formData.carryover_allowed} onCheckedChange={(c) => handleChange('carryover_allowed', c)} />
                                            <SettingToggle id="modal-negative_allowed" label="Allow Negative Balance" description="Users can request more time than they have." checked={formData.negative_allowed} onCheckedChange={(c) => handleChange('negative_allowed', c)} />
                                            <SettingToggle id="modal-affects_schedule" label="Show on Schedule" description="Display approved requests on the schedule." checked={formData.affects_schedule} onCheckedChange={(c) => handleChange('affects_schedule', c)} />
                                            <SettingToggle id="modal-show_in_department_calendar" label="Show on Department Calendar" description="Display this pto on the department calendar." checked={formData.show_in_department_calendar} onCheckedChange={(c) => handleChange('show_in_department_calendar', c)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2 rounded-md border p-4">
                                        <Label htmlFor="modal-color">Calendar Color</Label>
                                        <Input id="modal-color" type="color" value={formData.color} onChange={(e) => handleChange('color', e.target.value)} className="h-10 w-20 p-1" />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="sticky bottom-0 mt-4 gap-2 border-t bg-background p-4">
                                <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>Cancel</Button>
                                <Button type="submit" disabled={submitting} className="gap-2">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {isEditing ? 'Save Changes' : 'Create PTO Type'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Alert Dialog */}
                <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogDescription>
                            This will permanently delete the PTO type "{ptoTypeToDelete?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </HrLayout>
        </AppLayout>
    );
}

// Helper component for consistent toggle style
interface SettingToggleProps {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}

function SettingToggle({ id, label, description, checked, onCheckedChange }: SettingToggleProps) {
    return (
        <div className="flex items-start justify-between rounded-md p-2 hover:bg-muted/50">
            <div className="mr-4">
                <Label htmlFor={id} className="font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
}
