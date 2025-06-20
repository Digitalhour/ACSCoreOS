import React, {useEffect, useState} from 'react';
// Import the Inertia router
import {router} from '@inertiajs/react';
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

// Assume your AppLayout can display a flash message passed in props
const UserManagementWidget: React.FC = () => {
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeactivate, setShowDeactivate] = useState(false);
    const [users, setUsers] = useState<Membership[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);

    const fetchToken = async () => {
        // ... (this function remains the same as it's only fetching a token for a client-side widget)
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

    // --- THIS IS THE CORRECTED PART ---
    const handleUserAction = (membershipId: string, action: 'deactivate' | 'reactivate') => {
        router.post(`/api/${action}-user`, {
            membership_id: membershipId
        }, {
            preserveState: true, // Prevents component from resetting its internal state
            preserveScroll: true, // Prevents page from scrolling to the top
            onSuccess: () => {
                // The page props will refresh automatically, so we just need to re-fetch our local user list
                fetchUsers();
            },
            onError: (errors) => {
                console.error("Action failed:", errors);
            }
        });
    };

    useEffect(() => {
        fetchToken();
    }, []);

    useEffect(() => {
        if (showDeactivate) {
            fetchUsers();
        }
    }, [showDeactivate]);

    // ... The rest of your component JSX remains the same
    // Make sure to pass the `users` prop from your main page component
    // if you want the list to update automatically from Inertia's props.
    // For now, the onSuccess callback handles the refresh.

    if (loading) return <div>Loading...</div>;
    if (!authToken) return <div>Could not retrieve authentication token.</div>;

    return (
        <div>
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
        </div>
    );
};

export default UserManagementWidget;
