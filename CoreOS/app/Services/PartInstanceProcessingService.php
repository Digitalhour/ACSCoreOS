<?php

namespace App\Services;

use App\Models\Parts\Manufacturer;
use App\Models\Parts\PartCategory;
use App\Models\Parts\PartInstance;
use App\Models\Parts\PartModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PartInstanceProcessingService
{
    // Cache for lookups to avoid repeated DB queries
    protected array $manufacturerCache = [];
    protected array $categoryCache = [];
    protected array $modelCache = [];
    protected array $existingInstancesCache = [];

    // Batch processing constants
    const BATCH_SIZE = 500;
    const MODEL_BATCH_SIZE = 250;
    const MEMORY_LIMIT_MB = 100;

    private OptimizedNSProductMatcher $nsMatcher;

    public function __construct(OptimizedNSProductMatcher $nsMatcher)
    {
        $this->nsMatcher = $nsMatcher;
    }

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
        ?string $configuredUniqueColumn = null,
        ?string $batchId = null
    ): array {
        $batchId = $batchId ?? Str::uuid();
        $stats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0,
        ];

        Log::info("[PartInstanceProcessingService] Starting batch {$batchId} for file: {$csvFilename}");
        Log::info("[PartInstanceProcessingService] Input data: ".count($csvData)." rows");

        // Pre-load ALL data in bulk
        $this->preloadAllData($csvData, $csvFilename);

        DB::connection('parts_database')->transaction(function () use (
            $csvData,
            $csvHeaders,
            $csvFilename,
            $batchId,
            &$stats
        ) {
            // Process in large chunks using bulk operations
            $this->processBulk($csvData, $csvFilename, $batchId, $stats);
        });

        // Log detailed stats for debugging
        $this->logDetailedStats($csvData, $stats, $batchId);

        // After processing, enhance parts with Shopify data
        $this->enhancePartsWithShopifyData($batchId);

        return $stats;
    }

    /**
     * Enhance parts with Shopify data after CSV processing
     */
    protected function enhancePartsWithShopifyData(string $batchId): void
    {
        try {
            Log::info("[PartInstanceProcessingService] Starting Shopify enhancement for batch: {$batchId}");

            // Get all parts from this batch that don't have Shopify ID yet
            $partInstances = PartInstance::where('import_batch_id', $batchId)
                ->whereNull('shopify_id')
                ->with('manufacturer')
                ->get();

            if ($partInstances->isEmpty()) {
                Log::info("[PartInstanceProcessingService] No parts found for Shopify enhancement in batch: {$batchId}");
                return;
            }

            Log::info("[PartInstanceProcessingService] Found ".count($partInstances)." parts for Shopify enhancement");

            // Convert to array format expected by the matcher
            $partsArray = $partInstances->map(function ($instance) {
                return [
                    'id' => $instance->id,
                    'manufacture' => $instance->manufacturer?->name ?? '',
                    'part_number' => $instance->part_number,
                ];
            })->toArray();

            // Process in chunks to avoid memory issues
            $chunks = array_chunk($partsArray, 100);
            $totalUpdated = 0;

            foreach ($chunks as $chunkIndex => $chunk) {
                Log::info("[PartInstanceProcessingService] Processing Shopify chunk ".($chunkIndex + 1)."/".count($chunks));

                $enhancedParts = $this->nsMatcher->enhancePartsWithShopifyImages($chunk);

                foreach ($enhancedParts as $enhancedPart) {
                    if (!empty($enhancedPart['nsproduct_match']->shop_id ?? null)) {
                        PartInstance::where('id', $enhancedPart['id'])
                            ->update(['shopify_id' => $enhancedPart['nsproduct_match']->shop_id]);
                        $totalUpdated++;
                    }
                }
            }

            Log::info("[PartInstanceProcessingService] Enhanced {$totalUpdated} parts with Shopify IDs for batch: {$batchId}");

        } catch (\Exception $e) {
            Log::error("[PartInstanceProcessingService] Error enhancing parts with Shopify data: ".$e->getMessage(), [
                'batch_id' => $batchId,
                'exception_trace' => $e->getTraceAsString()
            ]);
        }
    }

    protected function preloadAllData(array $csvData, string $csvFilename): void
    {
        Log::info("[PartInstanceProcessingService] Preloading all data...");

        // Preload manufacturers and categories
        $this->preloadManufacturers($csvData);
        $this->preloadCategories($csvData);
        $this->preloadModels($csvData);
        $this->preloadExistingInstances($csvFilename);

        Log::info("[PartInstanceProcessingService] Preloading complete");
    }

    protected function preloadManufacturers(array $csvData): void
    {
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

    protected function preloadModels(array $csvData): void
    {
        $modelNames = [];
        foreach ($csvData as $row) {
            $modelsValue = $this->getValueFromRow($row, ['Models', 'models']);
            if (!empty($modelsValue)) {
                $parsedModels = $this->parseModelsString($modelsValue);
                foreach ($parsedModels as $modelName) {
                    if (!empty($modelName)) {
                        $modelNames[trim($modelName)] = true;
                    }
                }
            }
        }

        if (!empty($modelNames)) {
            $models = PartModel::whereIn('name', array_keys($modelNames))->get();
            foreach ($models as $model) {
                $this->modelCache[$model->name] = $model->id;
            }
        }

        Log::info("[PartInstanceProcessingService] Preloaded ".count($this->modelCache)." models");
    }

    protected function preloadExistingInstances(string $csvFilename): void
    {
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

    protected function processBulk(array $csvData, string $csvFilename, string $batchId, array &$stats): void
    {
        $totalRows = count($csvData);
        Log::info("[PartInstanceProcessingService] Processing {$totalRows} records in memory-optimized bulk mode");

        // Process in smaller chunks to avoid memory issues
        $chunkSize = 250;
        $chunks = array_chunk($csvData, $chunkSize);
        $processedCount = 0;

        foreach ($chunks as $chunkIndex => $chunk) {
            // Check memory usage
            $memoryUsage = memory_get_usage(true) / 1024 / 1024;
            if ($memoryUsage > self::MEMORY_LIMIT_MB) {
                Log::warning("[PartInstanceProcessingService] Memory usage ({$memoryUsage}MB) approaching limit, forcing garbage collection");
                gc_collect_cycles();
                $memoryUsage = memory_get_usage(true) / 1024 / 1024;
                Log::info("[PartInstanceProcessingService] Memory after GC: {$memoryUsage}MB");
            }

            Log::info("[PartInstanceProcessingService] Processing chunk ".($chunkIndex + 1)."/".count($chunks)." ({$chunkSize} records)");

            // Process this chunk
            $chunkData = $this->processChunkData($chunk, $csvFilename, $batchId, $stats);

            if (!empty($chunkData['prepared_data'])) {
                $this->processBulkChunk($chunkData['prepared_data'], $stats);
            }

            // Process models AFTER instances are created and cache is updated
            if (!empty($chunkData['models_data'])) {
                $this->processBulkModels($chunkData['models_data']);
            }

            if (!empty($chunkData['additional_fields_data'])) {
                $this->processBulkAdditionalFields($chunkData['additional_fields_data'], $csvFilename);
            }

            $processedCount += count($chunk);
            $percentComplete = round(($processedCount / $totalRows) * 100, 1);
            Log::info("[PartInstanceProcessingService] Completed chunk ".($chunkIndex + 1)."/".count($chunks)." ({$percentComplete}% total)");

            // Clear chunk data to free memory
            unset($chunkData, $chunk);

            // Force garbage collection every few chunks
            if (($chunkIndex + 1) % 5 === 0) {
                gc_collect_cycles();
            }
        }

        Log::info("[PartInstanceProcessingService] Bulk processing complete: {$processedCount} records processed");
    }

    protected function processChunkData(array $chunk, string $csvFilename, string $batchId, array &$stats): array
    {
        $preparedData = [];
        $modelsData = [];
        $additionalFieldsData = [];

        foreach ($chunk as $index => $row) {
            try {
                // Add validation
                $validation = $this->validateRowData($row, $index);
                if (!$validation['valid']) {
                    $stats['skipped']++;
                    Log::warning("[PartInstanceProcessingService] Skipped row {$index}: ".implode(', ',
                            $validation['issues']));
                    Log::debug("[PartInstanceProcessingService] Skipped row data: ".json_encode($row));
                    continue;
                }

                $result = $this->prepareRowDataBulk($row, $csvFilename, $batchId);
                if ($result === null) {
                    $stats['skipped']++;
                    Log::warning("[PartInstanceProcessingService] Row {$index} returned null after preparation - pdf_id: '{$validation['pdf_id']}', part_number: '{$validation['part_number']}'");
                    continue;
                }

                [$uniqueKey, $coreData, $models, $additionalFields] = $result;
                $instanceKey = $this->buildInstanceKey($uniqueKey);

                $preparedData[$instanceKey] = [
                    'unique_key' => $uniqueKey,
                    'core_data' => $coreData,
                    'is_existing' => isset($this->existingInstancesCache[$instanceKey]),
                    'original_index' => $index
                ];

                if (!empty($models)) {
                    $modelsData[$instanceKey] = $models;
                    Log::debug("[PartInstanceProcessingService] Row {$index} has models: {$models}");
                }

                if (!empty($additionalFields)) {
                    $additionalFieldsData[$instanceKey] = $additionalFields;
                }

            } catch (\Exception $e) {
                $stats['errors']++;
                Log::error("[PartInstanceProcessingService] Error preparing row {$index}: ".$e->getMessage());
                Log::error("[PartInstanceProcessingService] Row data: ".json_encode($row));
            }
        }

        Log::info("[PartInstanceProcessingService] Chunk preparation: ".count($preparedData)." prepared, ".count($modelsData)." with models");

        return [
            'prepared_data' => $preparedData,
            'models_data' => $modelsData,
            'additional_fields_data' => $additionalFieldsData
        ];
    }

    protected function processBulkChunk(array $chunk, array &$stats): void
    {
        // Don't separate inserts and updates - use upsert for everything
        $this->bulkUpsertOptimized($chunk, $stats);
    }

    protected function bulkUpsertOptimized(array $chunkData, array &$stats): void
    {
        $upsertRows = [];
        $now = now();

        // Define all possible columns that should be in every row
        $requiredColumns = [
            'pdf_id', 'manual_number', 'part_number', 'img_page_number', 'ccn_number',
            'description', 'quantity', 'manufacturer_serial', 'revision', 'manual_date',
            'img_page_path', 'part_location', 'part_type', 'additional_notes',
            'file_name', 'import_batch_id', 'is_active', 'manufacturer_id', 'part_category_id',
            'import_timestamp', 'created_at', 'updated_at', 's3_img_url', 'shopify_id'
        ];

        foreach ($chunkData as $instanceKey => $data) {
            // Merge unique key and core data
            $row = array_merge($data['unique_key'], $data['core_data']);

            // Add timestamps
            $row['created_at'] = $now;
            $row['updated_at'] = $now;
            $row['import_timestamp'] = $now;

            // Ensure every row has all required columns with proper defaults
            $normalizedRow = [];
            foreach ($requiredColumns as $column) {
                if (isset($row[$column])) {
                    $normalizedRow[$column] = $row[$column];
                } else {
                    // Set appropriate defaults for missing columns
                    switch ($column) {
                        case 'is_active':
                            $normalizedRow[$column] = true;
                            break;
                        case 'quantity':
                            $normalizedRow[$column] = null;
                            break;
                        case 'manufacturer_id':
                        case 'part_category_id':
                        case 's3_img_url':
                        case 'shopify_id':
                            $normalizedRow[$column] = null;
                            break;
                        case 'created_at':
                        case 'updated_at':
                        case 'import_timestamp':
                            $normalizedRow[$column] = $now;
                            break;
                        default:
                            $normalizedRow[$column] = null;
                    }
                }
            }

            $upsertRows[] = $normalizedRow;
        }

        try {
            // Use Laravel's upsert method for insert or update
            $affectedRows = PartInstance::upsert(
                $upsertRows,
                // Unique columns that determine if record exists
                ['pdf_id', 'manual_number', 'part_number', 'img_page_number', 'ccn_number'],
                // Columns to update if record exists
                [
                    'description', 'quantity', 'manufacturer_serial', 'revision', 'manual_date',
                    'img_page_path', 'part_location', 'part_type', 'additional_notes',
                    'file_name', 'import_batch_id', 'is_active', 'manufacturer_id', 'part_category_id',
                    'import_timestamp', 'updated_at', 's3_img_url', 'shopify_id'
                ]
            );

            // Update cache with newly created instances
            $this->updateInstanceCache($chunkData, $upsertRows);

            // Estimate created vs updated (approximate since upsert doesn't give exact counts)
            $existingInChunk = 0;
            foreach ($chunkData as $instanceKey => $data) {
                if ($data['is_existing']) {
                    $existingInChunk++;
                }
            }

            $totalInChunk = count($upsertRows);
            $newInChunk = $totalInChunk - $existingInChunk;

            $stats['created'] += $newInChunk;
            $stats['updated'] += $existingInChunk;

            Log::info("[PartInstanceProcessingService] Upserted {$totalInChunk} records (estimated: {$newInChunk} new, {$existingInChunk} updated)");

        } catch (\Exception $e) {
            Log::error("[PartInstanceProcessingService] Bulk upsert failed: ".$e->getMessage());
            // Fallback to individual upserts
            $this->fallbackIndividualUpserts($upsertRows, $stats);
        }
    }

    protected function updateInstanceCache(array $chunkData, array $upsertRows): void
    {
        // After upsert, we need to get the IDs for newly created instances
        $uniqueKeys = [];
        foreach ($chunkData as $instanceKey => $data) {
            $uniqueKeys[$instanceKey] = $data['unique_key'];
        }

        if (!empty($uniqueKeys)) {
            // Build a query to get all instances that were just created/updated
            $query = PartInstance::query();

            $first = true;
            foreach ($uniqueKeys as $instanceKey => $uniqueKey) {
                if ($first) {
                    $query->where(function ($q) use ($uniqueKey) {
                        foreach ($uniqueKey as $column => $value) {
                            $q->where($column, $value);
                        }
                    });
                    $first = false;
                } else {
                    $query->orWhere(function ($q) use ($uniqueKey) {
                        foreach ($uniqueKey as $column => $value) {
                            $q->where($column, $value);
                        }
                    });
                }
            }

            $instances = $query->select([
                'pdf_id', 'manual_number', 'part_number', 'img_page_number', 'ccn_number', 'id'
            ])->get();

            foreach ($instances as $instance) {
                $key = $this->buildInstanceKey([
                    'pdf_id' => $instance->pdf_id,
                    'manual_number' => $instance->manual_number,
                    'part_number' => $instance->part_number,
                    'img_page_number' => $instance->img_page_number,
                    'ccn_number' => $instance->ccn_number,
                ]);

                // Add to cache
                $this->existingInstancesCache[$key] = $instance->id;
            }

            Log::info("[PartInstanceProcessingService] Updated cache with ".count($instances)." instance IDs");
        }
    }

    protected function fallbackIndividualUpserts(array $data, array &$stats): void
    {
        $successCount = 0;
        $now = now();

        foreach ($data as $row) {
            try {
                // Build unique key for updateOrCreate
                $uniqueKey = [
                    'pdf_id' => $row['pdf_id'],
                    'manual_number' => $row['manual_number'],
                    'part_number' => $row['part_number'],
                    'img_page_number' => $row['img_page_number'],
                    'ccn_number' => $row['ccn_number'],
                ];

                // Remove unique key fields from update data
                $updateData = $row;
                foreach ($uniqueKey as $key => $value) {
                    unset($updateData[$key]);
                }
                $updateData['updated_at'] = $now;

                $partInstance = PartInstance::updateOrCreate($uniqueKey, $updateData);

                // Update cache with new instance ID
                $instanceKey = $this->buildInstanceKey($uniqueKey);
                $this->existingInstancesCache[$instanceKey] = $partInstance->id;

                if ($partInstance->wasRecentlyCreated) {
                    $stats['created']++;
                } else {
                    $stats['updated']++;
                }

                $successCount++;
            } catch (\Exception $e) {
                $stats['errors']++;
                Log::error("[PartInstanceProcessingService] Individual upsert failed: ".$e->getMessage(),
                    ['row' => $row]);
            }
        }

        Log::info("[PartInstanceProcessingService] Individual upserts: {$successCount} successful");
    }

    protected function processBulkModels(array $modelsData): void
    {
        Log::info("[PartInstanceProcessingService] Processing models for ".count($modelsData)." instances");

        // Create any missing models first
        $allModelNames = [];
        foreach ($modelsData as $models) {
            $parsedModels = $this->parseModelsString($models);
            foreach ($parsedModels as $modelName) {
                if (!empty($modelName) && !isset($this->modelCache[$modelName])) {
                    $allModelNames[trim($modelName)] = true;
                }
            }
        }

        // Bulk create missing models
        if (!empty($allModelNames)) {
            $this->bulkCreateModels(array_keys($allModelNames));
        }

        // Now sync relationships in batches
        $relationshipData = [];
        $missingInstances = [];

        foreach ($modelsData as $instanceKey => $models) {
            // Check existing instance cache
            $instanceId = null;
            if (isset($this->existingInstancesCache[$instanceKey])) {
                $instanceId = $this->existingInstancesCache[$instanceKey];
            }

            if ($instanceId) {
                $parsedModels = $this->parseModelsString($models);
                Log::debug("[PartInstanceProcessingService] Processing models for instance {$instanceId}: ".json_encode($parsedModels));

                foreach ($parsedModels as $modelName) {
                    $modelName = trim($modelName);
                    if (!empty($modelName) && isset($this->modelCache[$modelName])) {
                        $relationshipData[] = [
                            'part_instance_id' => $instanceId,
                            'model_id' => $this->modelCache[$modelName], // FIXED: Correct column name
                            'created_at' => now(),
                            'updated_at' => now()
                        ];
                        Log::debug("[PartInstanceProcessingService] Added relationship: instance {$instanceId} -> model {$modelName} (ID: {$this->modelCache[$modelName]})");
                    } else {
                        Log::warning("[PartInstanceProcessingService] Model '{$modelName}' not found in cache");
                    }
                }
            } else {
                $missingInstances[] = $instanceKey;
            }
        }

        if (!empty($missingInstances)) {
            Log::warning("[PartInstanceProcessingService] ".count($missingInstances)." instances not found in cache for model relationships");

            // Try to find these instances in the database
            $this->findMissingInstances($missingInstances, $modelsData, $relationshipData);
        }

        // Bulk insert relationships
        if (!empty($relationshipData)) {
            try {
                // Clear existing relationships first
                $instanceIds = array_unique(array_column($relationshipData, 'part_instance_id'));

                Log::info("[PartInstanceProcessingService] Clearing existing relationships for ".count($instanceIds)." instances");
                DB::connection('parts_database')
                    ->table('part_instance_models')
                    ->whereIn('part_instance_id', $instanceIds)
                    ->delete();

                // Insert new relationships in chunks to avoid memory issues
                $chunks = array_chunk($relationshipData, 500);
                $totalInserted = 0;

                foreach ($chunks as $chunk) {
                    DB::connection('parts_database')
                        ->table('part_instance_models')
                        ->insert($chunk);
                    $totalInserted += count($chunk);
                }

                Log::info("[PartInstanceProcessingService] Successfully synced {$totalInserted} model relationships");
            } catch (\Exception $e) {
                Log::error("[PartInstanceProcessingService] Failed to sync model relationships: ".$e->getMessage());
                Log::error("[PartInstanceProcessingService] Sample relationship data: ".json_encode(array_slice($relationshipData,
                        0, 3)));

                // Try individual inserts as fallback
                $this->fallbackIndividualModelSync($relationshipData);
            }
        } else {
            Log::warning("[PartInstanceProcessingService] No model relationships to sync");
        }
    }

    protected function findMissingInstances(
        array $missingInstanceKeys,
        array $modelsData,
        array &$relationshipData
    ): void {
        Log::info("[PartInstanceProcessingService] Attempting to find ".count($missingInstanceKeys)." missing instances in database");

        // For chunked processing, we need to query the database for instances that might have been created
        // but not yet in our cache
        $foundCount = 0;

        foreach ($missingInstanceKeys as $instanceKey) {
            // We can't easily reconstruct the unique key from the hash, so we'll try a different approach
            // Query for recently created instances that match our models data

            // This is a limitation of the current approach - in a perfect world we'd store
            // the unique key data along with the instance key

            // For now, just log that we couldn't find them
            Log::debug("[PartInstanceProcessingService] Could not find instance for key: {$instanceKey}");
        }

        if ($foundCount > 0) {
            Log::info("[PartInstanceProcessingService] Found {$foundCount} missing instances");
        }
    }

    protected function fallbackIndividualModelSync(array $relationshipData): void
    {
        $successCount = 0;

        foreach ($relationshipData as $relationship) {
            try {
                DB::connection('parts_database')
                    ->table('part_instance_models')
                    ->updateOrInsert(
                        [
                            'part_instance_id' => $relationship['part_instance_id'],
                            'model_id' => $relationship['model_id']
                        ],
                        $relationship
                    );
                $successCount++;
            } catch (\Exception $e) {
                Log::error("[PartInstanceProcessingService] Failed to insert individual model relationship: ".$e->getMessage());
            }
        }

        Log::info("[PartInstanceProcessingService] Fallback model sync: {$successCount} relationships created");
    }

    protected function bulkCreateModels(array $modelNames): void
    {
        if (empty($modelNames)) {
            return;
        }

        // First, check which models already exist by name
        $existingModels = PartModel::whereIn('name', $modelNames)->get();
        foreach ($existingModels as $model) {
            $this->modelCache[$model->name] = $model->id;
        }

        // Find models that need to be created
        $existingNames = $existingModels->pluck('name')->toArray();
        $modelsToCreate = array_diff($modelNames, $existingNames);

        if (empty($modelsToCreate)) {
            return; // All models already exist
        }

        Log::info("[PartInstanceProcessingService] Creating ".count($modelsToCreate)." new models");

        // Try bulk creation first, but handle slug conflicts
        $insertData = [];
        $now = now();
        $usedSlugs = [];

        // Get existing slugs to avoid conflicts
        $existingSlugs = PartModel::pluck('slug')->toArray();
        $usedSlugs = array_flip($existingSlugs);

        foreach ($modelsToCreate as $modelName) {
            $baseSlug = Str::slug($modelName);
            $slug = $baseSlug;
            $counter = 1;

            // Ensure unique slug
            while (isset($usedSlugs[$slug])) {
                $slug = $baseSlug.'-'.$counter;
                $counter++;
            }

            $usedSlugs[$slug] = true;

            $insertData[] = [
                'name' => $modelName,
                'slug' => $slug,
                'created_at' => $now,
                'updated_at' => $now
            ];
        }

        try {
            // Attempt bulk insert
            PartModel::insert($insertData);

            // Refresh model cache for new models
            $newModels = PartModel::whereIn('name', $modelsToCreate)->get();
            foreach ($newModels as $model) {
                $this->modelCache[$model->name] = $model->id;
            }

            Log::info("[PartInstanceProcessingService] Bulk created ".count($insertData)." models");

        } catch (\Exception $e) {
            if (str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), '1062')) {
                Log::warning("[PartInstanceProcessingService] Bulk model creation failed due to duplicates, falling back to individual creation");
                $this->fallbackIndividualModelCreation($modelsToCreate);
            } else {
                Log::error("[PartInstanceProcessingService] Bulk model creation failed: ".$e->getMessage());
                $this->fallbackIndividualModelCreation($modelsToCreate);
            }
        }
    }

    protected function fallbackIndividualModelCreation(array $modelNames): void
    {
        $successCount = 0;

        foreach ($modelNames as $modelName) {
            try {
                $model = PartModel::firstOrCreate(['name' => $modelName]);
                $this->modelCache[$modelName] = $model->id;
                $successCount++;
            } catch (\Exception $e) {
                if (str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), '1062')) {
                    // Model was created by another process, try to find it
                    $existingModel = PartModel::where('name', $modelName)->first();
                    if ($existingModel) {
                        $this->modelCache[$modelName] = $existingModel->id;
                        $successCount++;
                    } else {
                        // Try to find by slug as backup since slug conflicts are common
                        $slug = Str::slug($modelName);
                        $existingModel = PartModel::where('slug', $slug)->first();
                        if ($existingModel) {
                            $this->modelCache[$modelName] = $existingModel->id;
                            $successCount++;
                            Log::debug("[PartInstanceProcessingService] Found model '{$modelName}' by slug '{$slug}'");
                        } else {
                            // Try variations of the slug (sometimes there are extra hyphens, etc.)
                            $variations = [
                                $slug.'-1',
                                $slug.'-2',
                                preg_replace('/-+/', '-', $slug), // Remove double hyphens
                                str_replace(['(', ')', ' '], ['-', '-', '-'], strtolower($modelName))
                                // Different slug generation
                            ];

                            $found = false;
                            foreach ($variations as $variation) {
                                $existingModel = PartModel::where('slug', $variation)->first();
                                if ($existingModel) {
                                    $this->modelCache[$modelName] = $existingModel->id;
                                    $successCount++;
                                    $found = true;
                                    Log::debug("[PartInstanceProcessingService] Found model '{$modelName}' by slug variation '{$variation}'");
                                    break;
                                }
                            }

                            if (!$found) {
                                Log::warning("[PartInstanceProcessingService] Could not find existing model '{$modelName}' after duplicate error, skipping");
                            }
                        }
                    }
                } else {
                    Log::error("[PartInstanceProcessingService] Failed to create model '{$modelName}': ".$e->getMessage());
                }
            }
        }

        Log::info("[PartInstanceProcessingService] Individual model creation: {$successCount} successful out of ".count($modelNames)." attempted");
    }

    protected function processBulkAdditionalFields(array $additionalFieldsData, string $csvFilename): void
    {
        if (empty($additionalFieldsData)) {
            return;
        }

        Log::info("[PartInstanceProcessingService] Processing additional fields for ".count($additionalFieldsData)." instances");

        // Get instance IDs for this chunk only
        $instanceIds = [];
        foreach ($additionalFieldsData as $instanceKey => $fields) {
            if (isset($this->existingInstancesCache[$instanceKey])) {
                $instanceIds[] = $this->existingInstancesCache[$instanceKey];
            }
        }

        // Clear existing additional fields for these specific instances
        if (!empty($instanceIds)) {
            try {
                DB::connection('parts_database')
                    ->table('part_instance_additional_fields')
                    ->whereIn('part_instance_id', $instanceIds)
                    ->delete();
            } catch (\Exception $e) {
                Log::error("[PartInstanceProcessingService] Failed to clear existing additional fields: ".$e->getMessage());
            }
        }

        // Prepare insert data in smaller batches
        $insertData = [];
        $now = now();

        foreach ($additionalFieldsData as $instanceKey => $fields) {
            if (isset($this->existingInstancesCache[$instanceKey])) {
                $instanceId = $this->existingInstancesCache[$instanceKey];

                foreach ($fields as $fieldName => $fieldValue) {
                    if (!empty(trim($fieldName)) && $fieldValue !== null && $fieldValue !== '') {
                        $insertData[] = [
                            'part_instance_id' => $instanceId,
                            'field_name' => substr(trim($fieldName), 0, 100),
                            'field_value' => (string) $fieldValue,
                            'created_at' => $now,
                            'updated_at' => $now
                        ];
                    }
                }
            }
        }

        // Process in smaller chunks to avoid memory issues
        if (!empty($insertData)) {
            $chunks = array_chunk($insertData, 500); // Smaller chunks
            $totalInserted = 0;

            foreach ($chunks as $chunk) {
                try {
                    DB::connection('parts_database')
                        ->table('part_instance_additional_fields')
                        ->insert($chunk);
                    $totalInserted += count($chunk);
                } catch (\Exception $e) {
                    Log::error("[PartInstanceProcessingService] Failed to insert additional fields chunk: ".$e->getMessage());
                }

                // Clear chunk from memory
                unset($chunk);
            }

            Log::info("[PartInstanceProcessingService] Inserted {$totalInserted} additional fields");
        }

        // Clear data from memory
        unset($insertData, $additionalFieldsData);
    }

    protected function prepareRowDataBulk(array $row, string $csvFilename, string $batchId): ?array
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

        // Map core data
        $coreData = $this->mapCoreData($row);
        $coreData['file_name'] = substr($csvFilename, 0, 100);
        $coreData['import_batch_id'] = $batchId;
        $coreData['is_active'] = true;

        // Handle manufacturer lookup (using cache)
        $manufactureName = $this->getValueFromRow($row, ['Manufacture', 'manufacture', 'Manufacturer', 'manufacturer']);
        if (!empty($manufactureName)) {
            $manufactureName = trim($manufactureName);
            if (isset($this->manufacturerCache[$manufactureName])) {
                $coreData['manufacturer_id'] = $this->manufacturerCache[$manufactureName];
            } else {
                // Create manufacturer on the fly and cache it
                try {
                    $manufacturer = Manufacturer::firstOrCreate(['name' => $manufactureName]);
                    $this->manufacturerCache[$manufactureName] = $manufacturer->id;
                    $coreData['manufacturer_id'] = $manufacturer->id;
                } catch (\Exception $e) {
                    if (str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), '1062')) {
                        // Try to find existing manufacturer by name
                        $existingManufacturer = Manufacturer::where('name', $manufactureName)->first();
                        if ($existingManufacturer) {
                            $this->manufacturerCache[$manufactureName] = $existingManufacturer->id;
                            $coreData['manufacturer_id'] = $existingManufacturer->id;
                        } else {
                            // Try to find by slug as backup
                            $slug = Str::slug($manufactureName);
                            $existingManufacturer = Manufacturer::where('slug', $slug)->first();
                            if ($existingManufacturer) {
                                $this->manufacturerCache[$manufactureName] = $existingManufacturer->id;
                                $coreData['manufacturer_id'] = $existingManufacturer->id;
                            } else {
                                Log::error("[PartInstanceProcessingService] Could not find or create manufacturer '{$manufactureName}' after duplicate error");
                            }
                        }
                    } else {
                        Log::error("[PartInstanceProcessingService] Failed to create manufacturer '{$manufactureName}': ".$e->getMessage());
                    }
                }
            }
        }

        // Handle part category lookup (using cache)
        $partCategoryName = $this->getValueFromRow($row, ['Part_Category', 'part_category']);
        if (!empty($partCategoryName)) {
            $partCategoryName = trim($partCategoryName);
            if (isset($this->categoryCache[$partCategoryName])) {
                $coreData['part_category_id'] = $this->categoryCache[$partCategoryName];
            } else {
                // Create category on the fly and cache it
                try {
                    $category = PartCategory::firstOrCreate(['name' => $partCategoryName]);
                    $this->categoryCache[$partCategoryName] = $category->id;
                    $coreData['part_category_id'] = $category->id;
                } catch (\Exception $e) {
                    if (str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), '1062')) {
                        // Try to find existing category by name
                        $existingCategory = PartCategory::where('name', $partCategoryName)->first();
                        if ($existingCategory) {
                            $this->categoryCache[$partCategoryName] = $existingCategory->id;
                            $coreData['part_category_id'] = $existingCategory->id;
                        } else {
                            // Try to find by slug as backup
                            $slug = Str::slug($partCategoryName);
                            $existingCategory = PartCategory::where('slug', $slug)->first();
                            if ($existingCategory) {
                                $this->categoryCache[$partCategoryName] = $existingCategory->id;
                                $coreData['part_category_id'] = $existingCategory->id;
                            } else {
                                Log::error("[PartInstanceProcessingService] Could not find or create category '{$partCategoryName}' after duplicate error");
                            }
                        }
                    } else {
                        Log::error("[PartInstanceProcessingService] Failed to create category '{$partCategoryName}': ".$e->getMessage());
                    }
                }
            }
        }

        // Handle manual date
        $manualDate = $this->getValueFromRow($row, ['Manual_Date', 'manual_date']);
        if (!empty($manualDate)) {
            $coreData['manual_date'] = substr($manualDate, 0, 50);
        }

        // Clean up problematic values
        foreach ($coreData as $key => $value) {
            if (is_string($value) && str_contains($value, 'Models:')) {
                unset($coreData[$key]);
            }
            if ($value === '?' || $value === '') {
                $coreData[$key] = null;
            }
            if (is_array($value) || is_object($value)) {
                $coreData[$key] = json_encode($value);
            }
        }

        // Extract models and additional fields for separate processing
        $models = $this->getValueFromRow($row, ['Models', 'models']);
        $additionalFields = $this->extractAdditionalFields($row);

        return [$uniqueInstanceKey, $coreData, $models, $additionalFields];
    }

    protected function parseModelsString(string $modelsValue): array
    {
        $modelsValue = trim($modelsValue);

        if (empty($modelsValue)) {
            return [];
        }

        // Remove common prefixes
        $modelsValue = preg_replace('/^Models:\s*/i', '', $modelsValue);
        $modelsValue = preg_replace('/^For model:\s*/i', '', $modelsValue);

        Log::debug("[PartInstanceProcessingService] Parsing models string: '{$modelsValue}'");

        // Split by comma ONLY - this is the primary delimiter in your CSV
        $modelParts = explode(',', $modelsValue);

        $models = [];
        foreach ($modelParts as $part) {
            $part = trim($part);

            if (empty($part) || $part === '?' || $part === 'N/A') {
                continue;
            }

            // Remove "For model:" prefix from individual parts as well
            $part = preg_replace('/^For model:\s*/i', '', $part);
            $part = trim($part);

            if (!empty($part)) {
                $models[] = $part;
//                Log::debug("[PartInstanceProcessingService] Added model: '{$part}'");
            }
        }

        // Remove duplicates and return
        $uniqueModels = array_unique($models);
        Log::debug("[PartInstanceProcessingService] Final parsed models: ".json_encode($uniqueModels));

        return $uniqueModels;
    }

    // Keep existing helper methods
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
                if (is_string($value) && str_contains($value, 'Models:')) {
                    continue;
                }

                // Truncate based on database column lengths
                $maxLengths = [
                    'pdf_id' => 100, 'manual_number' => 50, 'part_number' => 50,
                    'revision' => 50, 'manufacturer_serial' => 100, 'quantity' => 20,
                    'part_type' => 100, 'part_location' => 100, 'img_page_number' => 20,
                    'ccn_number' => 30, 'manual_date' => 50
                ];

                if (isset($maxLengths[$dbColumn])) {
                    $value = substr($value, 0, $maxLengths[$dbColumn]);
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

    // DEBUG HELPER METHODS
    protected function validateRowData(array $row, int $index): array
    {
        $issues = [];

        // Check required fields
        $pdfId = $this->getValueFromRow($row, ['ID', 'id', 'pdf_id']);
        $partNumber = $this->getValueFromRow($row, ['Part_Number', 'part_number']);
        $manualNumber = $this->getValueFromRow($row, ['Manual_Number', 'manual_number']);

        if (empty($pdfId)) {
            $issues[] = "Missing PDF ID";
        }
        if (empty($partNumber)) {
            $issues[] = "Missing Part Number";
        }

        // Check for problematic characters or encoding issues
        foreach ($row as $key => $value) {
            if (is_string($value)) {
                if (!mb_check_encoding($value, 'UTF-8')) {
                    $issues[] = "Invalid UTF-8 encoding in column: {$key}";
                }
                if (strlen($value) > 1000) {
                    $issues[] = "Extremely long value in column: {$key}";
                }
            }
        }

        return [
            'valid' => empty($issues),
            'issues' => $issues,
            'pdf_id' => $pdfId,
            'part_number' => $partNumber,
            'manual_number' => $manualNumber
        ];
    }

    protected function logDetailedStats(array $csvData, array $stats, string $batchId): void
    {
        $totalInput = count($csvData);
        $totalProcessed = $stats['created'] + $stats['updated'];
        $totalFailed = $stats['skipped'] + $stats['errors'];

        Log::info("[PartInstanceProcessingService] DETAILED STATS for batch {$batchId}:");
        Log::info("  Input rows: {$totalInput}");
        Log::info("  Created: {$stats['created']}");
        Log::info("  Updated: {$stats['updated']}");
        Log::info("  Skipped: {$stats['skipped']}");
        Log::info("  Errors: {$stats['errors']}");
        Log::info("  Total processed: {$totalProcessed}");
        Log::info("  Total failed: {$totalFailed}");
        Log::info("  Missing: ".($totalInput - $totalProcessed - $totalFailed));

        // Check actual database count
        $dbCount = PartInstance::where('import_batch_id', $batchId)->count();
        Log::info("  Actual DB records: {$dbCount}");

        if ($dbCount !== $totalProcessed) {
            Log::warning("  DATABASE MISMATCH: Expected {$totalProcessed}, found {$dbCount}");
        }

        // Check model relationships
        $modelRelationshipsCount = DB::connection('parts_database')
            ->table('part_instance_models')
            ->whereIn('part_instance_id', function ($query) use ($batchId) {
                $query->select('id')
                    ->from('parts_instances')
                    ->where('import_batch_id', $batchId);
            })
            ->count();

        Log::info("  Model relationships: {$modelRelationshipsCount}");
    }

    public function handleRemovedInstances(string $csvFilename, string $batchId): void
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
            'with_images' => PartInstance::where('file_name', $csvFilename)
                ->where('is_active', true)
                ->whereNotNull('s3_img_url')
                ->count(),
            'with_shopify_ids' => PartInstance::where('file_name', $csvFilename)
                ->where('is_active', true)
                ->whereNotNull('shopify_id')
                ->count(),
        ];
    }
}
