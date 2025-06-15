<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;


class Position extends Model
{
    use HasFactory;

    use SoftDeletes;

    // Optional

    protected $fillable = [
        'name',
        'description',
    ];

    /**
     * Get the users associated with this position (current assignment).
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get all historical assignments for this position.
     */
    public function userReportingAssignments(): HasMany
    {
        return $this->hasMany(EmployeeReportingAssignment::class);
    }
}
