import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { UserCheck } from 'lucide-react'; // For the trigger button icon
import React, { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ManagerCandidate as ManagerCandidateInterface, User as UserInterface } from './UserHierarchyTable';

interface AssignManagerDialogProps {
    user: UserInterface; // User is now a direct prop for this specific dialog instance
    onSuccess: () => void; // Callback for parent to refresh data
    triggerButton?: React.ReactNode; // Optional custom trigger
}

const getDefaultDateTimeLocal = (): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 1);
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const AssignManagerDialog: React.FC<AssignManagerDialogProps> = ({ user, onSuccess, triggerButton }) => {
    const [open, setOpen] = useState(false); // Internal state to control dialog visibility

    // State for form fields
    const [selectedManagerId, setSelectedManagerId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>(getDefaultDateTimeLocal());

    // State for UI feedback
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isLoadingManagers, setIsLoadingManagers] = useState<boolean>(false);
    const [assignableManagers, setAssignableManagers] = useState<ManagerCandidateInterface[]>([]);

    useEffect(() => {
        const abortController = new AbortController();

        if (open && user) {
            // When dialog opens for a user, reset form and fetch data
            setSelectedManagerId(user.reports_to_user_id ? String(user.reports_to_user_id) : '');
            setStartDate(getDefaultDateTimeLocal());
            setErrors({});
            setIsSaving(false); // Reset saving state

            if (user.position_id) {
                const fetchManagers = async () => {
                    setIsLoadingManagers(true);
                    setAssignableManagers([]);
                    try {
                        const response = await axios.get<ManagerCandidateInterface[]>(`/api/users-hierarchy/${user.id}/assignable-managers`, {
                            signal: abortController.signal,
                            timeout: 30000,
                        });
                        setAssignableManagers(response.data);
                    } catch (err: any) {
                        if (axios.isCancel(err)) {
                            console.log('Assignable managers fetch canceled.');
                        } else {
                            toast.error('Failed to load assignable managers.');
                            console.error(err);
                        }
                    } finally {
                        if (!abortController.signal.aborted) {
                            setIsLoadingManagers(false);
                        }
                    }
                };
                fetchManagers();
            } else {
                setErrors({ user_position: ['The user must have a position assigned before a manager can be set.'] });
                setIsLoadingManagers(false);
                setAssignableManagers([]);
            }
        } else if (!open) {
            // When dialog closes, reset states
            setErrors({});
            setIsLoadingManagers(false);
            setIsSaving(false);
            setAssignableManagers([]);
            // Optionally reset form fields here if desired, e.g.
            // setSelectedManagerId('');
            // setStartDate(getDefaultDateTimeLocal());
        }

        return () => {
            abortController.abort(); // Cleanup on unmount or before effect re-runs
        };
    }, [open, user]); // Effect dependencies

    if (!user) {
        // This component instance is not usable without a user.
        // This check is more for safety; parent should ensure user is provided.
        return null;
    }

    const handleDialogClose = () => {
        setOpen(false);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({});

        if (!selectedManagerId) {
            setErrors({ manager_id: ['Please select a manager.'] });
            setIsSaving(false);
            return;
        }
        if (!startDate) {
            setErrors({ start_date: ['Please select a start date.'] });
            setIsSaving(false);
            return;
        }
        if (errors.user_position) {
            toast.error('Cannot assign manager: ' + errors.user_position.join(' '));
            setIsSaving(false);
            return;
        }

        const dateObj = new Date(startDate);
        const formattedStartDate = `${dateObj.getFullYear()}-${('0' + (dateObj.getMonth() + 1)).slice(-2)}-${('0' + dateObj.getDate()).slice(-2)} ${('0' + dateObj.getHours()).slice(-2)}:${('0' + dateObj.getMinutes()).slice(-2)}:${('0' + dateObj.getSeconds()).slice(-2)}`;

        try {
            await axios.post(
                `/api/users-hierarchy/${user.id}/assign-manager`,
                {
                    manager_id: parseInt(selectedManagerId),
                    start_date: formattedStartDate,
                },
                {
                    timeout: 30000,
                },
            );
            toast.success(`Manager assigned to ${user.name} successfully.`);
            onSuccess(); // Call parent's success handler (e.g., to refresh user list)
            setOpen(false); // Close dialog on success
        } catch (err: any) {
            if (err.response && err.response.status === 422 && err.response.data.errors) {
                setErrors(err.response.data.errors);
                toast.error('Validation failed. Please check the form.');
            } else {
                const errMsg = err.response?.data?.error || err.message || 'An unexpected error occurred.';
                toast.error(`Error assigning manager: ${errMsg}`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton ? (
                    triggerButton
                ) : (
                    <Button variant="ghost" size="sm" className="flex items-center text-xs">
                        {' '}
                        {/* Default trigger */}
                        <UserCheck className="mr-1 h-3.5 w-3.5" /> Assign Mgr
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Manager to {user.name}</DialogTitle>
                    <DialogDescription>Select a user to be the direct manager and the start date for this assignment.</DialogDescription>
                </DialogHeader>

                {errors.user_position && (
                    <div className="relative mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{errors.user_position.join(', ')}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 py-4" style={{ display: errors.user_position ? 'none' : 'block' }}>
                    <div>
                        <Label htmlFor={`manager-select-${user.id}`}>Manager</Label> {/* Unique ID for label */}
                        <Select value={selectedManagerId} onValueChange={setSelectedManagerId} disabled={isLoadingManagers || !!errors.user_position}>
                            <SelectTrigger id={`manager-select-${user.id}`} className={errors.manager_id ? 'border-red-500' : ''}>
                                <SelectValue placeholder={isLoadingManagers ? 'Loading managers...' : 'Select a manager'} />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingManagers ? (
                                    <div className="p-2 text-center">Loading managers...</div>
                                ) : assignableManagers.length > 0 ? (
                                    assignableManagers.map((mgr) => (
                                        <SelectItem key={mgr.id} value={String(mgr.id)}>
                                            {mgr.name} ({mgr.email})
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-center">No assignable managers found.</div>
                                )}
                            </SelectContent>
                        </Select>
                        {errors.manager_id && <p className="mt-1 text-xs text-red-500">{errors.manager_id.join(', ')}</p>}
                    </div>
                    <div>
                        <Label htmlFor={`start-date-manager-${user.id}`}>Start Date & Time</Label> {/* Unique ID for label */}
                        <Input
                            id={`start-date-manager-${user.id}`}
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={errors.start_date ? 'border-red-500' : ''}
                            disabled={!!errors.user_position}
                        />
                        {errors.start_date && <p className="mt-1 text-xs text-red-500">{errors.start_date.join(', ')}</p>}
                    </div>
                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving || isLoadingManagers || !selectedManagerId || !!errors.user_position}>
                            {isSaving ? 'Assigning...' : 'Assign Manager'}
                        </Button>
                    </DialogFooter>
                </form>
                {errors.user_position && (
                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={handleDialogClose}>
                            Close
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};
export default AssignManagerDialog;
