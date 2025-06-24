import React, {useEffect, useState} from 'react';
import {Head, router} from '@inertiajs/react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Checkbox} from "@/components/ui/checkbox";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Building2, CheckCircle, Lock, UserPlus, Users} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import HrLayout from "@/layouts/settings/hr-layout";

interface PtoType {
    id: number;
    name: string;
    code?: string;
    description?: string;
    uses_balance: boolean;
}

interface Department {
    id: number;
    name: string;
    description?: string;
}

interface Position {
    id: number;
    name: string;
}

interface Manager {
    id: number;
    name: string;
    email: string;
}

interface PtoPolicyForm {
    name: string;
    description: string;
    initial_days: number;
    annual_accrual_amount: number;
    bonus_days_per_year: number;
    rollover_enabled: boolean;
    max_rollover_days: number;
    max_negative_balance: number;
    years_for_bonus: number;
    accrual_frequency: 'monthly' | 'quarterly' | 'annually';
    prorate_first_year: boolean;
    effective_date: string;
    end_date: string;
    pto_type_id: number;
    is_active: boolean;
}

interface ApiResponse<T> {
    data: T;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'User Management',
        href: '/user-management',
    },
    {
        title: 'Onboard Employee',
        href: '/user-management/onboard',
    },
];

export default function OnboardEmployee() {
    // Section states
    const [section1Complete, setSection1Complete] = useState(false);
    const [section2Complete, setSection2Complete] = useState(false);
    const [section3Complete, setSection3Complete] = useState(false);

    // User data from section 1
    const [createdUserId, setCreatedUserId] = useState<number | null>(null);
    const [createdUserName, setCreatedUserName] = useState<string>('');
    const [createdUserEmail, setCreatedUserEmail] = useState<string>('');

    // Loading states
    const [isSubmitting1, setIsSubmitting1] = useState(false);
    const [isSubmitting2, setIsSubmitting2] = useState(false);
    const [isSubmitting3, setIsSubmitting3] = useState(false);

    // Data for dropdowns
    const [ptoTypes, setPtoTypes] = useState<PtoType[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [managers, setManagers] = useState<Manager[]>([]);

    // Form states
    const [inviteForm, setInviteForm] = useState({
        email: '',
        first_name: '',
        last_name: '',
        create_pto_policy: false
    });

    const [departmentForm, setDepartmentForm] = useState({
        assign_department: false,
        department_id: 0,
        assign_position: false,
        position_id: 0
    });

    const [managerForm, setManagerForm] = useState({
        assign_manager: false,
        manager_id: 0
    });

    const [ptoForm, setPtoForm] = useState<PtoPolicyForm>({
        name: '',
        description: '',
        initial_days: 0,
        annual_accrual_amount: 0,
        bonus_days_per_year: 0,
        rollover_enabled: false,
        max_rollover_days: 0,
        max_negative_balance: 0,
        years_for_bonus: 1,
        accrual_frequency: 'annually',
        prorate_first_year: true,
        effective_date: new Date().toISOString().split('T')[0],
        end_date: '',
        pto_type_id: 0,
        is_active: true,
    });

    // Fetch functions
    const fetchPtoTypes = async () => {
        try {
            const response = await fetch('/api/pto-types');
            const data: ApiResponse<PtoType[]> = await response.json();
            setPtoTypes(data.data || []);
        } catch (err) {
            console.error('PTO Types fetch error:', err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await fetch('/api/departments');
            const data: ApiResponse<Department[]> = await response.json();
            setDepartments(data.data || []);
        } catch (err) {
            console.error('Departments fetch error:', err);
        }
    };

    const fetchPositions = async () => {
        try {
            const response = await fetch('/api/positions');
            const data: Position[] | ApiResponse<Position[]> = await response.json();
            setPositions(Array.isArray(data) ? data : data.data || []);
        } catch (err) {
            console.error('Positions fetch error:', err);
        }
    };

    const fetchManagers = async (excludeUserId: number | null = null) => {
        try {
            let url = '/api/managers';
            if (excludeUserId) {
                url += `?exclude_user_id=${excludeUserId}`;
            }

            const response = await fetch(url);
            const data: ApiResponse<Manager[]> = await response.json();
            setManagers(data.data || []);
        } catch (err) {
            console.error('Managers fetch error:', err);
        }
    };

    // Load data when component mounts
    useEffect(() => {
        fetchPtoTypes();
        fetchDepartments();
        fetchPositions();
        fetchManagers();
    }, []);

    // Refresh managers when user is created
    useEffect(() => {
        if (createdUserId && section1Complete) {
            fetchManagers(createdUserId);
        }
    }, [createdUserId, section1Complete]);

    // Section 1: Invite User
    const handleSection1Submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting1(true);

        router.post('/user-management/invite-user', {
            invite: {
                ...inviteForm,
                role: 'member'
            },
            pto_policy: inviteForm.create_pto_policy ? {...ptoForm} : null
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                // Get user by email to get the ID
                fetch(`/api/user-by-email?email=${encodeURIComponent(inviteForm.email)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.user) {
                            setCreatedUserId(data.user.id);
                            setCreatedUserName(data.user.name);
                            setCreatedUserEmail(data.user.email);
                        } else {
                            setCreatedUserId(999999);
                            setCreatedUserName(`${inviteForm.first_name} ${inviteForm.last_name}`);
                            setCreatedUserEmail(inviteForm.email);
                        }
                        setSection1Complete(true);
                    })
                    .catch(() => {
                        setCreatedUserId(999999);
                        setCreatedUserName(`${inviteForm.first_name} ${inviteForm.last_name}`);
                        setCreatedUserEmail(inviteForm.email);
                        setSection1Complete(true);
                    });
            },
            onError: (errors) => {
                console.error('Invite failed with errors:', errors);
                if (errors) {
                    const errorMessages = Object.values(errors).flat().join('\n');
                    alert('Validation errors:\n' + errorMessages);
                }
            },
            onFinish: () => {
                setIsSubmitting1(false);
            }
        });
    };

    // Section 2: Department and Position
    const handleSection2Submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting2(true);

        if (!createdUserId) {
            console.error('No user ID available for assignment');
            setIsSubmitting2(false);
            return;
        }

        try {
            if (departmentForm.assign_department && departmentForm.department_id) {
                // Use the new addUser method instead of assign-users to avoid removing existing users
                await new Promise<void>((resolve, reject) => {
                    router.post(`/departments/${departmentForm.department_id}/add-user`, {
                        user_id: createdUserId
                    }, {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: () => resolve(),
                        onError: () => reject(new Error('Failed to assign department'))
                    });
                });
            }

            if (departmentForm.assign_position && departmentForm.position_id) {
                await new Promise<void>((resolve, reject) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const startDate = today.toISOString().slice(0, 19).replace('T', ' ');

                    router.post(`/api/users-hierarchy/${createdUserId}/assign-position`, {
                        position_id: departmentForm.position_id,
                        start_date: startDate
                    }, {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: () => resolve(),
                        onError: () => reject(new Error('Failed to assign position'))
                    });
                });
            }

            setSection2Complete(true);
        } catch (error) {
            console.error('Assignment failed:', error);
            alert(`Assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting2(false);
        }
    };

    // Section 3: Manager Assignment
    const handleSection3Submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting3(true);

        if (!createdUserId) {
            console.error('No user ID available for manager assignment');
            setIsSubmitting3(false);
            return;
        }

        try {
            if (managerForm.assign_manager && managerForm.manager_id) {
                await new Promise<void>((resolve, reject) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const startDate = today.toISOString().slice(0, 19).replace('T', ' ');

                    router.post(`/api/users-hierarchy/${createdUserId}/assign-manager`, {
                        manager_id: managerForm.manager_id,
                        start_date: startDate
                    }, {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: () => resolve(),
                        onError: () => reject(new Error('Failed to assign manager'))
                    });
                });
            }

            setSection3Complete(true);
            // Redirect to user management after completion
            setTimeout(() => {
                router.visit('/user-management');
            }, 2000);
        } catch (error) {
            console.error('Manager assignment failed:', error);
            alert(`Manager assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting3(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <HrLayout>
            <Head title="Onboard Employee" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-6">

                    {/* Section 1: Invite User */}
                    <Card className={`relative ${section1Complete ? 'border-green-200 bg-green-50' : ''}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {section1Complete ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <UserPlus className="h-5 w-5" />
                                )}
                                Section 1: Invite Employee
                            </CardTitle>
                            <CardDescription>
                                {section1Complete ? (
                                    <Badge variant="secondary">
                                        Completed: {createdUserName} ({createdUserEmail})
                                    </Badge>
                                ) : (
                                    'Enter the basic details for the new employee'
                                )}
                            </CardDescription>
                        </CardHeader>

                        {!section1Complete && (
                            <CardContent>
                                <form onSubmit={handleSection1Submit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            value={inviteForm.email}
                                            onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                                            placeholder="employee@company.com"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">First Name</Label>
                                            <Input
                                                id="firstName"
                                                type="text"
                                                required
                                                value={inviteForm.first_name}
                                                onChange={(e) => setInviteForm({...inviteForm, first_name: e.target.value})}
                                                placeholder="John"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">Last Name</Label>
                                            <Input
                                                id="lastName"
                                                type="text"
                                                required
                                                value={inviteForm.last_name}
                                                onChange={(e) => setInviteForm({...inviteForm, last_name: e.target.value})}
                                                placeholder="Doe"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="createPtoPolicy"
                                            checked={inviteForm.create_pto_policy}
                                            onCheckedChange={(checked) => setInviteForm({...inviteForm, create_pto_policy: checked as boolean})}
                                        />
                                        <Label htmlFor="createPtoPolicy" className="font-medium">
                                            Create PTO Policy
                                        </Label>
                                    </div>

                                    {inviteForm.create_pto_policy && (
                                        <div className="space-y-4 border-t pt-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="ptoType">PTO Type</Label>
                                                <Select
                                                    value={ptoForm.pto_type_id.toString()}
                                                    onValueChange={(value) => setPtoForm({...ptoForm, pto_type_id: parseInt(value)})}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select PTO Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ptoTypes.map(type => (
                                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                                {type.code ? `${type.name} (${type.code})` : type.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="initialDays">Initial Days</Label>
                                                    <Input
                                                        id="initialDays"
                                                        type="number"
                                                        step="0.01"
                                                        value={ptoForm.initial_days}
                                                        onChange={(e) => setPtoForm({...ptoForm, initial_days: parseFloat(e.target.value) || 0})}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="annualAccrual">Annual Accrual Amount</Label>
                                                    <Input
                                                        id="annualAccrual"
                                                        type="number"
                                                        step="0.01"
                                                        value={ptoForm.annual_accrual_amount}
                                                        onChange={(e) => setPtoForm({...ptoForm, annual_accrual_amount: parseFloat(e.target.value) || 0})}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="effectiveDate">Effective Date</Label>
                                                <Input
                                                    id="effectiveDate"
                                                    type="date"
                                                    required
                                                    value={ptoForm.effective_date}
                                                    onChange={(e) => setPtoForm({...ptoForm, effective_date: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isSubmitting1}>
                                            {isSubmitting1 ? 'Sending Invite...' : 'Send Invite & Continue'}
                                            <UserPlus className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        )}
                    </Card>

                    {/* Section 2: Department and Position */}
                    <Card className={`relative ${!section1Complete ? 'opacity-50' : section2Complete ? 'border-green-200 bg-green-50' : ''}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {!section1Complete ? (
                                    <Lock className="h-5 w-5 text-gray-400" />
                                ) : section2Complete ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <Building2 className="h-5 w-5" />
                                )}
                                Section 2: Department & Position Assignment
                            </CardTitle>
                            <CardDescription>
                                {!section1Complete ? 'Complete Section 1 to unlock' : 'Assign department and position to the employee'}
                            </CardDescription>
                        </CardHeader>

                        {section1Complete && !section2Complete && (
                            <CardContent>
                                <form onSubmit={handleSection2Submit} className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="assignDepartment"
                                            checked={departmentForm.assign_department}
                                            onCheckedChange={(checked) => setDepartmentForm({...departmentForm, assign_department: checked as boolean})}
                                        />
                                        <Label htmlFor="assignDepartment" className="font-medium">
                                            Assign to Department
                                        </Label>
                                    </div>

                                    {departmentForm.assign_department && (
                                        <div className="space-y-2">
                                            <Label htmlFor="department">Department</Label>
                                            <Select
                                                value={departmentForm.department_id.toString()}
                                                onValueChange={(value) => setDepartmentForm({...departmentForm, department_id: parseInt(value) || 0})}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Department" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departments.map(dept => (
                                                        <SelectItem key={dept.id} value={dept.id.toString()}>
                                                            {dept.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="assignPosition"
                                            checked={departmentForm.assign_position}
                                            onCheckedChange={(checked) => setDepartmentForm({...departmentForm, assign_position: checked as boolean})}
                                        />
                                        <Label htmlFor="assignPosition" className="font-medium">
                                            Assign Position
                                        </Label>
                                    </div>

                                    {departmentForm.assign_position && (
                                        <div className="space-y-2">
                                            <Label htmlFor="position">Position</Label>
                                            <Select
                                                value={departmentForm.position_id.toString()}
                                                onValueChange={(value) => setDepartmentForm({...departmentForm, position_id: parseInt(value) || 0})}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Position" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {positions.map(position => (
                                                        <SelectItem key={position.id} value={position.id.toString()}>
                                                            {position.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3">
                                        <Button type="button" variant="ghost" onClick={() => setSection2Complete(true)}>
                                            Skip
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting2}>
                                            {isSubmitting2 ? 'Assigning...' : 'Assign & Continue'}
                                            <Building2 className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        )}
                    </Card>

                    {/* Section 3: Manager Assignment */}
                    <Card className={`relative ${!section2Complete ? 'opacity-50' : section3Complete ? 'border-green-200 bg-green-50' : ''}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {!section2Complete ? (
                                    <Lock className="h-5 w-5 text-gray-400" />
                                ) : section3Complete ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <Users className="h-5 w-5" />
                                )}
                                Section 3: Manager Assignment
                            </CardTitle>
                            <CardDescription>
                                {!section2Complete ? 'Complete Section 2 to unlock' :
                                    section3Complete ? 'Employee onboarding completed successfully!' :
                                        'Assign a manager to the employee'}
                            </CardDescription>
                        </CardHeader>

                        {section2Complete && !section3Complete && (
                            <CardContent>
                                <form onSubmit={handleSection3Submit} className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="assignManager"
                                            checked={managerForm.assign_manager}
                                            onCheckedChange={(checked) => setManagerForm({...managerForm, assign_manager: checked as boolean})}
                                        />
                                        <Label htmlFor="assignManager" className="font-medium">
                                            Assign Manager
                                        </Label>
                                    </div>

                                    {managerForm.assign_manager && (
                                        <div className="space-y-2">
                                            <Label htmlFor="manager">Manager</Label>
                                            <Select
                                                value={managerForm.manager_id.toString()}
                                                onValueChange={(value) => setManagerForm({...managerForm, manager_id: parseInt(value) || 0})}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Manager" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {managers.map(manager => (
                                                        <SelectItem key={manager.id} value={manager.id.toString()}>
                                                            {manager.name} ({manager.email})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3">
                                        <Button type="button" variant="ghost" onClick={() => setSection3Complete(true)}>
                                            Skip & Finish
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting3}>
                                            {isSubmitting3 ? 'Assigning...' : 'Assign & Finish'}
                                            <Users className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        )}

                        {section3Complete && (
                            <CardContent>
                                <div className="text-center text-green-600">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold">Employee Onboarding Complete!</h3>
                                    <p className="text-sm text-gray-600 mt-2">
                                        {createdUserName} has been successfully onboarded.
                                        <br />
                                        Redirecting to User Management...
                                    </p>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
            </HrLayout>
        </AppLayout>
    );
}
