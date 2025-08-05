<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class WikiPageVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'wiki_page_id',
        'name',
        'content',
        'excerpt',
        'featured_image',
        'version_number',
        'change_summary',
        'user_id',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function page(): BelongsTo
    {
        return $this->belongsTo(WikiPage::class, 'wiki_page_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeLatest($query)
    {
        return $query->orderBy('version_number', 'desc');
    }

    public function scopeByPage($query, $pageId)
    {
        return $query->where('wiki_page_id', $pageId);
    }

    // Helper methods
    public function getFeaturedImageUrl(): ?string
    {
        if (!$this->featured_image) {
            return null;
        }

        try {
            return Storage::disk('s3')->temporaryUrl(
                $this->featured_image,
                now()->addHours(24)
            );
        } catch (\Exception $e) {
            return null;
        }
    }

    public function restoreToPage(): void
    {
        $this->page->update([
            'name' => $this->name,
            'content' => $this->content,
            'excerpt' => $this->excerpt,
            'featured_image' => $this->featured_image,
            'metadata' => $this->metadata,
        ]);

        $this->page->incrementVersion();
    }

    public function getWordCount(): int
    {
        return str_word_count(strip_tags($this->content));
    }

    public function getContentDiff(WikiPageVersion $otherVersion): array
    {
        // Simple diff implementation - you might want to use a more sophisticated diff library
        $thisLines = explode("\n", strip_tags($this->content));
        $otherLines = explode("\n", strip_tags($otherVersion->content));

        return [
            'added' => array_diff($thisLines, $otherLines),
            'removed' => array_diff($otherLines, $thisLines),
            'word_count_diff' => $this->getWordCount() - $otherVersion->getWordCount(),
        ];
    }
}
