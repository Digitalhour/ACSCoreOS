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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { Edit, Loader2, Plus, Save, Search, Trash2, User, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Interface Definitions
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

export default function PtoPoliciesComponent() {
    // Main state
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

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredPolicies, setFilteredPolicies] = useState<PtoPolicy[]>([]);
    const [selectedPtoType, setSelectedPtoType] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<string>('all');
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
            toast.error('Failed to load PTO policies. Please try again.');
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
        if (selectedPtoType && selectedPtoType !== 'all') {
            filtered = filtered.filter((policy) => policy.pto_type_id === parseInt(selectedPtoType));
        }

        // User filter
        if (selectedUser && selectedUser !== 'all') {
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
            effective_date: policy.effective_date.split('T')[0],
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

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">PTO Policies</h2>
                        <p className="text-sm text-gray-600 mt-1">Manage PTO policies and assignments</p>
                    </div>
                </div>
                <Card className="border border-gray-200">
                    <CardContent className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const hasActiveFilters = searchTerm ||
        (selectedPtoType && selectedPtoType !== 'all') ||
        (selectedUser && selectedUser !== 'all') ||
        showActiveOnly;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">PTO Policies</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage PTO policies and assignments</p>
                </div>
                <Button onClick={handleCreate} className="bg-gray-900 hover:bg-gray-800">
                    <Plus className="h-4 w-4 mr-2" />
                    Add PTO Policy
                </Button>
            </div>

            {/* Filters */}
            <Card className="border border-gray-200">

                <CardContent className="p-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="space-y-2">
                            <Label htmlFor="search">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    id="search"
                                    placeholder="Search policies..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pto-type-filter">PTO Type</Label>
                            <Select value={selectedPtoType} onValueChange={setSelectedPtoType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All types</SelectItem>
                                    {ptoTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id.toString()}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="user-filter">User</Label>
                            <Select value={selectedUser} onValueChange={setSelectedUser}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All users" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All users</SelectItem>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2 mt-6">
                            <Switch id="active-only" checked={showActiveOnly} onCheckedChange={setShowActiveOnly} />
                            <Label htmlFor="active-only" className="text-sm">Active only</Label>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">Active filters applied</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedPtoType('all');
                                    setSelectedUser('all');
                                    setShowActiveOnly(false);
                                }}
                            >
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Policies List */}
            <Card className="border border-gray-200">
                <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                    <CardTitle className="text-lg font-medium">PTO Policies ({filteredPolicies.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredPolicies.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            {hasActiveFilters
                                ? 'No policies match your filters.'
                                : 'No PTO policies found. Create your first policy to get started.'}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-gray-200">
                                    <TableHead className="font-medium text-gray-900">Policy Name</TableHead>
                                    <TableHead className="font-medium text-gray-900">User</TableHead>
                                    <TableHead className="font-medium text-gray-900">PTO Type</TableHead>
                                    <TableHead className="font-medium text-gray-900">Initial Days</TableHead>
                                    <TableHead className="font-medium text-gray-900">Annual Accrual</TableHead>
                                    <TableHead className="font-medium text-gray-900">Rollover</TableHead>
                                    <TableHead className="font-medium text-gray-900">Effective Date</TableHead>
                                    <TableHead className="font-medium text-gray-900">Status</TableHead>
                                    <TableHead className="text-right font-medium text-gray-900">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPolicies.map((policy) => (
                                    <TableRow key={policy.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                        <TableCell>
                                            <div>
                                                <div className="font-medium text-gray-900">{policy.name}</div>
                                                {policy.description && (
                                                    <div className="text-sm text-gray-500">
                                                        {policy.description.length > 50
                                                            ? `${policy.description.substring(0, 50)}...`
                                                            : policy.description}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-gray-500" />
                                                <div>
                                                    <div className="font-medium text-gray-900">{policy.user.name}</div>
                                                    <div className="text-sm text-gray-500">{policy.user.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-3 w-3 rounded border border-gray-300"
                                                    style={{ backgroundColor: policy.pto_type.color }}
                                                />
                                                <span className="text-gray-900">{policy.pto_type.name}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {policy.pto_type.code}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-900">{policy.initial_days}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div className="text-gray-900">{policy.annual_accrual_amount} days</div>
                                                {policy.bonus_days_per_year > 0 && (
                                                    <div className="text-gray-500">+{policy.bonus_days_per_year} bonus</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {policy.rollover_enabled ? (
                                                <div className="text-sm">
                                                    <div className="text-green-600">Enabled</div>
                                                    {policy.max_rollover_days && (
                                                        <div className="text-gray-500">Max: {policy.max_rollover_days}</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-red-600 text-sm">Disabled</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-gray-900">{formatDate(policy.effective_date)}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={policy.is_active ? 'default' : 'secondary'}
                                                className={policy.is_active
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                                                }
                                            >
                                                {policy.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(policy)}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(policy)}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Policy Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-h-[98vh] overflow-y-auto max-w-11/12 min-w-11/12">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit PTO Policy' : 'Add New PTO Policy'}</DialogTitle>
                        <DialogDescription>
                            {isEditing ? 'Update the PTO policy details below.' : 'Create a new PTO policy by filling out the form below.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-gray-900">Basic Information</h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="user_id">
                                        User <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={formData.user_id ? formData.user_id.toString() : ''}
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
                                        value={formData.pto_type_id ? formData.pto_type_id.toString() : ''}
                                        onValueChange={(value) => handleChange('pto_type_id', parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select PTO type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ptoTypes.map((type) => (
                                                <SelectItem key={type.id} value={type.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-3 w-3 rounded border"
                                                            style={{ backgroundColor: type.color }}
                                                        />
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
                            <h4 className="font-medium text-gray-900">PTO Allocation</h4>

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
                            <h4 className="font-medium text-gray-900">Rollover Settings</h4>

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
                            <h4 className="font-medium text-gray-900">Other Settings</h4>

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

                                <div className="flex items-center space-x-2 mt-6">
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
                            <Button type="submit" disabled={submitting} className="bg-gray-900 hover:bg-gray-800">
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
    );
}
