import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { router } from '@inertiajs/react';
import { Calendar, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface User {
    id: number;
    name: string;
    email: string;
}

interface PtoType {
    id: number;
    name: string;
    code: string;
    color: string;
}

interface HistoricalPtoModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    ptoTypes: PtoType[];
    onSuccess: () => void;
}

export default function HistoricalPtoModal({ isOpen, onClose, users, onSuccess }: HistoricalPtoModalProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [userPtoTypes, setUserPtoTypes] = useState<PtoType[]>([]);
    const [loadingPtoTypes, setLoadingPtoTypes] = useState(false);
    const [selectedPtoTypeId, setSelectedPtoTypeId] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedUserId('');
            setUserPtoTypes([]);
            setSelectedPtoTypeId('');
            setStartDate('');
            setEndDate('');
            setReason('');
        }
    }, [isOpen]);

    // Fetch PTO types when user is selected
    useEffect(() => {
        setSelectedPtoTypeId('');

        if (selectedUserId) {
            setLoadingPtoTypes(true);
            fetch(`/api/users/${selectedUserId}/pto-types`)
                .then(response => response.json())
                .then(data => {
                    const typesData = data.data || data;
                    setUserPtoTypes(Array.isArray(typesData) ? typesData : []);
                })
                .catch(error => {
                    console.error('Error fetching PTO types for user:', error);
                    toast.error('Failed to load PTO types for the selected Employees.');
                    setUserPtoTypes([]);
                })
                .finally(() => {
                    setLoadingPtoTypes(false);
                });
        } else {
            setUserPtoTypes([]);
        }
    }, [selectedUserId]);

    const handleSubmit = async () => {
        // Validation
        if (!selectedUserId) {
            toast.error('Please select an Employees.');
            return;
        }
        if (!selectedPtoTypeId) {
            toast.error('Please select a PTO type.');
            return;
        }
        if (!startDate) {
            toast.error('Please select a start date.');
            return;
        }
        if (!endDate) {
            toast.error('Please select an end date.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            toast.error('End date must be on or after the start date.');
            return;
        }
        if (new Date(startDate) > new Date() || new Date(endDate) > new Date()) {
            toast.error('Historical PTO dates must be in the past.');
            return;
        }

        setIsSubmitting(true);

        try {
            router.post(route('submit-historical'), {
                user_id: parseInt(selectedUserId),
                pto_type_id: parseInt(selectedPtoTypeId),
                start_date: startDate,
                end_date: endDate,
                reason: reason.trim() || null,
            }, {
                onSuccess: () => {
                    toast.success('Historical PTO submitted successfully');
                    onSuccess();
                    onClose();
                },
                onError: (errors) => {
                    const errorMessage = Object.values(errors)[0] || 'Failed to submit historical PTO.';
                    toast.error(errorMessage);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                }
            });
        } catch (error) {
            console.error('Error submitting historical PTO:', error);
            toast.error('An unexpected error occurred. Please try again.');
            setIsSubmitting(false);
        }
    };

    const selectedUser = users.find((user) => user.id.toString() === selectedUserId);
    const selectedPtoType = userPtoTypes.find((type) => type.id.toString() === selectedPtoTypeId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Submit Historical PTO
                    </DialogTitle>
                    <DialogDescription>Submit a historical PTO request that has already been taken in the past.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="employee-select">Employee *</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                        <div className="flex flex-col">
                                            <span>{user.name}</span>
                                            <span className="text-muted-foreground text-xs">{user.email}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="pto-type-select">PTO Type *</Label>
                        <Select value={selectedPtoTypeId} onValueChange={setSelectedPtoTypeId} disabled={!selectedUserId || loadingPtoTypes}>
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={
                                        loadingPtoTypes
                                            ? 'Loading PTO types...'
                                            : !selectedUserId
                                                ? 'Select an Employees first'
                                                : userPtoTypes.length === 0
                                                    ? 'No PTO types available'
                                                    : 'Select PTO type'
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {userPtoTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded border" style={{ backgroundColor: type.color }} />
                                            <span>{type.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {type.code}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedUserId && !loadingPtoTypes && userPtoTypes.length === 0 && (
                            <p className="text-muted-foreground mt-1 text-sm">This employee has no PTO types assigned.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="start-date">Start Date *</Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div>
                            <Label htmlFor="end-date">End Date *</Label>
                            <Input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="reason">Reason (Optional)</Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Enter reason for this historical PTO..."
                            rows={3}
                            maxLength={500}
                        />
                        <p className="text-muted-foreground mt-1 text-xs">{reason.length}/500 characters</p>
                    </div>

                    {selectedUser && selectedPtoType && startDate && endDate && (
                        <div className="rounded-lg bg-blue-50 p-4">
                            <h4 className="mb-2 text-sm font-medium">Summary</h4>
                            <div className="space-y-1 text-sm">
                                <div>
                                    <strong>Employee:</strong> {selectedUser.name}
                                </div>
                                <div className="flex items-center gap-2">
                                    <strong>PTO Type:</strong>
                                    <div className="h-3 w-3 rounded border" style={{ backgroundColor: selectedPtoType.color }} />
                                    {selectedPtoType.name} ({selectedPtoType.code})
                                </div>
                                <div>
                                    <strong>Dates:</strong> {startDate} to {endDate}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedUserId || !selectedPtoTypeId || !startDate || !endDate}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Historical PTO
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
