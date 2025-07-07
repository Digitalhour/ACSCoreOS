<?php
// app/Models/OvertimeRule.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class OvertimeRule extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'name',
        'description',
        'daily_threshold',
        'weekly_threshold',
        'overtime_multiplier',
        'is_active',
        'is_default',
        'department_ids',
        'user_ids',
        'effective_date',
        'end_date',
    ];

    protected $casts = [
        'daily_threshold' => 'decimal:2',
        'weekly_threshold' => 'decimal:2',
        'overtime_multiplier' => 'decimal:2',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'department_ids' => 'array',
        'user_ids' => 'array',
        'effective_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->useLogName('Overtime Rules')
            ->dontSubmitEmptyLogs();
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->whereNull('user_ids')
                ->orWhereJsonContains('user_ids', $userId);
        });
    }

    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where(function ($q) use ($departmentId) {
            $q->whereNull('department_ids')
                ->orWhereJsonContains('department_ids', $departmentId);
        });
    }

    public static function getForUser(User $user): self
    {
        // Check for user-specific rule first
        $rule = self::active()
            ->forUser($user->id)
            ->where('effective_date', '<=', now())
            ->where(function ($q) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            })
            ->orderBy('effective_date', 'desc')
            ->first();

        if ($rule) return $rule;

        // Check for department-specific rules
        $departmentIds = $user->departments()->pluck('departments.id')->toArray();
        foreach ($departmentIds as $deptId) {
            $rule = self::active()
                ->forDepartment($deptId)
                ->where('effective_date', '<=', now())
                ->where(function ($q) {
                    $q->whereNull('end_date')
                        ->orWhere('end_date', '>=', now());
                })
                ->orderBy('effective_date', 'desc')
                ->first();

            if ($rule) return $rule;
        }

        // Fall back to default rule
        return self::active()->default()->first() ?? self::createDefaultRule();
    }

    public static function createDefaultRule(): self
    {
        return self::create([
            'name' => 'Default Overtime Rule',
            'description' => 'Standard 40-hour work week with 1.5x overtime',
            'daily_threshold' => 8.00,
            'weekly_threshold' => 40.00,
            'overtime_multiplier' => 1.50,
            'is_active' => true,
            'is_default' => true,
            'effective_date' => now(),
        ]);
    }
}
