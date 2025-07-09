<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OvertimeRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'type',
        'daily_threshold',
        'weekly_threshold',
        'multiplier',
        'priority',
        'is_active',
        'effective_from',
        'effective_to',
        'conditions',
    ];

    protected $casts = [
        'daily_threshold' => 'decimal:2',
        'weekly_threshold' => 'decimal:2',
        'multiplier' => 'decimal:2',
        'priority' => 'integer',
        'is_active' => 'boolean',
        'effective_from' => 'date',
        'effective_to' => 'date',
        'conditions' => 'array',
    ];

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where('effective_from', '<=', now())
            ->where(function ($q) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', now());
            });
    }

    public function scopeDaily($query)
    {
        return $query->where('type', 'daily');
    }

    public function scopeWeekly($query)
    {
        return $query->where('type', 'weekly');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('priority')->orderBy('name');
    }

    public function scopeForDate($query, Carbon $date)
    {
        return $query->where('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $date);
            });
    }

    /**
     * Helper methods
     */
    public function isActive(): bool
    {
        return $this->is_active &&
            $this->effective_from <= now() &&
            ($this->effective_to === null || $this->effective_to >= now());
    }

    public function isDailyRule(): bool
    {
        return $this->type === 'daily';
    }

    public function isWeeklyRule(): bool
    {
        return $this->type === 'weekly';
    }

    public function getTypeLabel(): string
    {
        return match($this->type) {
            'daily' => 'Daily',
            'weekly' => 'Weekly',
            'custom' => 'Custom',
            default => ucfirst($this->type),
        };
    }

    public function getThresholdLabel(): string
    {
        if ($this->isDailyRule() && $this->daily_threshold) {
            return $this->daily_threshold . ' hours per day';
        }

        if ($this->isWeeklyRule() && $this->weekly_threshold) {
            return $this->weekly_threshold . ' hours per week';
        }

        return 'Custom threshold';
    }

    public function getMultiplierLabel(): string
    {
        return $this->multiplier . 'x';
    }

    public function getEffectivePeriod(): string
    {
        $from = $this->effective_from->format('M j, Y');
        $to = $this->effective_to ? $this->effective_to->format('M j, Y') : 'Present';

        return "{$from} - {$to}";
    }

    public function isEffectiveOn(Carbon $date): bool
    {
        return $this->effective_from <= $date &&
            ($this->effective_to === null || $this->effective_to >= $date);
    }

    /**
     * Calculate overtime hours based on this rule
     */
    public function calculateOvertimeHours(float $totalHours, float $weeklyHours = 0): float
    {
        if (!$this->isActive()) {
            return 0;
        }

        if ($this->isDailyRule() && $this->daily_threshold) {
            return max(0, $totalHours - $this->daily_threshold);
        }

        if ($this->isWeeklyRule() && $this->weekly_threshold) {
            return max(0, $weeklyHours - $this->weekly_threshold);
        }

        return 0;
    }

    /**
     * Get the applicable overtime rate for this rule
     */
    public function getOvertimeRate(float $baseRate): float
    {
        return $baseRate * $this->multiplier;
    }

    /**
     * Check if this rule applies to a given set of hours
     */
    public function appliesTo(float $dailyHours, float $weeklyHours = 0): bool
    {
        if (!$this->isActive()) {
            return false;
        }

        if ($this->isDailyRule() && $this->daily_threshold) {
            return $dailyHours > $this->daily_threshold;
        }

        if ($this->isWeeklyRule() && $this->weekly_threshold) {
            return $weeklyHours > $this->weekly_threshold;
        }

        return false;
    }

    /**
     * Get all active overtime rules ordered by priority
     */
    public static function getActiveRules(): \Illuminate\Database\Eloquent\Collection
    {
        return static::active()->ordered()->get();
    }

    /**
     * Get the highest priority rule that applies to the given hours
     */
    public static function getApplicableRule(float $dailyHours, float $weeklyHours = 0): ?OvertimeRule
    {
        return static::active()
            ->ordered()
            ->get()
            ->first(function ($rule) use ($dailyHours, $weeklyHours) {
                return $rule->appliesTo($dailyHours, $weeklyHours);
            });
    }
}
