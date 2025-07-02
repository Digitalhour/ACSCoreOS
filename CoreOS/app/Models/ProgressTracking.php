<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ProgressTracking extends Model
{
    use HasFactory;
    protected $table = 'progress_tracking';
    protected $fillable = [
        'user_id',
        'trackable_type',
        'trackable_id',
        'completed',
        'started_at',
        'completed_at',
        'time_spent',
        'metadata'
    ];

    protected $casts = [
        'completed' => 'boolean',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'time_spent' => 'integer',
        'metadata' => 'array'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function trackable(): MorphTo
    {
        return $this->morphTo();
    }

    public function markAsStarted()
    {
        if (!$this->started_at) {
            $this->started_at = now();
            $this->save();
        }
    }

    public function markAsCompleted()
    {
        $this->completed = true;
        $this->completed_at = now();
        $this->save();
    }

    public function addTimeSpent($seconds)
    {
        $this->time_spent += $seconds;
        $this->save();
    }
}
