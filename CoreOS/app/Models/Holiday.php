<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Holiday extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'date',
        'description',
        'type',
        'is_recurring',
        'is_active'
    ];

    protected $casts = [
        'date' => 'date',
        'is_recurring' => 'boolean',
        'is_active' => 'boolean'
    ];

    public function getFormattedDateAttribute()
    {
        return $this->date->format('M d, Y');
    }

    public function getIsUpcomingAttribute()
    {
        return $this->date->isFuture();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeUpcoming($query)
    {
        return $query->where('date', '>=', now());
    }

    public function scopeThisYear($query)
    {
        return $query->whereYear('date', now()->year);
    }

    /**
     * Get holidays within a date range
     */
    public static function getHolidaysInRange($startDate, $endDate)
    {
        return static::active()
            ->whereBetween('date', [$startDate, $endDate])
            ->get()
            ->pluck('date')
            ->map(function ($date) {
                return $date->format('Y-m-d');
            })
            ->toArray();
    }

    /**
     * Check if a specific date is a holiday
     */
    public static function isHoliday($date)
    {
        return static::active()
            ->whereDate('date', $date)
            ->exists();
    }
}
