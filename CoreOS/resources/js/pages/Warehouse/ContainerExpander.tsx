import React, {useCallback, useState} from 'react';
import {Head, router} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {type BreadcrumbItem} from '@/types';
import {Download, Upload} from 'lucide-react';
import axios from 'axios';
import {
    ExpandedDataRow,
    ExpandResponse,
    MappedColumns,
    SheetPreviewRow,
    UpdateColumnsResponse,
    UploadResponse
} from '@/types/container';
import AppLayout from "@/layouts/app-layout";

const ContainerExpander: React.FC = () => {
    const [spreadsheet, setSpreadsheet] = useState<File | null>(null);
    const [columns, setColumns] = useState<string[]>([]);
    const [startRow, setStartRow] = useState<number>(1);
    const [mappedColumns, setMappedColumns] = useState<MappedColumns>({
        container: null,
        part: null,
        quantity: null
    });
    const [expandedData, setExpandedData] = useState<ExpandedDataRow[]>([]);
    const [sheetPreview, setSheetPreview] = useState<SheetPreviewRow[]>([]);
    const [tempPath, setTempPath] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Helper function to set field-specific errors
    const setFieldError = (field: string, message: string) => {
        setErrors(prev => ({ ...prev, [field]: message }));
    };

    // Helper function to clear field-specific errors
    const clearFieldError = (field: string) => {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    };

    // Helper function to clear all errors
    const clearAllErrors = () => {
        setErrors({});
    };

    const validateSpreadsheet = (file: File): boolean => {
        const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
            setFieldError('spreadsheet', 'Please upload a valid Excel file (.xlsx or .xls)');
            return false;
        }

        if (file.size > maxSize) {
            setFieldError('spreadsheet', 'File size must be less than 10MB');
            return false;
        }

        clearFieldError('spreadsheet');
        return true;
    };

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!validateSpreadsheet(file)) {
            return;
        }

        setSpreadsheet(file);
        setLoading(true);
        clearAllErrors();

        try {
            const formData = new FormData();
            formData.append('spreadsheet', file);
            formData.append('startRow', startRow.toString());

            const response = await axios.post<UploadResponse>('/api/warehouse/container-expander/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            if (response.data.success) {
                setColumns(response.data.columns || []);
                setSheetPreview(response.data.sheetPreview || []);
                setTempPath(response.data.tempPath || '');
                clearAllErrors();

                // Reset column mappings when new file is uploaded
                setMappedColumns({
                    container: null,
                    part: null,
                    quantity: null
                });
                setExpandedData([]);
            } else {
                setFieldError('spreadsheet', response.data.message || 'Failed to upload file');
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            setFieldError('spreadsheet', err.response?.data?.message || 'Error processing spreadsheet');
        } finally {
            setLoading(false);
        }
    }, [startRow]);

    const handleStartRowChange = useCallback(async (value: string) => {
        const newStartRow = parseInt(value);
        setStartRow(newStartRow);

        if (tempPath) {
            setLoading(true);
            clearFieldError('startRow');

            try {
                const response = await axios.post<UpdateColumnsResponse>('/warehouse/container-expander/update-columns', {
                    tempPath,
                    startRow: newStartRow
                }, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/json',
                    }
                });

                if (response.data.success) {
                    setColumns(response.data.columns || []);
                    clearFieldError('startRow');

                    // Reset column mappings when start row changes
                    setMappedColumns({
                        container: null,
                        part: null,
                        quantity: null
                    });
                    setExpandedData([]);
                } else {
                    setFieldError('startRow', response.data.message || 'Failed to update columns');
                }
            } catch (err: any) {
                console.error('Update columns error:', err);
                setFieldError('startRow', err.response?.data?.message || 'Error updating columns');
            } finally {
                setLoading(false);
            }
        }
    }, [tempPath]);

    const handleMappedColumnChange = useCallback((field: keyof MappedColumns, value: string) => {
        setMappedColumns(prev => ({
            ...prev,
            [field]: parseInt(value)
        }));
        clearFieldError(`mappedColumns.${field}`);

        // Clear expanded data when mappings change
        setExpandedData([]);
    }, []);

    const validateMappedColumns = (): boolean => {
        let isValid = true;

        if (mappedColumns.container === null) {
            setFieldError('mappedColumns.container', 'Please select a container column');
            isValid = false;
        }

        if (mappedColumns.part === null) {
            setFieldError('mappedColumns.part', 'Please select a part column');
            isValid = false;
        }

        if (mappedColumns.quantity === null) {
            setFieldError('mappedColumns.quantity', 'Please select a quantity column');
            isValid = false;
        }

        return isValid;
    };

    const handleExpandContainers = useCallback(async () => {
        if (!tempPath) {
            setFieldError('expansion', 'Please upload a spreadsheet first');
            return;
        }

        if (!validateMappedColumns()) {
            return;
        }

        setLoading(true);
        clearFieldError('expansion');

        try {
            const response = await axios.post<ExpandResponse>('/warehouse/container-expander/expand', {
                tempPath,
                startRow,
                mappedColumns
            }, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                }
            });

            if (response.data.success) {
                setExpandedData(response.data.expandedData || []);
                clearFieldError('expansion');
            } else {
                setFieldError('expansion', response.data.message || 'Failed to expand containers');
            }
        } catch (err: any) {
            console.error('Expand error:', err);
            setFieldError('expansion', err.response?.data?.message || 'Error expanding containers');
        } finally {
            setLoading(false);
        }
    }, [tempPath, startRow, mappedColumns]);

    const handleDownload = useCallback(() => {
        if (expandedData.length === 0) {
            setFieldError('download', 'No data available to download. Please expand containers first.');
            return;
        }

        clearFieldError('download');
        router.get('/warehouse/container-expander/download');
    }, [expandedData]);

    // Filter and prepare valid columns for select options
    const validColumns = columns
        .map((column, index) => ({
            value: index.toString(),
            label: column || `Column ${index + 1}`
        }))
        .filter(item => item.value !== '');

    const isExpandDisabled = loading ||
        mappedColumns.container === null ||
        mappedColumns.part === null ||
        mappedColumns.quantity === null;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Warehouse Applications', href: '#' },
        { title: 'Container Expander', href: '/warehouse/container-expander' },
    ];
    return (
        <>
            <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Container Expander" />
            <div className="p-6 min-h-screen bg-gray-50">
                <div className="flex gap-6">
                    {/* Left Column */}
                    <div className="flex-shrink-0 w-full lg:w-1/4">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg">Containers</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* File Upload Section */}
                                <div className="space-y-2">
                                    <Label htmlFor="spreadsheet">Upload Spreadsheet</Label>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            id="spreadsheet"
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileUpload}
                                            disabled={loading}
                                            className="flex-1"
                                        />
                                        <Upload className="h-4 w-4 text-gray-500" />
                                    </div>
                                    {errors.spreadsheet && (
                                        <p className="text-sm text-red-600">{errors.spreadsheet}</p>
                                    )}
                                </div>

                                {/* Starting Row Selection */}
                                {spreadsheet && (
                                    <div className="space-y-2">
                                        <Label htmlFor="startRow">Starting Row for Columns</Label>
                                        <Select
                                            value={startRow.toString()}
                                            onValueChange={handleStartRowChange}
                                            disabled={loading}
                                        >
                                            <SelectTrigger className="w-20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 25 }, (_, i) => i + 1).map(i => (
                                                    <SelectItem key={i} value={i.toString()}>
                                                        {i.toString()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.startRow && (
                                            <p className="text-sm text-red-600">{errors.startRow}</p>
                                        )}
                                    </div>
                                )}

                                {/* Column Mapping */}
                                {validColumns.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-md font-semibold">Map Columns</h4>

                                        <div className="space-y-2">
                                            <Label htmlFor="containerCol">Select Carton Column</Label>
                                            <Select
                                                value={mappedColumns.container !== null ? mappedColumns.container.toString() : ""}
                                                onValueChange={(value) => value && handleMappedColumnChange('container', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a Container Column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {validColumns.map((column) => (
                                                        <SelectItem key={column.value} value={column.value}>
                                                            {column.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors['mappedColumns.container'] && (
                                                <p className="text-sm text-red-600">{errors['mappedColumns.container']}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="partCol">Select a Description Column</Label>
                                            <Select
                                                value={mappedColumns.part !== null ? mappedColumns.part.toString() : ""}
                                                onValueChange={(value) => value && handleMappedColumnChange('part', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Part Column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {validColumns.map((column) => (
                                                        <SelectItem key={column.value} value={column.value}>
                                                            {column.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors['mappedColumns.part'] && (
                                                <p className="text-sm text-red-600">{errors['mappedColumns.part']}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="quantityCol">Select a Quantity Column</Label>
                                            <Select
                                                value={mappedColumns.quantity !== null ? mappedColumns.quantity.toString() : ""}
                                                onValueChange={(value) => value && handleMappedColumnChange('quantity', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Quantity Column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {validColumns.map((column) => (
                                                        <SelectItem key={column.value} value={column.value}>
                                                            {column.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors['mappedColumns.quantity'] && (
                                                <p className="text-sm text-red-600">{errors['mappedColumns.quantity']}</p>
                                            )}
                                        </div>

                                        <Button
                                            onClick={handleExpandContainers}
                                            disabled={isExpandDisabled}
                                            className="w-full"
                                        >
                                            {loading ? 'Processing...' : 'Expand Containers'}
                                        </Button>

                                        {errors.expansion && (
                                            <p className="text-sm text-red-600">{errors.expansion}</p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="flex-grow flex flex-col gap-6">
                        {/* General Error Alert */}
                        {errors.download && (
                            <Alert variant="destructive">
                                <AlertDescription>{errors.download}</AlertDescription>
                            </Alert>
                        )}

                        {/* Sheet Preview */}
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg">Sheet Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {sheetPreview.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Excel Row #</TableHead>
                                                    {sheetPreview[0]?.data && Object.keys(sheetPreview[0].data).map(header => (
                                                        <TableHead key={header} className="text-left">{header}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sheetPreview.map((row, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{row.row}</TableCell>
                                                        {Object.values(row.data).map((cell, cellIndex) => (
                                                            <TableCell key={cellIndex}>{cell?.toString() || ''}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">Upload a spreadsheet to see the preview.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Expanded Data Preview */}
                        {expandedData.length > 0 && (
                            <Card className="shadow-lg">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg">Expanded Data Preview</CardTitle>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownload}
                                        className="flex items-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download Expanded Data
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Carton #</TableHead>
                                                    <TableHead>Part #</TableHead>
                                                    <TableHead>PCS Per Carton</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {expandedData.map((row, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{row.container.toString()}</TableCell>
                                                        <TableCell>{row.part}</TableCell>
                                                        <TableCell>{row.quantity.toString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDownload}
                                            className="flex items-center gap-2"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download Expanded Data
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
            </AppLayout>
        </>
    );
};

export default ContainerExpander;
