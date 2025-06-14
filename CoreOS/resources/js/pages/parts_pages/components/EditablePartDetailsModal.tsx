import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { FileText, ImageOff, Package, Save, ShoppingCart } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Part } from './types';

// API response interfaces that match the Laravel model structure
interface Manufacturer {
    id: number;
    name: string;
}

interface Model {
    id: number;
    name: string;
}

interface PartCategory {
    id: number;
    name: string;
}

// This matches the actual API response from the Laravel PartInstance model
interface PartInstanceApiResponse {
    id: number;
    part_number: string;
    description?: string;
    quantity?: number;
    part_type?: string;
    part_location?: string;
    additional_notes?: string;
    manufacturer_id?: number;
    part_category_id?: number;
    ccn_number?: string;
    s3_img_url?: string;
    shopify_id?: string;
    // Note: shopify_image doesn't exist in the database
    is_active: boolean;
    file_name: string;
    import_batch_id?: string;
    import_timestamp: string;

    // Relationships
    manufacturer?: Manufacturer;
    partCategory?: PartCategory;
    models?: Model[];
}

// Interface for the SamplePart from FileDetailsPage
interface SamplePart {
    id: number;
    part_number: string;
    description: string;
    manufacturer: string;
    category: string;
    has_shopify_id: boolean;
    has_image: boolean;
    is_active: boolean;
    imported_at: string;
}

interface PartDetailsModalProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    part: SamplePart | Part | null;
    onPartUpdated?: () => void;
}

/**
 * Modal component for displaying and editing detailed part information
 */
const EditablePartDetailsModal: React.FC<PartDetailsModalProps> = ({ isOpen, setIsOpen, part, onPartUpdated }) => {
    const [activeTab, setActiveTab] = useState('view');
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedPart, setEditedPart] = useState<Partial<PartInstanceApiResponse>>({});
    const [fullPart, setFullPart] = useState<PartInstanceApiResponse | null>(null);

    useEffect(() => {
        if (part && isOpen) {
            console.log('🔍 DEBUG: Opening modal with part:', part);
            // Fetch the full part details when the modal opens
            fetchPartDetails(part.id);
            // Fetch manufacturers and models for dropdowns
            fetchManufacturers();
            fetchModels();
        }
    }, [part, isOpen]);

    useEffect(() => {
        if (fullPart) {
            console.log('🔍 DEBUG: Full part loaded:', fullPart);
            console.log('🔍 DEBUG: s3_img_url:', fullPart.s3_img_url);
            console.log('🔍 DEBUG: All part properties:', Object.keys(fullPart));

            setEditedPart({
                part_number: fullPart.part_number,
                description: fullPart.description,
                quantity: fullPart.quantity,
                part_type: fullPart.part_type,
                part_location: fullPart.part_location,
                additional_notes: fullPart.additional_notes,
                manufacturer_id: fullPart.manufacturer_id,
                is_active: fullPart.is_active,
            });
        }
    }, [fullPart]);

    const fetchPartDetails = async (partId: number) => {
        setIsLoading(true);
        try {
            console.log('🔍 DEBUG: Fetching part details for ID:', partId);
            const response = await axios.get(`/api/imported-data/${partId}`);
            console.log('🔍 DEBUG: API Response:', response.data);
            setFullPart(response.data);
        } catch (error) {
            console.error('❌ Error fetching part details:', error);
            toast.error('Failed to load part details');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchManufacturers = async () => {
        try {
            const response = await axios.get('/api/imported-data/manufacturers');
            setManufacturers(response.data);
        } catch (error) {
            console.error('Error fetching manufacturers:', error);
            toast.error('Failed to load manufacturers');
        }
    };

    const fetchModels = async () => {
        try {
            const response = await axios.get('/api/imported-data/models');
            setModels(response.data);
        } catch (error) {
            console.error('Error fetching models:', error);
            toast.error('Failed to load models');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedPart((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setEditedPart((prev) => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (checked: boolean) => {
        setEditedPart((prev) => ({ ...prev, is_active: checked }));
    };

    const handleSave = async () => {
        if (!fullPart) return;

        setIsSaving(true);
        try {
            console.log('Saving part with data:', editedPart);
            const response = await axios.put(`/api/imported-data/${fullPart.id}`, editedPart);
            console.log('Save response:', response.data);

            // Update the local state with the response data
            setFullPart(response.data.data);

            // Switch to view tab
            setActiveTab('view');

            // Show success message
            toast.success('Part updated successfully');

            // Force a delay before calling onPartUpdated to ensure the server has time to process the update
            setTimeout(() => {
                if (onPartUpdated) {
                    onPartUpdated();
                }
            }, 500);
        } catch (error: any) {
            console.error('Error updating part:', error);
            toast.error(error.response?.data?.message || 'Failed to update part');
        } finally {
            setIsSaving(false);
        }
    };

    // Helper functions to get values from either data structure
    const getPartNumber = () => {
        return fullPart?.part_number || part?.part_number || 'N/A';
    };

    const getManufacturerName = () => {
        if (fullPart?.manufacturer?.name) return fullPart.manufacturer.name;
        if ('manufacturer' in (part || {}) && part?.manufacturer) return part.manufacturer;
        if ('manufacture' in (part || {}) && (part as Part)?.manufacture) return (part as Part).manufacture;
        return 'N/A';
    };

    const getCategoryName = () => {
        if (fullPart?.partCategory?.name) return fullPart.partCategory.name;
        if ('category' in (part || {}) && part?.category) return (part as SamplePart).category;
        if ('part_category' in (part || {}) && (part as Part)?.part_category) return (part as Part).part_category;
        return 'N/A';
    };

    const getImageUrl = () => {
        // Only check s3_img_url since shopify_image doesn't exist in database
        const imageUrl = fullPart?.s3_img_url || (part as Part)?.image_url || null;
        console.log('🔍 DEBUG: getImageUrl() returning:', imageUrl);
        return imageUrl;
    };

    const hasShopifyMatch = () => {
        if (fullPart?.shopify_id) return true;
        if ('has_shopify_id' in (part || {}) && (part as SamplePart)?.has_shopify_id) return true;
        if ('has_shopify_match' in (part || {}) && (part as Part)?.has_shopify_match) return true;
        return false;
    };

    if (!part) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl md:max-w-3xl lg:max-w-5xl dark:bg-gray-900">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <span>Part Details: {fullPart?.part_type || getPartNumber()}</span>
                        {hasShopifyMatch() && (
                            <Badge variant="outline" className="text-green-600">
                                <ShoppingCart className="mr-1 h-3 w-3" />
                                Available in Store
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {getManufacturerName()} - {fullPart?.part_type || ''}, {getPartNumber()}
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="view">View</TabsTrigger>
                        <TabsTrigger value="edit">Edit</TabsTrigger>
                    </TabsList>

                    <TabsContent value="view">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                                <span className="ml-2">Loading part details...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
                                <div className="col-span-1 space-y-4 md:col-span-1">
                                    {/* Debug Information - Remove this after testing */}
                                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-xs">
                                        <h5 className="mb-2 font-semibold">🔍 Debug Info:</h5>
                                        <p>
                                            <strong>Part ID:</strong> {part?.id}
                                        </p>
                                        <p>
                                            <strong>Has Image (SamplePart):</strong>{' '}
                                            {'has_image' in (part || {}) ? String((part as SamplePart)?.has_image) : 'N/A'}
                                        </p>
                                        <p>
                                            <strong>s3_img_url:</strong> {fullPart?.s3_img_url || 'null/undefined'}
                                        </p>
                                        <p>
                                            <strong>image_url (Part):</strong> {(part as Part)?.image_url || 'null/undefined'}
                                        </p>
                                        <p>
                                            <strong>getImageUrl():</strong> {getImageUrl() || 'null'}
                                        </p>
                                    </div>

                                    {/* Part Image */}
                                    <div>
                                        <h4 className="mb-2 flex items-center text-sm font-semibold">
                                            <FileText className="mr-2 h-4 w-4" />
                                            Part Image
                                        </h4>
                                        {getImageUrl() ? (
                                            <div>
                                                <p className="mb-2 text-xs text-blue-600">Loading image from: {getImageUrl()}</p>
                                                <img
                                                    src={getImageUrl()!}
                                                    alt={getPartNumber()}
                                                    className="max-h-96 w-full rounded-lg border object-contain"
                                                    onLoad={() => {
                                                        console.log('✅ Image loaded successfully:', getImageUrl());
                                                    }}
                                                    onError={(e) => {
                                                        console.log('❌ Image failed to load:', getImageUrl());
                                                        console.log('❌ Error event:', e);
                                                        e.currentTarget.style.display = 'none';
                                                        const nextSibling = e.currentTarget.nextElementSibling as HTMLElement;
                                                        if (nextSibling) nextSibling.classList.remove('hidden');
                                                    }}
                                                />
                                                <div className="flex hidden h-64 w-full items-center justify-center rounded-lg bg-red-100 text-red-500 md:h-96">
                                                    <ImageOff size={64} />
                                                    <p className="ml-2">Image Failed to Load</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex h-64 w-full items-center justify-center rounded-lg bg-gray-200 text-gray-500 md:h-96">
                                                <ImageOff size={64} />
                                                <p className="ml-2">No Image Available</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-1 space-y-6 md:col-span-1">
                                    {/* ─── Key Part Details ─── */}
                                    <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                                        <h4 className="border-b pb-2 text-lg font-semibold">Part Information</h4>
                                        <dl className="grid grid-cols-[100px_auto] gap-x-1 gap-y-3 text-sm">
                                            {/* Most critical */}
                                            <dt className="font-semibold text-gray-700 dark:text-gray-300">Part Number:</dt>
                                            <dd className="text-gray-600 dark:text-gray-400">{getPartNumber()}</dd>

                                            <dt className="font-semibold text-gray-700 dark:text-gray-300">Quantity:</dt>
                                            <dd className="text-gray-600 dark:text-gray-400">
                                                {fullPart?.quantity || (part as Part)?.quantity || 'N/A'}
                                            </dd>

                                            {/* Secondary details */}
                                            <dt className="font-semibold text-gray-700 dark:text-gray-300">Part Type:</dt>
                                            <dd className="text-gray-600 dark:text-gray-400">
                                                {fullPart?.part_type || (part as Part)?.part_type || 'N/A'}
                                            </dd>

                                            <dt className="font-semibold text-gray-700 dark:text-gray-300">Category:</dt>
                                            <dd className="text-gray-600 dark:text-gray-400">{getCategoryName()}</dd>

                                            {/* Tertiary */}
                                            <dt className="font-semibold text-gray-700 dark:text-gray-300">CCN Number:</dt>
                                            <dd className="text-gray-600 dark:text-gray-400">
                                                {fullPart?.ccn_number || (part as Part)?.ccn_number || 'N/A'}
                                            </dd>

                                            <dt className="font-semibold text-gray-700 dark:text-gray-300">Location:</dt>
                                            <dd className="text-gray-600 dark:text-gray-400">
                                                {fullPart?.part_location || (part as Part)?.part_location || 'N/A'}
                                            </dd>

                                            <dt className="font-semibold text-gray-700 dark:text-gray-300">Status:</dt>
                                            <dd className="text-gray-600 dark:text-gray-400">
                                                {fullPart?.is_active || (part as SamplePart)?.is_active ? (
                                                    <Badge
                                                        variant="default"
                                                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                                    >
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                                                    >
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </dd>
                                        </dl>

                                        {(fullPart?.description || (part as Part)?.description) && (
                                            <div className="pt-2">
                                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Description:</dt>
                                                <dd className="text-gray-600 dark:text-gray-400">
                                                    {fullPart?.description || (part as Part)?.description}
                                                </dd>
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── Manufacturer & Compatibility ─── */}
                                    <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                                        <h4 className="flex items-center border-b pb-2 text-lg font-semibold">
                                            <Package className="mr-2 h-4 w-4" />
                                            Manufacturer
                                        </h4>
                                        <dl className="grid grid-cols-[50px_auto] gap-x-1 gap-y-3 text-sm">
                                            <dt className="font-semibold text-gray-700 dark:text-gray-300">Name:</dt>
                                            <dd className="text-gray-600 dark:text-gray-400">{getManufacturerName()}</dd>
                                        </dl>

                                        {((fullPart?.models && fullPart.models.length > 0) ||
                                            ((part as Part)?.models && (part as Part).models!.length > 0)) && (
                                            <div className="pt-2">
                                                <dt className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Compatible Models:</dt>
                                                <div className="flex flex-wrap gap-1">
                                                    {(fullPart?.models || []).map((model, index) => (
                                                        <Badge key={index} variant="secondary">
                                                            {model.name}
                                                        </Badge>
                                                    ))}
                                                    {!fullPart?.models &&
                                                        (part as Part)?.models &&
                                                        (part as Part).models!.map((model, index) => (
                                                            <Badge key={index} variant="secondary">
                                                                {model}
                                                            </Badge>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Additional Notes */}
                                    {(fullPart?.additional_notes || (part as Part)?.additional_notes) && (
                                        <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                                            <h4 className="border-b pb-2 text-lg font-semibold">Additional Notes</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {fullPart?.additional_notes || (part as Part)?.additional_notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="edit">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                                <span className="ml-2">Loading part details...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
                                <div className="col-span-1 space-y-4 md:col-span-1">
                                    {/* Part Number */}
                                    <div className="space-y-2">
                                        <Label htmlFor="part_number">Part Number</Label>
                                        <Input
                                            id="part_number"
                                            name="part_number"
                                            value={editedPart.part_number || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            name="description"
                                            value={editedPart.description || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                        />
                                    </div>

                                    {/* Quantity */}
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Quantity</Label>
                                        <Input
                                            id="quantity"
                                            name="quantity"
                                            type="number"
                                            value={editedPart.quantity || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Part Type */}
                                    <div className="space-y-2">
                                        <Label htmlFor="part_type">Part Type</Label>
                                        <Input id="part_type" name="part_type" value={editedPart.part_type || ''} onChange={handleInputChange} />
                                    </div>
                                </div>

                                <div className="col-span-1 space-y-4 md:col-span-1">
                                    {/* Manufacturer */}
                                    <div className="space-y-2">
                                        <Label htmlFor="manufacturer_id">Manufacturer</Label>
                                        <Select
                                            value={editedPart.manufacturer_id?.toString() || ''}
                                            onValueChange={(value) => handleSelectChange('manufacturer_id', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select manufacturer" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {manufacturers.map((manufacturer) => (
                                                    <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                                                        {manufacturer.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Part Location */}
                                    <div className="space-y-2">
                                        <Label htmlFor="part_location">Part Location</Label>
                                        <Input
                                            id="part_location"
                                            name="part_location"
                                            value={editedPart.part_location || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    {/* Additional Notes */}
                                    <div className="space-y-2">
                                        <Label htmlFor="additional_notes">Additional Notes</Label>
                                        <Textarea
                                            id="additional_notes"
                                            name="additional_notes"
                                            value={editedPart.additional_notes || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                        />
                                    </div>

                                    {/* Active Status */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="is_active" className="text-base">
                                                Part Status
                                            </Label>
                                            <div className="flex items-center space-x-2">
                                                <Switch id="is_active" checked={editedPart.is_active} onCheckedChange={handleSwitchChange} />
                                                <Label htmlFor="is_active" className="text-sm font-medium">
                                                    {editedPart.is_active ? 'Active' : 'Inactive'}
                                                </Label>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">Toggle to activate or deactivate this part.</p>
                                    </div>

                                    {/* Save Button */}
                                    <Button className="mt-4 w-full" onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? (
                                            <>
                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-white"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditablePartDetailsModal;
