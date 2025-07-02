<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Test extends Model
{
    use HasFactory;

    protected $fillable = [
        'module_id',
        'title',
        'description',
        'time_limit',
        'passing_score',
        'randomize_questions',
        'show_results_immediately'
    ];

    protected $casts = [
        'time_limit' => 'integer',
        'passing_score' => 'integer',
        'randomize_questions' => 'boolean',
        'show_results_immediately' => 'boolean'
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function questions(): MorphMany
    {
        return $this->morphMany(Question::class, 'questionable')->orderBy('order');
    }

    public function grades(): MorphMany
    {
        return $this->morphMany(GradesResults::class, 'gradeable');
    }

    public function getQuestionsForAttempt()
    {
        $questions = $this->questions;

        if ($this->randomize_questions) {
            return $questions->shuffle();
        }

        return $questions;
    }

    public function getBestGradeForUser($userId)
    {
        return $this->grades()
            ->where('user_id', $userId)
            ->orderByDesc('score')
            ->first();
    }

    public function getAttemptsCountForUser($userId)
    {
        return $this->grades()
            ->where('user_id', $userId)
            ->count();
    }
}
