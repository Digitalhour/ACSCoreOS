<?php

namespace App\Models\Parts;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

// No Cache facade needed if not using caching
// use Illuminate\Support\Facades\Cache;

class PartModel extends Model
{
    protected $connection = 'parts_database';
    protected $table = 'models'; // Explicitly defining table name is good practice
    protected $fillable = ['name', 'slug'];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->slug)) {
                $model->slug = Str::slug($model->name);
            }
        });

        // Cache clearing logic is removed as per requirement
        // static::saved(function ($model) {
        //     self::clearPerformanceCache();
        // });

        // static::deleted(function ($model) {
        //     self::clearPerformanceCache();
        // });
    }

    // Cache clearing method is no longer needed if caching is disabled
    // public static function clearPerformanceCache(): void
    // {
    //     $cacheKeys = [
    //         'parts_filter_options_optimized', // Example key, adjust if it was different
    //         'parts_catalog_models_v2',      // Example key
    //     ];

    //     foreach ($cacheKeys as $key) {
    //         Cache::forget($key);
    //     }
    //     Log::info('PartModel related caches cleared.'); // Optional: Log when this would have been called
    // }

    public function partInstances(): BelongsToMany
    {
        return $this->belongsToMany(PartInstance::class, 'part_instance_models', 'model_id', 'part_instance_id');
    }
}
