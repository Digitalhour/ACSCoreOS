import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Progress} from '@/components/ui/progress';
import {useForm} from '@inertiajs/react';
import axios from 'axios';
import {AlertCircle, CheckCircle2, FileArchive, FileSpreadsheet, FileText, Upload, X} from 'lucide-react';
import React, {DragEvent, useRef, useState} from 'react';
import {toast} from 'sonner';

interface UploadFormData {
    file: File | null;
}

interface ProcessingLog {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
}

const PartsUpload: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [processingLogs, setProcessingLogs] = useState<ProcessingLog[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const { data, setData, post, processing, errors, reset } = useForm<UploadFormData>({
        file: null,
    });

    const handleFileSelect = (file: File | null) => {
        if (!file) {
            setData('file', null);
            return;
        }

        // Validate file type
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip',
            'application/x-zip-compressed'
        ];

        const allowedExtensions = ['csv', 'xls', 'xlsx', 'zip'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
            toast.error('Invalid file type. Please upload CSV, Excel, or ZIP files.');
            return;
        }

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            toast.error('File size must be less than 50MB.');
            return;
        }

        setData('file', file);
        addLog(`Selected file: ${file.name} (${formatFileSize(file.size)})`, 'info');
        toast.success(`File selected: ${file.name}`);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        handleFileSelect(file);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);

        const file = event.dataTransfer.files?.[0] || null;
        handleFileSelect(file);

        // Update the file input
        if (fileInputRef.current && file) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInputRef.current.files = dataTransfer.files;
        }
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleDragEnter = () => setIsDragging(true);
    const handleDragLeave = () => setIsDragging(false);

    const addLog = (message: string, type: ProcessingLog['type']) => {
        setProcessingLogs(prev => [...prev, { message, type, timestamp: new Date() }]);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!data.file) {
            toast.error('Please select a file to upload.');
            return;
        }

        setIsProcessing(true);
        setUploadProgress(0);
        setProcessingLogs([]);
        addLog('Starting upload...', 'info');

        // Create FormData manually and use axios instead of Inertia for file upload
        const formData = new FormData();
        formData.append('file', data.file);

        // Use axios for better file upload handling
        const axiosInstance = axios.create();

        axiosInstance.post('/api/parts/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                    addLog(`Upload progress: ${percentCompleted}%`, 'info');
                }
            },
        })
            .then((response) => {
                setIsProcessing(false);
                setUploadProgress(100);

                if (response.data.success) {
                    if (response.data.status === 'pending') {
                        addLog(`File uploaded successfully! Processing in background...`, 'success');
                        addLog(`Upload ID: ${response.data.upload_id}`, 'info');
                        addLog(`You can continue uploading more files while this processes.`, 'info');
                        toast.success('File uploaded and queued for processing!');
                    } else {
                        // Legacy immediate processing response
                        addLog(`Upload completed successfully! Processed ${response.data.total_parts || 0} parts.`, 'success');
                        toast.success(`Successfully processed ${response.data.total_parts || 0} parts`);
                    }

                    // Reset form
                    reset();
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                } else {
                    addLog(`Upload failed: ${response.data.error}`, 'error');
                    toast.error(`Upload failed: ${response.data.error}`);
                }
            })
            .catch((error) => {
                setIsProcessing(false);
                console.error('Upload error:', error);

                let errorMessage = 'Upload failed';
                if (error.response?.data?.error) {
                    errorMessage = error.response.data.error;
                } else if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }

                addLog(`Error: ${errorMessage}`, 'error');
                toast.error(errorMessage);
            });
    };

    const clearFile = () => {
        setData('file', null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        addLog('File selection cleared', 'info');
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (filename: string) => {
        const extension = filename.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'csv':
                return <FileText className="h-8 w-8 text-green-500" />;
            case 'xlsx':
            case 'xls':
                return <FileSpreadsheet className="h-8 w-8 text-blue-500" />;
            case 'zip':
                return <FileArchive className="h-8 w-8 text-orange-500" />;
            default:
                return <Upload className="h-8 w-8 text-gray-500" />;
        }
    };

    const getLogIcon = (type: ProcessingLog['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-600" />;
            case 'warning':
                return <AlertCircle className="h-4 w-4 text-yellow-600" />;
            default:
                return <div className="h-4 w-4" />;
        }
    };

    const getLogTextColor = (type: ProcessingLog['type']) => {
        switch (type) {
            case 'success':
                return 'text-green-600 dark:text-green-400';
            case 'error':
                return 'text-red-600 dark:text-red-400';
            case 'warning':
                return 'text-yellow-600 dark:text-yellow-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Upload className="h-6 w-6 text-primary" />
                        Parts Upload
                    </CardTitle>
                    <CardDescription>
                        Upload CSV, Excel, or ZIP files containing parts data. ZIP files can include images.
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        {/* File Upload Area */}
                        <div className="space-y-2">
                            <Label htmlFor="file-upload" className="text-sm font-medium">
                                Select File
                            </Label>
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                    isDragging
                                        ? 'border-primary bg-primary/10'
                                        : data.file
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                            : 'border-gray-300 hover:border-primary/50'
                                }`}
                            >
                                <Input
                                    id="file-upload"
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls,.zip"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                {!data.file ? (
                                    <Label htmlFor="file-upload" className="cursor-pointer">
                                        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <div className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Drop files here or click to browse
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Supports: CSV, Excel (.xlsx, .xls), ZIP files (max 50MB)
                                        </div>
                                    </Label>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center gap-3">
                                            {getFileIcon(data.file.name)}
                                            <div className="text-left">
                                                <div className="font-medium text-green-700 dark:text-green-400">
                                                    {data.file.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {formatFileSize(data.file.size)}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={clearFile}
                                            className="mx-auto"
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Clear File
                                        </Button>
                                    </div>
                                )}
                            </div>
                            {errors.file && (
                                <div className="text-sm text-red-600">{errors.file}</div>
                            )}
                        </div>

                        {/* Upload Progress */}
                        {isProcessing && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Upload Progress</Label>
                                <Progress value={uploadProgress} className="h-2" />
                                <div className="text-sm text-center text-gray-600">
                                    {uploadProgress}%
                                </div>
                            </div>
                        )}

                        {/* Processing Logs */}
                        {processingLogs.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Processing Logs</Label>
                                <div className="max-h-60 overflow-y-auto rounded-md border bg-gray-50 dark:bg-gray-900 p-3 space-y-2">
                                    {processingLogs.map((log, index) => (
                                        <div key={index} className="flex items-start gap-2 text-xs">
                                            {getLogIcon(log.type)}
                                            <div className="flex-1">
                                                <span className={getLogTextColor(log.type)}>
                                                    {log.message}
                                                </span>
                                                <div className="text-gray-400 text-xs">
                                                    {log.timestamp.toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex gap-3">
                        <Button
                            type="submit"
                            disabled={!data.file || processing || isProcessing}
                            className="flex-1"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {processing || isProcessing ? 'Processing...' : 'Upload & Process'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                reset();
                                setProcessingLogs([]);
                                setUploadProgress(0);
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                }
                            }}
                            disabled={processing || isProcessing}
                        >
                            Reset
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default PartsUpload;
