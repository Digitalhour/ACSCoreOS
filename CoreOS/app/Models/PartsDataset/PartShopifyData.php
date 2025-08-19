<?php
// app/Models/PartsDataset/PartShopifyData.php

namespace App\Models\PartsDataset;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartShopifyData extends Model
{
    use HasFactory;

    protected $connection = 'parts_database';
    protected $table = 'parts_shopify_data';

    protected $fillable = [
        'part_id',
        'shopify_id',
        'handle',
        'title',
        'vendor',
        'product_type',
        'status',
        'featured_image_url',
        'storefront_url',
        'admin_url',
        'all_images',
        'variant_data',
        'last_synced_at',
    ];

    protected $casts = [
        'all_images' => 'array',
        'variant_data' => 'array',
        'last_synced_at' => 'datetime',
    ];

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class, 'part_id');
    }

    /**
     * Check if Shopify data is stale (older than 24 hours)
     */
    public function getIsStaleAttribute(): bool
    {
        if (!$this->last_synced_at) {
            return true;
        }
        return $this->last_synced_at->diffInHours(now()) > 24;
    }
}
