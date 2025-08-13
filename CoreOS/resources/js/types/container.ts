export interface MappedColumns {
    container: number | null;
    part: number | null;
    quantity: number | null;
}

export interface ExpandedDataRow {
    container: number | string;
    part: string;
    quantity: number | string;
}

export interface SheetPreviewRow {
    row: number;
    data: Record<string, any>;
}

export interface UploadResponse {
    success: boolean;
    message?: string;
    columns?: string[];
    sheetPreview?: SheetPreviewRow[];
    tempPath?: string;
}

export interface UpdateColumnsResponse {
    success: boolean;
    message?: string;
    columns?: string[];
}

export interface ExpandResponse {
    success: boolean;
    message?: string;
    expandedData?: ExpandedDataRow[];
}
