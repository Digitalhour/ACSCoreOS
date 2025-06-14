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
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';
import { MoreHorizontal, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PositionFormDialog from './PositionFormDialog'; // Create this

export interface Position {
    id: number;
    name: string;
    description: string | null;
    created_at?: string;
    updated_at?: string;
    users_count?: number; // Optional: if backend provides count of users in this position
}

const PositionsTable: React.FC = () => {
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [isFormDialogOpen, setIsFormDialogOpen] = useState<boolean>(false);
    const [editingPosition, setEditingPosition] = useState<Position | null>(null);

    const [itemToDelete, setItemToDelete] = useState<Position | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

    const fetchPositions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get<Position[]>('/api/positions');
            setPositions(response.data);
        } catch (err: any) {
            const errMsg = err.response?.data?.error || err.message || 'Failed to fetch positions.';
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPositions();
    }, [fetchPositions]);

    const handleCreateNew = () => {
        setEditingPosition(null);
        setIsFormDialogOpen(true);
    };

    const handleEdit = (position: Position) => {
        setEditingPosition(position);
        setIsFormDialogOpen(true);
    };

    const handleDelete = (position: Position) => {
        setItemToDelete(position);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await axios.delete(`/api/positions/${itemToDelete.id}`);
            toast.success(`Position '${itemToDelete.name}' deleted successfully.`);
            fetchPositions(); // Refresh the list
        } catch (err: any) {
            const errMsg = err.response?.data?.error || err.message || 'Failed to delete position.';
            toast.error(errMsg);
            console.error('Delete error details:', err.response?.data);
        } finally {
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
        }
    };

    const handleFormSuccess = () => {
        fetchPositions(); // Refresh list after create/update
        setIsFormDialogOpen(false);
        setEditingPosition(null);
    };

    if (loading) {
        return <div className="py-10 text-center">Loading positions...</div>;
    }

    if (error && positions.length === 0) {
        return <div className="py-10 text-center text-red-500">Error: {error}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleCreateNew}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Position
                </Button>
            </div>

            <div className="overflow-hidden rounded-md border shadow-sm">
                <Table>
                    {positions.length === 0 && !loading && <TableCaption>No positions found. Create one to get started!</TableCaption>}
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            {/* <TableHead>Users</TableHead> */}
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {positions.map((position) => (
                            <TableRow key={position.id}>
                                <TableCell className="font-medium">{position.id}</TableCell>
                                <TableCell>{position.name}</TableCell>
                                <TableCell className="text-muted-foreground max-w-xs truncate text-sm">
                                    {position.description || <span className="italic">No description</span>}
                                </TableCell>
                                {/* <TableCell>{position.users_count || 0}</TableCell> */}
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(position)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(position)}
                                                className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/50"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {positions.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No positions available.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <PositionFormDialog
                isOpen={isFormDialogOpen}
                onClose={() => {
                    setIsFormDialogOpen(false);
                    setEditingPosition(null);
                }}
                position={editingPosition}
                onSuccess={handleFormSuccess}
            />

            {itemToDelete && (
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will delete the position
                                <span className="font-semibold"> '{itemToDelete.name}'</span>. If users are assigned to this position, their position
                                will be unassigned (set to null).
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                                Yes, delete position
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
};
export default PositionsTable;
