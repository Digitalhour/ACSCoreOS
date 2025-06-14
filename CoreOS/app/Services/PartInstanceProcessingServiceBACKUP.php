<?php

namespace App\Services;

use App\Models\Parts\Manufacturer;
use App\Models\Parts\PartCategory;
use App\Models\Parts\PartInstance;
use App\Models\Parts\PartModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PartInstanceProcessingServiceBACKUP
{
    // Cache for lookups to avoid repeated DB queries
    protected array $manufacturerCache = [];
    protected array $categoryCache = [];
    protected array $existingInstancesCache = [];

    // Batch processing constants
    const BATCH_SIZE = 250;
    const CACHE_REFRESH_INTERVAL = 500;

    public const CORE_COLUMN_MAPPING = [
        'Part_Number' => 'part_number',
        'Description' => 'description',
        'Quantity' => 'quantity',
        'CCN_Number' => 'ccn_number',
        'Manufacture' => 'manufacturer',
        'Manufacture_Serial' => 'manufacturer_serial',
        'Models' => 'models',
        'ID' => 'pdf_id',
        'pdf_id' => 'pdf_id',
        'Manual_Number' => 'manual_number',
        'Revision' => 'revision',
        'Manual_Date' => 'manual_date',
        'Img_Page_Number' => 'img_page_number',
        'Img_Page_Path' => 'img_page_path',
        'Part_Location' => 'part_location',
        'Part_Category' => 'part_category',
        'Part_Type' => 'part_type',
        'Additional_Notes' => 'additional_notes',
    ];

    public function processPartInstancesFromCsv(
        array $csvData,
        array $csvHeaders,
        string $csvFilename,
        ?string $configuredUniqueColumn = null
    ): array {
        $batchId = Str::uuid();
        $stats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0,
        ];

        Log::info("[PartInstanceProcessingService] Starting batch {$batchId} for file: {$csvFilename}");

        // Pre-load all manufacturers and categories to avoid repeated queries
        $this->preloadManufacturers($csvData);
        $this->preloadCategories($csvData);

        // Pre-load existing instances for this file to avoid repeated lookups
        $this->preloadExistingInstances($csvFilename);

        DB::connection('parts_database')->transaction(function () use (
            $csvData,
            $csvHeaders,
            $csvFilename,
            $batchId,
            &$stats
        ) {
            // Process in batches for better memory management
            $chunks = array_chunk($csvData, self::BATCH_SIZE);
            $totalChunks = count($chunks);

            foreach ($chunks as $chunkIndex => $chunk) {
                Log::info("[PartInstanceProcessingService] Processing chunk ".($chunkIndex + 1)." of {$totalChunks}");
                $this->processBatch($chunk, $csvFilename, $batchId, $stats);

                // Refresh cache periodically to handle large datasets
                if (($chunkIndex * self::BATCH_SIZE) % self::CACHE_REFRESH_INTERVAL === 0) {
                    $this->refreshCaches($csvFilename);
                }
            }

            // Handle cleanup for removed instances
            $this->handleRemovedInstances($csvFilename, $batchId);
        });

        return $stats;
    }

    protected function preloadManufacturers(array $csvData): void
    {
        Log::info("[PartInstanceProcessingService] Preloading manufacturers...");

        $manufacturerNames = [];
        foreach ($csvData as $row) {
            $name = $this->getValueFromRow($row, ['Manufacture', 'manufacture', 'Manufacturer', 'manufacturer']);
            if (!empty($name)) {
                $manufacturerNames[trim($name)] = true;
            }
        }

        if (!empty($manufacturerNames)) {
            $manufacturers = Manufacturer::whereIn('name', array_keys($manufacturerNames))->get();
            foreach ($manufacturers as $manufacturer) {
                $this->manufacturerCache[$manufacturer->name] = $manufacturer->id;
            }
        }

        Log::info("[PartInstanceProcessingService] Preloaded ".count($this->manufacturerCache)." manufacturers");
    }

    protected function preloadCategories(array $csvData): void
    {
        Log::info("[PartInstanceProcessingService] Preloading categories...");

        $categoryNames = [];
        foreach ($csvData as $row) {
            $name = $this->getValueFromRow($row, ['Part_Category', 'part_category']);
            if (!empty($name)) {
                $categoryNames[trim($name)] = true;
            }
        }

        if (!empty($categoryNames)) {
            $categories = PartCategory::whereIn('name', array_keys($categoryNames))->get();
            foreach ($categories as $category) {
                $this->categoryCache[$category->name] = $category->id;
            }
        }

        Log::info("[PartInstanceProcessingService] Preloaded ".count($this->categoryCache)." categories");
    }

    protected function preloadExistingInstances(string $csvFilename): void
    {
        Log::info("[PartInstanceProcessingService] Preloading existing instances...");

        $existing = PartInstance::where('file_name', $csvFilename)
            ->select(['pdf_id', 'manual_number', 'part_number', 'img_page_number', 'ccn_number', 'id'])
            ->get();

        foreach ($existing as $instance) {
            $key = $this->buildInstanceKey([
                'pdf_id' => $instance->pdf_id,
                'manual_number' => $instance->manual_number,
                'part_number' => $instance->part_number,
                'img_page_number' => $instance->img_page_number,
                'ccn_number' => $instance->ccn_number,
            ]);
            $this->existingInstancesCache[$key] = $instance->id;
        }

        Log::info("[PartInstanceProcessingService] Preloaded ".count($this->existingInstancesCache)." existing instances");
    }

    protected function refreshCaches(string $csvFilename): void
    {
        Log::info("[PartInstanceProcessingService] Refreshing caches...");
        $this->existingInstancesCache = [];
        $this->preloadExistingInstances($csvFilename);
    }

    protected function processBatch(array $rows, string $csvFilename, string $batchId, array &$stats): void
    {
        // For simplicity and reliability, let's use a more straightforward approach
        $processedCount = 0;

        foreach ($rows as $index => $row) {
            try {
                $result = $this->prepareRowData($row, $csvFilename, $batchId);
                if ($result === null) {
                    $stats['skipped']++;
                    continue;
                }

                [$uniqueKey, $coreData, $models, $additionalFields] = $result;

                // Use updateOrCreate for reliability
                $partInstance = PartInstance::updateOrCreate($uniqueKey, $coreData);

                if ($partInstance->wasRecentlyCreated) {
                    $stats['created']++;
                } else {
                    $stats['updated']++;
                }

                // Handle manual date parsing after save if we have a manual date
                $manualDate = $this->getValueFromRow($row, ['Manual_Date', 'manual_date']);
                if (!empty($manualDate)) {
                    $partInstance->parseAndSetManualDate($manualDate);
                    $partInstance->save();
                }

                $processedCount++;

                // Log progress every 50 records
                if ($processedCount % 50 === 0) {
                    Log::info("[PartInstanceProcessingService] Processed {$processedCount} records in current batch");
                }

                // Handle models relationship (many-to-many)
                if (!empty($models)) {
                    try {
                        $this->syncModelsForInstance($partInstance, $models);
                    } catch (\Exception $e) {
                        Log::error("[PartInstanceProcessingService] Failed to sync models for part instance {$partInstance->id}: ".$e->getMessage(),
                            [
                                'models_data' => $models,
                                'part_instance_id' => $partInstance->id
                            ]);
                    }
                }

                // Handle additional fields
                if (!empty($additionalFields)) {
                    try {
                        $this->syncAdditionalFieldsForInstance($partInstance, $additionalFields);
                    } catch (\Exception $e) {
                        Log::error("[PartInstanceProcessingService] Failed to sync additional fields for part instance {$partInstance->id}: ".$e->getMessage(),
                            [
                                'additional_fields' => $additionalFields,
                                'part_instance_id' => $partInstance->id
                            ]);
                    }
                }

            } catch (\Exception $e) {
                $stats['errors']++;
                Log::error("[PartInstanceProcessingService] Error processing row: ".$e->getMessage(), [
                    'row_data' => $row,
                    'exception' => $e->getTraceAsString()
                ]);
            }
        }

        Log::info("[PartInstanceProcessingService] Completed batch: {$processedCount} records processed");
    }

    protected function syncModelsForInstance(PartInstance $partInstance, string $modelsValue): void
    {
        if (empty(trim($modelsValue))) {
            return;
        }

        // Parse the models string - assuming it's comma-separated or similar format
        // Adjust this parsing logic based on your actual data format
        $modelNames = $this->parseModelsString($modelsValue);

        if (empty($modelNames)) {
            return;
        }

        $modelIds = [];
        foreach ($modelNames as $modelName) {
            $modelName = trim($modelName);
            if (empty($modelName)) {
                continue;
            }

            // Find or create the model
            $model = PartModel::firstOrCreate(['name' => $modelName]);
            $modelIds[] = $model->id;
        }

        if (!empty($modelIds)) {
            // Sync the models (assumes a many-to-many relationship)
            $partInstance->models()->sync($modelIds);
            Log::debug("[PartInstanceProcessingService] Synced ".count($modelIds)." models for part instance {$partInstance->id}");
        }
    }

    protected function parseModelsString(string $modelsValue): array
    {
        // Handle different possible formats in your CSV data
        $modelsValue = trim($modelsValue);

        // Remove "Models:" prefix if present
        $modelsValue = preg_replace('/^Models:\s*/i', '', $modelsValue);

        // Split by common delimiters
        $models = preg_split('/[,;|]/', $modelsValue);

        // Clean up each model name
        $cleanModels = [];
        foreach ($models as $model) {
            $model = trim($model);
            if (!empty($model) && $model !== '?') {
                $cleanModels[] = $model;
            }
        }

        return $cleanModels;
    }

    protected function syncAdditionalFieldsForInstance(PartInstance $partInstance, array $additionalFields): void
    {
        if (empty($additionalFields)) {
            return;
        }

        // This depends on how you want to handle additional fields
        // Option 1: Store as JSON in a column
        if ($partInstance->hasAttribute('additional_data')) {
            $partInstance->additional_data = json_encode($additionalFields);
            $partInstance->save();
        }

        // Option 2: Store in a separate related table (if you have one)
        // $partInstance->additionalFields()->sync($additionalFields);

        // Option 3: Store each field as a separate record in a key-value table
        // foreach ($additionalFields as $key => $value) {
        //     $partInstance->customFields()->updateOrCreate(
        //         ['field_name' => $key],
        //         ['field_value' => $value]
        //     );
        // }

        Log::debug("[PartInstanceProcessingService] Synced ".count($additionalFields)." additional fields for part instance {$partInstance->id}");
    }

    protected function bulkUpsert(array $data, array &$stats): void
    {
        if (empty($data)) {
            return;
        }

        // Add timestamps only if they don't already exist
        $now = now();
        foreach ($data as &$row) {
            if (!isset($row['created_at'])) {
                $row['created_at'] = $now;
            }
            if (!isset($row['updated_at'])) {
                $row['updated_at'] = $now;
            }
            if (!isset($row['import_timestamp'])) {
                $row['import_timestamp'] = $now;
            }
        }

        try {
            // Laravel 8+ upsert method - updates if exists, inserts if new
            $affectedRows = PartInstance::upsert(
                $data,
                ['pdf_id', 'manual_number', 'part_number', 'img_page_number', 'ccn_number'], // unique columns
                [
                    'description', 'quantity', 'manufacturer_id', 'part_category_id', 'part_location', 'part_type',
                    'additional_notes', 'manufacturer_serial', 'revision', 'manual_date', 'img_page_path', 'file_name',
                    'import_batch_id', 'is_active', 'updated_at', 'import_timestamp'
                ] // columns to update
            );

            // Estimate created vs updated (this is approximate)
            $existingCount = count($this->existingInstancesCache);
            $totalRows = count($data);
            $newRows = max(0, $totalRows - $existingCount);

            $stats['created'] += $newRows;
            $stats['updated'] += ($totalRows - $newRows);

            Log::info("[PartInstanceProcessingService] Bulk upserted {$totalRows} records (estimated: {$newRows} new, ".($totalRows - $newRows)." updated)");

        } catch (\Exception $e) {
            Log::error("[PartInstanceProcessingService] Upsert failed, falling back to individual operations: ".$e->getMessage());
            $this->fallbackSeparateOperations($data, $stats);
        }
    }

    protected function fallbackSeparateOperations(array $data, array &$stats): void
    {
        $insertData = [];
        $updateData = [];

        foreach ($data as $row) {
            $instanceKey = $this->buildInstanceKey([
                'pdf_id' => $row['pdf_id'],
                'manual_number' => $row['manual_number'],
                'part_number' => $row['part_number'],
                'img_page_number' => $row['img_page_number'],
                'ccn_number' => $row['ccn_number'],
            ]);

            if (isset($this->existingInstancesCache[$instanceKey])) {
                $row['id'] = $this->existingInstancesCache[$instanceKey];
                $updateData[] = $row;
            } else {
                $insertData[] = $row;
            }
        }

        if (!empty($insertData)) {
            $this->bulkInsert($insertData);
            $stats['created'] += count($insertData);
        }

        if (!empty($updateData)) {
            $this->bulkUpdate($updateData);
            $stats['updated'] += count($updateData);
        }
    }

    protected function bulkInsert(array $data): void
    {
        if (empty($data)) {
            return;
        }

        // Get all possible columns from the first row to establish the schema
        $firstRow = $data[0];
        $requiredColumns = array_keys($firstRow);

        // Only add timestamp columns if they don't already exist
        $timestampColumns = ['created_at', 'updated_at', 'import_timestamp'];
        foreach ($timestampColumns as $timestampCol) {
            if (!in_array($timestampCol, $requiredColumns)) {
                $requiredColumns[] = $timestampCol;
            }
        }

        // Normalize all rows to have the same columns
        $now = now();
        $normalizedData = [];

        foreach ($data as $row) {
            $normalizedRow = [];

            // Ensure every row has all required columns
            foreach ($requiredColumns as $column) {
                if (in_array($column, $timestampColumns)) {
                    $normalizedRow[$column] = $now;
                } else {
                    $normalizedRow[$column] = $row[$column] ?? null;
                }
            }

            $normalizedData[] = $normalizedRow;
        }

        // Verify all rows have the same number of columns
        $columnCount = count($requiredColumns);
        foreach ($normalizedData as $index => $row) {
            if (count($row) !== $columnCount) {
                Log::error("[PartInstanceProcessingService] Row {$index} has ".count($row)." columns, expected {$columnCount}",
                    [
                        'row_data' => $row,
                        'expected_columns' => $requiredColumns
                    ]);
                throw new \Exception("Column count mismatch in bulk insert data at row {$index}");
            }
        }

        try {
            PartInstance::insert($normalizedData);
            Log::info("[PartInstanceProcessingService] Bulk inserted ".count($normalizedData)." records");
        } catch (\Exception $e) {
            // If bulk insert fails due to duplicates, fall back to individual inserts with better error handling
            Log::warning("[PartInstanceProcessingService] Bulk insert failed, falling back to individual inserts: ".$e->getMessage());
            $this->fallbackIndividualInserts($normalizedData);
        }
    }

    protected function fallbackIndividualInserts(array $data): void
    {
        $successCount = 0;
        $skipCount = 0;

        foreach ($data as $row) {
            try {
                PartInstance::create($row);
                $successCount++;
            } catch (\Exception $e) {
                // Skip duplicates and other constraint violations
                if (str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), '1062')) {
                    $skipCount++;
                    Log::debug("[PartInstanceProcessingService] Skipped duplicate record");
                } else {
                    Log::error("[PartInstanceProcessingService] Failed to insert individual row: ".$e->getMessage(),
                        ['row' => $row]);
                }
            }
        }

        Log::info("[PartInstanceProcessingService] Individual inserts: {$successCount} successful, {$skipCount} skipped duplicates");
    }

    protected function bulkUpdate(array $data): void
    {
        if (empty($data)) {
            return;
        }

        $now = now();
        $updateCount = 0;

        foreach ($data as $row) {
            $id = $row['id'];
            unset($row['id']); // Remove ID from the data to update

            $row['updated_at'] = $now;
            $row['import_timestamp'] = $now;

            // Remove any null values that could cause issues
            $row = array_filter($row, function ($value) {
                return $value !== null;
            });

            $affected = PartInstance::where('id', $id)->update($row);
            if ($affected > 0) {
                $updateCount++;
            }
        }

        Log::info("[PartInstanceProcessingService] Bulk updated {$updateCount} records");
    }

    protected function prepareRowData(array $row, string $csvFilename, string $batchId): ?array
    {
        // Build the unique instance identifier
        $pdfIdValue = $this->getValueFromRow($row, ['ID', 'id', 'pdf_id']);
        $manualNumberValue = $this->getValueFromRow($row, ['Manual_Number', 'manual_number']);
        $partNumberValue = $this->getValueFromRow($row, ['Part_Number', 'part_number']);
        $imgPageNumberValue = $this->getValueFromRow($row, ['Img_Page_Number', 'img_page_number']);
        $ccnNumberValue = $this->getValueFromRow($row, ['CCN_Number', 'ccn_number']);

        $uniqueInstanceKey = [
            'pdf_id' => substr($pdfIdValue ?? '', 0, 100),
            'manual_number' => substr($manualNumberValue ?? '', 0, 50),
            'part_number' => substr($partNumberValue ?? '', 0, 50),
            'img_page_number' => substr($imgPageNumberValue ?? '', 0, 20),
            'ccn_number' => substr($ccnNumberValue ?? '', 0, 30),
        ];

        // Validate required fields
        if (empty($uniqueInstanceKey['pdf_id']) || empty($uniqueInstanceKey['part_number'])) {
            return null;
        }

        // Map core data - but DON'T include the Models field here
        $coreData = $this->mapCoreData($row);
        $coreData['file_name'] = substr($csvFilename, 0, 100);
        $coreData['import_batch_id'] = $batchId;
        $coreData['is_active'] = true;

        // Handle manufacturer lookup
        $manufactureName = $this->getValueFromRow($row, ['Manufacture', 'manufacture', 'Manufacturer', 'manufacturer']);
        if (!empty($manufactureName)) {
            $coreData['manufacturer_id'] = $this->getOrCreateManufacturerId($manufactureName);
        }

        // Handle part category lookup
        $partCategoryName = $this->getValueFromRow($row, ['Part_Category', 'part_category']);
        if (!empty($partCategoryName)) {
            $coreData['part_category_id'] = $this->getOrCreatePartCategoryId($partCategoryName);
        }

        // Handle manual date
        $manualDate = $this->getValueFromRow($row, ['Manual_Date', 'manual_date']);
        if (!empty($manualDate)) {
            $coreData['manual_date'] = substr($manualDate, 0, 50);
        }

        // Clean up any null or problematic values that could cause column mismatches
        foreach ($coreData as $key => $value) {
            if (is_string($value) && str_contains($value, 'Models:')) {
                // This data belongs in the models relationship, not the main table
                unset($coreData[$key]);
            }

            // Convert problematic question marks to null
            if ($value === '?' || $value === '') {
                $coreData[$key] = null;
            }

            // Ensure we don't have any arrays or objects that would break the insert
            if (is_array($value) || is_object($value)) {
                $coreData[$key] = json_encode($value);
            }
        }

        // Extract models and additional fields for separate processing
        $models = $this->getValueFromRow($row, ['Models', 'models']);
        $additionalFields = $this->extractAdditionalFields($row);

        return [$uniqueInstanceKey, $coreData, $models, $additionalFields];
    }

    protected function buildInstanceKey(array $uniqueKey): string
    {
        return md5(implode('|', [
            $uniqueKey['pdf_id'] ?? '',
            $uniqueKey['manual_number'] ?? '',
            $uniqueKey['part_number'] ?? '',
            $uniqueKey['img_page_number'] ?? '',
            $uniqueKey['ccn_number'] ?? ''
        ]));
    }

    protected function processBulkRelationships(
        array $modelsToSync,
        array $additionalFieldsToSync,
        string $csvFilename
    ): void {
        // This would need to be implemented based on your specific relationship handling
        // For now, we'll skip the complex relationship syncing for performance
        // You might want to queue these operations separately if they're not critical for immediate processing

        Log::info("[PartInstanceProcessingService] Skipping relationship syncing for performance - ".
            count($modelsToSync)." models, ".count($additionalFieldsToSync)." additional fields");
    }

    protected function getOrCreateManufacturerId(string $manufacturerName): int
    {
        $cleanName = trim($manufacturerName);

        if (isset($this->manufacturerCache[$cleanName])) {
            return $this->manufacturerCache[$cleanName];
        }

        try {
            // Try to create first
            $manufacturer = Manufacturer::firstOrCreate(['name' => $cleanName]);
            $this->manufacturerCache[$cleanName] = $manufacturer->id;
            return $manufacturer->id;
        } catch (\Exception $e) {
            // If creation fails due to duplicate, try to find the existing one
            if (str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), '1062')) {
                Log::debug("[PartInstanceProcessingService] Manufacturer '{$cleanName}' already exists, fetching existing record");

                $manufacturer = Manufacturer::where('name', $cleanName)->first();
                if ($manufacturer) {
                    $this->manufacturerCache[$cleanName] = $manufacturer->id;
                    return $manufacturer->id;
                }
            }

            // If we still can't find it, throw the original error
            Log::error("[PartInstanceProcessingService] Failed to get or create manufacturer '{$cleanName}': ".$e->getMessage());
            throw $e;
        }
    }

    protected function getOrCreatePartCategoryId(string $categoryName): int
    {
        $cleanName = trim($categoryName);

        if (isset($this->categoryCache[$cleanName])) {
            return $this->categoryCache[$cleanName];
        }

        try {
            // Try to create first
            $category = PartCategory::firstOrCreate(['name' => $cleanName]);
            $this->categoryCache[$cleanName] = $category->id;
            return $category->id;
        } catch (\Exception $e) {
            // If creation fails due to duplicate, try to find the existing one
            if (str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), '1062')) {
                Log::debug("[PartInstanceProcessingService] Category '{$cleanName}' already exists, fetching existing record");

                $category = PartCategory::where('name', $cleanName)->first();
                if ($category) {
                    $this->categoryCache[$cleanName] = $category->id;
                    return $category->id;
                }
            }

            // If we still can't find it, throw the original error
            Log::error("[PartInstanceProcessingService] Failed to get or create category '{$cleanName}': ".$e->getMessage());
            throw $e;
        }
    }

    // Keep all the existing helper methods unchanged
    protected function getValueFromRow(array $row, array $possibleColumnNames): ?string
    {
        foreach ($possibleColumnNames as $columnName) {
            if (isset($row[$columnName]) && !empty(trim($row[$columnName]))) {
                return trim($row[$columnName]);
            }
        }
        return null;
    }

    protected function mapCoreData(array $row): array
    {
        $coreData = [];

        $flexibleMappings = [
            'pdf_id' => ['ID', 'id', 'pdf_id'],
            'part_number' => ['Part_Number', 'part_number'],
            'description' => ['Description', 'description'],
            'quantity' => ['Quantity', 'quantity'],
            'ccn_number' => ['CCN_Number', 'ccn_number'],
            'manufacturer_serial' => ['Manufacture_Serial', 'manufacture_serial', 'manufacturer_serial'],
            'manual_number' => ['Manual_Number', 'manual_number'],
            'revision' => ['Revision', 'revision'],
            'manual_date' => ['Manual_Date', 'manual_date'],
            'img_page_number' => ['Img_Page_Number', 'img_page_number'],
            'img_page_path' => ['Img_Page_Path', 'img_page_path'],
            'part_location' => ['Part_Location', 'part_location'],
            'part_type' => ['Part_Type', 'part_type'],
            'additional_notes' => ['Additional_Notes', 'additional_notes'],
        ];

        foreach ($flexibleMappings as $dbColumn => $possibleColumns) {
            $value = $this->getValueFromRow($row, $possibleColumns);

            if ($value !== null) {
                // Skip values that contain "Models:" as they belong in relationships
                if (is_string($value) && str_contains($value, 'Models:')) {
                    continue;
                }

                // Truncate fields based on database column lengths
                if ($dbColumn === 'pdf_id') {
                    $value = substr($value, 0, 100);
                } elseif ($dbColumn === 'manual_number') {
                    $value = substr($value, 0, 50);
                } elseif ($dbColumn === 'part_number') {
                    $value = substr($value, 0, 50);
                } elseif ($dbColumn === 'revision') {
                    $value = substr($value, 0, 50);
                } elseif ($dbColumn === 'manufacturer_serial') {
                    $value = substr($value, 0, 100);
                } elseif ($dbColumn === 'quantity') {
                    $value = substr($value, 0, 20);
                } elseif ($dbColumn === 'part_type') {
                    $value = substr($value, 0, 100);
                } elseif ($dbColumn === 'part_location') {
                    $value = substr($value, 0, 100);
                } elseif ($dbColumn === 'img_page_number') {
                    $value = substr($value, 0, 20);
                } elseif ($dbColumn === 'ccn_number') {
                    $value = substr($value, 0, 30);
                } elseif ($dbColumn === 'manual_date') {
                    $value = substr($value, 0, 50);
                }

                $coreData[$dbColumn] = $value;
            }
        }

        return $coreData;
    }

    protected function extractAdditionalFields(array $row): array
    {
        $additionalFields = [];
        $coreMappedColumns = array_keys(self::CORE_COLUMN_MAPPING);

        foreach ($row as $columnName => $value) {
            if (in_array($columnName, $coreMappedColumns)) {
                continue;
            }

            if (empty(trim($columnName))) {
                continue;
            }

            $fieldName = substr(trim($columnName), 0, 100);
            $additionalFields[$fieldName] = $value;
        }

        return $additionalFields;
    }

    protected function handleRemovedInstances(string $csvFilename, string $batchId): void
    {
        $removedCount = PartInstance::where('file_name', $csvFilename)
            ->where('import_batch_id', '!=', $batchId)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        if ($removedCount > 0) {
            Log::info("[PartInstanceProcessingService] Marked {$removedCount} instances as inactive");
        }
    }

    public function getProcessingStats(string $csvFilename): array
    {
        return [
            'total_instances' => PartInstance::where('file_name', $csvFilename)->count(),
            'active_instances' => PartInstance::where('file_name', $csvFilename)->where('is_active', true)->count(),
            'inactive_instances' => PartInstance::where('file_name', $csvFilename)->where('is_active', false)->count(),
            'unique_parts' => PartInstance::where('file_name', $csvFilename)
                ->where('is_active', true)
                ->distinct('part_number')
                ->count(),
            'unique_manuals' => PartInstance::where('file_name', $csvFilename)
                ->where('is_active', true)
                ->distinct('pdf_id')
                ->count(),
            'manufacturers_count' => PartInstance::where('file_name', $csvFilename)
                ->where('is_active', true)
                ->whereNotNull('manufacturer_id')
                ->distinct('manufacturer_id')
                ->count(),
            'categories_count' => PartInstance::where('file_name', $csvFilename)
                ->where('is_active', true)
                ->whereNotNull('part_category_id')
                ->distinct('part_category_id')
                ->count(),
        ];
    }
}
