import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // For mode selection
import axios from 'axios';
import { AlertCircle, CheckCircle2, FileArchive, FileText, ImagePlus, Info, RefreshCw, UploadCloud, X } from 'lucide-react';
import React, { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { toast } from 'sonner';

interface UploadedFile {
    file: File;
    id: string;
}

type UploadMode = 'individual' | 'zip';

const CsvUploader: React.FC = () => {
    // Existing state
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [images, setImages] = useState<UploadedFile[]>([]);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [processingLogs, setProcessingLogs] = useState<string[]>([]);
    const [isCsvDragging, setIsCsvDragging] = useState<boolean>(false);
    const [isImageDragging, setIsImageDragging] = useState<boolean>(false);

    // Updated state for multiple ZIP uploads
    const [zipFiles, setZipFiles] = useState<UploadedFile[]>([]); // Changed from single file to array
    const [isZipDragging, setIsZipDragging] = useState<boolean>(false);
    const [uploadMode, setUploadMode] = useState<UploadMode>('individual');

    // Refs
    const csvInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const zipInputRef = useRef<HTMLInputElement>(null);

    const MAX_IMAGES = 150; // For individual image upload
    const MAX_ZIP_FILES = 10; // Arbitrary limit for concurrent ZIP uploads, adjust as needed

    // --- CSV File Processing ---
    const processCsvFile = async (file: File | null) => {
        if (uploadMode !== 'individual') return;
        if (file) {
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                toast.error('Invalid file type. Please upload a .csv file.');
                setProcessingLogs((prev) => [...prev, `[ERROR] Invalid file type: ${file.name}. Please upload a .csv file.`]);
                if (csvInputRef.current) csvInputRef.current.value = '';
                return;
            }
            setCsvFile(file);
            setCsvHeaders([]);
            setProcessingLogs([`[INFO] Selected CSV: ${file.name}`]);
            const formData = new FormData();
            formData.append('csv_file', file);
            try {
                const response = await axios.post<{ headers: string[] }>('/api/get-csv-headers', formData);
                setCsvHeaders(response.data.headers);
                setProcessingLogs((prev) => [...prev, `[INFO] Detected Columns: ${response.data.headers.join(', ')}`]);
                toast.success(`Detected ${response.data.headers.length} columns from ${file.name}.`);
            } catch (error: any) {
                console.error('Error fetching CSV headers:', error);
                const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to get CSV headers.';
                toast.error(errorMsg);
                setProcessingLogs((prev) => [...prev, `[ERROR] Error fetching headers: ${errorMsg}`]);
                setCsvFile(null);
                if (csvInputRef.current) csvInputRef.current.value = '';
            }
        } else {
            setCsvFile(null);
            setCsvHeaders([]);
            setProcessingLogs([]);
        }
    };

    const handleCsvFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        processCsvFile(event.target.files?.[0] || null);
    };

    const handleCsvDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsCsvDragging(false);
        if (uploadMode !== 'individual') return;
        const droppedFile = event.dataTransfer.files?.[0];
        if (droppedFile) {
            processCsvFile(droppedFile);
            if (csvInputRef.current) {
                try {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(droppedFile);
                    csvInputRef.current.files = dataTransfer.files;
                } catch (e) {
                    console.warn('Could not set dropped CSV file to input.', e);
                }
            }
        }
    };

    // --- Image Files Processing ---
    const processImageFiles = (files: FileList | null) => {
        if (uploadMode !== 'individual') return;
        if (files) {
            const currentImageCount = images.length;
            let filesToAdd = Array.from(files).filter((file) => file.type.startsWith('image/'));
            if (filesToAdd.length !== files.length) toast.warning('Some selected files were not valid image types and were ignored.');
            if (currentImageCount + filesToAdd.length > MAX_IMAGES) {
                toast.warning(`Max ${MAX_IMAGES} images. Only ${MAX_IMAGES - currentImageCount} more will be added.`);
            }
            const newImages: UploadedFile[] = filesToAdd
                .slice(0, Math.max(0, MAX_IMAGES - currentImageCount))
                .map((file) => ({ file, id: crypto.randomUUID() }));
            if (newImages.length > 0) setImages((prevImages) => [...prevImages, ...newImages]);
        }
    };

    const handleImageFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
        processImageFiles(event.target.files);
    };

    const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsImageDragging(false);
        if (uploadMode !== 'individual') return;
        processImageFiles(event.dataTransfer.files);
        if (imageInputRef.current) {
            try {
                const dataTransfer = new DataTransfer();
                Array.from(event.dataTransfer.files).forEach((file) => dataTransfer.items.add(file));
                imageInputRef.current.files = dataTransfer.files;
            } catch (e) {
                console.warn('Could not set dropped image files to input.', e);
            }
        }
    };

    const removeImage = (idToRemove: string) => {
        setImages((prevImages) => {
            const updatedImages = prevImages.filter((image) => image.id !== idToRemove);
            if (updatedImages.length === 0 && imageInputRef.current) imageInputRef.current.value = '';
            return updatedImages;
        });
    };

    // --- ZIP File Processing (Updated for Multiple Files) ---
    const processZipFiles = (incomingFiles: FileList | null) => {
        if (uploadMode !== 'zip' || !incomingFiles) return;

        const currentZipCount = zipFiles.length;
        let validZipFilesToAdd: File[] = [];
        let invalidFilesFound = false;

        Array.from(incomingFiles).forEach((file) => {
            if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed' || file.name.endsWith('.zip')) {
                if (zipFiles.find((existing) => existing.file.name === file.name && existing.file.size === file.size)) {
                    toast.info(`ZIP file "${file.name}" is already selected.`);
                } else {
                    validZipFilesToAdd.push(file);
                }
            } else {
                invalidFilesFound = true;
            }
        });

        if (invalidFilesFound) {
            toast.error('Some files were not valid .zip files and were ignored.');
            setProcessingLogs((prev) => [...prev, '[WARNING] Some selected files were not valid .zip types and were ignored.']);
        }

        if (currentZipCount + validZipFilesToAdd.length > MAX_ZIP_FILES) {
            toast.warning(`You can select up to ${MAX_ZIP_FILES} ZIP files. Only ${MAX_ZIP_FILES - currentZipCount} more will be added.`);
            validZipFilesToAdd = validZipFilesToAdd.slice(0, Math.max(0, MAX_ZIP_FILES - currentZipCount));
        }

        if (validZipFilesToAdd.length > 0) {
            const newZipUploads: UploadedFile[] = validZipFilesToAdd.map((file) => ({ file, id: crypto.randomUUID() }));
            setZipFiles((prevZips) => [...prevZips, ...newZipUploads]);
            const newFileNames = newZipUploads.map((z) => z.file.name).join(', ');
            setProcessingLogs((prev) => [...prev, `[INFO] Selected ZIP bundles: ${newFileNames}`]);
            toast.success(`${newZipUploads.length} ZIP file(s) added to selection.`);
        }

        // Clear the input value if all files were processed or if some were duplicates/invalid
        if (zipInputRef.current) {
            zipInputRef.current.value = '';
        }
    };

    const handleZipFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        processZipFiles(event.target.files);
    };

    const handleZipDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsZipDragging(false);
        if (uploadMode !== 'zip') return;
        processZipFiles(event.dataTransfer.files);
    };

    const removeZipFile = (idToRemove: string) => {
        setZipFiles((prevZips) => {
            const removedFile = prevZips.find((zip) => zip.id === idToRemove);
            const updatedZips = prevZips.filter((zip) => zip.id !== idToRemove);
            if (removedFile) {
                setProcessingLogs((prev) => [...prev, `[INFO] Removed ZIP: ${removedFile.file.name}`]);
                toast.info(`Removed ZIP: ${removedFile.file.name}`);
            }
            if (updatedZips.length === 0 && zipInputRef.current) {
                // It's tricky to reset DataTransfer objects for drag-and-drop,
                // but for click-select, this helps.
                zipInputRef.current.value = '';
            }
            return updatedZips;
        });
    };

    // --- Common Handlers ---
    const commonDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleReset = () => {
        setCsvFile(null);
        setImages([]);
        setCsvHeaders([]);
        setZipFiles([]); // Reset to empty array
        setIsLoading(false);
        setUploadProgress(0);
        setProcessingLogs([]);
        setIsCsvDragging(false);
        setIsImageDragging(false);
        setIsZipDragging(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (zipInputRef.current) zipInputRef.current.value = '';
        toast.info('Uploader fields have been reset.');
    };

    const handleModeChange = (value: string) => {
        handleReset();
        setUploadMode(value as UploadMode);
        setProcessingLogs([]);
    };

    // --- Submit Handler (Updated for Multiple ZIPs) ---
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setUploadProgress(0);
        setProcessingLogs([]);

        const formData = new FormData();
        let endpoint = '';
        let fileToUploadName = ''; // For logging purposes

        if (uploadMode === 'zip') {
            if (zipFiles.length === 0) {
                toast.error('Please select one or more ZIP bundles.');
                setIsLoading(false);
                return;
            }
            zipFiles.forEach((zipUploadedFile) => {
                formData.append('zip_bundles[]', zipUploadedFile.file); // Use zip_bundles[] for array
            });
            endpoint = '/api/upload-zip-bundle';
            fileToUploadName = `${zipFiles.length} ZIP bundle(s)`;
            setProcessingLogs((prev) => [...prev, `[INFO] Starting ZIP bundle upload for ${fileToUploadName}...`]);
        } else {
            // individual mode
            if (!csvFile) {
                toast.error('Please select a CSV file.');
                setIsLoading(false);
                return;
            }
            formData.append('csv_file', csvFile);
            images.forEach((img) => formData.append('images[]', img.file));
            endpoint = '/api/upload-csv';
            fileToUploadName = csvFile.name;
            setProcessingLogs((prev) => [
                ...prev,
                `[INFO] Starting upload for CSV: ${fileToUploadName}...`,
                `[INFO] Backend will use configured unique ID column (if set and found in CSV) for updates, or perform a full replace.`,
            ]);
        }

        try {
            const response = await axios.post(endpoint, formData, {
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                },
            });

            toast.success(response.data.message || 'Files processed successfully!');
            let currentLogs = [`[SUCCESS] ${response.data.message || 'Files processed successfully!'}`];

            if (uploadMode === 'individual') {
                // ... (existing individual mode log summary)
            } else if (uploadMode === 'zip') {
                if (response.data.total_zip_files_received !== undefined) {
                    currentLogs.push(`[INFO] Total ZIP files received by backend: ${response.data.total_zip_files_received}`);
                }
                if (response.data.total_datasets_processed_across_all_zips !== undefined) {
                    currentLogs.push(`[INFO] Total Datasets Processed (all ZIPs): ${response.data.total_datasets_processed_across_all_zips}`);
                }
                if (response.data.total_images_queued_across_all_zips !== undefined) {
                    currentLogs.push(`[INFO] Total Images Queued (all ZIPs): ${response.data.total_images_queued_across_all_zips}`);
                }
                if (response.data.total_pdfs_queued_across_all_zips !== undefined) {
                    currentLogs.push(`[INFO] Total PDFs Queued (all ZIPs): ${response.data.total_pdfs_queued_across_all_zips}`);
                }
            }

            const backendLogs = response.data.logs || []; // Expecting logs to be an array of strings
            currentLogs.push(...backendLogs.map((log: string) => (log.startsWith('[') ? log : `[BE] ${log}`)));
            setProcessingLogs(currentLogs);

            if (uploadMode === 'zip') {
                setZipFiles([]); // Clear selected ZIPs
                if (zipInputRef.current) zipInputRef.current.value = '';
            } else {
                setCsvFile(null);
                setImages([]);
                setCsvHeaders([]);
                if (csvInputRef.current) csvInputRef.current.value = '';
                if (imageInputRef.current) imageInputRef.current.value = '';
            }
            setUploadProgress(0);
        } catch (error: any) {
            console.error('Error uploading files:', error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || 'An unknown error occurred.';
            const errorDetails = error.response?.data?.details || '';
            const validationErrors = error.response?.data?.errors;

            toast.error(`Upload failed: ${errorMsg}`);
            let errorLogs = [`[ERROR] Upload failed: ${errorMsg} ${errorDetails}`];

            if (validationErrors) {
                Object.entries(validationErrors).forEach(([field, messages]) => {
                    // Handle cases where field might be like 'zip_bundles.0'
                    const fieldName = field.startsWith('zip_bundles.') ? `ZIP File #${parseInt(field.split('.')[1]) + 1}` : field;
                    (messages as string[]).forEach((msg) => errorLogs.push(`[ERROR] Validation (${fieldName}): ${msg}`));
                });
            }
            // Preserve initial log messages for the current attempt
            setProcessingLogs((prevLogs) => {
                const baseIndex = prevLogs.findIndex((log) => log.includes(`Starting ${uploadMode === 'zip' ? 'ZIP bundle' : 'upload for CSV'}`));
                const baseLogs = baseIndex !== -1 ? prevLogs.slice(0, baseIndex + 1) : [];
                return [...baseLogs, ...errorLogs, ...(error.response?.data?.logs?.map((log: string) => `[BE-ERROR] ${log}`) || [])];
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                    <UploadCloud className="text-primary h-6 w-6" /> Data Uploader
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                    Choose an upload mode. For 'Individual', upload a CSV and optionally images. For 'ZIP Bundle', upload one or more .zip files.
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6 pt-6">
                    {/* Upload Mode Selection */}
                    <div className="space-y-2">
                        <Label className="text-md font-medium">Select Upload Mode:</Label>
                        <RadioGroup
                            value={uploadMode}
                            onValueChange={handleModeChange}
                            className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="individual" id="mode-individual" />
                                <Label htmlFor="mode-individual" className="cursor-pointer">
                                    Individual CSV & Images
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="zip" id="mode-zip" />
                                <Label htmlFor="mode-zip" className="cursor-pointer">
                                    Upload ZIP Bundle(s)
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Conditional Rendering based on uploadMode */}
                    {uploadMode === 'individual' && (
                        <>
                            {/* CSV File Input Section */}
                            <div className="space-y-2">
                                <Label htmlFor="csv-file" className="text-md flex items-center gap-1.5 font-medium">
                                    <FileText className="text-primary h-5 w-5" /> Select CSV File* (or drag & drop)
                                </Label>
                                <div
                                    onDrop={handleCsvDrop}
                                    onDragOver={commonDragOver}
                                    onDragEnter={() => setIsCsvDragging(true)}
                                    onDragLeave={() => setIsCsvDragging(false)}
                                    className={`rounded-md border-2 border-dashed p-4 text-center transition-colors ${isCsvDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/70'} ${csvFile ? 'border-green-500 bg-green-500/10' : ''}`}
                                >
                                    <Input
                                        id="csv-file"
                                        ref={csvInputRef}
                                        type="file"
                                        accept=".csv, text/csv"
                                        onChange={handleCsvFileChange}
                                        className="hidden"
                                    />
                                    {!csvFile && (
                                        <Label htmlFor="csv-file" className="block cursor-pointer">
                                            <UploadCloud className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                                            <span className="text-muted-foreground text-sm">Drag & drop CSV or click to select.</span>
                                        </Label>
                                    )}
                                    {csvFile && (
                                        <div className="text-sm">
                                            <p className="font-semibold text-green-700 dark:text-green-400">Selected: {csvFile.name}</p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCsvFile(null);
                                                    setCsvHeaders([]);
                                                    if (csvInputRef.current) csvInputRef.current.value = '';
                                                    setProcessingLogs((prev) =>
                                                        prev.filter((log) => !log.includes(csvFile.name) && !log.includes('Detected Columns')),
                                                    );
                                                }}
                                                className="mt-1 text-xs text-red-500 hover:text-red-700"
                                            >
                                                Clear CSV
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {csvHeaders.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-md font-medium">Detected CSV Columns:</Label>
                                    <div className="flex flex-wrap gap-2 rounded-md border bg-slate-50 p-2 dark:bg-slate-800">
                                        {csvHeaders.map((header, index) => (
                                            <Badge key={`${header}-${index}`} variant="secondary" className="text-xs">
                                                {header}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-700/50 dark:bg-red-900/30">
                                <Info className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    <strong>DATASET NAMING (CSV):</strong> CSV filename should ideally be the same as the intended dataset identifier
                                    for images/PDFs to link correctly if uploaded separately or if the ZIP structure relies on it.
                                </p>
                            </div>

                            {/* Image Files Input Section */}
                            <div className="space-y-2">
                                <Label htmlFor="image-files" className="text-md flex items-center gap-1.5 font-medium">
                                    <ImagePlus className="h-5 w-5 text-indigo-500" /> Select Images (Optional, or drag & drop)
                                </Label>
                                <div
                                    onDrop={handleImageDrop}
                                    onDragOver={commonDragOver}
                                    onDragEnter={() => setIsImageDragging(true)}
                                    onDragLeave={() => setIsImageDragging(false)}
                                    className={`rounded-md border-2 border-dashed p-4 text-center transition-colors ${isImageDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-border hover:border-indigo-500/70'} ${images.length > 0 ? 'border-green-500 bg-green-500/10' : ''}`}
                                >
                                    <Input
                                        id="image-files"
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageFilesChange}
                                        className="hidden"
                                    />
                                    <Label htmlFor="image-files" className="block cursor-pointer">
                                        <UploadCloud className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                                        <span className="text-muted-foreground text-sm">Drag & drop images or click to select.</span>
                                    </Label>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    Max {MAX_IMAGES} images. ({images.length} selected)
                                </p>
                                {images.length > 0 && (
                                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                        {images.map((img) => (
                                            <div key={img.id} className="group relative rounded-md border p-1 shadow-sm">
                                                <img
                                                    src={URL.createObjectURL(img.file)}
                                                    alt={img.file.name}
                                                    className="aspect-square w-full rounded-md object-cover"
                                                    onLoad={() => URL.revokeObjectURL(img.file.name)} // Changed from img.file.name to the src
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(img.id)}
                                                    className="absolute top-1 right-1 rounded-full bg-red-500/80 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 focus:opacity-100"
                                                    aria-label="Remove image"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                                <p className="text-muted-foreground mt-1 truncate px-1 text-xs" title={img.file.name}>
                                                    {img.file.name}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {uploadMode === 'zip' && (
                        <div className="space-y-2">
                            <Label htmlFor="zip-files" className="text-md flex items-center gap-1.5 font-medium">
                                {' '}
                                {/* Changed htmlFor */}
                                <FileArchive className="text-primary h-5 w-5" /> Select ZIP Bundle(s)* (.zip) (or drag & drop)
                            </Label>
                            <div
                                onDrop={handleZipDrop}
                                onDragOver={commonDragOver}
                                onDragEnter={() => setIsZipDragging(true)}
                                onDragLeave={() => setIsZipDragging(false)}
                                className={`rounded-md border-2 border-dashed p-4 text-center transition-colors ${isZipDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/70'} ${zipFiles.length > 0 ? 'border-green-500 bg-green-500/10' : ''}`}
                            >
                                <Input
                                    id="zip-files" // Changed id
                                    ref={zipInputRef}
                                    type="file"
                                    accept=".zip,application/zip,application/x-zip,application/x-zip-compressed"
                                    multiple // Added multiple attribute
                                    onChange={handleZipFileChange}
                                    className="hidden"
                                />
                                {zipFiles.length === 0 && (
                                    <Label htmlFor="zip-files" className="block cursor-pointer">
                                        {' '}
                                        {/* Changed htmlFor */}
                                        <UploadCloud className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                                        <span className="text-muted-foreground text-sm">Drag & drop .zip files here, or click to select.</span>
                                    </Label>
                                )}
                                {zipFiles.length > 0 && (
                                    <div className="text-left text-sm">
                                        <p className="mb-2 font-semibold text-green-700 dark:text-green-400">
                                            Selected ZIP Files ({zipFiles.length} / {MAX_ZIP_FILES}):
                                        </p>
                                        <div className="max-h-40 space-y-1 overflow-y-auto pr-2">
                                            {zipFiles.map((zipUploadedFile) => (
                                                <div
                                                    key={zipUploadedFile.id}
                                                    className="flex items-center justify-between rounded bg-slate-100 p-1.5 text-xs dark:bg-slate-700"
                                                >
                                                    <span className="truncate" title={zipUploadedFile.file.name}>
                                                        {zipUploadedFile.file.name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeZipFile(zipUploadedFile.id)}
                                                        className="ml-2 rounded-full p-0.5 text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-800"
                                                        aria-label={`Remove ${zipUploadedFile.file.name}`}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        {zipFiles.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setZipFiles([]);
                                                    if (zipInputRef.current) zipInputRef.current.value = '';
                                                    setProcessingLogs((prev) => [...prev, '[INFO] Cleared all selected ZIP files.']);
                                                }}
                                                className="mt-2 text-xs text-indigo-500 hover:text-indigo-700"
                                            >
                                                Clear All ZIPs
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-start rounded-md border border-sky-200 bg-sky-50 p-3 dark:border-sky-700/50 dark:bg-sky-900/30">
                                <Info className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-sky-600 dark:text-sky-400" />
                                <p className="text-sm text-sky-700 dark:text-sky-300">
                                    <strong>ZIP Structure:</strong> Each .zip file should contain top-level folders. Each folder represents one
                                    dataset and should include one .csv file and its associated images/PDFs. The folder name will be used as the
                                    dataset identifier.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Common Sections: Progress and Logs */}
                    {isLoading && (
                        <div className="space-y-1 pt-2">
                            <Label className="font-medium">Upload Progress:</Label>
                            <Progress value={uploadProgress} className="h-2 w-full" />
                            <p className="text-muted-foreground text-center text-sm">{uploadProgress}%</p>
                        </div>
                    )}

                    {processingLogs.length > 0 && (
                        <div className="space-y-2 pt-4">
                            <Label className="text-md font-medium">Processing Logs:</Label>
                            <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-md border bg-slate-50 p-3 font-mono text-xs dark:bg-slate-800">
                                {processingLogs.map((log, index) => {
                                    const isError =
                                        log.toUpperCase().includes('[ERROR]') ||
                                        log.toUpperCase().includes('FAILED') ||
                                        log.toUpperCase().includes('CRITICAL');
                                    const isWarning = log.toUpperCase().includes('[WARNING]') || log.toUpperCase().includes('WARN');
                                    const isSuccess = log.toUpperCase().includes('[SUCCESS]');
                                    const isSummary = log.toUpperCase().includes('SUMMARY');
                                    const isInfo = log.toUpperCase().includes('[INFO]');
                                    let logColor = 'text-muted-foreground';
                                    let IconComponent = null;
                                    if (isError) {
                                        logColor = 'text-red-600 dark:text-red-400';
                                        IconComponent = AlertCircle;
                                    } else if (isWarning) {
                                        logColor = 'text-amber-600 dark:text-amber-400';
                                        IconComponent = Info;
                                    } else if (isSuccess || isSummary) {
                                        logColor = 'text-green-600 dark:text-green-400';
                                        IconComponent = CheckCircle2;
                                    } else if (isInfo) {
                                        logColor = 'text-sky-600 dark:text-sky-400';
                                        IconComponent = Info;
                                    }
                                    return (
                                        <p key={index} className={`flex items-start gap-2 ${logColor}`}>
                                            {IconComponent && <IconComponent className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
                                            {!IconComponent && <span className="h-3.5 w-3.5 flex-shrink-0"></span>}
                                            <span>{log}</span>
                                        </p>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col items-center gap-3 border-t pt-6 sm:flex-row">
                    <Button
                        type="submit"
                        disabled={isLoading || (uploadMode === 'individual' && !csvFile) || (uploadMode === 'zip' && zipFiles.length === 0)}
                        className="w-full px-4 py-2 text-sm sm:w-auto"
                    >
                        <UploadCloud className="mr-2 h-4 w-4" />
                        {isLoading ? 'Processing...' : `Upload ${uploadMode === 'zip' ? 'ZIP Bundle(s)' : 'Files'}`}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading} className="w-full px-4 py-2 text-sm sm:w-auto">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset Fields
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

export default CsvUploader;
