<?php

namespace App\Models\PtoModels;

use App\Models\Position;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PtoBlackout extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'description',
        'start_date',
        'end_date',
        'position_id',
        'is_company_wide',
        'is_holiday',
        'is_strict',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_company_wide' => 'boolean',
        'is_holiday' => 'boolean',
        'is_strict' => 'boolean',
    ];

    /**
     * Get the position that this blackout is associated with (if any).
     */
    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    /**
     * Scope a query to only include company-wide blackouts.
     */
    public function scopeCompanyWide($query)
    {
        return $query->where('is_company_wide', true);
    }

    /**
     * Scope a query to only include holidays.
     */
    public function scopeHolidays($query)
    {
        return $query->where('is_holiday', true);
    }

    /**
     * Scope a query to only include strict blackouts.
     */
    public function scopeStrict($query)
    {
        return $query->where('is_strict', true);
    }

    /**
     * Scope a query to only include blackouts for a specific position.
     */
    public function scopeForPosition($query, $positionId)
    {
        return $query->where('position_id', $positionId);
    }

    /**
     * Scope a query to only include blackouts that overlap with a date range.
     */
    public function scopeOverlapping($query, $startDate, $endDate)
    {
        return $query->where(function ($query) use ($startDate, $endDate) {
            $query->where(function ($query) use ($startDate, $endDate) {
                $query->where('start_date', '<=', $endDate)
                    ->where('end_date', '>=', $startDate);
            });
        });
    }

    /**
     * Check if this blackout is company-wide.
     */
    public function isCompanyWide(): bool
    {
        return $this->is_company_wide;
    }

    /**
     * Check if this blackout is a holiday.
     */
    public function isHoliday(): bool
    {
        return $this->is_holiday;
    }

    /**
     * Check if this blackout is strict (PTO requests are automatically denied).
     */
    public function isStrict(): bool
    {
        return $this->is_strict;
    }

    /**
     * Check if this blackout applies to a specific position.
     */
    public function appliesToPosition($positionId): bool
    {
        return $this->position_id === $positionId || $this->is_company_wide;
    }

    /**
     * Check if this blackout overlaps with a date range.
     */
    public function overlapsWithDateRange($startDate, $endDate): bool
    {
        return $this->start_date <= $endDate && $this->end_date >= $startDate;
    }
}
