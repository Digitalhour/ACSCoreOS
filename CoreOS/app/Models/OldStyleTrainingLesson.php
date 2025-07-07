<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OldStyleTrainingLesson extends Model
{
    use HasFactory;

    protected $table = 'old_style_training_lessons';
    protected $primaryKey = 'lesson_id';

    protected $fillable = [
        'module_id',
        'lesson_name',
        'lesson_description',
        'lesson_status',
    ];

    protected $casts = [
        'lesson_status' => 'string',
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(OldStyleTrainingModule::class, 'module_id', 'module_id');
    }

    public function quizzes(): HasMany
    {
        return $this->hasMany(OldStyleTrainingQuiz::class, 'lesson_id', 'lesson_id');
    }
}
