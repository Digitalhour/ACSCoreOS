import React, {useEffect, useState} from 'react';
import {router, usePage} from '@inertiajs/react';
import {UsersManagement, WorkOsWidgets} from '@workos-inc/widgets';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import '@radix-ui/themes/styles.css';
import '@workos-inc/widgets/styles.css';

const queryClient = new QueryClient();

interface Membership {
    id: string;
    user_id: string;
    user?: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    };
    status: string;
    role: {
        slug: string;
    };
}

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

const UserManagementWidget: React.FC = () => {
    const { flash } = usePage().props as any;
    const pageProps = usePage().props as any;
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeactivate, setShowDeactivate] = useState(false);
    const [users, setUsers] = useState<Membership[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);

    // Wizard states
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [createdUserId, setCreatedUserId] = useState<number | null>(null);
    const [createdUserName, setCreatedUserName] = useState<string>('');
    const [createdUserEmail, setCreatedUserEmail] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check if we're in continue setup mode
    useEffect(() => {
        if (pageProps.continue_setup && pageProps.created_user_id) {
            console.log('Continue setup detected:', {
                userId: pageProps.created_user_id,
                userName: pageProps.created_user_name,
                userEmail: pageProps.created_user_email
            });

            setCreatedUserId(Number(pageProps.created_user_id));
            setCreatedUserName(pageProps.created_user_name || 'New User');
            setCreatedUserEmail(pageProps.created_user_email || '');
            setShowWizard(true);
            setWizardStep(2); // Start at step 2 (department/position)
        }
    }, [pageProps.continue_setup, pageProps.created_user_id]);

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
        is_active: true
    });

    const fetchToken = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/widget-token', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            const data = await response.json();
            setAuthToken(data.token);
        } catch (err) {
            console.error('Token fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const response = await fetch('/api/organization-users');
            const data = await response.json();
            setUsers(data.data || []);
        } catch (err) {
            console.error('Users fetch error:', err);
        } finally {
            setUsersLoading(false);
        }
    };

    const fetchPtoTypes = async () => {
        try {
            const response = await fetch('/api/pto-types');
            const data = await response.json();
            setPtoTypes(data.data || []);
        } catch (err) {
            console.error('PTO Types fetch error:', err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await fetch('/api/departments');
            const data = await response.json();
            setDepartments(data.data || []);
        } catch (err) {
            console.error('Departments fetch error:', err);
        }
    };

    const fetchPositions = async () => {
        try {
            const response = await fetch('/api/positions');
            const data = await response.json();
            setPositions(Array.isArray(data) ? data : data.data || []);
        } catch (err) {
            console.error('Positions fetch error:', err);
        }
    };

    const fetchManagers = async (excludeUserId = null) => {
        try {
            let url = '/api/managers';
            if (excludeUserId) {
                url += `?exclude_user_id=${excludeUserId}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            setManagers(data.data || []);
        } catch (err) {
            console.error('Managers fetch error:', err);
        }
    };

    const handleUserAction = (membershipId: string, action: 'deactivate' | 'reactivate') => {
        router.post(`/api/${action}-user`, {
            membership_id: membershipId
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                fetchUsers();
            },
            onError: (errors) => {
                console.error("Action failed:", errors);
            }
        });
    };

    // Watch for flash data changes after invite
    useEffect(() => {
        if (isSubmitting && flash?.created_user_id) {
            console.log('User created successfully, found flash data:', flash);

            setCreatedUserId(Number(flash.created_user_id));
            setCreatedUserName(flash.created_user_name || 'New User');
            setCreatedUserEmail(flash.created_user_email || inviteForm.email);
            setWizardStep(2);
            setIsSubmitting(false);
        }
    }, [flash?.created_user_id, isSubmitting]);

    // Step 1: Invite User - Simplified
    const handleInviteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        console.log('Submitting invite - will redirect to continue setup page');

        router.post('/user-management/invite-user', {
            invite: {
                ...inviteForm,
                role: 'member'
            },
            pto_policy: inviteForm.create_pto_policy ? ptoForm : null
        }, {
            onError: (errors) => {
                console.error('Invite failed with errors:', errors);
                setIsSubmitting(false);

                if (errors) {
                    const errorMessages = Object.values(errors).flat().join('\n');
                    alert('Validation errors:\n' + errorMessages);
                }
            },
            onFinish: () => {
                setIsSubmitting(false);
            }
        });
    };

    // Step 2: Assign Department and Position
    const handleDepartmentPositionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!createdUserId) {
            console.error('No user ID available for assignment');
            return;
        }

        try {
            // Step 1: Assign to department if requested
            if (departmentForm.assign_department && departmentForm.department_id) {
                console.log('Assigning department...');

                await new Promise((resolve, reject) => {
                    router.post(`/departments/${departmentForm.department_id}/assign-users`, {
                        user_ids: [createdUserId]
                    }, {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: () => {
                            console.log('Department assigned successfully');
                            resolve(true);
                        },
                        onError: (errors) => {
                            console.error('Department assignment failed:', errors);
                            reject(new Error('Failed to assign department'));
                        }
                    });
                });
            }

            // Step 2: Assign position if requested
            if (departmentForm.assign_position && departmentForm.position_id) {
                console.log('Assigning position...');

                await new Promise((resolve, reject) => {
                    // Use today's date at start of day to avoid timezone issues
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const startDate = today.toISOString().slice(0, 19).replace('T', ' ');

                    router.post(`/api/users-hierarchy/${createdUserId}/assign-position`, {
                        position_id: departmentForm.position_id,
                        start_date: startDate
                    }, {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: () => {
                            console.log('Position assigned successfully');
                            resolve(true);
                        },
                        onError: (errors) => {
                            console.error('Position assignment failed:', errors);
                            reject(new Error('Failed to assign position'));
                        }
                    });
                });
            }

            // Move to step 3 (manager assignment)
            setWizardStep(3);
            // Refresh managers list excluding the created user
            if (createdUserId) {
                fetchManagers(createdUserId);
            }
            console.log('Department and position assignments completed successfully');

        } catch (error) {
            console.error('Assignment failed:', error);
            alert(`Assignment failed: ${error.message}`);
        }
    };

    // Step 3: Assign Manager
    const handleManagerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!createdUserId) {
            console.error('No user ID available for manager assignment');
            return;
        }

        try {
            if (managerForm.assign_manager && managerForm.manager_id) {
                console.log('Assigning manager...');

                await new Promise((resolve, reject) => {
                    // Use today's date at start of day to avoid timezone issues
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const startDate = today.toISOString().slice(0, 19).replace('T', ' ');

                    router.post(`/users-hierarchy/${createdUserId}/assign-manager`, {
                        manager_id: managerForm.manager_id,
                        start_date: startDate
                    }, {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: () => {
                            console.log('Manager assigned successfully');
                            resolve(true);
                        },
                        onError: (errors) => {
                            console.error('Manager assignment failed:', errors);
                            reject(new Error('Failed to assign manager'));
                        }
                    });
                });
            }

            // Success - close wizard and refresh
            closeWizard();
            fetchUsers();
            console.log('All assignments completed successfully');

        } catch (error) {
            console.error('Manager assignment failed:', error);
            alert(`Manager assignment failed: ${error.message}`);
        }
    };

    const closeWizard = () => {
        setShowWizard(false);
        setWizardStep(1);
        setCreatedUserId(null);
        setCreatedUserName('');
        setCreatedUserEmail('');
        setIsSubmitting(false);

        // Reset forms
        setInviteForm({
            email: '',
            first_name: '',
            last_name: '',
            create_pto_policy: false
        });
        setDepartmentForm({
            assign_department: false,
            department_id: 0,
            assign_position: false,
            position_id: 0
        });
        setManagerForm({
            assign_manager: false,
            manager_id: 0
        });
        setPtoForm({
            ...ptoForm,
            name: '',
            description: '',
            initial_days: 0,
            annual_accrual_amount: 0,
            pto_type_id: 0
        });

        // Reset managers list to show all managers (no exclusions)
        fetchManagers();
    };

    const skipStep = () => {
        if (wizardStep === 2) {
            setWizardStep(3);
        } else if (wizardStep === 3) {
            closeWizard();
            fetchUsers();
        }
    };

    useEffect(() => {
        fetchToken();
        fetchPtoTypes();
        fetchDepartments();
        fetchPositions();
        // Initial fetch of managers without exclusions
        fetchManagers();
    }, []);

    // Refresh managers list when wizard reaches step 3, excluding the created user
    useEffect(() => {
        if (wizardStep === 3 && createdUserId) {
            console.log('Fetching managers for step 3, excluding user:', createdUserId);
            fetchManagers(createdUserId);
        }
    }, [wizardStep, createdUserId]);

    useEffect(() => {
        if (showDeactivate) {
            fetchUsers();
        }
    }, [showDeactivate]);

    if (loading) return <div>Loading...</div>;
    if (!authToken) return <div>Could not retrieve authentication token.</div>;

    return (
        <div>
            {flash?.success && (
                <div style={{
                    padding: '12px',
                    marginBottom: '20px',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px'
                }}>
                    {flash.success}
                </div>
            )}

            {flash?.error && (
                <div style={{
                    padding: '12px',
                    marginBottom: '20px',
                    backgroundColor: '#fecaca',
                    color: '#991b1b',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px'
                }}>
                    {flash.error}
                </div>
            )}

            <div style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                <button
                    onClick={() => setShowDeactivate(false)}
                    style={{
                        marginRight: '10px',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: !showDeactivate ? '#3b82f6' : '#e5e7eb',
                        color: !showDeactivate ? 'white' : 'black'
                    }}
                >
                    Widget
                </button>
                <button
                    onClick={() => setShowDeactivate(true)}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: showDeactivate ? '#3b82f6' : '#e5e7eb',
                        color: showDeactivate ? 'white' : 'black'
                    }}
                >
                    Manage Users
                </button>
                <button
                    onClick={() => setShowWizard(true)}
                    style={{
                        marginLeft: '10px',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: '#059669',
                        color: 'white'
                    }}
                >
                    Invite User
                </button>
            </div>

            {!showDeactivate ? (
                <QueryClientProvider client={queryClient}>
                    <WorkOsWidgets>
                        <UsersManagement authToken={authToken} />
                    </WorkOsWidgets>
                </QueryClientProvider>
            ) : (
                <div>
                    <h3>User Status Management</h3>
                    {usersLoading ? (
                        <p>Loading users...</p>
                    ) : users.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                            <thead>
                            <tr style={{ borderBottom: '1px solid #ccc' }}>
                                <th style={{ textAlign: 'left', padding: '10px' }}>User</th>
                                <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '10px' }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {users.map((membership) => (
                                <tr key={membership.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px' }}>
                                        <div>{membership.user ? `${membership.user.first_name} ${membership.user.last_name}`: 'Invited User'}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>{membership.user?.email ?? `User ID: ${membership.user_id}`}</div>
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Role: {membership.role?.slug || 'No role'}</div>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                backgroundColor: membership.status === 'active' ? '#dcfce7' : '#fecaca',
                                                color: membership.status === 'active' ? '#166534' : '#991b1b'
                                            }}>
                                                {membership.status}
                                            </span>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {membership.status === 'active' ? (
                                            <button
                                                onClick={() => handleUserAction(membership.id, 'deactivate')}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: '#dc2626',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Deactivate
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleUserAction(membership.id, 'reactivate')}
                                                style={{
                                                    padding: '6px 12px',
                                                    backgroundColor: '#059669',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Reactivate
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No users found</p>
                    )}
                </div>
            )}

            {/* Wizard Modal */}
            {showWizard && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        width: '700px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        {/* Wizard Header */}
                        <div style={{ marginBottom: '30px' }}>
                            <h2>Invite User - Step {wizardStep} of 3</h2>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                {[1, 2, 3].map((step) => (
                                    <div
                                        key={step}
                                        style={{
                                            width: '30%',
                                            height: '4px',
                                            backgroundColor: step <= wizardStep ? '#059669' : '#e5e7eb',
                                            borderRadius: '2px'
                                        }}
                                    />
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '12px', color: '#6b7280' }}>
                                <span>Invite User</span>
                                <span>Dept & Position</span>
                                <span>Manager</span>
                            </div>
                        </div>

                        {/* Step 1: Invite User */}
                        {wizardStep === 1 && (
                            <form onSubmit={handleInviteSubmit}>
                                <h3 style={{ marginBottom: '20px' }}>User Information</h3>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={inviteForm.email}
                                        onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>First Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={inviteForm.first_name}
                                            onChange={(e) => setInviteForm({...inviteForm, first_name: e.target.value})}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                border: '1px solid #ccc',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Last Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={inviteForm.last_name}
                                            onChange={(e) => setInviteForm({...inviteForm, last_name: e.target.value})}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                border: '1px solid #ccc',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={inviteForm.create_pto_policy}
                                            onChange={(e) => setInviteForm({...inviteForm, create_pto_policy: e.target.checked})}
                                        />
                                        <span style={{ fontWeight: 'bold' }}>Create PTO Policy</span>
                                    </label>
                                </div>

                                {inviteForm.create_pto_policy && (
                                    <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
                                        <h4 style={{ marginBottom: '15px', color: '#374151' }}>PTO Policy Details</h4>

                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>PTO Type</label>
                                            <select
                                                required
                                                value={ptoForm.pto_type_id}
                                                onChange={(e) => setPtoForm({...ptoForm, pto_type_id: parseInt(e.target.value)})}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px'
                                                }}
                                            >
                                                <option value="">Select PTO Type</option>
                                                {ptoTypes.map(type => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.code ? `${type.name} (${type.code})` : type.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Initial Days</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required={ptoTypes.find(t => t.id === ptoForm.pto_type_id)?.uses_balance}
                                                    disabled={!ptoTypes.find(t => t.id === ptoForm.pto_type_id)?.uses_balance}
                                                    value={ptoForm.initial_days}
                                                    onChange={(e) => setPtoForm({...ptoForm, initial_days: parseFloat(e.target.value)})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        backgroundColor: !ptoTypes.find(t => t.id === ptoForm.pto_type_id)?.uses_balance ? '#f3f4f6' : 'white'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Annual Accrual Amount</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required={ptoTypes.find(t => t.id === ptoForm.pto_type_id)?.uses_balance}
                                                    disabled={!ptoTypes.find(t => t.id === ptoForm.pto_type_id)?.uses_balance}
                                                    value={ptoForm.annual_accrual_amount}
                                                    onChange={(e) => setPtoForm({...ptoForm, annual_accrual_amount: parseFloat(e.target.value)})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        backgroundColor: !ptoTypes.find(t => t.id === ptoForm.pto_type_id)?.uses_balance ? '#f3f4f6' : 'white'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Accrual Frequency</label>
                                                <select
                                                    value={ptoForm.accrual_frequency}
                                                    onChange={(e) => setPtoForm({...ptoForm, accrual_frequency: e.target.value as 'monthly' | 'quarterly' | 'annually'})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px'
                                                    }}
                                                >
                                                    <option value="monthly">Monthly</option>
                                                    <option value="quarterly">Quarterly</option>
                                                    <option value="annually">Annually</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Effective Date</label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={ptoForm.effective_date}
                                                    onChange={(e) => setPtoForm({...ptoForm, effective_date: e.target.value})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={ptoForm.rollover_enabled}
                                                    onChange={(e) => setPtoForm({...ptoForm, rollover_enabled: e.target.checked})}
                                                />
                                                <span>Enable Rollover</span>
                                            </label>
                                        </div>

                                        {ptoForm.rollover_enabled && (
                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Max Rollover Days</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={ptoForm.max_rollover_days}
                                                    onChange={(e) => setPtoForm({...ptoForm, max_rollover_days: parseFloat(e.target.value)})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={closeWizard}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: isSubmitting ? '#9ca3af' : '#059669',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {isSubmitting ? 'Sending...' : 'Send Invite & Continue'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 2: Department and Position */}
                        {wizardStep === 2 && createdUserId && (
                            <form onSubmit={handleDepartmentPositionSubmit}>
                                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                                    <h3 style={{ color: '#059669', marginBottom: '10px' }}>✅ User Invited Successfully!</h3>
                                    <p style={{ color: '#6b7280' }}>
                                        <strong>{createdUserName}</strong> ({createdUserEmail}) has been invited.
                                        <br />
                                        <small>User ID: {createdUserId}</small>
                                    </p>
                                </div>

                                <h3 style={{ marginBottom: '20px' }}>Department & Position Assignment</h3>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={departmentForm.assign_department}
                                            onChange={(e) => setDepartmentForm({...departmentForm, assign_department: e.target.checked})}
                                        />
                                        <span style={{ fontWeight: 'bold' }}>Assign to Department</span>
                                    </label>
                                </div>

                                {departmentForm.assign_department && (
                                    <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Department</label>
                                            <select
                                                required
                                                value={departmentForm.department_id}
                                                onChange={(e) => setDepartmentForm({...departmentForm, department_id: parseInt(e.target.value)})}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px'
                                                }}
                                            >
                                                <option value="">Select Department</option>
                                                {departments.map(dept => (
                                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={departmentForm.assign_position}
                                            onChange={(e) => setDepartmentForm({...departmentForm, assign_position: e.target.checked})}
                                        />
                                        <span style={{ fontWeight: 'bold' }}>Assign Position</span>
                                    </label>
                                </div>

                                {departmentForm.assign_position && (
                                    <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Position</label>
                                            <select
                                                required
                                                value={departmentForm.position_id}
                                                onChange={(e) => setDepartmentForm({...departmentForm, position_id: parseInt(e.target.value)})}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px'
                                                }}
                                            >
                                                <option value="">Select Position</option>
                                                {positions.map(position => (
                                                    <option key={position.id} value={position.id}>{position.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => skipStep()}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Skip
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: '#059669',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Assign & Continue
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 3: Manager Assignment */}
                        {wizardStep === 3 && createdUserId && (
                            <form onSubmit={handleManagerSubmit}>
                                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                                    <h3 style={{ color: '#059669', marginBottom: '10px' }}>Manager Assignment</h3>
                                    <p style={{ color: '#6b7280' }}>
                                        Assign a manager to <strong>{createdUserName}</strong>
                                        <br />
                                        <small>User ID: {createdUserId}</small>
                                    </p>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={managerForm.assign_manager}
                                            onChange={(e) => setManagerForm({...managerForm, assign_manager: e.target.checked})}
                                        />
                                        <span style={{ fontWeight: 'bold' }}>Assign Manager</span>
                                    </label>
                                </div>

                                {managerForm.assign_manager && (
                                    <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Manager</label>
                                            <select
                                                required
                                                value={managerForm.manager_id}
                                                onChange={(e) => setManagerForm({...managerForm, manager_id: parseInt(e.target.value)})}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px'
                                                }}
                                            >
                                                <option value="">Select Manager</option>
                                                {managers.map(manager => (
                                                    <option key={manager.id} value={manager.id}>{manager.name} ({manager.email})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => skipStep()}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Skip
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: '#059669',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Assign & Finish
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementWidget;
