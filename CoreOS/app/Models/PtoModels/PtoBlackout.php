<?php

namespace App\Models\PtoModels;

use App\Models\Department;
use App\Models\Position;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PtoBlackout extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'start_date',
        'end_date',
        'position_id',
        'department_ids',
        'user_ids',
        'is_company_wide',
        'is_holiday',
        'is_strict',
        'allow_emergency_override',
        'restriction_type',
        'max_requests_allowed',
        'pto_type_ids',
        'is_active',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'department_ids' => 'array',
        'user_ids' => 'array',
        'pto_type_ids' => 'array',
        'is_company_wide' => 'boolean',
        'is_holiday' => 'boolean',
        'is_strict' => 'boolean',
        'allow_emergency_override' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function departments()
    {
        return Department::whereIn('id', $this->department_ids ?? [])->get();
    }

    public function users()
    {
        return User::whereIn('id', $this->user_ids ?? [])->get();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeCompanyWide($query)
    {
        return $query->where('is_company_wide', true);
    }

    public function scopeHolidays($query)
    {
        return $query->where('is_holiday', true);
    }

    public function scopeStrict($query)
    {
        return $query->where('is_strict', true);
    }

    public function scopeForPosition($query, $positionId)
    {
        return $query->where('position_id', $positionId);
    }

    public function scopeOverlapping($query, $startDate, $endDate)
    {
        return $query->where(function ($query) use ($startDate, $endDate) {
            $query->where('start_date', '<=', $endDate)
                ->where('end_date', '>=', $startDate);
        });
    }

    public function isCompanyWide(): bool
    {
        return $this->is_company_wide;
    }

    public function isHoliday(): bool
    {
        return $this->is_holiday;
    }

    public function isStrict(): bool
    {
        return $this->is_strict;
    }

    public function appliesToPosition($positionId): bool
    {
        return $this->position_id === $positionId || $this->is_company_wide;
    }

    public function appliesToDepartment($departmentId): bool
    {
        return in_array($departmentId, $this->department_ids ?? []) || $this->is_company_wide;
    }

    public function appliesToUser($userId): bool
    {
        return in_array($userId, $this->user_ids ?? []) || $this->is_company_wide;
    }

    public function overlapsWithDateRange($startDate, $endDate): bool
    {
        return $this->start_date <= $endDate && $this->end_date >= $startDate;
    }

    public function getFormattedDateRangeAttribute()
    {
        if ($this->start_date->eq($this->end_date)) {
            return $this->start_date->format('M d, Y');
        }
        return $this->start_date->format('M d, Y') . ' - ' . $this->end_date->format('M d, Y');
    }
}
