<?php

// app/Models/PartsDataset/Part.php

namespace App\Models\PartsDataset;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Part extends Model
{
    use HasFactory;

    protected $connection = 'parts_database';
    protected $table = 'parts';

    protected $fillable = [
        'upload_id',
        'part_number',
        'description',
        'manufacturer',
        'batch_id',
        'is_active',
        'image_url',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function upload(): BelongsTo
    {
        return $this->belongsTo(PartsUpload::class, 'upload_id');
    }

    public function additionalFields(): HasMany
    {
        return $this->hasMany(PartAdditionalField::class, 'part_id');
    }

    public function shopifyData(): HasOne
    {
        return $this->hasOne(PartShopifyData::class, 'part_id');
    }

    /**
     * Get additional fields as a key-value array
     */
    public function getAdditionalFieldsArrayAttribute(): array
    {
        return $this->additionalFields->pluck('field_value', 'field_name')->toArray();
    }

    /**
     * Check if part has Shopify data
     */
    public function getHasShopifyDataAttribute(): bool
    {
        return $this->shopifyData !== null && !empty($this->shopifyData->shopify_id);
    }
}
