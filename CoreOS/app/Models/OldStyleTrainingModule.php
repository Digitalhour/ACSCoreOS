<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OldStyleTrainingModule extends Model
{
    use HasFactory;

    protected $table = 'old_style_training_modules';
    protected $primaryKey = 'module_id';

    protected $fillable = [
        'module_name',
        'module_description',
        'module_status',
    ];

    protected $casts = [
        'module_status' => 'string',
    ];

    public function lessons(): HasMany
    {
        return $this->hasMany(OldStyleTrainingLesson::class, 'module_id', 'module_id');
    }

    public function tests(): HasMany
    {
        return $this->hasMany(OldStyleTrainingTest::class, 'module_id', 'module_id');
    }
}
