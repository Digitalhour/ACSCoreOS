import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {Calendar, FileText, ImageOff, Package, ShoppingCart, Store, Wrench} from 'lucide-react';
import React from 'react';

interface BrowsePart {
    id: number;
    part_number?: string;
    description?: string;
    manufacture?: string;
    part_type?: string;
    part_category?: string;
    models?: string[];
    quantity?: string;
    part_location?: string;
    image_url?: string | null;
    shopify_image?: string | null;
    has_shopify_match?: boolean;
    online_store_url?: string | null;
    shopify_data?: {
        admin_url?: string;
        title?: string;
        vendor?: string;
        status?: string;
    };
    additional_fields?: Record<string, any>;
    upload_info?: {
        filename?: string;
        uploaded_at?: string;
    };
    is_active?: boolean;
    created_at?: string;
}

interface PartDetailsModalProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    part: BrowsePart | null;
}

/**
 * Modal component for displaying detailed part information from new database schema
 */
const PartDetailsModal: React.FC<PartDetailsModalProps> = ({ isOpen, setIsOpen, part }) => {
    if (!part) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl md:max-w-3xl lg:max-w-5xl dark:bg-gray-900">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <span>Part Details: {part.part_type || part.part_number || 'N/A'}</span>
                        {part.has_shopify_match && (
                            <Badge variant="outline" className="text-green-600">
                                <ShoppingCart className="mr-1 h-3 w-3" />
                                Available in Store
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {part.manufacture || 'N/A'} - {part.part_type || ''}, {part.part_number || 'N/A'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
                    <div className="col-span-1 space-y-4 md:col-span-1">
                        {/* Manual/Original Image */}
                        <div>
                            <h4 className="mb-2 flex items-center text-sm font-semibold">
                                <FileText className="mr-2 h-4 w-4" />
                                Part Image
                            </h4>
                            {part.image_url ? (
                                <img
                                    src={part.image_url}
                                    alt={part.part_number || 'Part Image'}
                                    className="max-h-96 w-full rounded-lg border object-contain"
                                />
                            ) : (
                                <div className="flex h-64 w-full items-center justify-center rounded-lg bg-gray-200 text-gray-500 md:h-96">
                                    <ImageOff size={64} />
                                    <p className="ml-2">No Image Available</p>
                                </div>
                            )}
                        </div>

                        {/* Shopify Store Image */}
                        {part.shopify_image && (
                            <div>
                                <h4 className="mb-2 flex items-center text-sm font-semibold text-green-600">
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Store Product Image
                                </h4>
                                <img
                                    src={part.shopify_image}
                                    alt={`${part.part_number} - Store Product`}
                                    className="max-h-96 w-full rounded-lg border-2 object-contain"
                                />
                            </div>
                        )}
                    </div>

                    <div className="col-span-1 space-y-6 md:col-span-1">
                        {/* Key Part Details */}
                        <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                            <h4 className="border-b pb-2 text-lg font-semibold">Part Information</h4>
                            <dl className="grid grid-cols-[100px_auto] gap-x-1 gap-y-3 text-sm">
                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Part Number:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.part_number || 'N/A'}</dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Quantity:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.quantity || 'N/A'}</dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Part Type:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.part_type || 'N/A'}</dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Category:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.part_category || 'N/A'}</dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Location:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.part_location || 'N/A'}</dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Status:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">
                                    {part.is_active ? (
                                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                            Inactive
                                        </Badge>
                                    )}
                                </dd>
                            </dl>

                            {part.description && (
                                <div className="pt-2">
                                    <dt className="font-semibold text-gray-700 dark:text-gray-300">Description:</dt>
                                    <dd className="text-gray-600 dark:text-gray-400">{part.description}</dd>
                                </div>
                            )}
                        </div>

                        {/* Manufacturer & Compatibility */}
                        <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                            <h4 className="flex items-center border-b pb-2 text-lg font-semibold">
                                <Package className="mr-2 h-4 w-4" />
                                Manufacturer
                            </h4>
                            <dl className="grid grid-cols-[50px_auto] gap-x-1 gap-y-3 text-sm">
                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Name:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.manufacture || 'N/A'}</dd>
                            </dl>

                            {part.models && part.models.length > 0 && (
                                <div className="pt-2">
                                    <dt className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Compatible Models:</dt>
                                    <div className="flex flex-wrap gap-1">
                                        {part.models.map((model, index) => (
                                            <Badge key={index} variant="secondary">
                                                {model}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Store Availability */}
                        {part.has_shopify_match && (
                            <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
                                <h4 className="flex items-center border-b border-green-300 pb-2 text-lg font-semibold text-green-800">
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Store Availability
                                </h4>
                                <div className="text-sm text-green-700">
                                    <p>✓ This part is available in our online store</p>
                                    {part.shopify_data && (
                                        <div className="mt-2 space-y-1 text-xs">
                                            {part.shopify_data.title && (
                                                <p><strong>Title:</strong> {part.shopify_data.title}</p>
                                            )}
                                            {part.shopify_data.vendor && (
                                                <p><strong>Vendor:</strong> {part.shopify_data.vendor}</p>
                                            )}
                                            {part.shopify_data.status && (
                                                <p><strong>Status:</strong> {part.shopify_data.status}</p>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-2">
                                        {part.shopify_data?.admin_url && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(part.shopify_data!.admin_url, '_blank')}
                                                className="flex items-center space-x-1"
                                            >
                                                <Wrench className="mr-1 h-4 w-4" />
                                                Shopify Admin
                                            </Button>
                                        )}
                                        {part.online_store_url && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(part.online_store_url, '_blank')}
                                                className="flex items-center space-x-1"
                                            >
                                                <Store className="h-3 w-3" />
                                                <span>ACS Online</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Additional Fields */}
                        {part.additional_fields && Object.keys(part.additional_fields).length > 0 && (
                            <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                                <h4 className="border-b pb-2 text-lg font-semibold">Additional Details</h4>
                                <dl className="grid grid-cols-[120px_auto] gap-x-1 gap-y-3 text-sm">
                                    {Object.entries(part.additional_fields).map(([key, value]) => (
                                        <React.Fragment key={key}>
                                            <dt className="font-semibold text-gray-700 dark:text-gray-300">
                                                {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:
                                            </dt>
                                            <dd className="text-gray-600 dark:text-gray-400">{String(value)}</dd>
                                        </React.Fragment>
                                    ))}
                                </dl>
                            </div>
                        )}

                        {/* Upload Information */}
                        {part.upload_info && (
                            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                                <h4 className="flex items-center border-b pb-2 text-sm font-semibold text-gray-500">
                                    <Calendar className="mr-2 h-3 w-3" />
                                    Upload Information
                                </h4>
                                <dl className="mt-3 grid grid-cols-[70px_auto] gap-x-6 gap-y-3 text-xs">
                                    <dt className="font-semibold text-gray-600">Source File:</dt>
                                    <dd className="text-gray-500">{part.upload_info.filename || 'N/A'}</dd>
                                    <dt className="font-semibold text-gray-600">Upload Time:</dt>
                                    <dd className="text-gray-500">
                                        {part.upload_info.uploaded_at
                                            ? new Date(part.upload_info.uploaded_at).toLocaleString()
                                            : 'N/A'}
                                    </dd>
                                </dl>
                            </div>
                        )}
                    </div>
                </div>

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

export default PartDetailsModal;
