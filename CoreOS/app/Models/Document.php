<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Document extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'name',
        'original_filename',
        'description',
        'file_type',
        'file_size',
        's3_key',
        's3_url',
        'folder_id',
        'assignment_type',
        'assignment_ids',
        'uploaded_by',
        'last_accessed_at',
        'download_count',
        'is_active',
    ];

    protected $casts = [
        'assignment_ids' => 'array',
        'is_active' => 'boolean',
        'last_accessed_at' => 'datetime',
        'file_size' => 'integer',
        'download_count' => 'integer',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->useLogName('Documents')
            ->dontSubmitEmptyLogs();
    }

    // Relationships
    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'document_tags')->withTimestamps();
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeAccessibleByUser($query, User $user)
    {
        return $query->where(function ($q) use ($user) {
            $q->where('assignment_type', 'company_wide')
                ->orWhere(function ($subQ) use ($user) {
                    $subQ->where('assignment_type', 'user')
                        ->whereJsonContains('assignment_ids', $user->id);
                })
                ->orWhere(function ($subQ) use ($user) {
                    $subQ->where('assignment_type', 'department')
                        ->where(function ($deptQ) use ($user) {
                            foreach ($user->departments->pluck('id') as $deptId) {
                                $deptQ->orWhereJsonContains('assignment_ids', $deptId);
                            }
                        });
                })
                ->orWhere(function ($subQ) use ($user) {
                    $subQ->where('assignment_type', 'hierarchy')
                        ->where(function ($hierQ) use ($user) {
                            $accessibleUserIds = collect([$user->id])
                                ->merge($user->subordinates->pluck('id'))
                                ->toArray();

                            foreach ($accessibleUserIds as $userId) {
                                $hierQ->orWhereJsonContains('assignment_ids', $userId);
                            }
                        });
                });
        });
    }

    public function scopeByFileType($query, string $fileType)
    {
        return $query->where('file_type', $fileType);
    }

    // Helper methods
    public function isAccessibleBy(User $user): bool
    {
        // First check if folder is accessible
        if (!$this->folder->isAccessibleBy($user)) {
            return false;
        }

        switch ($this->assignment_type) {
            case 'company_wide':
                return true;

            case 'user':
                return in_array($user->id, $this->assignment_ids ?? []);

            case 'department':
                $userDepartmentIds = $user->departments->pluck('id')->toArray();
                return !empty(array_intersect($userDepartmentIds, $this->assignment_ids ?? []));

            case 'hierarchy':
                $accessibleUserIds = collect([$user->id])
                    ->merge($user->subordinates->pluck('id'))
                    ->toArray();
                return !empty(array_intersect($accessibleUserIds, $this->assignment_ids ?? []));

            default:
                return false;
        }
    }

    public function getDownloadUrl(): string
    {
        return Storage::disk('s3')->temporaryUrl($this->s3_key, now()->addMinutes(30));
    }

    public function getFormattedFileSize(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }

    public function getFileIcon(): string
    {
        $icons = [
            'pdf' => 'file-text',
            'doc' => 'file-text',
            'docx' => 'file-text',
            'xls' => 'file-spreadsheet',
            'xlsx' => 'file-spreadsheet',
            'csv' => 'file-spreadsheet',
            'txt' => 'file-text',
            'jpg' => 'image',
            'jpeg' => 'image',
            'png' => 'image',
            'gif' => 'image',
            'mp4' => 'video',
            'avi' => 'video',
            'zip' => 'archive',
            'rar' => 'archive',
        ];

        return $icons[strtolower($this->file_type)] ?? 'file';
    }

    public function incrementDownloadCount(): void
    {
        $this->increment('download_count');
        $this->update(['last_accessed_at' => now()]);
    }

    public function getAssignedEntities()
    {
        switch ($this->assignment_type) {
            case 'company_wide':
                return ['type' => 'company_wide', 'entities' => []];

            case 'user':
                $users = User::whereIn('id', $this->assignment_ids ?? [])->get();
                return ['type' => 'users', 'entities' => $users];

            case 'department':
                $departments = Department::whereIn('id', $this->assignment_ids ?? [])->get();
                return ['type' => 'departments', 'entities' => $departments];

            case 'hierarchy':
                $users = User::whereIn('id', $this->assignment_ids ?? [])->get();
                return ['type' => 'hierarchy', 'entities' => $users];

            default:
                return ['type' => 'unknown', 'entities' => []];
        }
    }
}
