<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ImportedFileData extends Model
{
    use HasFactory, LogsActivity;
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->useLogName('Time Off Type')
            ->dontSubmitEmptyLogs();
    }
    protected $connection = 'parts_database';
    protected $table = 'parts';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'file_name',
        'row_identifier_key',
        'row_identifier_value',
        'revision',
        'manual_date',
        'pdf',
        'manual_number',
        'manufacturer',
        'manufacturer_serial',
        'model',
        'part_category',
        'part_type',
        'description',
        'part_number',
        'quantity',
        'additional_notes',
        'img_page_number',
        'img_page_path',
        'ccn_number',
        'part_location',
        'extra_data',
        'import_timestamp',
    ];

    protected $casts = [
        'extra_data' => 'array',
        'import_timestamp' => 'datetime',
        'part_number' => 'string',
        'description' => 'string',
        'quantity' => 'string',
        'img_page_number' => 'string',
        'img_page_path' => 'string',
        'ccn_number' => 'string',
        'manual_number' => 'string',
        'manufacturer' => 'string',        // Fixed: was 'manufacture'
        'manufacturer_serial' => 'string', // Fixed: was 'manufacture_serial'
        'model' => 'string',              // Fixed: was 'models'
        'revision' => 'string',
        'manual_date' => 'string',
        'pdf' => 'string',
        'part_category' => 'string',
        'part_type' => 'string',
        'additional_notes' => 'string',
        'part_location' => 'string',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->import_timestamp)) {
                $model->import_timestamp = now();
            }
        });
    }

    // This accessor returns the content of 'extra_data'
    // Maintains compatibility with existing code that might use getDataAttribute
    public function getDataAttribute()
    {
        return $this->extra_data ?? [];
    }
}
