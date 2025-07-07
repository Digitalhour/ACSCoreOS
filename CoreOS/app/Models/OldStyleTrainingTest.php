<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OldStyleTrainingTest extends Model
{
    use HasFactory;

    protected $table = 'old_style_training_tests';
    protected $primaryKey = 'test_id';

    protected $fillable = [
        'module_id',
        'test_name',
        'test_description',
        'test_status',
    ];

    protected $casts = [
        'test_status' => 'string',
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(OldStyleTrainingModule::class, 'module_id', 'module_id');
    }
}
