import React, {useEffect, useMemo, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Checkbox} from '@/components/ui/checkbox';


import {ChevronDown, ChevronRight, Download, RotateCcw, Save, Search} from 'lucide-react';
import {Head, Link, useForm} from '@inertiajs/react';
import {toast} from 'sonner';
import AppLayout from '@/layouts/app-layout';

interface Role {
    id: number | string;
    name: string;
}

interface User {
    id: number | string;
    name: string;
    email: string;
    department?: string;
    roles?: Role[];
}

interface UserRoleMatrixPageProps {
    users: User[];
    roles: Role[];
    departments: { id: number | string; name: string; }[];
    flash?: {
        success?: string;
        error?: string;
    };
}

interface UserGroup {
    name: string;
    users: User[];
    expanded: boolean;
}

interface UserRoleMatrix {
    [userId: string]: {
        [roleId: string]: boolean;
    };
}

const breadcrumbs = [
    {
        title: 'User Role Assignment',
        href: route('user-roles-matrix.index'),
    },
];

export default function UserRoleMatrixPage({
                                               users: initialUsers,
                                               roles: initialRoles,

                                               flash,
                                           }: UserRoleMatrixPageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
    const [hasChanges, setHasChanges] = useState(false);

    // User modal state
    const [ setUserModal] = useState({
        open: false,
        mode: 'create' as 'create' | 'edit',
        user: null as User | null
    });

    // Initialize matrix state
    const [matrix, setMatrix] = useState<UserRoleMatrix>(() => {
        const initialMatrix: UserRoleMatrix = {};

        initialUsers.forEach(user => {
            initialMatrix[user.id] = {};
            initialRoles.forEach(role => {
                initialMatrix[user.id][role.id] =
                    user.roles?.some(r => r.id === role.id) || false;
            });
        });

        return initialMatrix;
    });

    const { data, setData, post, processing } = useForm({
        matrix: matrix
    });



    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Group users by department or create single group
    const userGroups = useMemo<UserGroup[]>(() => {
        const groups: { [key: string]: User[] } = {};

        initialUsers.forEach(user => {
            const groupName = user.department || 'No Department';

            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(user);
        });

        return Object.entries(groups)
            .map(([name, users]) => ({
                name,
                users: users.sort((a, b) => a.name.localeCompare(b.name)),
                expanded: expandedGroups[name] !== false // Default to expanded
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [initialUsers, expandedGroups]);

    // Filter groups based on search
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return userGroups;

        const query = searchQuery.toLowerCase();
        return userGroups
            .map(group => ({
                ...group,
                users: group.users.filter(user =>
                    user.name.toLowerCase().includes(query) ||
                    user.email.toLowerCase().includes(query) ||
                    group.name.toLowerCase().includes(query)
                )
            }))
            .filter(group => group.users.length > 0);
    }, [userGroups, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const totalUsers = initialUsers.length;
        const totalRoles = initialRoles.length;
        const totalAssignments = Object.values(matrix).reduce((sum, userRoles) =>
            sum + Object.values(userRoles).filter(Boolean).length, 0
        );
        const avgRolesPerUser = totalUsers > 0 ? (totalAssignments / totalUsers).toFixed(1) : '0';
        const usersWithRoles = Object.values(matrix).filter(userRoles =>
            Object.values(userRoles).some(Boolean)
        ).length;

        return {
            totalUsers,
            totalRoles,
            totalGroups: userGroups.length,
            totalAssignments,
            avgRolesPerUser,
            usersWithRoles
        };
    }, [initialUsers, initialRoles, userGroups, matrix]);

    // Handlers
    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const toggleUserRole = (userId: string | number, roleId: string | number) => {
        setMatrix(prev => {
            const newMatrix = {
                ...prev,
                [userId]: {
                    ...prev[userId],
                    [roleId]: !prev[userId][roleId]
                }
            };
            setHasChanges(true);
            return newMatrix;
        });
    };

    const toggleAllInGroup = (groupName: string, roleId: string | number, checked: boolean) => {
        const group = userGroups.find(g => g.name === groupName);
        if (!group) return;

        setMatrix(prev => {
            const newMatrix = { ...prev };
            group.users.forEach(user => {
                newMatrix[user.id][roleId] = checked;
            });
            setHasChanges(true);
            return newMatrix;
        });
    };

    const toggleAllForUser = (userId: string | number, checked: boolean) => {
        setMatrix(prev => {
            const newMatrix = {
                ...prev,
                [userId]: {}
            };
            initialRoles.forEach(role => {
                newMatrix[userId][role.id] = checked;
            });
            setHasChanges(true);
            return newMatrix;
        });
    };

    const toggleAllForRole = (roleId: string | number, checked: boolean) => {
        setMatrix(prev => {
            const newMatrix = { ...prev };
            initialUsers.forEach(user => {
                newMatrix[user.id][roleId] = checked;
            });
            setHasChanges(true);
            return newMatrix;
        });
    };

    const saveChanges = () => {
        setData('matrix', matrix);
        post('/user-roles-matrix', {
            onSuccess: () => {
                toast.success('User roles updated successfully!');
                setHasChanges(false);
            },
            onError: () => {
                toast.error('Failed to update user roles');
            },
            preserveScroll: true,
        });
    };

    const resetChanges = () => {
        const originalMatrix: UserRoleMatrix = {};
        initialUsers.forEach(user => {
            originalMatrix[user.id] = {};
            initialRoles.forEach(role => {
                originalMatrix[user.id][role.id] =
                    user.roles?.some(r => r.id === role.id) || false;
            });
        });
        setMatrix(originalMatrix);
        setHasChanges(false);
        toast.info('Changes reset');
    };

    const expandAllGroups = () => {
        const allExpanded: { [key: string]: boolean } = {};
        userGroups.forEach(group => {
            allExpanded[group.name] = true;
        });
        setExpandedGroups(allExpanded);
    };

    const collapseAllGroups = () => {
        const allCollapsed: { [key: string]: boolean } = {};
        userGroups.forEach(group => {
            allCollapsed[group.name] = false;
        });
        setExpandedGroups(allCollapsed);
    };

    // Get role status for group header
    const getGroupRoleStatus = (groupName: string, roleId: string | number) => {
        const group = userGroups.find(g => g.name === groupName);
        if (!group) return { checked: false, indeterminate: false };

        const users = group.users;
        const checkedCount = users.filter(u => matrix[u.id]?.[roleId]).length;

        return {
            checked: checkedCount === users.length,
            indeterminate: checkedCount > 0 && checkedCount < users.length
        };
    };







    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Role Assignment Matrix" />
            <>
                <div className="flex h-full max-h-screen flex-col gap-4 rounded-xl p-2 sm:p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={expandAllGroups}
                                >
                                    Expand All
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={collapseAllGroups}
                                >
                                    Collapse All
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link href={`/roles-permissions`}>
                                <Button variant={"outline"} className="w-full">

                                    Role and Permission Management
                                </Button>
                            </Link>
                            {hasChanges && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={resetChanges}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                            <Button
                                onClick={saveChanges}
                                disabled={!hasChanges || processing}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {processing ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <Card className="border-sidebar-border/70">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">{stats.totalGroups}</p>
                                    <p className="text-sm text-muted-foreground">Groups</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/70">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">{stats.totalUsers}</p>
                                    <p className="text-sm text-muted-foreground">Users</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/70">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-purple-600">{stats.totalRoles}</p>
                                    <p className="text-sm text-muted-foreground">Roles</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/70">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-orange-600">{stats.totalAssignments}</p>
                                    <p className="text-sm text-muted-foreground">Assignments</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/70">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-red-600">{stats.avgRolesPerUser}</p>
                                    <p className="text-sm text-muted-foreground">Avg/User</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/70">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-indigo-600">{stats.usersWithRoles}</p>
                                    <p className="text-sm text-muted-foreground">With Roles</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search */}
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users, emails, and departments..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Matrix Table */}
                    <Card className="border-sidebar-border/70">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <div className="min-w-full">
                                    {/* Header Row */}
                                    <div className="flex border-b bg-muted/30">
                                        <div className="w-80 p-4 font-medium border-r bg-background">
                                            Users
                                        </div>
                                        {initialRoles.map(role => (
                                            <div key={role.id} className="w-38 p-4 text-center border-r bg-background">
                                                <div className="font-medium text-sm mb-2">{role.name}</div>
                                                <Checkbox
                                                    checked={initialUsers.every(u => matrix[u.id]?.[role.id])}
                                                    onCheckedChange={(checked) =>
                                                        toggleAllForRole(role.id, checked as boolean)
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* User Groups */}
                                    {filteredGroups.map(group => (
                                        <div key={group.name}>
                                            {/* Group Header */}
                                            <div className="flex border-b bg-muted/20">
                                                <div
                                                    className="w-80 flex-shrink-0 p-3 border-r cursor-pointer hover:bg-muted/40 flex items-center gap-2"
                                                    onClick={() => toggleGroup(group.name)}
                                                >
                                                    {group.expanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                    <span className="font-medium">{group.name}</span>
                                                    <Badge variant="outline" className="ml-auto">
                                                        {group.users.length}
                                                    </Badge>
                                                </div>
                                                {initialRoles.map(role => {
                                                    const status = getGroupRoleStatus(group.name, role.id);
                                                    return (
                                                        <div key={role.id} className="w-38  p-3 text-center border-r">
                                                            <Checkbox
                                                                checked={status.checked}
                                                                ref={(el) => {
                                                                    if (el) {
                                                                        el.indeterminate = status.indeterminate;
                                                                    }
                                                                }}
                                                                onCheckedChange={(checked) =>
                                                                    toggleAllInGroup(group.name, role.id, checked as boolean)
                                                                }
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Group Users */}
                                            {group.expanded && group.users.map(user => (
                                                <div key={user.id} className="flex border-b hover:bg-muted/30">
                                                    <div className="w-80 flex-shrink-0 p-3 border-r pl-8 flex items-center justify-between">
                                                        <div>
                                                            <div className="font-medium text-sm">{user.name}</div>
                                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                                        </div>
                                                        <Checkbox
                                                            checked={initialRoles.every(r => matrix[user.id]?.[r.id])}
                                                            onCheckedChange={(checked) =>
                                                                toggleAllForUser(user.id, checked as boolean)
                                                            }
                                                        />
                                                    </div>
                                                    {initialRoles.map(role => (
                                                        <div key={role.id} className="w-38 shrink p-3 text-center border-r">
                                                            <Checkbox
                                                                checked={matrix[user.id]?.[role.id] || false}
                                                                onCheckedChange={() =>
                                                                    toggleUserRole(user.id, role.id)
                                                                }
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Reminder */}
                    {hasChanges && (
                        <div className="fixed bottom-6 right-6 z-50">
                            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm text-orange-800 dark:text-orange-200">
                                            You have unsaved changes
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={saveChanges}
                                            disabled={processing}
                                            className="bg-orange-600 hover:bg-orange-700"
                                        >
                                            <Save className="h-3 w-3 mr-1" />
                                            Save
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>


            </>
        </AppLayout>
    );
}
