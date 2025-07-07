<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OldStyleTrainingQuiz extends Model
{
    use HasFactory;

    protected $table = 'old_style_training_quizzes';
    protected $primaryKey = 'quiz_id';

    protected $fillable = [
        'lesson_id',
        'quiz_name',
        'quiz_description',
        'quiz_status',
    ];

    protected $casts = [
        'quiz_status' => 'string',
    ];

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(OldStyleTrainingLesson::class, 'lesson_id', 'lesson_id');
    }
}
