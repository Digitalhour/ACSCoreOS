import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Separator} from '@/components/ui/separator';
import {Head, router} from '@inertiajs/react';
import {
    Download,
    FlipHorizontal,
    FlipVertical,
    Folder,
    Image,
    Plus,
    RotateCcw,
    RotateCw,
    Search,
    Trash2,
    Upload,
    X
} from 'lucide-react';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import ReactCrop, {Crop, PixelCrop} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {toast} from 'sonner';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {Slider} from "@/components/ui/slider";
import AppLayout from "@/layouts/app-layout";


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
    alt?: string;
    image?: {
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
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    const [showImageModal, setShowImageModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedProductItem, setSelectedProductItem] = useState<ProductItem | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
                router.get('/product-picture-manager/search-folders',
                    { query },
                    {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: (page: any) => {
                            setFolders(page.props.folders || []);
                        },
                        onError: () => {
                            toast.error('Failed to search folders');
                        }
                    }
                );
            } catch (error) {
                toast.error('Failed to search folders');
            }
        },
        [],
    );

    // Select folder and fetch images
    const selectFolder = useCallback(
        async (folder: Folder) => {
            setSelectedFolder(folder);
            setLoading(true);

            try {
                router.get('/product-picture-manager/fetch-drive-images',
                    { folderId: folder.id },
                    {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: (page: any) => {
                            if (page.props.success) {
                                setDriveImages(page.props.images || []);
                            }

                            // Extract number from folder name and search NetSuite
                            const match = folder.name.match(/^(\d+)/);
                            if (match) {
                                searchNetSuite(match[1]);
                            }
                        },
                        onError: () => {
                            toast.error('Failed to fetch folder images');
                        },
                        onFinish: () => {
                            setLoading(false);
                        }
                    }
                );
            } catch (error) {
                toast.error('Failed to fetch folder images');
                setLoading(false);
            }
        },
        [],
    );

    // Search NetSuite
    const searchNetSuite = useCallback(
        async (number: string) => {
            try {
                router.get('/product-picture-manager/search-netsuite',
                    { query: number },
                    {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: (page: any) => {
                            setNetsuiteResults(page.props.itemDetails);
                            setNetsuiteItem(page.props.itemDetails);
                            setProductItems(page.props.items?.filter((item: ProductItem) =>
                                item.isinactive === 'F' && item.custrecord_product_shopify_id) || []);
                        },
                        onError: () => {
                            toast.error('Failed to search NetSuite');
                        }
                    }
                );
            } catch (error) {
                toast.error('Failed to search NetSuite');
            }
        },
        [],
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

    // Open image modal
    const openImageModal = useCallback((productItem: ProductItem, imageIndex: number = 0) => {
        setSelectedProductItem(productItem);
        setSelectedImageIndex(imageIndex);
        setShowImageModal(true);
    }, []);

    // Navigate images in modal
    const navigateImage = useCallback((direction: 'next' | 'prev') => {
        if (!selectedProductItem) return;

        const images = shopifyImages[selectedProductItem.custrecord_product_shopify_id] || [];
        const maxIndex = images.filter(img => img.image?.url).length - 1;

        if (direction === 'next') {
            setSelectedImageIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
        } else {
            setSelectedImageIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
        }
    }, [selectedProductItem, shopifyImages]);

    // Load Shopify images
    const loadShopifyImages = useCallback(
        async (shopifyId: string) => {
            try {
                const response = await fetch(`/product-picture-manager/shopify-images?shopifyId=${shopifyId}`);
                const data = await response.json();

                if (data.success) {
                    setShopifyImages((prev) => ({
                        ...prev,
                        [shopifyId]: data.images || [],
                    }));
                } else {
                    console.error('Shopify API error:', data.error);
                    setShopifyImages((prev) => ({
                        ...prev,
                        [shopifyId]: [],
                    }));
                }
            } catch (error) {
                console.error('Error loading Shopify images:', error);
                setShopifyImages((prev) => ({
                    ...prev,
                    [shopifyId]: [],
                }));
            }
        },
        [],
    );

    // Delete image with confirmation
    const handleDeleteImage = useCallback(async () => {
        if (!selectedProductItem) return;

        const images = shopifyImages[selectedProductItem.custrecord_product_shopify_id]?.filter(img => img.image?.url) || [];
        const imageToDelete = images[selectedImageIndex];

        if (!imageToDelete) return;

        setLoading(true);

        try {
            router.delete('/product-picture-manager/delete-shopify-image', {
                data: {
                    shopifyId: selectedProductItem.custrecord_product_shopify_id,
                    imageId: imageToDelete.id
                },
                onSuccess: () => {
                    toast.success('Image deleted successfully');

                    // Force refresh images by clearing cache and reloading
                    const shopifyId = selectedProductItem.custrecord_product_shopify_id;
                    setShopifyImages((prev) => ({
                        ...prev,
                        [shopifyId]: []
                    }));

                    // Reload images
                    fetch(`/product-picture-manager/shopify-images?shopifyId=${shopifyId}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                setShopifyImages((prev) => ({
                                    ...prev,
                                    [shopifyId]: data.images || [],
                                }));
                            }
                        });

                    setShowDeleteConfirm(false);

                    // Adjust selected image index if needed
                    const remainingCount = images.length - 1;
                    if (selectedImageIndex >= remainingCount && remainingCount > 0) {
                        setSelectedImageIndex(remainingCount - 1);
                    } else if (remainingCount === 0) {
                        setShowImageModal(false);
                    }
                },
                onError: () => {
                    toast.error('Failed to delete image');
                },
                onFinish: () => {
                    setLoading(false);
                }
            });
        } catch (error) {
            toast.error('Failed to delete image');
            setLoading(false);
        }
    }, [selectedProductItem, selectedImageIndex, shopifyImages]);

    // Generate NetSuite URL
    const getNetSuiteUrl = useCallback((item: ProductItem) => {
        return `https://5541216.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=524&id=${item.id}`;
    }, []);

    // Generate Shopify Admin URL
    const getShopifyAdminUrl = useCallback((item: ProductItem) => {
        return `https://admin.shopify.com/store/aircompressorservices/products/${item.custrecord_product_shopify_id}`;
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
            toast.error('Please select folder, items, and crop images first');
            return;
        }

        // Validate image views
        for (let i = 0; i < croppedImages.length; i++) {
            if (!imageViews[i]) {
                toast.error('Please select a view for all cropped images');
                return;
            }
            if (imageViews[i] === 'custom' && !customTitles[i]) {
                toast.error('Please enter custom titles for all custom view images');
                return;
            }
        }

        setLoading(true);

        try {
            const selectedItemsData = productItems.filter((item) => selectedItems.includes(item.id));

            router.post('/product-picture-manager/upload-processed-images', {
                images: croppedImages,
                folderId: selectedFolder.id,
                selectedItems: selectedItemsData,
                imageViews,
                customTitles,
                storeOriginal,
            }, {
                onSuccess: (page: any) => {
                    if (page.props.success) {
                        toast.success(page.props.message);

                        // Clear uploaded and cropped images
                        setUploadedImages([]);
                        setCroppedImages([]);
                        setImageViews([]);
                        setCustomTitles([]);
                        setSelectedItems([]);

                        // Refresh drive images
                        if (selectedFolder) {
                            selectFolder(selectedFolder);
                        }
                    } else {
                        throw new Error(page.props.error);
                    }
                },
                onError: () => {
                    toast.error('Failed to upload images');
                },
                onFinish: () => {
                    setLoading(false);
                }
            });
        } catch (error) {
            toast.error('Failed to upload images');
            setLoading(false);
        }
    }, [selectedFolder, selectedItems, croppedImages, imageViews, customTitles, storeOriginal, productItems]);

    // Create folders
    const createFolders = useCallback(async () => {
        if (!netsuiteItem || !netsuiteNumber) {
            toast.error('Please enter a valid NetSuite number');
            return;
        }

        setLoading(true);

        try {
            router.post('/product-picture-manager/create-folders', {
                netsuiteNumber,
                itemDetails: netsuiteItem,
            }, {
                onSuccess: (page: any) => {
                    if (page.props.success) {
                        toast.success('Folder created successfully');
                        setShowFolderModal(false);
                        setNetsuiteNumber('');
                        setNetsuiteItem(null);
                    } else {
                        throw new Error(page.props.error);
                    }
                },
                onError: () => {
                    toast.error('Failed to create folder');
                },
                onFinish: () => {
                    setLoading(false);
                }
            });
        } catch (error) {
            toast.error('Failed to create folder');
            setLoading(false);
        }
    }, [netsuiteItem, netsuiteNumber]);

    // Load Shopify images automatically when products are loaded
    useEffect(() => {
        if (productItems.length > 0) {
            productItems.forEach(item => {
                if (item.custrecord_product_shopify_id && !shopifyImages[item.custrecord_product_shopify_id]?.length) {
                    loadShopifyImages(item.custrecord_product_shopify_id);
                }
            });
        }
    }, [productItems, loadShopifyImages, shopifyImages]);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Product Picture Manager',
            href: '/product-picture-manager',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Product Picture Manager" />
            <div className="container mx-auto space-y-6 ">
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setNetsuiteNumber(e.target.value);
                                            if (e.target.value.length >= 2) {
                                                searchNetSuite(e.target.value);
                                            }
                                        }}
                                        placeholder="Enter NetSuite number..."
                                    />
                                </div>
                                {netsuiteItem && (
                                    <Card>
                                        <CardContent className="pt-4">
                                            <h4 className="font-semibold">{netsuiteItem.displayname}</h4>
                                            <p className="text-sm text-muted-foreground">{netsuiteItem.description}</p>
                                            <p className="text-sm text-muted-foreground">ID: {netsuiteItem.id}</p>
                                        </CardContent>
                                    </Card>
                                )}
                                <Button
                                    onClick={createFolders}
                                    disabled={!netsuiteItem || loading}
                                    className="w-full"
                                >
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setSearchQuery(e.target.value);
                                            searchFolders(e.target.value);
                                        }}
                                    />

                                    {folders.length > 0 && (
                                        <div className="max-h-60 space-y-2 overflow-y-auto">
                                            {folders.map((folder) => (
                                                <div
                                                    key={folder.id}
                                                    className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted"
                                                    onClick={() => selectFolder(folder)}
                                                >
                                                    <div className="flex items-center">
                                                        <Folder className="mr-2 h-4 w-4 text-muted-foreground" />
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
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="outline"
                                        className="w-full"
                                    >
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
                                                        className="aspect-square cursor-pointer rounded-md object-cover"
                                                        onClick={() => openCropModal(image)}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="absolute right-1 top-1 h-6 w-6 p-0"
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
                                            <Label className="text-sm text-muted-foreground">Name</Label>
                                            <p className="font-semibold">{netsuiteResults.displayname}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm text-muted-foreground">Item ID</Label>
                                            <p className="font-semibold">{netsuiteResults.id}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm text-muted-foreground">Description</Label>
                                            <p className="font-semibold">{netsuiteResults.description}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm text-muted-foreground">Vendor</Label>
                                            <p className="font-semibold">{netsuiteResults.vendorname}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Google Drive Images */}
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
                                                            className="h-24 w-full cursor-pointer rounded-md object-cover"
                                                            onClick={() => addDriveImageToQueue(image)}
                                                        />
                                                        <Badge
                                                            variant={image.isOriginal ? 'default' : 'secondary'}
                                                            className="absolute left-1 top-1 text-xs"
                                                        >
                                                            {image.isOriginal ? 'Original' : 'Processed'}
                                                        </Badge>
                                                        <div className="absolute inset-0 flex items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100">
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => addDriveImageToQueue(image)}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <p className="mt-1 truncate text-center text-xs text-muted-foreground">
                                                            {image.name}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="py-8 text-center text-muted-foreground">
                                                No images found in this folder
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="py-8 text-center text-muted-foreground">
                                        Select a folder to view images
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Product Items */}
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
                                                onCheckedChange={(checked: boolean) => {
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
                                                <div key={item.id} className="flex items-center space-x-4 rounded-lg border p-4">
                                                    <Checkbox
                                                        checked={selectedItems.includes(item.id)}
                                                        onCheckedChange={(checked: boolean) => {
                                                            if (checked) {
                                                                setSelectedItems((prev) => [...prev, item.id]);
                                                            } else {
                                                                setSelectedItems((prev) => prev.filter((id) => id !== item.id));
                                                            }
                                                        }}
                                                    />
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold">{item.name}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            Shopify ID: {item.custrecord_product_shopify_id}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">NetSuite ID: {item.id}</p>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <div className="flex items-center space-x-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => window.open(getNetSuiteUrl(item), '_blank')}
                                                                title="Open in NetSuite"
                                                            >
                                                                NS
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => window.open(getShopifyAdminUrl(item), '_blank')}
                                                                title="Open in Shopify Admin"
                                                            >
                                                                Shopify
                                                            </Button>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            {shopifyImages[item.custrecord_product_shopify_id]?.length > 0 ? (
                                                                <div className="flex -space-x-1">
                                                                    {shopifyImages[item.custrecord_product_shopify_id]
                                                                        .filter(image => image.image?.url)
                                                                        .slice(0, 3).map((image, imgIndex) => (
                                                                            <img
                                                                                key={imgIndex}
                                                                                src={image.image!.url}
                                                                                alt={image.alt || 'Product image'}
                                                                                className="h-8 w-8 rounded-full ring-2 ring-white cursor-pointer hover:opacity-75 transition-opacity"
                                                                                onClick={() => openImageModal(item, imgIndex)}
                                                                            />
                                                                        ))}
                                                                    {shopifyImages[item.custrecord_product_shopify_id].filter(image => image.image?.url).length > 3 && (
                                                                        <div
                                                                            className="h-8 w-8 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-xs text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
                                                                            onClick={() => openImageModal(item, 3)}
                                                                        >
                                                                            +{shopifyImages[item.custrecord_product_shopify_id].filter(image => image.image?.url).length - 3}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => loadShopifyImages(item.custrecord_product_shopify_id)}
                                                                >
                                                                    <Image className="mr-1 h-3 w-3" />
                                                                    Load Images
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="py-8 text-center text-muted-foreground">No products found</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Cropped Images */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Cropped Images</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {croppedImages.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            {croppedImages.map((image, index) => (
                                                <Card key={index}>
                                                    <CardContent className="p-4">
                                                        <img
                                                            src={image}
                                                            alt={`Cropped ${index}`}
                                                            className="mb-4 h-40 w-full rounded-md object-cover"
                                                        />
                                                        <div className="space-y-2">
                                                            <Select
                                                                value={imageViews[index] || ''}
                                                                onValueChange={(value: string) => {
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
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="store-original"
                                                    checked={storeOriginal}
                                                    onCheckedChange={setStoreOriginal}
                                                />
                                                <Label htmlFor="store-original">Store Original</Label>
                                            </div>

                                            <Button
                                                onClick={uploadProcessedImages}
                                                disabled={loading || croppedImages.length === 0 || selectedItems.length === 0}
                                            >
                                                {loading ? 'Uploading...' : 'Upload All Images'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="py-8 text-center text-muted-foreground">No cropped images yet</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Crop Modal */}
                <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
                    <DialogContent className="min-w-8/12 max-w-10/12 p-0">
                        <DialogHeader className="sr-only">
                            <DialogTitle>Edit your image</DialogTitle>
                        </DialogHeader>
                        <ImageCropper
                            imageUrl={selectedImage}
                            onSave={saveCroppedImage}
                            onCancel={() => setShowCropModal(false)}
                        />
                    </DialogContent>
                </Dialog>

                {/* Image View Modal */}
                <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedProductItem?.name}
                            </DialogTitle>
                        </DialogHeader>
                        {selectedProductItem && shopifyImages[selectedProductItem.custrecord_product_shopify_id] && (
                            <ImageViewModal
                                productItem={selectedProductItem}
                                images={shopifyImages[selectedProductItem.custrecord_product_shopify_id].filter(img => img.image?.url)}
                                currentIndex={selectedImageIndex}
                                onNavigate={navigateImage}
                                onDelete={() => setShowDeleteConfirm(true)}
                                onClose={() => setShowImageModal(false)}
                                getNetSuiteUrl={getNetSuiteUrl}
                                getShopifyAdminUrl={getShopifyAdminUrl}
                            />
                        )}
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Modal */}
                <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Image</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <p>Are you sure you want to delete this image? This action cannot be undone.</p>
                            <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleDeleteImage} disabled={loading}>
                                    {loading ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

// Image View Modal Component
interface ImageViewModalProps {
    productItem: ProductItem;
    images: ShopifyImage[];
    currentIndex: number;
    onNavigate: (direction: 'next' | 'prev') => void;
    onDelete: () => void;
    onClose: () => void;
    getNetSuiteUrl: (item: ProductItem) => string;
    getShopifyAdminUrl: (item: ProductItem) => string;
}

function ImageViewModal({
                            productItem,
                            images,
                            currentIndex,
                            onNavigate,
                            onDelete,
                            onClose,
                            getNetSuiteUrl,
                            getShopifyAdminUrl
                        }: ImageViewModalProps) {
    const currentImage = images[currentIndex];

    if (!currentImage || !currentImage.image) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">No image available</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Product Info */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">{productItem.name}</h3>
                    <p className="text-sm text-muted-foreground">
                        Shopify ID: {productItem.custrecord_product_shopify_id}
                    </p>
                </div>
                <div className="flex space-x-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(getNetSuiteUrl(productItem), '_blank')}
                    >
                        Open in NetSuite
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(getShopifyAdminUrl(productItem), '_blank')}
                    >
                        Open in Shopify
                    </Button>
                </div>
            </div>

            {/* Image Display */}
            <div className="relative">
                <img
                    src={currentImage.image.url}
                    alt={currentImage.alt || 'Product image'}
                    className="w-full max-h-96 object-contain rounded-lg"
                />

                {/* Navigation Buttons */}
                {images.length > 1 && (
                    <>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="absolute left-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => onNavigate('prev')}
                        >
                            ←
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => onNavigate('next')}
                        >
                            →
                        </Button>
                    </>
                )}
            </div>

            {/* Image Info */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {currentImage.alt && <p>Alt Text: {currentImage.alt}</p>}
                    <p>Dimensions: {currentImage.image.width} × {currentImage.image.height}</p>
                    <p>Image {currentIndex + 1} of {images.length}</p>
                </div>

                <Button
                    size="sm"
                    variant="destructive"
                    onClick={onDelete}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Image
                </Button>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto pb-2">
                    {images.map((image, index) => (
                        <img
                            key={index}
                            src={image.image?.url}
                            alt={image.alt || `Thumbnail ${index + 1}`}
                            className={`h-16 w-16 object-cover rounded cursor-pointer flex-shrink-0 ${
                                index === currentIndex
                                    ? 'ring-2 ring-primary'
                                    : 'hover:opacity-75'
                            }`}
                            onClick={() => {
                                const diff = index - currentIndex;
                                if (diff > 0) {
                                    for (let i = 0; i < diff; i++) onNavigate('next');
                                } else if (diff < 0) {
                                    for (let i = 0; i < Math.abs(diff); i++) onNavigate('prev');
                                }
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Image Cropper Component
interface ImageCropperProps {
    imageUrl: string | null;
    onSave: (croppedDataUrl: string, view: string, customTitle?: string) => void;
    onCancel: () => void;
}

function ImageCropper({ imageUrl, onSave, onCancel }: ImageCropperProps) {
    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        x: 25,
        y: 25,
        width: 50,
        height: 50,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [selectedView, setSelectedView] = useState('');
    const [customTitle, setCustomTitle] = useState('');

    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
    const [rotation, setRotation] = useState(0);
    const [straightening, setStraightening] = useState([0]);
    const [contrast, setContrast] = useState([100]);
    const [highlights, setHighlights] = useState([0]);
    const [shadows, setShadows] = useState([0]);
    const [saturation, setSaturation] = useState([100]);
    const [tint, setTint] = useState([0]);
    const [temperature, setTemperature] = useState([0]);

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        setDimensions({ width: Math.round(width), height: Math.round(height) });
        const initialCrop = {
            unit: '%' as const,
            x: 25,
            y: 25,
            width: 50,
            height: 50,
        };
        setCrop(initialCrop);

        // Set initial completed crop
        setCompletedCrop({
            x: (width * 25) / 100,
            y: (height * 25) / 100,
            width: (width * 50) / 100,
            height: (height * 50) / 100,
            unit: 'px' as const,
        });
    }, []);

    const generateCrop = useCallback(() => {
        if (!completedCrop || !imgRef.current || !canvasRef.current || !selectedView) {
            return;
        }

        const image = imgRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        const pixelRatio = window.devicePixelRatio;

        canvas.width = completedCrop.width * pixelRatio;
        canvas.height = completedCrop.height * pixelRatio;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.imageSmoothingQuality = 'high';

        // Apply all image adjustments
        const brightness = 100 + highlights[0] + shadows[0];
        const hueRotate = tint[0] + temperature[0];
        const sepia = temperature[0] !== 0 ? Math.abs(temperature[0]) * 0.3 : 0;

        ctx.filter = `
            contrast(${contrast[0]}%)
            brightness(${brightness}%)
            saturate(${saturation[0]}%)
            hue-rotate(${hueRotate}deg)
            ${sepia > 0 ? `sepia(${sepia}%)` : ''}
        `.trim();

        // Apply rotation if needed
        if (rotation !== 0 || straightening[0] !== 0) {
            const centerX = completedCrop.width / 2;
            const centerY = completedCrop.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate((rotation + straightening[0]) * Math.PI / 180);
            ctx.translate(-centerX, -centerY);
        }

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            completedCrop.width,
            completedCrop.height,
        );

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onSave(croppedDataUrl, selectedView, selectedView === 'custom' ? customTitle : undefined);
    }, [completedCrop, selectedView, customTitle, rotation, straightening, contrast, highlights, shadows, saturation, tint, temperature, onSave]);

    const handleRotateLeft = () => setRotation(prev => prev - 90);
    const handleRotateRight = () => setRotation(prev => prev + 90);

    if (!imageUrl) return null;

    return (
        <div className="flex h-[80vh] rounded-lg">
            {/* Left Sidebar */}
            <div className="w-4/12 border-r bg-muted/30 p-6 overflow-y-auto">
                <div className="space-y-1">
                    {/* Resize Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide">RESIZE</h3>
                        <Separator />

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Width</Label>
                                <Input
                                    type="number"
                                    value={dimensions.width}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setDimensions(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))
                                    }
                                    className="h-8"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Height</Label>
                                <Input
                                    type="number"
                                    value={dimensions.height}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setDimensions(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))
                                    }
                                    className="h-8"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rotate & Flip Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide">ROTATE & FLIP</h3>
                        <Separator />

                        <div className="flex justify-between gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRotateLeft}
                                className="p-2"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRotateRight}
                                className="p-2"
                            >
                                <RotateCw className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="p-2"
                            >
                                <FlipHorizontal className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="p-2"
                            >
                                <FlipVertical className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Straightening</span>
                                <span>{straightening[0]}°</span>
                            </div>
                            <Slider
                                min={-30}
                                max={30}
                                step={1}
                                value={straightening}
                                onValueChange={setStraightening}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Adjustments Section */}
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold uppercase tracking-wide">ADJUSTMENTS</h3>
                        <Separator />
                        <Accordion
                            type="single"
                            collapsible
                            className="w-full"
                            defaultValue="item-1"
                        >
                            <AccordionItem value="item-1">
                                <AccordionTrigger>
                                    <span className="text-muted-foreground">Contrast</span>
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4 text-balance">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Contrast</span>
                                        <span>{contrast[0]}%</span>
                                    </div>
                                    <Slider
                                        min={0}
                                        max={200}
                                        step={1}
                                        value={contrast}
                                        onValueChange={setContrast}
                                        className="w-full"
                                    />
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>
                                    <span className="text-muted-foreground">Highlights</span>
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4 text-balance">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Highlights</span>
                                        <span>{highlights[0] > 0 ? '+' : ''}{highlights[0]}</span>
                                    </div>
                                    <Slider
                                        min={-100}
                                        max={100}
                                        step={1}
                                        value={highlights}
                                        onValueChange={setHighlights}
                                        className="w-full"
                                    />
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>
                                    <span className="text-muted-foreground">Shadows</span>
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4 text-balance">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Shadows</span>
                                        <span>{shadows[0] > 0 ? '+' : ''}{shadows[0]}</span>
                                    </div>
                                    <Slider
                                        min={-100}
                                        max={100}
                                        step={1}
                                        value={shadows}
                                        onValueChange={setShadows}
                                        className="w-full"
                                    />
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-4">
                                <AccordionTrigger>
                                    <span className="text-muted-foreground">Saturation</span>
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4 text-balance">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Saturation</span>
                                        <span>{saturation[0]}%</span>
                                    </div>
                                    <Slider
                                        min={0}
                                        max={200}
                                        step={1}
                                        value={saturation}
                                        onValueChange={setSaturation}
                                        className="w-full"
                                    />
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-5">
                                <AccordionTrigger>
                                    <span className="text-muted-foreground">Tint</span>
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4 text-balance">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Tint</span>
                                        <span>{tint[0] > 0 ? '+' : ''}{tint[0]}</span>
                                    </div>
                                    <Slider
                                        min={-100}
                                        max={100}
                                        step={1}
                                        value={tint}
                                        onValueChange={setTint}
                                        className="w-full"
                                    />
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-6">
                                <AccordionTrigger>
                                    <span className="text-muted-foreground">Temperature</span>
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4 text-balance">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Temperature</span>
                                        <span>{temperature[0] > 0 ? '+' : ''}{temperature[0]}</span>
                                    </div>
                                    <Slider
                                        min={-100}
                                        max={100}
                                        step={1}
                                        value={temperature}
                                        onValueChange={setTemperature}
                                        className="w-full"
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>

                    {/* View Type Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide">VIEW TYPE</h3>
                        <Separator />

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

                        {selectedView === 'custom' && (
                            <Input
                                value={customTitle}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomTitle(e.target.value)}
                                placeholder="Enter custom title"
                            />
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            className="flex-1"
                        >
                            CANCEL
                        </Button>
                        <Button
                            onClick={generateCrop}
                            disabled={!selectedView || !completedCrop || (selectedView === 'custom' && !customTitle)}
                            className="flex-1"
                        >
                            SAVE CHANGES
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Image Area */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="relative max-w-full max-h-full">
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        minWidth={50}
                        minHeight={50}
                        className="max-w-full max-h-full"
                    >
                        <img
                            ref={imgRef}
                            alt="Crop me"
                            src={imageUrl}
                            style={{
                                maxHeight: 'calc(80vh - 3rem)',
                                maxWidth: '100%',
                                transform: `rotate(${rotation + straightening[0]}deg)`,
                                filter: `
                                    contrast(${contrast[0]}%)
                                    brightness(${100 + highlights[0] + shadows[0]}%)
                                    saturate(${saturation[0]}%)
                                    hue-rotate(${tint[0] + temperature[0]}deg)
                                    ${temperature[0] !== 0 ? `sepia(${Math.abs(temperature[0]) * 0.3}%)` : ''}
                                `.trim()
                            }}
                            onLoad={onImageLoad}
                            className="rounded-md"
                        />
                    </ReactCrop>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
            />
        </div>
    );
}
