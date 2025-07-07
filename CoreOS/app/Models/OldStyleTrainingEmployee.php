<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OldStyleTrainingEmployee extends Model
{
    use HasFactory;

    protected $table = 'old_style_training_employees';
    protected $primaryKey = 'employee_id';

    protected $fillable = [
        'employee_first_name',
        'employee_last_name',
        'employee_hire_date',
        'employee_status',
    ];

    protected $casts = [
        'employee_hire_date' => 'date',
        'employee_status' => 'string',
    ];

    protected $appends = ['full_name'];

    public function fullName(): Attribute
    {
        return Attribute::make(
            get: fn () => trim($this->employee_first_name . ' ' . $this->employee_last_name)
        );
    }

    public function grades(): HasMany
    {
        return $this->hasMany(OldStyleTrainingGrade::class, 'grade_employee_id', 'employee_id');
    }
}
