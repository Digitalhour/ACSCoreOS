import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { Briefcase } from 'lucide-react'; // For the trigger button icon
import React, { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PositionSummary as PositionSummaryInterface, User as UserInterface } from './UserHierarchyTable';

interface AssignPositionDialogProps {
    user: UserInterface; // User is a direct prop
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

const AssignPositionDialog: React.FC<AssignPositionDialogProps> = ({ user, onSuccess, triggerButton }) => {
    const [open, setOpen] = useState(false); // Internal state for dialog visibility

    // Form fields state
    const [selectedPositionId, setSelectedPositionId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>(getDefaultDateTimeLocal());

    // UI feedback state
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isLoadingPositions, setIsLoadingPositions] = useState<boolean>(false);
    const [availablePositions, setAvailablePositions] = useState<PositionSummaryInterface[]>([]);

    useEffect(() => {
        const abortController = new AbortController();

        if (open && user) {
            // When dialog opens for a user, reset form and fetch data
            setSelectedPositionId(user.current_position?.id ? String(user.current_position.id) : '');
            setStartDate(getDefaultDateTimeLocal());
            setErrors({});
            setIsSaving(false); // Reset saving state

            const fetchPositions = async () => {
                setIsLoadingPositions(true);
                setAvailablePositions([]);
                try {
                    const response = await axios.get<PositionSummaryInterface[]>('/api/positions', {
                        signal: abortController.signal,
                        timeout: 30000,
                    });
                    setAvailablePositions(response.data);
                } catch (err: any) {
                    if (axios.isCancel(err)) {
                        console.log('Positions fetch request canceled.');
                    } else {
                        toast.error('Failed to load positions.');
                        console.error(err);
                    }
                } finally {
                    if (!abortController.signal.aborted) {
                        setIsLoadingPositions(false);
                    }
                }
            };
            fetchPositions();
        } else if (!open) {
            // When dialog closes, reset states
            setErrors({});
            setIsLoadingPositions(false);
            setIsSaving(false);
            setAvailablePositions([]);
            // Optionally reset form fields if desired
            // setSelectedPositionId('');
            // setStartDate(getDefaultDateTimeLocal());
        }

        return () => {
            abortController.abort(); // Cleanup on unmount or before effect re-runs
        };
    }, [open, user]); // Effect dependencies

    if (!user) {
        // Safety check, parent should ensure user is provided.
        return null;
    }

    const handleDialogClose = () => {
        setOpen(false);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({});

        if (!selectedPositionId) {
            setErrors({ position_id: ['Please select a position.'] });
            setIsSaving(false);
            return;
        }
        if (!startDate) {
            setErrors({ start_date: ['Please select a start date.'] });
            setIsSaving(false);
            return;
        }

        const dateObj = new Date(startDate);
        const formattedStartDate = `${dateObj.getFullYear()}-${('0' + (dateObj.getMonth() + 1)).slice(-2)}-${('0' + dateObj.getDate()).slice(-2)} ${('0' + dateObj.getHours()).slice(-2)}:${('0' + dateObj.getMinutes()).slice(-2)}:${('0' + dateObj.getSeconds()).slice(-2)}`;

        try {
            await axios.post(
                `/api/users-hierarchy/${user.id}/assign-position`,
                {
                    position_id: parseInt(selectedPositionId),
                    start_date: formattedStartDate,
                },
                {
                    timeout: 30000,
                },
            );
            toast.success(`Position assigned to ${user.name} successfully.`);
            onSuccess(); // Call parent's success handler
            setOpen(false); // Close dialog on success
        } catch (err: any) {
            if (err.response && err.response.status === 422 && err.response.data.errors) {
                setErrors(err.response.data.errors);
                toast.error('Validation failed. Please check the form.');
            } else {
                const errMsg = err.response?.data?.error || err.message || 'An unexpected error occurred.';
                toast.error(`Error assigning position: ${errMsg}`);
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
                        <Briefcase className="mr-1 h-3.5 w-3.5" /> Assign Pos
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Position to {user.name}</DialogTitle>
                    <DialogDescription>Select a new position and the start date for this assignment.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor={`position-select-${user.id}`}>Position</Label> {/* Unique ID for label */}
                        <Select value={selectedPositionId} onValueChange={setSelectedPositionId} disabled={isLoadingPositions}>
                            <SelectTrigger id={`position-select-${user.id}`} className={errors.position_id ? 'border-red-500' : ''}>
                                <SelectValue placeholder={isLoadingPositions ? 'Loading positions...' : 'Select a position'} />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingPositions ? (
                                    <div className="p-2 text-center">Loading positions...</div>
                                ) : availablePositions.length > 0 ? (
                                    availablePositions.map((pos) => (
                                        <SelectItem key={pos.id} value={String(pos.id)}>
                                            {pos.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-center">No positions found.</div>
                                )}
                            </SelectContent>
                        </Select>
                        {errors.position_id && <p className="mt-1 text-xs text-red-500">{errors.position_id.join(', ')}</p>}
                    </div>
                    <div className="w-6/12">
                        <Label htmlFor={`start-date-position-${user.id}`}>Start Date & Time</Label> {/* Unique ID for label */}
                        <Input
                            id={`start-date-position-${user.id}`}
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={errors.start_date ? 'border-red-500' : ''}
                        />
                        {errors.start_date && <p className="mt-1 text-xs text-red-500">{errors.start_date.join(', ')}</p>}
                    </div>
                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving || isLoadingPositions || !selectedPositionId}>
                            {isSaving ? 'Assigning...' : 'Assign Position'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
export default AssignPositionDialog;
