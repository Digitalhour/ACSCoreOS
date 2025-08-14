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
import {Part} from './types';

// import {slugify} from './utils';

interface PartDetailsModalProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    part: Part | null;
}

/**
 * Modal component for displaying detailed part information
 */
const PartDetailsModal: React.FC<PartDetailsModalProps> = ({ isOpen, setIsOpen, part }) => {
    if (!part) return null;
    const getOnlineStoreUrl = (): string | null => {
        return part.online_store_url ||
            part.nsproduct_match?.online_store_url ||
            part.shopify_data?.online_store_url ||
            null;
    };

    const onlineStoreUrl = getOnlineStoreUrl();

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl md:max-w-3xl lg:max-w-5xl dark:bg-gray-900">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <span>Part Details: {part.part_type || 'N/A'}</span>
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
                        {/* Original/Manual Image */}
                        <div>
                            <h4 className="mb-2 flex items-center text-sm font-semibold">
                                <FileText className="mr-2 h-4 w-4" />
                                Manual Image
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
                                    <p className="ml-2">No Manual Image Available</p>
                                </div>
                            )}
                        </div>

                        {/* Shopify Image */}
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
                        {/* ─── Key Part Details ─── */}
                        <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                            <h4 className="border-b pb-2 text-lg font-semibold">Part Information</h4>
                            <dl className="grid grid-cols-[100px_auto] gap-x-1 gap-y-3 text-sm">
                                {/* Most critical */}
                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Part Number:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.part_number || 'N/A'}</dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Quantity:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.quantity || 'N/A'}</dd>

                                {/* Secondary details */}
                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Part Type:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.part_type || 'N/A'}</dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Category:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.part_category || 'N/A'}</dd>

                                {/* Tertiary */}
                                <dt className="font-semibold text-gray-700 dark:text-gray-300">CCN Number:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.ccn_number || 'N/A'}</dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Location:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.part_location || 'N/A'}</dd>
                            </dl>

                            {part.description && (
                                <div className="pt-2">
                                    <dt className="font-semibold text-gray-700 dark:text-gray-300">Description:</dt>
                                    <dd className="text-gray-600 dark:text-gray-400">{part.description}</dd>
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

                        {/* ─── Store Availability ─── */}
                        {part.has_shopify_match && (
                            <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
                                <h4 className="flex items-center border-b border-green-300 pb-2 text-lg font-semibold text-green-800">
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Store Availability
                                </h4>
                                <div className="text-sm text-green-700">
                                    <p>✓ This part is available in our online store</p>
                                    {part.nsproduct_match && (
                                        <div className="mt-2 space-y-1 text-xs">
                                            <p>
                                                <strong>Store SKU:</strong> {part.nsproduct_match.number}
                                            </p>
                                            <p>
                                                <strong>Vendor:</strong> {part.nsproduct_match.oem}
                                            </p>
                                            <p>
                                                <strong>List Price</strong> {part.nsproduct_match.list_price}
                                            </p>
                                            <div className="flex justify-between pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => window.open(`https://admin.shopify.com/store/aircompressorservices/products/${part.nsproduct_match.shop_id}`, '_blank')}
                                                    className="flex items-center space-x-1"
                                                >
                                                    {/*<a*/}
                                                    {/*    target={'_blank'}*/}
                                                    {/*    href={`https://admin.shopify.com/store/aircompressorservices/products/${part.nsproduct_match.shop_id}`}*/}
                                                    {/*>*/}
                                                        <Wrench className="mr-1 h-4 w-4" />
                                                        Shopify
                                                    {/*</a>*/}
                                                </Button>
                                                {onlineStoreUrl && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(onlineStoreUrl, '_blank')}
                                                        className="flex items-center space-x-1"
                                                    >
                                                        <Store className="h-3 w-3" />
                                                        <span>ACS Online</span>

                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ─── Manual & Revision ─── */}
                        <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                            <h4 className="flex items-center border-b pb-2 text-lg font-semibold">
                                <FileText className="mr-2 h-4 w-4" />
                                Manual Information
                            </h4>
                            <dl className="grid grid-cols-[120px_auto] gap-x-1 gap-y-3 text-sm">
                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Manual Number:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.manual_number || 'N/A'}</dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">PDF:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">
                                    {part.pdf_url ? (
                                        <Button asChild variant="outline" size="sm">
                                            <a href={part.pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1">
                                                <FileText className="h-4 w-4" />
                                                <span>View PDF</span>
                                            </a>
                                        </Button>
                                    ) : (
                                        part.pdf_id || 'N/A'
                                    )}
                                </dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Revision:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.revision || 'N/A'}</dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Date:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.manual_date || 'N/A'}</dd>

                                <dt className="font-semibold text-gray-700 dark:text-gray-300">Page:</dt>
                                <dd className="text-gray-600 dark:text-gray-400">{part.img_page_number || 'N/A'}</dd>
                            </dl>
                        </div>

                        {/* ─── Additional Notes & Custom Fields ─── */}
                        {(part.additional_notes || (part.custom_fields && Object.keys(part.custom_fields).length > 0)) && (
                            <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                                {part.additional_notes && (
                                    <>
                                        <h4 className="border-b pb-2 text-lg font-semibold">Additional Notes</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{part.additional_notes}</p>
                                    </>
                                )}

                                {part.custom_fields && Object.keys(part.custom_fields).length > 0 && (
                                    <>
                                        <h4 className="border-b pb-2 text-lg font-semibold">Additional Details</h4>
                                        <dl className="grid grid-cols-[100px_auto] gap-x-1 gap-y-3 text-sm">
                                            {Object.entries(part.custom_fields).map(([key, value]) => (
                                                <React.Fragment key={key}>
                                                    <dt className="font-semibold text-gray-700 dark:text-gray-300">
                                                        {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:
                                                    </dt>
                                                    <dd className="text-gray-600 dark:text-gray-400">{String(value)}</dd>
                                                </React.Fragment>
                                            ))}
                                        </dl>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ─── Import Metadata ─── */}
                        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                            <h4 className="flex items-center border-b pb-2 text-sm font-semibold text-gray-500">
                                <Calendar className="mr-2 h-3 w-3" />
                                Import Information
                            </h4>
                            <dl className="mt-3 grid grid-cols-[70px_auto] gap-x-6 gap-y-3 text-xs">
                                <dt className="font-semibold text-gray-600">Source File:</dt>
                                <dd className="text-gray-500">{part.file_name || 'N/A'}</dd>
                            </dl>
                            <dl className="grid grid-cols-[80px_auto] gap-x-6 gap-y-3 text-xs">
                                <dt className="font-semibold text-gray-600">Import Time:</dt>
                                <dd className="text-gray-500">{part.import_timestamp ? new Date(part.import_timestamp).toLocaleString() : 'N/A'}</dd>
                            </dl>
                        </div>
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
