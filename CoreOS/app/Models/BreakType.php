<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BreakType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'label',
        'description',
        'is_paid',
        'max_duration_minutes',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_paid' => 'boolean',
        'is_active' => 'boolean',
        'max_duration_minutes' => 'integer',
        'sort_order' => 'integer',
    ];

    /**
     * Get the time clock entries for this break type.
     */
    public function timeClocks(): HasMany
    {
        return $this->hasMany(TimeClock::class);
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    public function scopePaid($query)
    {
        return $query->where('is_paid', true);
    }

    public function scopeUnpaid($query)
    {
        return $query->where('is_paid', false);
    }

    /**
     * Helper methods
     */
    public function getDisplayLabel(): string
    {
        return $this->label ?: ucfirst($this->name);
    }

    public function getFormattedMaxDuration(): string
    {
        if (!$this->max_duration_minutes) {
            return 'No limit';
        }

        $hours = floor($this->max_duration_minutes / 60);
        $minutes = $this->max_duration_minutes % 60;

        if ($hours > 0) {
            return $minutes > 0 ? "{$hours}h {$minutes}m" : "{$hours}h";
        }

        return "{$minutes}m";
    }

    public function isPaid(): bool
    {
        return $this->is_paid;
    }

    public function isActive(): bool
    {
        return $this->is_active;
    }

    public function hasMaxDuration(): bool
    {
        return $this->max_duration_minutes !== null;
    }

    public function getMaxDurationHours(): float
    {
        return $this->max_duration_minutes ? round($this->max_duration_minutes / 60, 2) : 0;
    }

    /**
     * Check if a duration exceeds the maximum allowed for this break type
     */
    public function exceedsMaxDuration(int $durationMinutes): bool
    {
        return $this->max_duration_minutes && $durationMinutes > $this->max_duration_minutes;
    }

    /**
     * Get the color class for this break type (for UI styling)
     */
    public function getColorClass(): string
    {
        return match($this->name) {
            'lunch' => 'bg-blue-100 text-blue-800',
            'personal' => 'bg-green-100 text-green-800',
            'extended' => 'bg-yellow-100 text-yellow-800',
            'medical' => 'bg-red-100 text-red-800',
            default => 'bg-gray-100 text-gray-800',
        };
    }

    /**
     * Get the icon for this break type
     */
    public function getIcon(): string
    {
        return match($this->name) {
            'lunch' => 'utensils',
            'personal' => 'user',
            'extended' => 'clock',
            'medical' => 'heart',
            default => 'coffee',
        };
    }
}
