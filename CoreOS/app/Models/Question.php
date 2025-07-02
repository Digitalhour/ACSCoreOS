<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'questionable_type',
        'questionable_id',
        'type',
        'question',
        'options',
        'correct_answers',
        'explanation',
        'points',
        'order'
    ];

    protected $casts = [
        'options' => 'array',
        'correct_answers' => 'array',
        'points' => 'integer',
        'order' => 'integer'
    ];

    public function questionable(): MorphTo
    {
        return $this->morphTo();
    }

    public function checkAnswer($userAnswer)
    {
        $correctAnswers = $this->correct_answers;

        if ($this->type === 'multiple_choice') {
            return in_array($userAnswer, $correctAnswers);
        }

        if ($this->type === 'true_false') {
            return $userAnswer === $correctAnswers[0];
        }

        if ($this->type === 'short_answer') {
            return in_array(strtolower(trim($userAnswer)),
                array_map('strtolower', $correctAnswers));
        }

        return false;
    }
}
