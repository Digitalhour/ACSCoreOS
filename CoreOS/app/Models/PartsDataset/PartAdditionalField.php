<?php

// app/Models/PartsDataset/PartAdditionalField.php

namespace App\Models\PartsDataset;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartAdditionalField extends Model
{
    use HasFactory;

    protected $connection = 'parts_database';
    protected $table = 'parts_additional_fields';

    protected $fillable = [
        'part_id',
        'field_name',
        'field_value',
    ];

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class, 'part_id');
    }
}
