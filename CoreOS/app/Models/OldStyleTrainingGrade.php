<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OldStyleTrainingGrade extends Model
{
    use HasFactory;

    protected $table = 'old_style_training_grades';
    protected $primaryKey = 'grade_id';

    protected $fillable = [
        'grade_employee_id',
        'grade_assessment_id',
        'grade_assessment_type',
        'grade_score',
    ];

    protected $casts = [
        'grade_score' => 'decimal:2',
        'grade_assessment_type' => 'string',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'grade_employee_id', 'id');
    }

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(OldStyleTrainingQuiz::class, 'grade_assessment_id', 'quiz_id');
    }

    public function test(): BelongsTo
    {
        return $this->belongsTo(OldStyleTrainingTest::class, 'grade_assessment_id', 'test_id');
    }
}
