<?php

namespace App\Models\PtoModels;

use App\Models\Department;
use App\Models\Position;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'is_recurring',
        'recurring_days',
        'recurring_start_date',
        'recurring_end_date',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'recurring_start_date' => 'date',
        'recurring_end_date' => 'date',
        'department_ids' => 'array',
        'user_ids' => 'array',
        'pto_type_ids' => 'array',
        'recurring_days' => 'array',
        'is_company_wide' => 'boolean',
        'is_holiday' => 'boolean',
        'is_strict' => 'boolean',
        'allow_emergency_override' => 'boolean',
        'is_active' => 'boolean',
        'is_recurring' => 'boolean',
    ];

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function departments()
    {
        if (empty($this->department_ids)) {
            return collect([]);
        }
        return Department::whereIn('id', $this->department_ids)->get();
    }

    public function users()
    {
        if (empty($this->user_ids)) {
            return collect([]);
        }
        return User::whereIn('id', $this->user_ids)->get();
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

    public function scopeRecurring($query)
    {
        return $query->where('is_recurring', true);
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

    public function isRecurring(): bool
    {
        return $this->is_recurring;
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
        if ($this->is_recurring) {
            return $this->overlapsWithRecurringDays($startDate, $endDate);
        }

        return $this->start_date <= $endDate && $this->end_date >= $startDate;
    }

    /**
     * Check if the blackout applies to any day in the given date range for recurring blackouts
     */
    public function overlapsWithRecurringDays($startDate, $endDate): bool
    {
        if (!$this->is_recurring || empty($this->recurring_days)) {
            return false;
        }

        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        // Check if recurring blackout is within its effective date range
        if ($this->recurring_start_date && $end->lt($this->recurring_start_date)) {
            return false;
        }

        if ($this->recurring_end_date && $start->gt($this->recurring_end_date)) {
            return false;
        }

        // Check each day in the range to see if it matches any recurring day
        $current = $start->copy();
        while ($current->lte($end)) {
            if (in_array($current->dayOfWeek, $this->recurring_days)) {
                return true;
            }
            $current->addDay();
        }

        return false;
    }

    /**
     * Get the days of the week that this blackout applies to (for recurring blackouts)
     */
    public function getRecurringDayNames(): array
    {
        if (!$this->is_recurring || empty($this->recurring_days)) {
            return [];
        }

        $dayNames = [
            0 => 'Sunday',
            1 => 'Monday',
            2 => 'Tuesday',
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday'
        ];

        return collect($this->recurring_days)
            ->map(fn($day) => $dayNames[$day] ?? '')
            ->filter()
            ->values()
            ->toArray();
    }

    /**
     * Check if a specific date conflicts with this recurring blackout
     */
    public function conflictsWithDate($date): bool
    {
        if (!$this->is_recurring) {
            return $this->overlapsWithDateRange($date, $date);
        }

        $carbonDate = Carbon::parse($date);

        // Check if within effective date range
        if ($this->recurring_start_date && $carbonDate->lt($this->recurring_start_date)) {
            return false;
        }

        if ($this->recurring_end_date && $carbonDate->gt($this->recurring_end_date)) {
            return false;
        }

        return in_array($carbonDate->dayOfWeek, $this->recurring_days ?? []);
    }

    public function getFormattedDateRangeAttribute()
    {
        if ($this->is_recurring) {
            $days = $this->getRecurringDayNames();
            $dayStr = implode(', ', $days);

            $effectiveRange = '';
            if ($this->recurring_start_date || $this->recurring_end_date) {
                $start = $this->recurring_start_date ? $this->recurring_start_date->format('M d, Y') : 'Beginning';
                $end = $this->recurring_end_date ? $this->recurring_end_date->format('M d, Y') : 'Ongoing';
                $effectiveRange = " (Effective: {$start} - {$end})";
            }

            return "Every {$dayStr}{$effectiveRange}";
        }

        if ($this->start_date->eq($this->end_date)) {
            return $this->start_date->format('M d, Y');
        }
        return $this->start_date->format('M d, Y') . ' - ' . $this->end_date->format('M d, Y');
    }
}
