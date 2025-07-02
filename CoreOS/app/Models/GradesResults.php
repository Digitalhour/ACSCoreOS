<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class GradesResults extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'gradeable_type',
        'gradeable_id',
        'answers',
        'score',
        'total_points',
        'earned_points',
        'passed',
        'attempt_number',
        'started_at',
        'completed_at'
    ];

    protected $casts = [
        'answers' => 'array',
        'score' => 'integer',
        'total_points' => 'integer',
        'earned_points' => 'integer',
        'passed' => 'boolean',
        'attempt_number' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gradeable(): MorphTo
    {
        return $this->morphTo();
    }

    public function getGradeLetterAttribute()
    {
        if ($this->score >= 90) return 'A';
        if ($this->score >= 80) return 'B';
        if ($this->score >= 70) return 'C';
        if ($this->score >= 60) return 'D';
        return 'F';
    }
}
