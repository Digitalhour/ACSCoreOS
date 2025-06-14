import { Button as ShadButton } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input as ShadInput } from '@/components/ui/input';
import { Label as ShadLabel } from '@/components/ui/label';
import { Textarea as ShadTextarea } from '@/components/ui/textarea';
import axios from 'axios';
import React, { useEffect as ReactUseEffect, useState as ReactUseState } from 'react'; // Renamed to avoid conflict with component's useState
import { toast as shadToast } from 'sonner';

// Re-define interface here if it's not globally available or imported
interface ImportedDataRowForEdit {
    import_id: number;
    file_name: string;
    row_identifier_key: string | null;
    row_identifier_value: string | null;
    row_data_json: Record<string, any>;
    import_timestamp: string;
}

interface EditDataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    item: ImportedDataRowForEdit | null; // Use the redefined interface
    onSuccess: (updatedItem: ImportedDataRowForEdit) => void; // Use the redefined interface
}

const EditDataDialog: React.FC<EditDataDialogProps> = ({ isOpen, onClose, item, onSuccess }) => {
    const [formData, setFormData] = ReactUseState<Record<string, any>>({});
    const [isSaving, setIsSaving] = ReactUseState<boolean>(false);

    ReactUseEffect(() => {
        if (item) {
            setFormData(JSON.parse(JSON.stringify(item.row_data_json))); // Deep copy
        } else {
            setFormData({});
        }
    }, [item]);

    if (!item) return null;

    const handleChange = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const getInputType = (value: any): string => {
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'checkbox';
        return 'text';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const response = await axios.put(`/api/imported-data/${item.import_id}`, {
                row_data_json: formData,
            });
            shadToast.success('Record updated successfully!');
            onSuccess(response.data.data);
            onClose();
        } catch (err: any) {
            shadToast.error('Failed to update record: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    const editableKeys = Object.keys(formData).filter((key) => {
        // Example: Prevent editing the unique identifier key if it's critical
        // if (item.row_identifier_key && key === item.row_identifier_key) {
        //     if (formData[key] !== item.row_identifier_value) {
        //         // Log or notify that this key shouldn't be changed here
        //         // For now, we allow editing but backend might ignore changes to it.
        //     }
        // }
        return true;
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg md:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Record (ID: {item.import_id})</DialogTitle>
                    <DialogDescription>
                        File: {item.file_name}
                        {item.row_identifier_key && ` | ${item.row_identifier_key}: ${item.row_identifier_value}`}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-grow space-y-4 overflow-y-auto py-4 pr-2">
                    {editableKeys.map((key) => {
                        const value = formData[key];
                        const inputType = getInputType(value);
                        const isTextArea = typeof value === 'string' && value.length > 60;

                        return (
                            <div key={key} className="grid grid-cols-4 items-center gap-4">
                                <ShadLabel htmlFor={key} className="col-span-1 text-right text-sm break-words">
                                    {key.replace(/_/g, ' ')}
                                </ShadLabel>
                                {isTextArea ? (
                                    <ShadTextarea
                                        id={key}
                                        value={String(value ?? '')}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        className="col-span-3 text-sm"
                                        rows={3}
                                    />
                                ) : (
                                    <ShadInput
                                        id={key}
                                        type={inputType}
                                        value={String(value ?? '')}
                                        onChange={(e) => handleChange(key, inputType === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                                        className="col-span-3 text-sm"
                                    />
                                )}
                            </div>
                        );
                    })}
                </form>
                <DialogFooter className="mt-auto border-t pt-4">
                    <DialogClose asChild>
                        <ShadButton type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </ShadButton>
                    </DialogClose>
                    <ShadButton type="submit" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </ShadButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditDataDialog;
