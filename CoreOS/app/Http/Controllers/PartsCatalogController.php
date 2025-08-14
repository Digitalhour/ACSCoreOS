<?php

namespace App\Http\Controllers;

use App\Models\Parts\PartInstance;
use App\Services\ShopifyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PartsCatalogController extends Controller
{
    protected string $s3PartsDisk = 's3';
    private ShopifyService $shopifyService;

    public function __construct(ShopifyService $shopifyService)
    {
        $this->shopifyService = $shopifyService;
    }

    /**
     * Main index method - heavily optimized
     */
    public function index(Request $request)
    {
        // Build the base query with filters and search applied
        $query = $this->buildOptimizedQuery($request);

        // Execute paginated query
        $paginator = $query->paginate(12)->withQueryString();

        // Transform the current page's items using stored data ONLY
        $transformedItems = $this->transformPartInstancesFromStoredData($paginator->items());

        // BATCH enhance with Shopify images - this is the key optimization
        $enhancedItems = $this->batchEnhanceWithShopifyImages($transformedItems);

        // Prepare data for Inertia response
        $initialPartsData = [
            'data' => $enhancedItems,
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from' => $paginator->firstItem(),
                'last_page' => $paginator->lastPage(),
                'path' => $paginator->path(),
                'per_page' => $paginator->perPage(),
                'to' => $paginator->lastItem(),
                'total' => $paginator->total(),
                'links' => $paginator->linkCollection()->toArray(),
            ],
        ];

        // ALWAYS include filter options to prevent separate requests
        $filterOptions = $this->getOptimizedFilterOptions();

        return Inertia::render('parts_pages/Parts-Database', [
            'initialParts' => $initialPartsData,
            'filters' => $request->only(['search', 'manufacturer', 'category', 'model', 'serial_number', 'part_type']),
            'initialFilterOptions' => $filterOptions, // Always include
        ]);
    }

    /**
     * Build optimized query using stored data and indexes
     */
    private function buildOptimizedQuery(Request $request)
    {
        $query = PartInstance::query();

        // Apply active filter first - ensure this uses your existing index
        $query->where('is_active', true);

        // Apply specific column filters and relationship-based filters
        $this->applyFilters($query, $request);

        // Apply search term across multiple fields
        $this->applySearch($query, $request);

        // Eager load relationships efficiently, selecting only necessary columns
        $query->with([
            'manufacturer:id,name',
            'partCategory:id,name',
            'models:id,name',
            'additionalFields:id,part_instance_id,field_name,field_value'
        ]);

        // Select all columns including shopify_id and s3_img_url
        $query->select([
            'parts_instances.*'
        ]);

        // Default ordering by existing index
        $query->orderBy('import_timestamp', 'desc');

        return $query;
    }

    /**
     * Apply request filters to the query
     */
    private function applyFilters($query, Request $request): void
    {
        // Manufacturer filter - using names, converted to IDs via subquery for efficiency
        if ($request->filled('manufacturer')) {
            $manufacturers = explode(',', $request->input('manufacturer'));
            $query->whereIn('manufacturer_id', function ($subQuery) use ($manufacturers) {
                $subQuery->select('id')
                    ->from('manufacturers')
                    ->whereIn('name', $manufacturers);
            });
        }

        // Category filter - using names, converted to IDs via subquery
        if ($request->filled('category')) {
            $categories = explode(',', $request->input('category'));
            $query->whereIn('part_category_id', function ($subQuery) use ($categories) {
                $subQuery->select('id')
                    ->from('part_categories')
                    ->whereIn('name', $categories);
            });
        }

        // Model filter - use EXISTS for better performance
        if ($request->filled('model')) {
            $models = explode(',', $request->input('model'));
            $query->whereExists(function ($subQuery) use ($models) {
                $subQuery->select(DB::raw(1))
                    ->from('part_instance_models as pim')
                    ->join('models as m', 'pim.model_id', '=', 'm.id')
                    ->whereColumn('pim.part_instance_id', 'parts_instances.id')
                    ->whereIn('m.name', $models);
            });
        }

        // Direct column filters are efficient with indexes
        if ($request->filled('part_type')) {
            $partTypes = explode(',', $request->input('part_type'));
            $query->whereIn('part_type', $partTypes);
        }

        if ($request->filled('serial_number')) {
            $serials = explode(',', $request->input('serial_number'));
            $query->whereIn('manufacturer_serial', $serials);
        }
    }

    /**
     * Apply search term to the query
     */
    private function applySearch($query, Request $request): void
    {
        if (!$request->filled('search')) {
            return;
        }

        $searchTerm = trim($request->input('search'));

        // Use full-text search if available and term is long enough
        if ($this->supportsFullTextSearch() && strlen($searchTerm) >= 3) {
            $query->where(function ($q) use ($searchTerm) {
                $q->whereRaw('MATCH(description, part_number, ccn_number) AGAINST(? IN NATURAL LANGUAGE MODE)',
                    [$searchTerm])
                    ->orWhereExists(function ($modelQuery) use ($searchTerm) {
                        $modelQuery->select(DB::raw(1))
                            ->from('part_instance_models as pim')
                            ->join('models as m', 'pim.model_id', '=', 'm.id')
                            ->whereColumn('pim.part_instance_id', 'parts_instances.id')
                            ->whereRaw('MATCH(m.name) AGAINST(? IN NATURAL LANGUAGE MODE)', [$searchTerm]);
                    });
            });
        } else {
            $query->where(function ($q) use ($searchTerm) {
                $q->where('part_number', 'like', "%{$searchTerm}%")
                    ->orWhere('ccn_number', 'like', "%{$searchTerm}%")
                    ->orWhere('manufacturer_serial', 'like', "%{$searchTerm}%")
                    ->orWhere('description', 'like', "%{$searchTerm}%")
                    ->orWhereExists(function ($modelQuery) use ($searchTerm) {
                        $modelQuery->select(DB::raw(1))
                            ->from('part_instance_models as pim')
                            ->join('models as m', 'pim.model_id', '=', 'm.id')
                            ->whereColumn('pim.part_instance_id', 'parts_instances.id')
                            ->where('m.name', 'like', "%{$searchTerm}%");
                    });
            });
        }
    }

    /**
     * Transform part instances using stored data - no external lookups needed for basic data
     */
    private function transformPartInstancesFromStoredData(iterable $partInstances): array
    {
        if (empty($partInstances)) {
            return [];
        }

        return collect($partInstances)->map(function (PartInstance $partInstance) {
            $customFields = $partInstance->additionalFields->pluck('field_value', 'field_name')->all();
            $modelNames = $partInstance->models->pluck('name')->all();

            $transformedPart = [
                'id' => $partInstance->id,
                'file_name' => $partInstance->file_name,
                'import_timestamp' => $partInstance->import_timestamp?->toDateTimeString(),
                'part_number' => $partInstance->part_number,
                'description' => $partInstance->description,
                'ccn_number' => $partInstance->ccn_number,
                'manufacture' => $partInstance->manufacturer?->name,
                'models' => $modelNames,
                'manufacture_serial' => $partInstance->manufacturer_serial,
                'part_type' => $partInstance->part_type,
                'part_category' => $partInstance->partCategory?->name,
                'pdf_id' => $partInstance->pdf_id,
                'pdf_url' => $partInstance->pdf_url,
                'manual_number' => $partInstance->manual_number,
                'manual_date' => $partInstance->manual_date,
                'revision' => $partInstance->revision,
                'quantity' => $partInstance->quantity,
                'part_location' => $partInstance->part_location,
                'additional_notes' => $partInstance->additional_notes,
                'img_page_number' => $partInstance->img_page_number,
                'img_page_path' => $partInstance->img_page_path,
                'custom_fields' => $customFields,
                'image_url' => $partInstance->s3_img_url,
                'batch_id' => $partInstance->import_batch_id,
                'is_active' => $partInstance->is_active,
                'shopify_id' => $partInstance->shopify_id,
                'storefront_url' => $this->generateStorefrontUrl($partInstance),
                'has_shopify_match' => !empty($partInstance->shopify_id),
                'onlineStoreUrl' => $partInstance->onlineStoreUrl,
                // Initialize as null - will be populated by batch Shopify service if needed
                'shopify_image' => null,
                'nsproduct_match' => null,
                'shopify_data' => null,
            ];

            // If the part has a Shopify ID, create basic structures from stored data
            if (!empty($partInstance->shopify_id)) {
                $transformedPart['nsproduct_match'] = (object) [
                    'id' => null,
                    'oem' => $partInstance->manufacturer?->name ?? null,
                    'number' => $partInstance->part_number,
                    'shop_id' => $partInstance->shopify_id,
                    'name' => $this->generateProductName($partInstance),
                    'storefront_url' => $this->generateStorefrontUrl($partInstance),
                    'handle' => $this->generateProductHandle($partInstance),
                    'title' => $this->generateProductName($partInstance),
                    'onlineStoreUrl'=> $partInstance->onlineStoreUrl,
                ];

                $transformedPart['shopify_data'] = [
                    'shopify_id' => $partInstance->shopify_id,
                    'handle' => $this->generateProductHandle($partInstance),
                    'title' => $this->generateProductName($partInstance),
                    'vendor' => $partInstance->manufacturer?->name ?? null,
                    'product_type' => $partInstance->part_type ?? null,
                    'status' => 'active',
                    'storefront_url' => $this->generateStorefrontUrl($partInstance),
                    'admin_url' => $this->generateAdminUrl($partInstance->shopify_id),
                    'all_images' => [],
                    'variant_info' => [],
                ];
            }

            return $transformedPart;
        })->all();
    }

    /**
     * OPTIMIZED: Batch enhance parts with Shopify images using single batch request
     */
    private function batchEnhanceWithShopifyImages(array $parts): array
    {
        if (empty($parts)) {
            return $parts;
        }

        $partsForBatchQuery = [];
        $partIndexMap = [];

        foreach ($parts as $index => $part) {
            if (!empty($part['shopify_id']) && !empty($part['manufacture']) && !empty($part['part_number'])) {
                // Check cache first (1 hour cache)
                $cacheKey = "shopify_product_data_{$part['shopify_id']}";
                $cachedData = Cache::get($cacheKey);

                if ($cachedData) {
                    // Use cached data
                    $parts[$index]['shopify_image'] = $cachedData['image_url'] ?? null;
                    $parts[$index]['online_store_url'] = $cachedData['online_store_url'] ?? null;

                    if (!empty($parts[$index]['shopify_data'])) {
                        $parts[$index]['shopify_data'] = array_merge($parts[$index]['shopify_data'], $cachedData);
                    }
                } else {
                    // Need to fetch from API
                    $partsForBatchQuery[] = [
                        'original_part_id' => $part['id'],
                        'vendor' => $part['manufacture'],
                        'sku' => $part['part_number'],
                    ];
                    $partIndexMap[$part['id']] = $index;
                }
            }
        }

        // Only make API calls for non-cached items
        if (!empty($partsForBatchQuery)) {
            try {
                $shopifyImageData = $this->shopifyService->getBatchProductImages($partsForBatchQuery);

                foreach ($shopifyImageData as $originalPartId => $shopifyData) {
                    if (isset($partIndexMap[$originalPartId])) {
                        $index = $partIndexMap[$originalPartId];
                        $parts[$index]['shopify_image'] = $shopifyData['image_url'] ?? null;
                        $parts[$index]['online_store_url'] = $shopifyData['online_store_url'] ?? null;

                        // Cache for 1 hour (3600 seconds)
                        $cacheKey = "shopify_product_data_{$parts[$index]['shopify_id']}";
                        Cache::put($cacheKey, $shopifyData, 3600);

                        if (!empty($parts[$index]['shopify_data'])) {
                            $parts[$index]['shopify_data'] = array_merge($parts[$index]['shopify_data'], $shopifyData);
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Failed to get batch Shopify product data', [
                    'error' => $e->getMessage(),
                    'parts_count' => count($partsForBatchQuery)
                ]);
            }
        }

        return $parts;
    }

    /**
     * Get filter options directly from the database using optimized queries
     */
    private function getOptimizedFilterOptions(): array
    {
        try {
            return [
                'manufacturers' => $this->getSimpleManufacturers(),
                'categories' => $this->getSimpleCategories(),
                'models' => $this->getSimpleModels(),
                'partTypes' => $this->getSimplePartTypes(),
                'serials' => $this->getSimpleSerials(),
            ];
        } catch (\Exception $e) {
            Log::error('Error in getOptimizedFilterOptions: '.$e->getMessage(), ['exception' => $e]);
            return [
                'manufacturers' => [], 'categories' => [], 'models' => [],
                'partTypes' => [], 'serials' => [],
            ];
        }
    }

    // Optimized filter option methods (unchanged)
    private function getSimpleManufacturers(): array
    {
        return DB::connection('parts_database')
            ->table('manufacturers as m')
            ->join('parts_instances as pi', 'm.id', '=', 'pi.manufacturer_id')
            ->where('pi.is_active', true)
            ->distinct()
            ->orderBy('m.name')
            ->pluck('m.name')
            ->toArray();
    }

    private function getSimpleCategories(): array
    {
        return DB::connection('parts_database')
            ->table('part_categories as pc')
            ->join('parts_instances as pi', 'pc.id', '=', 'pi.part_category_id')
            ->where('pi.is_active', true)
            ->distinct()
            ->orderBy('pc.name')
            ->pluck('pc.name')
            ->toArray();
    }

    private function getSimpleModels(): array
    {
        return DB::connection('parts_database')
            ->table('models as m')
            ->join('part_instance_models as pim', 'm.id', '=', 'pim.model_id')
            ->join('parts_instances as pi', 'pim.part_instance_id', '=', 'pi.id')
            ->where('pi.is_active', true)
            ->distinct()
            ->orderBy('m.name')
            ->pluck('m.name')
            ->toArray();
    }

    private function getSimplePartTypes(): array
    {
        return DB::connection('parts_database')
            ->table('parts_instances')
            ->where('is_active', true)
            ->whereNotNull('part_type')
            ->where('part_type', '!=', '')
            ->distinct()
            ->orderBy('part_type')
            ->pluck('part_type')
            ->toArray();
    }

    private function getSimpleSerials(): array
    {
        return DB::connection('parts_database')
            ->table('parts_instances')
            ->where('is_active', true)
            ->whereNotNull('manufacturer_serial')
            ->where('manufacturer_serial', '!=', '')
            ->distinct()
            ->orderBy('manufacturer_serial')
            ->limit(250)
            ->pluck('manufacturer_serial')
            ->toArray();
    }

    /**
     * API endpoints
     */
    public function getCount()
    {
        return response()->json(['count' => $this->getActivePartsCount()]);
    }

    public function getFilterOptions()
    {
        return response()->json($this->getOptimizedFilterOptions());
    }

    public function getActivePartsCount(): int
    {
        return PartInstance::where('is_active', true)->count();
    }

    /**
     * Helper methods for generating Shopify URLs and product data
     */
    private function generateProductName(PartInstance $partInstance): string
    {
        $parts = array_filter([
            $partInstance->manufacturer?->name,
            $partInstance->part_type,
            $partInstance->part_number,
        ]);

        return implode(' ', $parts) ?: $partInstance->description ?: 'Part '.$partInstance->part_number;
    }

    private function generateProductHandle(PartInstance $partInstance): string
    {
        $name = $this->generateProductName($partInstance);
        return Str::slug($name);
    }

    private function generateStorefrontUrl(PartInstance $partInstance): string
    {
        $handle = $this->generateProductHandle($partInstance);
        $storefrontDomain = config('services.shopify.storefront_domain', 'aircompressorservices.com');
        return "https://{$storefrontDomain}/products/{$handle}";
    }

    private function generateAdminUrl(string $shopifyId): string
    {
        $shopDomain = config('services.shopify.shop_domain');
        $shopName = str_replace('.myshopify.com', '', $shopDomain);
        return "https://admin.shopify.com/store/{$shopName}/products/{$shopifyId}";
    }

    private function supportsFullTextSearch(): bool
    {
        return DB::connection('parts_database')->getDriverName() === 'mysql';
    }



    public function debugShopifyData(Request $request)
    {
        // Get a few parts with Shopify IDs
        $parts = PartInstance::where('is_active', true)
            ->whereNotNull('shopify_id')
            ->with(['manufacturer'])
            ->limit(3)
            ->get();

        $debug = [];

        foreach ($parts as $part) {
            $debug[] = [
                'part_id' => $part->id,
                'part_number' => $part->part_number,
                'manufacturer' => $part->manufacturer?->name,
                'shopify_id_in_db' => $part->shopify_id,
                'stored_online_store_url' => $part->onlineStoreUrl ?? $part->online_store_url ?? 'NOT STORED',
            ];
        }

        // Test Shopify API call
        $shopifyData = [];
        if ($parts->count() > 0) {
            $firstPart = $parts->first();
            if ($firstPart->manufacturer && $firstPart->part_number) {
                try {
                    $apiResult = $this->shopifyService->getProductImage(
                        $firstPart->manufacturer->name,
                        $firstPart->part_number
                    );
                    $shopifyData = $apiResult;
                } catch (\Exception $e) {
                    $shopifyData = ['error' => $e->getMessage()];
                }
            }
        }

        return response()->json([
            'message' => 'Shopify Data Debug',
            'parts_in_db' => $debug,
            'live_shopify_api_result' => $shopifyData,
            'explanation' => [
                'stored_vs_live' => 'If stored_online_store_url shows NOT STORED, you are fetching live data',
                'live_data_benefits' => 'Always current, never stale, reflects real Shopify state',
                'performance_note' => 'Slower but more accurate - add caching for best of both worlds'
            ]
        ]);
    }



}
