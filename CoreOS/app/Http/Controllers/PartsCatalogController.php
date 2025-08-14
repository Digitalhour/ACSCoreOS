<?php

namespace App\Http\Controllers;

use App\Models\Parts\PartInstance;
use App\Services\ShopifyService;
use Illuminate\Http\Request;
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
     * Main index method - optimized to use stored data with optional Shopify enhancement
     */
    public function index(Request $request)
    {
        // Build the base query with filters and search applied
        $query = $this->buildOptimizedQuery($request);

        // Execute paginated query
        $paginator = $query->paginate(12)->withQueryString();

        // Transform the current page's items using stored data
        $transformedItems = $this->transformPartInstancesFromStoredData($paginator->items());

        // Enhance with Shopify images if needed (but use stored data as foundation)
        $enhancedItems = $this->enhanceWithShopifyImages($transformedItems);

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

        $shouldLoadFilters = $this->shouldLoadFilterOptions($request);

        return Inertia::render('parts_pages/Parts-Database', [
            'initialParts' => $initialPartsData,
            'filters' => $request->only(['search', 'manufacturer', 'category', 'model', 'serial_number', 'part_type']),
            'initialFilterOptions' => $shouldLoadFilters ? $this->getOptimizedFilterOptions() : null,
        ]);
    }

//https://aircompressorservices.com/products/ingersoll-rand-actuator-repair-kit-replacement-23127053
//https://aircompressorservices.com/products/ingersoll-rand-actuator-kit-23127053


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
     * Apply search term to the query - ENHANCED TO INCLUDE MODEL SEARCH
     */
    private function applySearch($query, Request $request): void
    {
        if (!$request->filled('search')) {
            return;
        }

        $searchTerm = trim($request->input('search'));

        // Use full-text search if available and term is long enough
        if ($this->supportsFullTextSearch() && strlen($searchTerm) >= 3) {
            // Enhanced full-text search to include model search
            $query->where(function ($q) use ($searchTerm) {
                // Search in part fields using full-text
                $q->whereRaw('MATCH(description, part_number, ccn_number) AGAINST(? IN NATURAL LANGUAGE MODE)',
                    [$searchTerm])
                    // OR search in associated models
                    ->orWhereExists(function ($modelQuery) use ($searchTerm) {
                        $modelQuery->select(DB::raw(1))
                            ->from('part_instance_models as pim')
                            ->join('models as m', 'pim.model_id', '=', 'm.id')
                            ->whereColumn('pim.part_instance_id', 'parts_instances.id')
                            ->whereRaw('MATCH(m.name) AGAINST(? IN NATURAL LANGUAGE MODE)', [$searchTerm]);
                    });
            });
        } else {
            // Enhanced LIKE search prioritizing most selective fields and including models
            $query->where(function ($q) use ($searchTerm) {
                $q->where('part_number', 'like', "%{$searchTerm}%")
                    ->orWhere('ccn_number', 'like', "%{$searchTerm}%")
                    ->orWhere('manufacturer_serial', 'like', "%{$searchTerm}%")
                    ->orWhere('description', 'like', "%{$searchTerm}%")
                    // Add model search using EXISTS subquery
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
                // Use stored S3 image URL from the database
                'image_url' => $partInstance->s3_img_url,
                'batch_id' => $partInstance->import_batch_id,
                'is_active' => $partInstance->is_active,
                // Use stored Shopify ID from the database
                'shopify_id' => $partInstance->shopify_id,
                'storefront_url' => $this->generateStorefrontUrl($partInstance),
                'has_shopify_match' => !empty($partInstance->shopify_id),
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

                // Initialize shopify_image as null - will be populated by Shopify service if needed
                $transformedPart['shopify_image'] = null;
            } else {
                $transformedPart['nsproduct_match'] = null;
                $transformedPart['shopify_data'] = null;
                $transformedPart['shopify_image'] = null;
            }

            return $transformedPart;
        })->all();
    }

    /**
     * Enhance parts with Shopify images for parts that have shopify_id
     */
    private function enhanceWithShopifyImages(array $parts): array
    {
        if (empty($parts)) {
            return $parts;
        }

        // Collect parts that have Shopify IDs but might need image enhancement
        $partsNeedingShopifyImages = [];
        foreach ($parts as $part) {
            if (!empty($part['shopify_id'])) {
                $partsNeedingShopifyImages[] = [
                    'original_part_id' => $part['id'],
                    'shopify_id' => $part['shopify_id'],
                ];
            }
        }

        $shopifyImageData = [];
        if (!empty($partsNeedingShopifyImages)) {
            // Get Shopify product data for parts with Shopify IDs
            foreach ($partsNeedingShopifyImages as $item) {
                try {
                    $productData = $this->shopifyService->getProductById($item['shopify_id']);
                    if ($productData && !empty($productData['image_url'])) {
                        $shopifyImageData[$item['original_part_id']] = $productData;
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to get Shopify product data for ID: '.$item['shopify_id'], [
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }

        // Merge Shopify image data with parts
        foreach ($parts as &$part) {
            if (isset($shopifyImageData[$part['id']])) {
                $shopifyData = $shopifyImageData[$part['id']];
                $part['shopify_image'] = $shopifyData['image_url'] ?? null;

                // Update shopify_data with real data if available
                if (!empty($part['shopify_data'])) {
                    $part['shopify_data'] = array_merge($part['shopify_data'], $shopifyData);
                }
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

    // Optimized filter option methods
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

    private function shouldLoadFilterOptions(Request $request): bool
    {
        return $request->boolean('load_filters') || (
                !$request->filled('search') &&
                !$request->filled('manufacturer') &&
                !$request->filled('category') &&
                !$request->filled('model') &&
                !$request->filled('serial_number') &&
                !$request->filled('part_type')
            );
    }
}
