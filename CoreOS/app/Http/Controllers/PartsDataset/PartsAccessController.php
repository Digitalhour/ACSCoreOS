<?php

// app/Http/Controllers/PartsDataset/PartsAccessController.php

namespace App\Http\Controllers\PartsDataset;

use App\Http\Controllers\Controller;
use App\Models\PartsDataset\Part;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class PartsAccessController extends Controller
{
    /**
     * Display the parts browse page
     */


    public function index(Request $request): Response
    {
        $validator = Validator::make($request->all(), [
            'per_page' => 'nullable|integer|min:5|max:100',
            'page' => 'nullable|integer|min:1',
            'search' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return Inertia::render('PartsDataset/PartsBrowse', [
                'initialParts' => $this->getDefaultPaginatedData(),
                'filters' => $request->only(['search']),
            ]);
        }

        $query = Part::with(['upload', 'shopifyData', 'additionalFields'])
            ->where('is_active', true)
            ->orderBy('created_at', 'desc');

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('part_number', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('manufacturer', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 25);
        $parts = $query->paginate($perPage)->withPath(url('/parts-browse/'));

        // Transform parts data to match expected format
        $transformedParts = $parts->getCollection()->map(function ($part) {
            return [
                'id' => $part->id,
                'part_number' => $part->part_number,
                'description' => $part->description,
                'manufacture' => $part->manufacturer,
                'part_type' => $this->extractPartType($part),
                'part_category' => $this->extractPartCategory($part),
                'models' => $this->extractModels($part),
                'quantity' => $this->extractQuantity($part),
                'part_location' => $this->extractLocation($part),
                'image_url' => $part->image_url,
                'shopify_image' => $part->shopifyData?->featured_image_url,
                'has_shopify_match' => $part->shopifyData && !empty($part->shopifyData->shopify_id),
                'online_store_url' => $part->shopifyData?->storefront_url,
                'shopify_data' => [
                    'admin_url' => $part->shopifyData?->admin_url,
                ],
                'is_active' => $part->is_active,
                'created_at' => $part->created_at,
            ];
        });

        // Transform pagination to match expected format
        $paginationData = [
            'data' => $transformedParts->toArray(),
            'links' => [
                'first' => $parts->url(1),
                'last' => $parts->url($parts->lastPage()),
                'prev' => $parts->previousPageUrl(),
                'next' => $parts->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $parts->currentPage(),
                'from' => $parts->firstItem(),
                'last_page' => $parts->lastPage(),
                'path' => $parts->path(),
                'per_page' => $parts->perPage(),
                'to' => $parts->lastItem(),
                'total' => $parts->total(),
                'links' => $parts->linkCollection()->toArray(),
            ],
        ];

        return Inertia::render('PartsDataset/PartsBrowse', [
            'initialParts' => $paginationData,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Get parts data via API (for frontend requests)
     */
    public function parts(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'per_page' => 'nullable|integer|min:5|max:100',
            'page' => 'nullable|integer|min:1',
            'search' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $query = Part::with(['upload', 'shopifyData', 'additionalFields'])
            ->where('is_active', true)
            ->orderBy('created_at', 'desc');

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('part_number', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('manufacturer', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 25);
        $parts = $query->paginate($perPage)->withPath(url('/parts-browse'));

        // Transform parts data
        $transformedParts = $parts->getCollection()->map(function ($part) {
            return [
                'id' => $part->id,
                'part_number' => $part->part_number,
                'description' => $part->description,
                'manufacture' => $part->manufacturer,
                'part_type' => $this->extractPartType($part),
                'part_category' => $this->extractPartCategory($part),
                'models' => $this->extractModels($part),
                'quantity' => $this->extractQuantity($part),
                'part_location' => $this->extractLocation($part),
                'image_url' => $part->image_url,
                'shopify_image' => $part->shopifyData?->featured_image_url,
                'has_shopify_match' => $part->shopifyData && !empty($part->shopifyData->shopify_id),
                'online_store_url' => $part->shopifyData?->storefront_url,
                'shopify_data' => [
                    'admin_url' => $part->shopifyData?->admin_url,
                ],
                'is_active' => $part->is_active,
                'created_at' => $part->created_at,
            ];
        });

        $parts->setCollection($transformedParts);

        // Transform pagination to match expected format
        $paginationData = [
            'data' => $parts->items(),
            'links' => [
                'first' => $parts->url(1),
                'last' => $parts->url($parts->lastPage()),
                'prev' => $parts->previousPageUrl(),
                'next' => $parts->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $parts->currentPage(),
                'from' => $parts->firstItem(),
                'last_page' => $parts->lastPage(),
                'path' => $parts->path(),
                'per_page' => $parts->perPage(),
                'to' => $parts->lastItem(),
                'total' => $parts->total(),
                'links' => $parts->linkCollection()->toArray(),
            ],
        ];

        return response()->json($paginationData);
    }

    /**
     * Get detailed information about a specific part
     */
    public function show(int $partId): JsonResponse
    {
        try {
            $part = Part::with(['upload', 'shopifyData', 'additionalFields'])
                ->where('is_active', true)
                ->findOrFail($partId);

            $transformedPart = [
                'id' => $part->id,
                'part_number' => $part->part_number,
                'description' => $part->description,
                'manufacture' => $part->manufacturer,
                'part_type' => $this->extractPartType($part),
                'part_category' => $this->extractPartCategory($part),
                'models' => $this->extractModels($part),
                'quantity' => $this->extractQuantity($part),
                'part_location' => $this->extractLocation($part),
                'image_url' => $part->image_url,
                'shopify_image' => $part->shopifyData?->featured_image_url,
                'has_shopify_match' => $part->shopifyData && !empty($part->shopifyData->shopify_id),
                'online_store_url' => $part->shopifyData?->storefront_url,
                'shopify_data' => [
                    'admin_url' => $part->shopifyData?->admin_url,
                    'title' => $part->shopifyData?->title,
                    'vendor' => $part->shopifyData?->vendor,
                    'status' => $part->shopifyData?->status,
                ],
                'additional_fields' => $part->additionalFields->pluck('field_value', 'field_name')->toArray(),
                'upload_info' => [
                    'filename' => $part->upload?->original_filename,
                    'uploaded_at' => $part->upload?->uploaded_at,
                ],
                'is_active' => $part->is_active,
                'created_at' => $part->created_at,
            ];

            return response()->json([
                'success' => true,
                'part' => $transformedPart,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Part not found',
            ], 404);
        }
    }

    /**
     * Normalize additional field key (case-insensitive, remove spaces/underscores and non-alphanumerics)
     */
    private function normalizeKey(string $key): string
    {
        $normalized = strtolower(trim($key));
        $normalized = preg_replace('/[^a-z0-9]+/', '', $normalized);
        return $normalized ?? '';
    }

    /**
     * Build normalized map of additional fields for quick lookup
     */
    private function buildNormalizedFieldsMap($fields): array
    {
        $map = [];
        foreach ($fields as $f) {
            $map[$this->normalizeKey($f->field_name)] = $f->field_value;
        }
        return $map;
    }

    /**
     * Find first value by aliases from a normalized map
     */
    private function findFirstByAliases(array $map, array $aliases): ?string
    {
        foreach ($aliases as $alias) {
            $key = $this->normalizeKey($alias);
            if (array_key_exists($key, $map)) {
                return $map[$key];
            }
        }
        return null;
    }

    /**
     * Extract part type from additional fields or other sources
     */
    private function extractPartType(Part $part): ?string
    {
        // Use already loaded collection to avoid extra queries
        $fields = $part->relationLoaded('additionalFields') ? $part->additionalFields : $part->additionalFields()->get();

        // Build normalized map and search by common aliases
        $map = $this->buildNormalizedFieldsMap($fields);
        $value = $this->findFirstByAliases($map, [
            'part_type', 'type', 'category', 'part category', 'item type', 'product type'
        ]);
        return $value;
    }

    /**
     * Extract part category from additional fields
     */
    private function extractPartCategory(Part $part): ?string
    {
        $fields = $part->relationLoaded('additionalFields') ? $part->additionalFields : $part->additionalFields()->get();
        $map = $this->buildNormalizedFieldsMap($fields);
        $value = $this->findFirstByAliases($map, [
            'part_category', 'category', 'group', 'part group', 'category name'
        ]);
        return $value;
    }

    /**
     * Extract models from additional fields
     */
    private function extractModels(Part $part): array
    {
        $fields = $part->relationLoaded('additionalFields') ? $part->additionalFields : $part->additionalFields()->get();
        $map = $this->buildNormalizedFieldsMap($fields);
        $value = $this->findFirstByAliases($map, [
            'models', 'supported_models', 'model', 'models supported', 'compatible models', 'compatibility'
        ]);
        if ($value === null || $value === '') {
            return [];
        }
        // Try to parse JSON array
        $models = json_decode($value, true);
        if (is_array($models)) {
            return $models;
        }
        // Split by common delimiters (comma or semicolon)
        if (is_string($value)) {
            if (str_contains($value, ',') || str_contains($value, ';')) {
                return array_values(array_filter(array_map('trim', preg_split('/[;,]/', $value)))) ;
            }
            return [trim($value)];
        }
        return [];
    }

    /**
     * Extract quantity from additional fields
     */
    private function extractQuantity(Part $part): ?string
    {
        $fields = $part->relationLoaded('additionalFields') ? $part->additionalFields : $part->additionalFields()->get();
        $map = $this->buildNormalizedFieldsMap($fields);
        return $this->findFirstByAliases($map, [
            'quantity', 'qty', 'on_hand', 'onhand', 'stockqty', 'stock'
        ]);
    }

    /**
     * Extract location from additional fields
     */
    private function extractLocation(Part $part): ?string
    {
        $fields = $part->relationLoaded('additionalFields') ? $part->additionalFields : $part->additionalFields()->get();
        $map = $this->buildNormalizedFieldsMap($fields);
        return $this->findFirstByAliases($map, [
            'part_location', 'location', 'warehouse_location', 'bin', 'shelf', 'aisle', 'warehouse bin'
        ]);
    }

    /**
     * Get default paginated data structure
     */
    private function getDefaultPaginatedData(): array
    {
        return [
            'data' => [],
            'links' => ['first' => null, 'last' => null, 'prev' => null, 'next' => null],
            'meta' => [
                'current_page' => 1,
                'from' => null,
                'last_page' => 1,
                'path' => '',
                'per_page' => 25,
                'to' => null,
                'total' => 0,
                'links' => []
            ],
        ];
    }
}
