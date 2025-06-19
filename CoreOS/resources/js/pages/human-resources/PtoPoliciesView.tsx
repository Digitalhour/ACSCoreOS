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
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Textarea} from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import HrLayout from "@/layouts/settings/hr-layout";
import {type BreadcrumbItem} from '@/types';
import {Head} from '@inertiajs/react';
import axios from 'axios';
import {Edit, Loader2, Plus, Save, Search, Trash2, User, X} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {toast} from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'PTO Dashboard',
        href: '/admin',
    },
    {
        title: 'PTO Policies',
        href: '/admin/pto-policies',
    },
];

interface User {
    id: number;
    name: string;
    email: string;
    hire_date?: string;
}

interface PtoType {
    id: number;
    name: string;
    code: string;
    color: string;
}

interface PtoPolicy {
    id: number;
    name: string;
    description?: string;
    initial_days: number;
    annual_accrual_amount: number;
    bonus_days_per_year: number;
    rollover_enabled: boolean;
    max_rollover_days?: number;
    max_negative_balance: number;
    years_for_bonus: number;
    accrual_frequency: 'monthly' | 'quarterly' | 'annually';
    prorate_first_year: boolean;
    effective_date: string;
    end_date?: string;
    is_active: boolean;
    pto_type_id: number;
    user_id: number;
    pto_type: PtoType;
    user: User;
    created_at: string;
    updated_at: string;
}

interface FormData {
    name: string;
    description: string;
    initial_days: number;
    annual_accrual_amount: number;
    bonus_days_per_year: number;
    rollover_enabled: boolean;
    max_rollover_days: number | string;
    max_negative_balance: number;
    years_for_bonus: number;
    accrual_frequency: 'monthly' | 'quarterly' | 'annually';
    prorate_first_year: boolean;
    effective_date: string;
    end_date: string;
    is_active: boolean;
    pto_type_id: number | string;
    user_id: number | string;
}

const initialFormData: FormData = {
    name: '',
    description: '',
    initial_days: 0,
    annual_accrual_amount: 0,
    bonus_days_per_year: 0,
    rollover_enabled: false,
    max_rollover_days: '',
    max_negative_balance: 0,
    years_for_bonus: 1,
    accrual_frequency: 'annually',
    prorate_first_year: true,
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
    pto_type_id: '',
    user_id: '',
};

export default function PtoPoliciesView() {
    const [ptoPolicies, setPtoPolicies] = useState<PtoPolicy[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [ptoTypes, setPtoTypes] = useState<PtoType[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [currentPolicy, setCurrentPolicy] = useState<PtoPolicy | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [showForm, setShowForm] = useState(false);

    // Modal state
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [policyToDelete, setPolicyToDelete] = useState<PtoPolicy | null>(null);

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredPolicies, setFilteredPolicies] = useState<PtoPolicy[]>([]);
    const [selectedPtoType, setSelectedPtoType] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [showActiveOnly, setShowActiveOnly] = useState(false);

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            const [policiesResponse, usersResponse, typesResponse] = await Promise.all([
                axios.get('/api/pto-policies'),
                axios.get('/api/users'),
                axios.get('/api/pto-types?active_only=true'),
            ]);

            const policiesData = policiesResponse.data.data || policiesResponse.data;
            const usersData = usersResponse.data.data || usersResponse.data;
            const typesData = typesResponse.data.data || typesResponse.data;

            setPtoPolicies(Array.isArray(policiesData) ? policiesData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
            setPtoTypes(Array.isArray(typesData) ? typesData : []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter policies
    useEffect(() => {
        let filtered = ptoPolicies;

        // Text search
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (policy) =>
                    policy.name?.toLowerCase().includes(searchLower) ||
                    policy.description?.toLowerCase().includes(searchLower) ||
                    policy.pto_type?.name?.toLowerCase().includes(searchLower) ||
                    policy.user?.name?.toLowerCase().includes(searchLower) ||
                    policy.user?.email?.toLowerCase().includes(searchLower),
            );
        }

        // PTO type filter
        if (selectedPtoType) {
            filtered = filtered.filter((policy) => policy.pto_type_id === parseInt(selectedPtoType));
        }

        // User filter
        if (selectedUser) {
            filtered = filtered.filter((policy) => policy.user_id === parseInt(selectedUser));
        }

        // Active only filter
        if (showActiveOnly) {
            filtered = filtered.filter((policy) => policy.is_active);
        }

        setFilteredPolicies(filtered);
    }, [ptoPolicies, searchTerm, selectedPtoType, selectedUser, showActiveOnly]);

    // Handle form input changes
    const handleChange = useCallback((field: keyof FormData, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    }, []);

    // Reset form
    const resetForm = useCallback(() => {
        setFormData(initialFormData);
        setIsEditing(false);
        setCurrentPolicy(null);
        setShowForm(false);
    }, []);

    // Create new policy
    const handleCreate = useCallback(() => {
        resetForm();
        setShowForm(true);
    }, [resetForm]);

    // Edit policy
    const handleEdit = useCallback((policy: PtoPolicy) => {
        setFormData({
            name: policy.name || '',
            description: policy.description || '',
            initial_days: policy.initial_days,
            annual_accrual_amount: policy.annual_accrual_amount,
            bonus_days_per_year: policy.bonus_days_per_year,
            rollover_enabled: policy.rollover_enabled,
            max_rollover_days: policy.max_rollover_days ?? '',
            max_negative_balance: policy.max_negative_balance,
            years_for_bonus: policy.years_for_bonus,
            accrual_frequency: policy.accrual_frequency,
            prorate_first_year: policy.prorate_first_year,
            effective_date: policy.effective_date.split('T')[0], // Convert to YYYY-MM-DD format
            end_date: policy.end_date ? policy.end_date.split('T')[0] : '',
            is_active: policy.is_active,
            pto_type_id: policy.pto_type_id,
            user_id: policy.user_id,
        });

        setCurrentPolicy(policy);
        setIsEditing(true);
        setShowForm(true);
    }, []);

    // Delete policy
    const handleDelete = useCallback((policy: PtoPolicy) => {
        setPolicyToDelete(policy);
        setShowDeleteAlert(true);
    }, []);

    // Confirm delete
    const confirmDelete = useCallback(async () => {
        if (!policyToDelete) return;

        try {
            await axios.delete(`/api/pto-policies/${policyToDelete.id}`);
            setPtoPolicies((prev) => prev.filter((policy) => policy.id !== policyToDelete.id));
            toast.success(`PTO policy "${policyToDelete.name}" deleted successfully.`);
        } catch (error: any) {
            console.error('Error deleting policy:', error);
            const errorMessage = error.response?.data?.error || 'Failed to delete PTO policy.';
            toast.error(errorMessage);
        } finally {
            setShowDeleteAlert(false);
            setPolicyToDelete(null);
        }
    }, [policyToDelete]);

    // Submit form
    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();

            if (!formData.pto_type_id || !formData.user_id) {
                toast.error('PTO type and user are required.');
                return;
            }

            try {
                setSubmitting(true);

                const submitData = {
                    ...formData,
                    max_rollover_days: formData.max_rollover_days === '' ? null : formData.max_rollover_days,
                    end_date: formData.end_date === '' ? null : formData.end_date,
                };

                if (isEditing && currentPolicy) {
                    const response = await axios.put(`/api/pto-policies/${currentPolicy.id}`, submitData);
                    const updatedPolicy = response.data.data;

                    setPtoPolicies((prev) => prev.map((policy) => (policy.id === currentPolicy.id ? updatedPolicy : policy)));

                    toast.success(`PTO policy "${updatedPolicy.name}" updated successfully.`);
                } else {
                    const response = await axios.post('/api/pto-policies', submitData);
                    const newPolicy = response.data.data;

                    setPtoPolicies((prev) => [...prev, newPolicy]);
                    toast.success(`PTO policy "${newPolicy.name}" created successfully.`);
                }

                resetForm();
            } catch (error: any) {
                console.error('Error saving policy:', error);
                const errorMessage = error.response?.data?.error || 'Failed to save PTO policy.';
                toast.error(errorMessage);
            } finally {
                setSubmitting(false);
            }
        },
        [formData, isEditing, currentPolicy, resetForm],
    );

    // Format date
    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }, []);

    // Get available users (exclude users who already have a policy for the selected PTO type)
    const getAvailableUsers = useCallback(() => {
        if (!formData.pto_type_id) return users;

        const usedUserIds = ptoPolicies
            .filter((policy) => policy.pto_type_id === parseInt(formData.pto_type_id.toString()) && (!isEditing || policy.id !== currentPolicy?.id))
            .map((policy) => policy.user_id);

        return users.filter((user) => !usedUserIds.includes(user.id));
    }, [users, ptoPolicies, formData.pto_type_id, isEditing, currentPolicy]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>

            <Head title="Manage PTO Policies" />
                <HrLayout>
            <div className="flex h-full flex-1 flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Manage PTO Policies</h1>
                    <Button onClick={handleCreate} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add PTO Policy
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                            <div>
                                <Label htmlFor="search">Search</Label>
                                <div className="relative">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                                    <Input
                                        id="search"
                                        placeholder="Search policies..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="pto-type-filter">PTO Type</Label>
                                <Select value={selectedPtoType || undefined} onValueChange={(value) => setSelectedPtoType(value || '')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ptoTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="user-filter">User</Label>
                                <Select value={selectedUser || undefined} onValueChange={(value) => setSelectedUser(value || '')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All users" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map((user) => (
                                            <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2 pt-6">
                                <Switch id="active-only" checked={showActiveOnly} onCheckedChange={setShowActiveOnly} />
                                <Label htmlFor="active-only">Active only</Label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Policies List */}
                <Card className={"w-full"}>
                    <CardHeader>
                        <CardTitle>PTO Policies ({filteredPolicies.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center p-1">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : filteredPolicies.length === 0 ? (
                            <div className="text-muted-foreground p-8 text-center">
                                {searchTerm || selectedPtoType || selectedUser || showActiveOnly
                                    ? 'No policies match your filters.'
                                    : 'No PTO policies found. Create your first policy to get started.'}
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Policy Name</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>PTO Type</TableHead>
                                            <TableHead>Initial Days</TableHead>
                                            <TableHead>Annual Accrual</TableHead>
                                            <TableHead>Rollover</TableHead>
                                            <TableHead>Effective Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPolicies.map((policy) => (
                                            <TableRow key={policy.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{policy.name}</div>
                                                        {policy.description && (
                                                            <div className="text-muted-foreground text-sm">
                                                                {policy.description.length > 50
                                                                    ? `${policy.description.substring(0, 50)}...`
                                                                    : policy.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4" />
                                                        <div>
                                                            <div className="font-medium">{policy.user.name}</div>
                                                            <div className="text-muted-foreground text-sm">{policy.user.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded border" style={{ backgroundColor: policy.pto_type.color }} />
                                                        <span>{policy.pto_type.name}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {policy.pto_type.code}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{policy.initial_days}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <div>{policy.annual_accrual_amount} days</div>
                                                        {policy.bonus_days_per_year > 0 && (
                                                            <div className="text-muted-foreground">+{policy.bonus_days_per_year} bonus</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {policy.rollover_enabled ? (
                                                        <div className="text-sm">
                                                            <div className="text-green-600">Enabled</div>
                                                            {policy.max_rollover_days && (
                                                                <div className="text-muted-foreground">Max: {policy.max_rollover_days}</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-red-600">Disabled</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{formatDate(policy.effective_date)}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={policy.is_active ? 'default' : 'secondary'}
                                                        className={policy.is_active ? 'bg-green-100 text-green-800' : ''}
                                                    >
                                                        {policy.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(policy)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(policy)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Policy Form Dialog */}
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ width: '90vw', maxWidth: 'none' }}>
                        <DialogHeader>
                            <DialogTitle>{isEditing ? 'Edit PTO Policy' : 'Add New PTO Policy'}</DialogTitle>
                            <DialogDescription>
                                {isEditing ? 'Update the PTO policy details below.' : 'Create a new PTO policy by filling out the form below.'}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h4 className="font-medium">Basic Information</h4>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="user_id">
                                            User <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={formData.user_id ? formData.user_id.toString() : undefined}
                                            onValueChange={(value) => handleChange('user_id', parseInt(value))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select user" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getAvailableUsers().map((user) => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.name} ({user.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="pto_type_id">
                                            PTO Type <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={formData.pto_type_id ? formData.pto_type_id.toString() : undefined}
                                            onValueChange={(value) => handleChange('pto_type_id', parseInt(value))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select PTO type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ptoTypes.map((type) => (
                                                    <SelectItem key={type.id} value={type.id.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-3 w-3 rounded border" style={{ backgroundColor: type.color }} />
                                                            {type.name} ({type.code})
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Policy Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            placeholder="Auto-generated if empty"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="effective_date">
                                            Effective Date <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="effective_date"
                                            type="date"
                                            value={formData.effective_date}
                                            onChange={(e) => handleChange('effective_date', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder="Optional description for this policy..."
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* PTO Allocation */}
                            <div className="space-y-4">
                                <h4 className="font-medium">PTO Allocation</h4>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="initial_days">Initial Days</Label>
                                        <Input
                                            id="initial_days"
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={formData.initial_days}
                                            onChange={(e) => handleChange('initial_days', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="annual_accrual_amount">Annual Accrual</Label>
                                        <Input
                                            id="annual_accrual_amount"
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={formData.annual_accrual_amount}
                                            onChange={(e) => handleChange('annual_accrual_amount', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bonus_days_per_year">Bonus Days/Year</Label>
                                        <Input
                                            id="bonus_days_per_year"
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={formData.bonus_days_per_year}
                                            onChange={(e) => handleChange('bonus_days_per_year', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="years_for_bonus">Years for Bonus</Label>
                                        <Input
                                            id="years_for_bonus"
                                            type="number"
                                            min="1"
                                            value={formData.years_for_bonus}
                                            onChange={(e) => handleChange('years_for_bonus', parseInt(e.target.value) || 1)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="accrual_frequency">Accrual Frequency</Label>
                                        <Select
                                            value={formData.accrual_frequency}
                                            onValueChange={(value) => handleChange('accrual_frequency', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                                <SelectItem value="annually">Annually</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Rollover Settings */}
                            <div className="space-y-4">
                                <h4 className="font-medium">Rollover Settings</h4>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="rollover_enabled"
                                        checked={formData.rollover_enabled}
                                        onCheckedChange={(checked) => handleChange('rollover_enabled', checked)}
                                    />
                                    <Label htmlFor="rollover_enabled">Enable rollover</Label>
                                </div>

                                {formData.rollover_enabled && (
                                    <div className="space-y-2">
                                        <Label htmlFor="max_rollover_days">Max Rollover Days</Label>
                                        <Input
                                            id="max_rollover_days"
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={formData.max_rollover_days}
                                            onChange={(e) =>
                                                handleChange('max_rollover_days', e.target.value === '' ? '' : parseFloat(e.target.value))
                                            }
                                            placeholder="Leave empty for no limit"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Other Settings */}
                            <div className="space-y-4">
                                <h4 className="font-medium">Other Settings</h4>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="max_negative_balance">Max Negative Balance</Label>
                                        <Input
                                            id="max_negative_balance"
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={formData.max_negative_balance}
                                            onChange={(e) => handleChange('max_negative_balance', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="end_date">End Date (Optional)</Label>
                                        <Input
                                            id="end_date"
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) => handleChange('end_date', e.target.value)}
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2 pt-6">
                                        <Switch
                                            id="is_active"
                                            checked={formData.is_active}
                                            onCheckedChange={(checked) => handleChange('is_active', checked)}
                                        />
                                        <Label htmlFor="is_active">Active</Label>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="prorate_first_year"
                                        checked={formData.prorate_first_year}
                                        onCheckedChange={(checked) => handleChange('prorate_first_year', checked)}
                                    />
                                    <Label htmlFor="prorate_first_year">Prorate first year</Label>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    {isEditing ? 'Update' : 'Create'} Policy
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Alert Dialog */}
                <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete the PTO policy "{policyToDelete?.name}" for {policyToDelete?.user?.name}? This action
                                cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            </HrLayout>
        </AppLayout>
    );
}
