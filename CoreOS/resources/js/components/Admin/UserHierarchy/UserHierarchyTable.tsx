import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from '@inertiajs/react';
import axios from 'axios';
import { Briefcase, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CircleUser, MoreHorizontal, Search, UserCheck } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import AssignManagerDialog from './AssignManagerDialog';
import AssignPositionDialog from './AssignPositionDialog';

export interface User {
    avatar: string | null;
    src?: string | null;
    id: number;
    name: string;
    email: string;
    position_id: number | null;
    reports_to_user_id: number | null;
    current_position?: {
        id: number;
        name: string;
    } | null;
    manager?: {
        id: number;
        name: string;
        email: string;
    } | null;
}

export interface PositionSummary {
    id: number;
    name: string;
}

export interface ManagerCandidate {
    id: number;
    name: string;
    email: string;
}

interface PaginatedUserResponse {
    data: User[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

const UserHierarchyTable: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
        from: 0,
        to: 0,
    });
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

    // Removed state for AssignPositionDialog as it will manage its own state
    // const [isAssignPositionDialogOpen, setIsAssignPositionDialogOpen] = useState<boolean>(false);
    // const [selectedUserForPosition, setSelectedUserForPosition] = useState<User | null>(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchUsers = useCallback(
        async (page = 1, search = debouncedSearchTerm) => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get<PaginatedUserResponse>('/api/users-hierarchy', {
                    params: {
                        page,
                        search,
                        per_page: pagination.per_page,
                    },
                    timeout: 30000,
                });
                setUsers(response.data.data);
                setPagination({
                    current_page: response.data.current_page,
                    last_page: response.data.last_page,
                    per_page: response.data.per_page,
                    total: response.data.total,
                    from: response.data.from,
                    to: response.data.to,
                });
            } catch (err: any) {
                const errMsg = err.response?.data?.error || err.message || 'Failed to fetch users.';
                setError(errMsg);
                toast.error(errMsg);
            } finally {
                setLoading(false);
            }
        },
        [pagination.per_page, debouncedSearchTerm],
    );

    useEffect(() => {
        fetchUsers(pagination.current_page, debouncedSearchTerm);
    }, [fetchUsers, pagination.current_page, debouncedSearchTerm]);

    // handleAssignPosition is no longer needed as the dialog triggers itself.
    // const handleAssignPosition = (user: User) => {
    //     setSelectedUserForPosition(user);
    //     setIsAssignPositionDialogOpen(true);
    // };

    const handleAssignmentSuccess = () => {
        fetchUsers(pagination.current_page, debouncedSearchTerm);
        // No need to manage dialog states here anymore
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.last_page) {
            setPagination((prev) => ({ ...prev, current_page: newPage }));
        }
    };

    if (loading && users.length === 0) {
        return <div className="py-10 text-center">Loading users...</div>;
    }

    if (error && users.length === 0) {
        return <div className="py-10 text-center text-red-500">Error: {error}</div>;
    }
    const getInitials = (name: string): string => {
        const names = name.split(' ');
        let initials = names[0].substring(0, 1).toUpperCase();
        if (names.length > 1) {
            initials += names[names.length - 1].substring(0, 1).toUpperCase();
        }
        return initials;
    };
    return (
        <div className="space-y-4">
            <div className="bg-card flex flex-col items-center gap-2 rounded-lg border p-4 shadow sm:flex-row">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                    <Input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-md border shadow-sm">
                <Table>
                    {users.length === 0 && !loading && <TableCaption>No users found.</TableCaption>}
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Current Position</TableHead>
                            <TableHead>Reports To (Manager)</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.id}</TableCell>

                                <TableCell>
                                    <div className={'group flex'}>
                                        <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                                            <AvatarImage src={user.avatar || undefined} alt={user.name} />
                                            <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="mt-2 grid flex-1 pl-2 text-left text-sm leading-tight">
                                            <span className="truncate font-medium">{user.name}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                                <TableCell>
                                    {user.current_position ? user.current_position.name : <span className="text-muted-foreground italic">N/A</span>}
                                </TableCell>
                                <TableCell>{user.manager ? user.manager.name : <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                                                <Link href={`/users/${user.id}`}>
                                                    <div className="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm outline-none">
                                                        <CircleUser className="mr-2 h-4 w-4" />
                                                        <span>View profile</span>
                                                    </div>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                                                <AssignPositionDialog
                                                    user={user}
                                                    onSuccess={handleAssignmentSuccess}
                                                    triggerButton={
                                                        <div className="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm outline-none">
                                                            <Briefcase className="mr-2 h-4 w-4" />
                                                            <span>Assign Position</span>
                                                        </div>
                                                    }
                                                />
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                                                <AssignManagerDialog
                                                    user={user}
                                                    onSuccess={handleAssignmentSuccess}
                                                    triggerButton={
                                                        <div className="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm outline-none">
                                                            <UserCheck className="mr-2 h-4 w-4" />
                                                            <span>Assign Manager</span>
                                                        </div>
                                                    }
                                                />
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No users match your search criteria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {users.length > 0 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-muted-foreground text-sm">
                        Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total} users.
                    </div>
                    <div className="space-x-1">
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={pagination.current_page === 1}>
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.current_page - 1)}
                            disabled={pagination.current_page === 1}
                        >
                            <ChevronLeft className="h-4 w-4" /> Previous
                        </Button>
                        <span className="p-2 text-sm">
                            Page {pagination.current_page} of {pagination.last_page}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.current_page + 1)}
                            disabled={pagination.current_page === pagination.last_page}
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.last_page)}
                            disabled={pagination.current_page === pagination.last_page}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Dialogs are now rendered within the table rows and manage their own state */}
        </div>
    );
};
export default UserHierarchyTable;
