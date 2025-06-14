<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Parts\Manufacturer;
use App\Models\Parts\PartInstance;
use App\Models\Parts\PartModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ImportedDataController extends Controller
{
    /**
     * Display a listing of individual imported parts (from parts_instances table).
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file_name' => 'nullable|string|max:255',
            'batch_id' => 'nullable|string|max:255',
            'per_page' => 'nullable|integer|min:5|max:100',
            'page' => 'nullable|integer|min:1',
            'sort_by' => 'nullable|string|in:file_name,import_timestamp,id,part_number',
            'sort_direction' => 'nullable|string|in:asc,desc',
            'search' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $query = PartInstance::query()->with(['manufacturer', 'partCategory', 'models']);

        if ($request->filled('file_name')) {
            $query->where('file_name', $request->input('file_name'));
        }

        if ($request->filled('batch_id')) {
            $query->where('import_batch_id', $request->input('batch_id'));
        }

        if ($request->filled('search')) {
            $searchTerm = $request->input('search');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('file_name', 'like', "%{$searchTerm}%")
                    ->orWhere('part_number', 'like', "%{$searchTerm}%")
                    ->orWhere('description', 'like', "%{$searchTerm}%")
                    ->orWhere('ccn_number', 'like', "%{$searchTerm}%")
                    ->orWhereHas('manufacturer', function ($mq) use ($searchTerm) {
                        $mq->where('name', 'like', "%{$searchTerm}%");
                    });
            });
        }

        $sortBy = $request->input('sort_by', 'import_timestamp');
        $sortDirection = $request->input('sort_direction', 'desc');
        $query->orderBy($sortBy, $sortDirection);

        $perPage = $request->input('per_page', 15);
        $data = $query->paginate($perPage);

        return response()->json($data);
    }

    /**
     * Get a summary of uploaded files/datasets with enhanced statistics.
     */
    public function getFileSummaries(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'sort_by' => 'nullable|string|in:file_name,last_imported_at,total_parts,active_parts',
            'sort_direction' => 'nullable|string|in:asc,desc',
            'per_page' => 'nullable|integer|min:5|max:100',
            'search' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $sortBy = $request->input('sort_by', 'last_imported_at');
        $sortDirection = $request->input('sort_direction', 'desc');
        $perPage = $request->input('per_page', 15);
        $search = $request->input('search');

        // Adjust sortBy for actual DB column names
        $sortByDbColumn = match ($sortBy) {
            'last_imported_at' => 'max_import_timestamp',
            'total_parts' => 'total_parts',
            'active_parts' => 'active_parts',
            default => 'file_name'
        };

        $query = DB::connection('parts_database')->table('parts_instances')
            ->select([
                'file_name',
                DB::raw('COUNT(*) as total_parts'),
                DB::raw('COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_parts'),
                DB::raw('COUNT(CASE WHEN is_active = 1 AND shopify_id IS NOT NULL THEN 1 END) as parts_with_shopify'),
                DB::raw('MAX(import_timestamp) as max_import_timestamp'),
                DB::raw('MIN(import_timestamp) as min_import_timestamp'),
                DB::raw('COUNT(DISTINCT import_batch_id) as batch_count')
            ])
            ->whereNotNull('file_name')
            ->groupBy('file_name');

        // Apply search filter if provided
        if ($search) {
            $query->where('file_name', 'like', "%{$search}%");
        }

        $query->orderBy($sortByDbColumn, $sortDirection);

        $summaries = $query->paginate($perPage);

        // Enhance with calculated statistics
        $summariesWithStats = $summaries->getCollection()->map(function ($summary) {
            $shopifyMatchRate = $summary->active_parts > 0
                ? round(($summary->parts_with_shopify / $summary->active_parts) * 100, 1)
                : 0;

            $summary->shopify_match_rate = $shopifyMatchRate;
            $summary->parts_without_shopify = $summary->active_parts - $summary->parts_with_shopify;

            return $summary;
        });

        $summaries->setCollection($summariesWithStats);

        return response()->json($summaries);
    }

    /**
     * Get detailed statistics for a specific file
     */
    public function getFileStatistics(string $fileName): JsonResponse
    {
        try {
            $fileName = urldecode($fileName);

            // Get comprehensive file statistics
            $fileStats = PartInstance::where('file_name', $fileName)
                ->selectRaw('
                    COUNT(*) as total_parts,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_parts,
                    COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_parts,
                    COUNT(CASE WHEN is_active = 1 AND shopify_id IS NOT NULL THEN 1 END) as parts_with_shopify,
                    COUNT(CASE WHEN is_active = 1 AND s3_img_url IS NOT NULL THEN 1 END) as parts_with_images,
                    COUNT(DISTINCT manufacturer_id) as unique_manufacturers,
                    COUNT(DISTINCT part_category_id) as unique_categories,
                    COUNT(DISTINCT import_batch_id) as unique_batches,
                    MIN(import_timestamp) as first_imported_at,
                    MAX(import_timestamp) as last_imported_at
                ')
                ->first();

            if (!$fileStats || $fileStats->total_parts == 0) {
                return response()->json(['error' => 'File not found'], 404);
            }

            // Calculate additional metrics
            $shopifyMatchRate = $fileStats->active_parts > 0
                ? round(($fileStats->parts_with_shopify / $fileStats->active_parts) * 100, 2)
                : 0;

            $imageMatchRate = $fileStats->active_parts > 0
                ? round(($fileStats->parts_with_images / $fileStats->active_parts) * 100, 2)
                : 0;

            // Get batch information
            $batches = PartInstance::where('file_name', $fileName)
                ->select('import_batch_id',
                    DB::raw('COUNT(*) as parts_count'),
                    DB::raw('MIN(import_timestamp) as batch_imported_at'))
                ->whereNotNull('import_batch_id')
                ->groupBy('import_batch_id')
                ->orderBy('batch_imported_at', 'desc')
                ->get();

            // Get all parts with pagination
            $partsQuery = PartInstance::where('file_name', $fileName)
                ->with(['manufacturer', 'partCategory']);

            // Apply any filters from request
            $request = request();
            $page = $request->input('page', 1);
            $perPage = $request->input('per_page', 20);

            $parts = $partsQuery->paginate($perPage);

            // Map the parts to a simpler format
            $parts->getCollection()->transform(function ($part) {
                return [
                    'id' => $part->id,
                    'part_number' => $part->part_number,
                    'description' => $part->description,
                    'manufacturer' => $part->manufacturer?->name,
                    'category' => $part->partCategory?->name,
                    'has_shopify_id' => !empty($part->shopify_id),
                    'has_image' => !empty($part->s3_img_url),
                    'is_active' => $part->is_active,
                    'imported_at' => $part->import_timestamp,
                ];
            });

            return response()->json([
                'file_name' => $fileName,
                'statistics' => [
                    'total_parts' => $fileStats->total_parts,
                    'active_parts' => $fileStats->active_parts,
                    'inactive_parts' => $fileStats->inactive_parts,
                    'parts_with_shopify' => $fileStats->parts_with_shopify,
                    'parts_with_images' => $fileStats->parts_with_images,
                    'shopify_match_rate' => $shopifyMatchRate,
                    'image_match_rate' => $imageMatchRate,
                    'unique_manufacturers' => $fileStats->unique_manufacturers,
                    'unique_categories' => $fileStats->unique_categories,
                    'unique_batches' => $fileStats->unique_batches,
                    'first_imported_at' => $fileStats->first_imported_at,
                    'last_imported_at' => $fileStats->last_imported_at,
                ],
                'batches' => $batches,
                'parts' => $parts,
            ]);

        } catch (\Exception $e) {
            Log::error("Error getting file statistics for '{$fileName}': ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to get file statistics',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Get a distinct list of unique file names.
     */
    public function getUniqueFileNames(): JsonResponse
    {
        try {
            $fileNames = PartInstance::query()
                ->select('file_name')
                ->distinct()
                ->whereNotNull('file_name')
                ->orderBy('file_name', 'asc')
                ->pluck('file_name');
            return response()->json($fileNames);
        } catch (\Exception $e) {
            Log::error("Error fetching unique filenames: ".$e->getMessage());
            return response()->json(['error' => 'Failed to fetch unique filenames.', 'details' => $e->getMessage()],
                500);
        }
    }

    /**
     * Get unique batch IDs
     */
    public function getUniqueBatchIds(): JsonResponse
    {
        try {
            $batchIds = PartInstance::query()
                ->select('import_batch_id')
                ->distinct()
                ->whereNotNull('import_batch_id')
                ->orderBy('import_batch_id', 'desc')
                ->pluck('import_batch_id');
            return response()->json($batchIds);
        } catch (\Exception $e) {
            Log::error("Error fetching unique batch IDs: ".$e->getMessage());
            return response()->json(['error' => 'Failed to fetch unique batch IDs.', 'details' => $e->getMessage()],
                500);
        }
    }

    /**
     * Export data for a specific file as CSV
     */
    public function exportFile(string $fileName): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        try {
            $fileName = urldecode($fileName);

            $parts = PartInstance::where('file_name', $fileName)
                ->with(['manufacturer', 'partCategory', 'models', 'additionalFields'])
                ->orderBy('import_timestamp', 'asc')
                ->get();

            if ($parts->isEmpty()) {
                abort(404, 'File not found');
            }

            $callback = function () use ($parts) {
                $file = fopen('php://output', 'w');

                // Define headers
                $headers = [
                    'id', 'part_number', 'description', 'manufacturer', 'category',
                    'models', 'quantity', 'part_type', 'ccn_number', 'manufacturer_serial',
                    'pdf_id', 'manual_number', 'revision', 'manual_date', 'img_page_number',
                    'img_page_path', 'part_location', 'additional_notes', 'file_name',
                    'import_batch_id', 'is_active', 'has_shopify_id', 'has_image',
                    'import_timestamp'
                ];

                fputcsv($file, $headers);

                // Write data rows
                foreach ($parts as $part) {
                    $row = [
                        $part->id,
                        $part->part_number,
                        $part->description,
                        $part->manufacturer?->name ?? '',
                        $part->partCategory?->name ?? '',
                        implode(', ', $part->models->pluck('name')->toArray()),
                        $part->quantity,
                        $part->part_type,
                        $part->ccn_number,
                        $part->manufacturer_serial,
                        $part->pdf_id,
                        $part->manual_number,
                        $part->revision,
                        $part->manual_date,
                        $part->img_page_number,
                        $part->img_page_path,
                        $part->part_location,
                        $part->additional_notes,
                        $part->file_name,
                        $part->import_batch_id,
                        $part->is_active ? 'Yes' : 'No',
                        !empty($part->shopify_id) ? 'Yes' : 'No',
                        !empty($part->s3_img_url) ? 'Yes' : 'No',
                        $part->import_timestamp?->toDateTimeString(),
                    ];

                    fputcsv($file, $row);
                }

                fclose($file);
            };

            $sanitizedFileName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $fileName);

            return response()->stream($callback, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"{$sanitizedFileName}_parts_export.csv\"",
            ]);

        } catch (\Exception $e) {
            Log::error("Error exporting file '{$fileName}': ".$e->getMessage());
            abort(500, 'Export failed');
        }
    }

    /**
     * Display the specified resource (single part).
     */
    public function show(PartInstance $partInstance): JsonResponse
    {
        $partInstance->load(['manufacturer', 'partCategory', 'models', 'additionalFields']);
        return response()->json($partInstance);
    }

    /**
     * Update the specified resource (single part) in storage.
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $partInstance = PartInstance::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'part_number' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'quantity' => 'nullable|integer|min:0',
                'part_type' => 'nullable|string|max:255',
                'part_location' => 'nullable|string|max:255',
                'additional_notes' => 'nullable|string',
                'manufacturer_id' => 'nullable|integer|exists:manufacturers,id',
                'part_category_id' => 'nullable|integer|exists:part_categories,id',
                'is_active' => 'boolean', // Explicitly validate as boolean
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Get validated data
            $validatedData = $validator->validated();

            // Ensure is_active is properly set
            if (array_key_exists('is_active', $validatedData)) {
                $validatedData['is_active'] = (bool) $validatedData['is_active'];
            }

            Log::info("Updating PartInstance ID {$id} with data:", $validatedData);

            $partInstance->update($validatedData);

            // Reload the model to get fresh data with relationships
            $partInstance->refresh();
            $partInstance->load(['manufacturer', 'partCategory', 'models']);

            Log::info("PartInstance updated: ID {$partInstance->id}, is_active: ".($partInstance->is_active ? 'true' : 'false'));

            return response()->json([
                'success' => true,
                'message' => 'Part updated successfully',
                'data' => $partInstance
            ]);

        } catch (\Exception $e) {
            Log::error("Error updating PartInstance ID {$id}: ".$e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to update part.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Get a list of all manufacturers
     */
    public function getManufacturers(): JsonResponse
    {
        try {
            $manufacturers = Manufacturer::orderBy('name', 'asc')->get(['id', 'name']);
            return response()->json($manufacturers);
        } catch (\Exception $e) {
            Log::error("Error fetching manufacturers: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch manufacturers',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Get a list of all models
     */
    public function getModels(): JsonResponse
    {
        try {
            $models = PartModel::orderBy('name', 'asc')->get(['id', 'name']);
            return response()->json($models);
        } catch (\Exception $e) {
            Log::error("Error fetching models: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch models',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Remove the specified resource (single part) from storage.
     */
    public function destroy(PartInstance $partInstance): JsonResponse
    {
        try {
            $partId = $partInstance->id;
            $fileName = $partInstance->file_name;
            $partInstance->delete();
            Log::info("Part ID {$partId} from file '{$fileName}' deleted successfully.");
            return response()->json(['message' => 'Part deleted successfully.'], 200);
        } catch (\Exception $e) {
            Log::error("Error deleting part ID {$partInstance->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to delete part.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Remove all parts associated with a specific file_name.
     */
    public function destroyByFileName(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file_name' => 'required|string|max:255',
            'delete_inactive_only' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $fileName = $request->input('file_name');
        $deleteInactiveOnly = $request->boolean('delete_inactive_only', false);

        try {
            DB::beginTransaction();

            $query = PartInstance::where('file_name', $fileName);

            if ($deleteInactiveOnly) {
                $query->where('is_active', false);
            }

            $deletedCount = $query->delete();

            DB::commit();

            $message = $deleteInactiveOnly
                ? "Successfully deleted {$deletedCount} inactive parts for file '{$fileName}'."
                : "Successfully deleted all {$deletedCount} parts for file '{$fileName}'.";

            Log::info("File data deletion completed", [
                'file_name' => $fileName,
                'deleted_parts_count' => $deletedCount,
                'delete_inactive_only' => $deleteInactiveOnly,
                'user_id' => auth()->id() ?? 'N/A'
            ]);

            return response()->json([
                'message' => $message,
                'deleted_parts_count' => $deletedCount,
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error("Error deleting parts for file '{$fileName}': ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to delete parts.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Get overall import and processing statistics
     */
    public function getOverallStatistics(): JsonResponse
    {
        try {
            // Parts statistics
            $partsStats = PartInstance::selectRaw('
                COUNT(*) as total_parts,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_parts,
                COUNT(CASE WHEN is_active = 1 AND shopify_id IS NOT NULL THEN 1 END) as parts_with_shopify,
                COUNT(CASE WHEN is_active = 1 AND s3_img_url IS NOT NULL THEN 1 END) as parts_with_images,
                COUNT(DISTINCT file_name) as unique_files,
                COUNT(DISTINCT import_batch_id) as unique_batches,
                COUNT(DISTINCT manufacturer_id) as unique_manufacturers,
                MIN(import_timestamp) as first_import,
                MAX(import_timestamp) as last_import
            ')->first();

            $shopifyMatchPercentage = $partsStats->active_parts > 0
                ? round(($partsStats->parts_with_shopify / $partsStats->active_parts) * 100, 2)
                : 0;

            $imageMatchPercentage = $partsStats->active_parts > 0
                ? round(($partsStats->parts_with_images / $partsStats->active_parts) * 100, 2)
                : 0;

            return response()->json([
                'parts_statistics' => [
                    'total_parts' => $partsStats->total_parts,
                    'active_parts' => $partsStats->active_parts,
                    'inactive_parts' => $partsStats->total_parts - $partsStats->active_parts,
                    'parts_with_shopify' => $partsStats->parts_with_shopify,
                    'parts_with_images' => $partsStats->parts_with_images,
                    'shopify_match_percentage' => $shopifyMatchPercentage,
                    'image_match_percentage' => $imageMatchPercentage,
                    'unique_files' => $partsStats->unique_files,
                    'unique_batches' => $partsStats->unique_batches,
                    'unique_manufacturers' => $partsStats->unique_manufacturers,
                    'first_import' => $partsStats->first_import,
                    'last_import' => $partsStats->last_import,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting overall statistics: '.$e->getMessage());
            return response()->json([
                'error' => 'Failed to get statistics',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }
}
