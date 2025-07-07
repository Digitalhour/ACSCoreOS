<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OldStyleTrainingActivityLog extends Model
{
    use HasFactory;

    protected $table = 'old_style_training_activity_logs';
    protected $primaryKey = 'log_id';

    protected $fillable = [
        'log_action',
        'log_type',
        'log_details',
        'log_type_id',
        'previous_value',
        'new_value',
    ];

    protected $casts = [
        'previous_value' => 'array',
        'new_value' => 'array',
    ];
}
