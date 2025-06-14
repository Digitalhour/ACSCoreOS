<?php

namespace App\Models\Parts;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartInstanceAdditionalField extends Model
{
    protected $connection = 'parts_database';
    protected $fillable = ['field_name', 'field_value'];

    public function partInstance(): BelongsTo
    {
        return $this->belongsTo(PartInstance::class);
    }
}
