import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Head } from '@inertiajs/react';
import { Download, Folder, Image, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { useSonner } from 'sonner';

interface NetSuiteItem {
    id: string;
    displayname: string;
    description: string;
    vendorname: string;
}

interface ProductItem {
    id: string;
    name: string;
    custrecord_product_shopify_id: string;
    custrecord_product_parent_item: string;
    isinactive: string;
}

interface DriveImage {
    id: string;
    name: string;
    mimeType: string;
    tempUrl: string;
    isOriginal: boolean;
}

interface Folder {
    id: string;
    name: string;
}

interface ShopifyImage {
    id: string;
    alt: string;
    image: {
        url: string;
        width: number;
        height: number;
    };
}

const IMAGE_VIEW_OPTIONS = [
    { value: 'front', label: 'Front View' },
    { value: 'back', label: 'Back View' },
    { value: 'left-side', label: 'Left Side' },
    { value: 'right-side', label: 'Right Side' },
    { value: 'custom', label: 'Custom' },
];

export default function ProductPictureManager() {
    const { toast } = useSonner();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
    const [driveImages, setDriveImages] = useState<DriveImage[]>([]);
    const [netsuiteResults, setNetsuiteResults] = useState<NetSuiteItem | null>(null);
    const [productItems, setProductItems] = useState<ProductItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [croppedImages, setCroppedImages] = useState<string[]>([]);
    const [imageViews, setImageViews] = useState<string[]>([]);
    const [customTitles, setCustomTitles] = useState<string[]>([]);
    const [shopifyImages, setShopifyImages] = useState<Record<string, ShopifyImage[]>>({});
    const [loading, setLoading] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [netsuiteNumber, setNetsuiteNumber] = useState('');
    const [netsuiteItem, setNetsuiteItem] = useState<NetSuiteItem | null>(null);
    const [storeOriginal, setStoreOriginal] = useState(false);

    // Search folders
    const searchFolders = useCallback(
        async (query: string) => {
            if (query.length < 3) {
                setFolders([]);
                return;
            }

            try {
                const response = await fetch(`/product-picture-manager/search-folders?query=${encodeURIComponent(query)}`);
                const data = await response.json();
                setFolders(data.folders || []);
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to search folders',
                    variant: 'destructive',
                });
            }
        },
        [toast],
    );

    // Select folder and fetch images
    const selectFolder = useCallback(
        async (folder: Folder) => {
            setSelectedFolder(folder);
            setLoading(true);

            try {
                const response = await fetch(`/product-picture-manager/fetch-drive-images?folderId=${folder.id}`);
                const data = await response.json();

                if (data.success) {
                    setDriveImages(data.images || []);
                }

                // Extract number from folder name and search NetSuite
                const match = folder.name.match(/^(\d+)/);
                if (match) {
                    await searchNetSuite(match[1]);
                }
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to fetch folder images',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        },
        [toast],
    );

    // Search NetSuite
    const searchNetSuite = useCallback(
        async (number: string) => {
            try {
                const response = await fetch(`/product-picture-manager/search-netsuite?query=${encodeURIComponent(number)}`);
                const data = await response.json();

                setNetsuiteResults(data.itemDetails);
                setProductItems(data.items?.filter((item: ProductItem) => item.isinactive === 'F' && item.custrecord_product_shopify_id) || []);
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to search NetSuite',
                    variant: 'destructive',
                });
            }
        },
        [toast],
    );

    // Handle file upload
    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);

        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setUploadedImages((prev) => [...prev, result]);
                setStoreOriginal(true);
            };
            reader.readAsDataURL(file);
        });
    }, []);

    // Add drive image to upload queue
    const addDriveImageToQueue = useCallback((image: DriveImage) => {
        setUploadedImages((prev) => [...prev, image.tempUrl]);
        setStoreOriginal(false);
    }, []);

    // Open crop modal
    const openCropModal = useCallback((imageUrl: string) => {
        setSelectedImage(imageUrl);
        setShowCropModal(true);
    }, []);

    // Save cropped image
    const saveCroppedImage = useCallback((croppedDataUrl: string, view: string, customTitle?: string) => {
        setCroppedImages((prev) => [...prev, croppedDataUrl]);
        setImageViews((prev) => [...prev, view]);
        setCustomTitles((prev) => [...prev, customTitle || '']);
        setShowCropModal(false);
    }, []);

    // Remove cropped image
    const removeCroppedImage = useCallback((index: number) => {
        setCroppedImages((prev) => prev.filter((_, i) => i !== index));
        setImageViews((prev) => prev.filter((_, i) => i !== index));
        setCustomTitles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Upload processed images
    const uploadProcessedImages = useCallback(async () => {
        if (!selectedFolder || selectedItems.length === 0 || croppedImages.length === 0) {
            toast({
                title: 'Missing Information',
                description: 'Please select folder, items, and crop images first',
                variant: 'destructive',
            });
            return;
        }

        // Validate image views
        for (let i = 0; i < croppedImages.length; i++) {
            if (!imageViews[i]) {
                toast({
                    title: 'Missing View',
                    description: 'Please select a view for all cropped images',
                    variant: 'destructive',
                });
                return;
            }
            if (imageViews[i] === 'custom' && !customTitles[i]) {
                toast({
                    title: 'Missing Custom Title',
                    description: 'Please enter custom titles for all custom view images',
                    variant: 'destructive',
                });
                return;
            }
        }

        setLoading(true);

        try {
            const selectedItemsData = productItems.filter((item) => selectedItems.includes(item.id));

            const response = await fetch('/product-picture-manager/upload-processed-images', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    images: croppedImages,
                    folderId: selectedFolder.id,
                    selectedItems: selectedItemsData,
                    imageViews,
                    customTitles,
                    storeOriginal,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: 'Success',
                    description: data.message,
                });

                // Clear uploaded and cropped images
                setUploadedImages([]);
                setCroppedImages([]);
                setImageViews([]);
                setCustomTitles([]);
                setSelectedItems([]);

                // Refresh drive images
                if (selectedFolder) {
                    const refreshResponse = await fetch(`/product-picture-manager/fetch-drive-images?folderId=${selectedFolder.id}`);
                    const refreshData = await refreshResponse.json();
                    if (refreshData.success) {
                        setDriveImages(refreshData.images || []);
                    }
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to upload images',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [selectedFolder, selectedItems, croppedImages, imageViews, customTitles, storeOriginal, productItems, toast]);

    // Create folders
    const createFolders = useCallback(async () => {
        if (!netsuiteItem || !netsuiteNumber) {
            toast({
                title: 'Missing Information',
                description: 'Please enter a valid NetSuite number',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/product-picture-manager/create-folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    netsuiteNumber,
                    itemDetails: netsuiteItem,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: 'Success',
                    description: 'Folder created successfully',
                });
                setShowFolderModal(false);
                setNetsuiteNumber('');
                setNetsuiteItem(null);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to create folder',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [netsuiteItem, netsuiteNumber, toast]);

    // Load Shopify images
    const loadShopifyImages = useCallback(
        async (shopifyId: string) => {
            if (shopifyImages[shopifyId]) return shopifyImages[shopifyId];

            try {
                const response = await fetch(`/product-picture-manager/shopify-images?shopifyId=${shopifyId}`);
                const data = await response.json();

                setShopifyImages((prev) => ({
                    ...prev,
                    [shopifyId]: data.images || [],
                }));

                return data.images || [];
            } catch (error) {
                return [];
            }
        },
        [shopifyImages],
    );

    return (
        <>
            <Head title="Product Picture Manager" />

            <div className="container mx-auto space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Product Picture Manager</h1>
                    <Dialog open={showFolderModal} onOpenChange={setShowFolderModal}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Folder
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Folder</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="netsuite-number">NetSuite Number</Label>
                                    <Input
                                        id="netsuite-number"
                                        value={netsuiteNumber}
                                        onChange={(e) => {
                                            setNetsuiteNumber(e.target.value);
                                            if (e.target.value.length >= 2) {
                                                searchNetSuite(e.target.value);
                                            }
                                        }}
                                        placeholder="Enter NetSuite number..."
                                    />
                                </div>
                                {netsuiteItem && (
                                    <div className="rounded-lg bg-gray-50 p-4">
                                        <h4 className="font-semibold">{netsuiteItem.displayname}</h4>
                                        <p className="text-sm text-gray-600">{netsuiteItem.description}</p>
                                        <p className="text-sm text-gray-600">ID: {netsuiteItem.id}</p>
                                    </div>
                                )}
                                <Button onClick={createFolders} disabled={!netsuiteItem || loading}>
                                    {loading ? 'Creating...' : 'Create Folder'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    {/* Left Sidebar */}
                    <div className="space-y-6">
                        {/* Folder Search */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Search className="mr-2 h-4 w-4" />
                                    Folder Search
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Input
                                        placeholder="Search folders..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            searchFolders(e.target.value);
                                        }}
                                    />

                                    {folders.length > 0 && (
                                        <div className="max-h-60 space-y-2 overflow-y-auto">
                                            {folders.map((folder) => (
                                                <div
                                                    key={folder.id}
                                                    className="cursor-pointer rounded border p-2 hover:bg-gray-50"
                                                    onClick={() => selectFolder(folder)}
                                                >
                                                    <div className="flex items-center">
                                                        <Folder className="mr-2 h-4 w-4" />
                                                        <span className="text-sm">{folder.name}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Image Upload */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Image Upload
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Select Images
                                    </Button>

                                    {uploadedImages.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {uploadedImages.map((image, index) => (
                                                <div key={index} className="relative">
                                                    <img
                                                        src={image}
                                                        alt={`Upload ${index}`}
                                                        className="h-20 w-full cursor-pointer rounded object-cover"
                                                        onClick={() => openCropModal(image)}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="absolute top-1 right-1 h-6 w-6 p-0"
                                                        onClick={() => setUploadedImages((prev) => prev.filter((_, i) => i !== index))}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="space-y-6 lg:col-span-3">
                        {/* NetSuite Item Details */}
                        {netsuiteResults && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>NetSuite Item Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                        <div>
                                            <Label className="text-sm text-gray-600">Name</Label>
                                            <p className="font-semibold">{netsuiteResults.displayname}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm text-gray-600">Item ID</Label>
                                            <p className="font-semibold">{netsuiteResults.id}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm text-gray-600">Description</Label>
                                            <p className="font-semibold">{netsuiteResults.description}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm text-gray-600">Vendor</Label>
                                            <p className="font-semibold">{netsuiteResults.vendorname}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Tabs defaultValue="images" className="w-full">
                            <TabsList>
                                <TabsTrigger value="images">Images</TabsTrigger>
                                <TabsTrigger value="products">Products</TabsTrigger>
                                <TabsTrigger value="cropped">Cropped Images</TabsTrigger>
                            </TabsList>

                            {/* Drive Images */}
                            <TabsContent value="images">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Google Drive Images</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedFolder ? (
                                            <div className="space-y-4">
                                                <Badge variant="outline">{selectedFolder.name}</Badge>

                                                {driveImages.length > 0 ? (
                                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                                                        {driveImages.map((image) => (
                                                            <div key={image.id} className="group relative">
                                                                <img
                                                                    src={image.tempUrl}
                                                                    alt={image.name}
                                                                    className="h-24 w-full cursor-pointer rounded object-cover"
                                                                    onClick={() => addDriveImageToQueue(image)}
                                                                />
                                                                <Badge
                                                                    variant={image.isOriginal ? 'default' : 'secondary'}
                                                                    className="absolute top-1 left-1 text-xs"
                                                                >
                                                                    {image.isOriginal ? 'Original' : 'Processed'}
                                                                </Badge>
                                                                <div className="bg-opacity-0 group-hover:bg-opacity-30 absolute inset-0 flex items-center justify-center rounded bg-black transition-all">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        className="opacity-0 transition-opacity group-hover:opacity-100"
                                                                        onClick={() => addDriveImageToQueue(image)}
                                                                    >
                                                                        <Download className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <p className="mt-1 truncate text-center text-xs">{image.name}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="py-8 text-center text-gray-500">No images found in this folder</p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="py-8 text-center text-gray-500">Select a folder to view images</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Products */}
                            <TabsContent value="products">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Product Items</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {productItems.length > 0 ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="select-all"
                                                        checked={selectedItems.length === productItems.length}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedItems(productItems.map((item) => item.id));
                                                            } else {
                                                                setSelectedItems([]);
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor="select-all">Select All Products</Label>
                                                </div>

                                                <div className="space-y-2">
                                                    {productItems.map((item) => (
                                                        <div key={item.id} className="flex items-center space-x-4 rounded border p-4">
                                                            <Checkbox
                                                                checked={selectedItems.includes(item.id)}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setSelectedItems((prev) => [...prev, item.id]);
                                                                    } else {
                                                                        setSelectedItems((prev) => prev.filter((id) => id !== item.id));
                                                                    }
                                                                }}
                                                            />
                                                            <div className="flex-1">
                                                                <h4 className="font-semibold">{item.name}</h4>
                                                                <p className="text-sm text-gray-600">
                                                                    Shopify ID: {item.custrecord_product_shopify_id}
                                                                </p>
                                                                <p className="text-sm text-gray-600">NetSuite ID: {item.id}</p>
                                                            </div>
                                                            <div className="flex space-x-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => loadShopifyImages(item.custrecord_product_shopify_id)}
                                                                >
                                                                    <Image className="mr-1 h-3 w-3" />
                                                                    Images
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="py-8 text-center text-gray-500">No products found</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Cropped Images */}
                            <TabsContent value="cropped">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Cropped Images</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {croppedImages.length > 0 ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    {croppedImages.map((image, index) => (
                                                        <div key={index} className="rounded-lg border p-4">
                                                            <img
                                                                src={image}
                                                                alt={`Cropped ${index}`}
                                                                className="mb-4 h-40 w-full rounded object-cover"
                                                            />
                                                            <div className="space-y-2">
                                                                <Select
                                                                    value={imageViews[index] || ''}
                                                                    onValueChange={(value) => {
                                                                        const newViews = [...imageViews];
                                                                        newViews[index] = value;
                                                                        setImageViews(newViews);
                                                                    }}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select view" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {IMAGE_VIEW_OPTIONS.map((option) => (
                                                                            <SelectItem key={option.value} value={option.value}>
                                                                                {option.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>

                                                                {imageViews[index] === 'custom' && (
                                                                    <Input
                                                                        placeholder="Enter custom title"
                                                                        value={customTitles[index] || ''}
                                                                        onChange={(e) => {
                                                                            const newTitles = [...customTitles];
                                                                            newTitles[index] = e.target.value;
                                                                            setCustomTitles(newTitles);
                                                                        }}
                                                                    />
                                                                )}

                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => removeCroppedImage(index)}
                                                                    className="w-full"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex space-x-4">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="store-original" checked={storeOriginal} onCheckedChange={setStoreOriginal} />
                                                        <Label htmlFor="store-original">Store Original</Label>
                                                    </div>

                                                    <Button
                                                        onClick={uploadProcessedImages}
                                                        disabled={loading || croppedImages.length === 0 || selectedItems.length === 0}
                                                        className="flex-1"
                                                    >
                                                        {loading ? 'Uploading...' : 'Upload All Images'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="py-8 text-center text-gray-500">No cropped images yet</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* Crop Modal */}
                <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Crop Image</DialogTitle>
                        </DialogHeader>
                        <ImageCropper imageUrl={selectedImage} onSave={saveCroppedImage} onCancel={() => setShowCropModal(false)} />
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

// Image Cropper Component
interface ImageCropperProps {
    imageUrl: string | null;
    onSave: (croppedDataUrl: string, view: string, customTitle?: string) => void;
    onCancel: () => void;
}

function ImageCropper({ imageUrl, onSave, onCancel }: ImageCropperProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [selectedView, setSelectedView] = useState('');
    const [customTitle, setCustomTitle] = useState('');
    const [cropData, setCropData] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const handleCrop = useCallback(() => {
        if (!canvasRef.current || !imageRef.current || !selectedView) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const image = imageRef.current;

        if (!ctx) return;

        canvas.width = cropData.width;
        canvas.height = cropData.height;

        ctx.drawImage(image, cropData.x, cropData.y, cropData.width, cropData.height, 0, 0, cropData.width, cropData.height);

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onSave(croppedDataUrl, selectedView, selectedView === 'custom' ? customTitle : undefined);
    }, [cropData, selectedView, customTitle, onSave]);

    if (!imageUrl) return null;

    return (
        <div className="space-y-4">
            <div className="flex justify-center">
                <div className="relative border">
                    <img
                        ref={imageRef}
                        src={imageUrl}
                        alt="Crop preview"
                        className="max-h-96 max-w-full"
                        onLoad={() => {
                            if (imageRef.current) {
                                setCropData({
                                    x: 0,
                                    y: 0,
                                    width: imageRef.current.width,
                                    height: imageRef.current.height,
                                });
                            }
                        }}
                    />
                </div>
            </div>

            <div className="flex space-x-4">
                <div className="flex-1">
                    <Label>View Type</Label>
                    <Select value={selectedView} onValueChange={setSelectedView}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select view type" />
                        </SelectTrigger>
                        <SelectContent>
                            {IMAGE_VIEW_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedView === 'custom' && (
                    <div className="flex-1">
                        <Label>Custom Title</Label>
                        <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Enter custom title" />
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleCrop} disabled={!selectedView || (selectedView === 'custom' && !customTitle)}>
                    Save Crop
                </Button>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
