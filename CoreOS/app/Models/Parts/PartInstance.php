<?php

namespace App\Models\Parts;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PartInstance extends Model
{
    use HasFactory;

    protected $connection = 'parts_database';
    protected $table = 'parts_instances';

    protected $fillable = [
        'pdf_id',
        'manual_number',
        'part_number',
        'img_page_number',
        'ccn_number',
        'description',
        'quantity',
        'manufacturer_serial',
        'revision',
        'manual_date',
        'manual_date_parsed',
        'img_page_path',
        'part_location',
        'part_type',
        'additional_notes',
        'file_name',
        'import_batch_id',
        'is_active',
        'manufacturer_id',
        'part_category_id',
        'import_timestamp',
        'pdf_url',
        's3_img_url',
        'shopify_id',
        'shopify_image_url', // Store Shopify product image URL
        'shopify_matched_at', // Track when the match was made
        'shopify_match_attempts', // Track how many times we've tried to match
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'import_timestamp' => 'datetime',
        'shopify_matched_at' => 'datetime',
        'manual_date_parsed' => 'date',
        'manual_date' => 'string', // Keep as string since it's not always a proper date format
        'quantity' => 'integer',
        'shopify_match_attempts' => 'integer',
    ];

    protected $dates = [
        'created_at',
        'updated_at',
        'import_timestamp',
        'shopify_matched_at',
        'manual_date_parsed',
    ];

    // Relationships
    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class, 'manufacturer_id');
    }

    public function partCategory(): BelongsTo
    {
        return $this->belongsTo(PartCategory::class, 'part_category_id');
    }

    public function models(): BelongsToMany
    {
        return $this->belongsToMany(PartModel::class, 'part_instance_models', 'part_instance_id', 'model_id')
            ->withTimestamps();
    }

    public function additionalFields(): HasMany
    {
        return $this->hasMany(PartInstanceAdditionalField::class, 'part_instance_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeWithImages($query)
    {
        return $query->whereNotNull('s3_img_url');
    }

    public function scopeWithShopifyId($query)
    {
        return $query->whereNotNull('shopify_id');
    }

    public function scopeWithoutShopifyId($query)
    {
        return $query->whereNull('shopify_id');
    }

    public function scopeByBatch($query, string $batchId)
    {
        return $query->where('import_batch_id', $batchId);
    }

    public function scopeByFile($query, string $fileName)
    {
        return $query->where('file_name', $fileName);
    }

    public function scopeNeedsShopifyMatch($query)
    {
        return $query->whereNull('shopify_id')
            ->where(function ($q) {
                $q->whereNull('shopify_match_attempts')
                    ->orWhere('shopify_match_attempts', '<', 3); // Don't retry too many times
            })
            ->whereNotNull('manufacturer_id')
            ->whereNotNull('part_number');
    }

    public function scopeStaleShopifyMatches($query, int $daysOld = 30)
    {
        return $query->whereNotNull('shopify_id')
            ->where(function ($q) use ($daysOld) {
                $q->whereNull('shopify_matched_at')
                    ->orWhere('shopify_matched_at', '<', now()->subDays($daysOld));
            });
    }

    // Accessors
    public function getImageUrlAttribute(): ?string
    {
        return $this->s3_img_url;
    }

    public function getHasImageAttribute(): bool
    {
        return !empty($this->s3_img_url);
    }

    public function getHasShopifyIdAttribute(): bool
    {
        return !empty($this->shopify_id);
    }

    public function getCompleteDataAttribute(): bool
    {
        return $this->has_image && $this->has_shopify_id;
    }

    public function getIsShopifyMatchStaleAttribute(): bool
    {
        if (empty($this->shopify_id)) {
            return false;
        }

        return empty($this->shopify_matched_at) ||
            $this->shopify_matched_at->lt(now()->subDays(30));
    }

    // Helper methods
    public function getUniqueKey(): array
    {
        return [
            'pdf_id' => $this->pdf_id,
            'manual_number' => $this->manual_number,
            'part_number' => $this->part_number,
            'img_page_number' => $this->img_page_number,
            'ccn_number' => $this->ccn_number,
        ];
    }

    public function getModelNames(): array
    {
        return $this->models->pluck('name')->toArray();
    }

    public function getAdditionalFieldsArray(): array
    {
        return $this->additionalFields->pluck('field_value', 'field_name')->toArray();
    }

    /**
     * Update image URL and optionally Shopify ID with image
     */
    public function updateImageData(string $imageUrl, ?string $shopifyId = null, ?string $shopifyImageUrl = null): bool
    {
        $updateData = ['s3_img_url' => $imageUrl];

        if ($shopifyId) {
            $updateData['shopify_id'] = $shopifyId;
            $updateData['shopify_matched_at'] = now();
        }

        if ($shopifyImageUrl) {
            $updateData['shopify_image_url'] = $shopifyImageUrl;
        }

        return $this->update($updateData);
    }

    /**
     * Update Shopify match data including image URL
     */
    public function updateShopifyMatch(?string $shopifyId, ?string $shopifyImageUrl = null): bool
    {
        $updateData = [
            'shopify_id' => $shopifyId,
            'shopify_matched_at' => now(),
            'shopify_match_attempts' => ($this->shopify_match_attempts ?? 0) + 1,
        ];

        if ($shopifyImageUrl) {
            $updateData['shopify_image_url'] = $shopifyImageUrl;
        }

        return $this->update($updateData);
    }

    /**
     * Mark as attempted but no match found
     */
    public function markShopifyAttempt(): bool
    {
        return $this->update([
            'shopify_match_attempts' => ($this->shopify_match_attempts ?? 0) + 1,
        ]);
    }

    /**
     * Reset Shopify matching data
     */
    public function resetShopifyMatch(): bool
    {
        return $this->update([
            'shopify_id' => null,
            'shopify_image_url' => null,
            'shopify_matched_at' => null,
            'shopify_match_attempts' => 0,
        ]);
    }

    /**
     * Check if this instance matches the given image name
     */
    public function matchesImage(string $imageName): bool
    {
        $imageName = strtolower(trim($imageName));

        // Direct matches
        if (str_contains(strtolower($this->img_page_path ?? ''), $imageName)) {
            return true;
        }

        if (strtolower($this->part_number) === $imageName) {
            return true;
        }

        if (strtolower($this->ccn_number ?? '') === $imageName) {
            return true;
        }

        // Fuzzy matches - remove common separators
        $cleanImageName = preg_replace('/[-_\s]+/', '', $imageName);
        $cleanPartNumber = preg_replace('/[-_\s]+/', '', strtolower($this->part_number));
        $cleanCcnNumber = preg_replace('/[-_\s]+/', '', strtolower($this->ccn_number ?? ''));

        if ($cleanPartNumber === $cleanImageName || $cleanCcnNumber === $cleanImageName) {
            return true;
        }

        // Partial matches
        if (str_contains(strtolower($this->part_number), $imageName)) {
            return true;
        }

        return false;
    }

    /**
     * Get display name for this part instance
     */
    public function getDisplayName(): string
    {
        $parts = array_filter([
            $this->part_number,
            $this->manufacturer?->name,
            $this->description
        ]);

        return implode(' - ', array_slice($parts, 0, 2));
    }

    /**
     * Get searchable criteria for NSProduct matching
     */
    public function getShopifyMatchCriteria(): array
    {
        return [
            'manufacturer' => trim($this->manufacturer?->name ?? ''),
            'part_number' => trim($this->part_number ?? ''),
            'description' => trim($this->description ?? ''),
            'part_type' => trim($this->part_type ?? ''),
        ];
    }

    /**
     * Check if part has valid data for Shopify matching
     */
    public function canAttemptShopifyMatch(): bool
    {
        $criteria = $this->getShopifyMatchCriteria();

        return !empty($criteria['manufacturer']) &&
            !empty($criteria['part_number']) &&
            ($this->shopify_match_attempts ?? 0) < 3;
    }

    /**
     * Static method to find instances matching an image
     */
    public static function findByImageName(string $imageName)
    {
        return static::active()
            ->where(function ($query) use ($imageName) {
                $query->where('img_page_path', 'LIKE', "%{$imageName}%")
                    ->orWhere('part_number', $imageName)
                    ->orWhere('ccn_number', $imageName);
            })
            ->get();
    }

    /**
     * Static method to get parts without Shopify IDs that need matching
     */
    public static function needingShopifyMatch(int $limit = 100)
    {
        return static::needsShopifyMatch()
            ->with('manufacturer')
            ->limit($limit)
            ->get();
    }

    /**
     * Static method to get parts with stale Shopify matches
     */
    public static function withStaleShopifyMatches(int $limit = 100, int $daysOld = 30)
    {
        return static::staleShopifyMatches($daysOld)
            ->with('manufacturer')
            ->limit($limit)
            ->get();
    }

    /**
     * Get batches that need Shopify matching
     */
    public static function getBatchesNeedingMatching(): array
    {
        return static::needsShopifyMatch()
            ->whereNotNull('import_batch_id')
            ->distinct()
            ->pluck('import_batch_id')
            ->toArray();
    }

    /**
     * Legacy method - kept for backwards compatibility
     * Static method to get parts without Shopify IDs
     */
    public static function withoutShopifyIds(int $limit = 100)
    {
        return static::active()
            ->whereNull('shopify_id')
            ->with('manufacturer')
            ->limit($limit)
            ->get();
    }
}
