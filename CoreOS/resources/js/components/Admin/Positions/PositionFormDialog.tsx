import { Button as ShadButton } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input as ShadInput } from '@/components/ui/input';
import { Label as ShadLabel } from '@/components/ui/label';
import { Textarea as ShadTextarea } from '@/components/ui/textarea';
import axios from 'axios';
import React, { FormEvent, useEffect as ReactUseEffect, useState as ReactUseState } from 'react';
import { toast as shadToast } from 'sonner';
import { Position as PositionInterface } from './PositionsTable'; // Import the interface

interface PositionFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    position: PositionInterface | null; // The position to edit, or null to create
    onSuccess: () => void; // Callback on successful save
}

const PositionFormDialog: React.FC<PositionFormDialogProps> = ({ isOpen, onClose, position, onSuccess }) => {
    const [name, setName] = ReactUseState('');
    const [description, setDescription] = ReactUseState('');
    const [errors, setErrors] = ReactUseState<Record<string, string[]>>({});
    const [isSaving, setIsSaving] = ReactUseState<boolean>(false);

    ReactUseEffect(() => {
        if (position) {
            setName(position.name);
            setDescription(position.description || '');
        } else {
            // Reset for new position
            setName('');
            setDescription('');
        }
        setErrors({}); // Clear errors when dialog opens or position changes
    }, [position, isOpen]); // Rerun effect if isOpen changes (e.g. dialog reopens)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors({});

        const payload = { name, description };

        try {
            if (position && position.id) {
                // Update existing position
                await axios.put(`/api/positions/${position.id}`, payload);
                shadToast.success(`Position '${name}' updated successfully.`);
            } else {
                // Create new position
                await axios.post('/api/positions', payload);
                shadToast.success(`Position '${name}' created successfully.`);
            }
            onSuccess(); // Call parent's success handler (refreshes list, closes dialog)
        } catch (err: any) {
            if (err.response && err.response.status === 422 && err.response.data.errors) {
                setErrors(err.response.data.errors);
                shadToast.error('Validation failed. Please check the form.');
            } else {
                const errMsg = err.response?.data?.error || err.message || 'An unexpected error occurred.';
                shadToast.error(`Error saving position: ${errMsg}`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{position ? 'Edit Position' : 'Create New Position'}</DialogTitle>
                    <DialogDescription>
                        {position ? `Update the details for '${position.name}'.` : 'Enter the details for the new position.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <ShadLabel htmlFor="position-name">Position Name</ShadLabel>
                        <ShadInput
                            id="position-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Software Engineer, Sales Manager"
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.join(', ')}</p>}
                    </div>
                    <div>
                        <ShadLabel htmlFor="position-description">Description (Optional)</ShadLabel>
                        <ShadTextarea
                            id="position-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="A brief description of the position's role and responsibilities."
                            className={errors.description ? 'border-red-500' : ''}
                            rows={3}
                        />
                        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.join(', ')}</p>}
                    </div>

                    <DialogFooter className="mt-6">
                        <ShadButton type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </ShadButton>
                        <ShadButton type="submit" disabled={isSaving}>
                            {isSaving ? (position ? 'Saving Changes...' : 'Creating Position...') : position ? 'Save Changes' : 'Create Position'}
                        </ShadButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default PositionFormDialog;
