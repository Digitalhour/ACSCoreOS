<?php

namespace App\Http\Controllers;

use App\Models\WikiBook;
use App\Models\WikiChapter;
use App\Models\WikiPage;
use App\Models\WikiTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class WikiPageController extends Controller
{
    public function show(WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {
        $page->load(['user', 'chapter.book', 'attachments', 'versions.user']);

        // Record page view
        $page->recordView(
            auth()->user(),
            request()->ip(),
            request()->userAgent()
        );

        $pageArray = $page->toArray();
        $pageArray['featured_image_url'] = $this->getFeaturedImageUrl($page);
        $pageArray['reading_time'] = $page->reading_time;

        return Inertia::render('Wiki/Pages/Show', [
            'book' => $book,
            'chapter' => $chapter,
            'page' => $pageArray,
        ]);
    }

    public function create(WikiBook $book, WikiChapter $chapter, Request $request)
    {
        $templates = WikiTemplate::active()->ordered()->get()->map(function ($template) {
            return [
                'name' => $template->name,
                'html' => $template->content,
                'featured_image' => $this->getTemplateImageUrl($template),
            ];
        });

        return Inertia::render('Wiki/Pages/Create', [
            'book' => $book,
            'chapter' => $chapter,
            'templates' => $templates,
        ]);
    }

    public function store(Request $request, WikiBook $book, WikiChapter $chapter)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string|max:500',
            'featured_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'required|in:draft,published',
            'change_summary' => 'nullable|string|max:255',
        ]);

        $slug = Str::slug($validated['name']);

        // Handle featured image upload
        if ($request->hasFile('featured_image')) {
            $validated['featured_image'] = $this->storeFeaturedImage(
                $request->file('featured_image'),
                $book->slug,
                $chapter->slug,
                $slug
            );
        }

        $page = $chapter->pages()->create([
            'name' => $validated['name'],
            'slug' => $slug,
            'content' => $validated['content'],
            'excerpt' => $validated['excerpt'],
            'featured_image' => $validated['featured_image'] ?? null,
            'status' => $validated['status'],
            'user_id' => auth()->id(),
            'sort_order' => $chapter->pages()->max('sort_order') + 1,
            'published_at' => $validated['status'] === 'published' ? now() : null,
            'version' => 1,
        ]);

        // Create initial version
        $page->createVersion($validated['change_summary'] ?? 'Initial version');

        return redirect()->route('wiki.pages.show', [$book, $chapter, $page])
            ->with('success', 'Page created successfully.');
    }

    public function edit(WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {
        $templates = WikiTemplate::active()->ordered()->get()->map(function ($template) {
            return [
                'name' => $template->name,
                'html' => $template->content,
                'featured_image' => $this->getTemplateImageUrl($template),
            ];
        });

        $pageArray = $page->toArray();
        $pageArray['featured_image_url'] = $this->getFeaturedImageUrl($page);

        return Inertia::render('Wiki/Pages/Edit', [
            'book' => $book,
            'chapter' => $chapter,
            'page' => $pageArray,
            'templates' => $templates,
        ]);
    }

    public function update(Request $request, WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string|max:500',
            'featured_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'required|in:draft,published',
            'change_summary' => 'nullable|string|max:255',
            'remove_featured_image' => 'sometimes|boolean',
        ]);

        $oldSlug = $page->slug;
        $newSlug = Str::slug($validated['name']);

        $updateData = [
            'name' => $validated['name'],
            'slug' => $newSlug,
            'content' => $validated['content'],
            'excerpt' => $validated['excerpt'],
            'status' => $validated['status'],
            'published_at' => $validated['status'] === 'published' && !$page->published_at ? now() : $page->published_at,
        ];

        // Handle image removal
        if ($request->boolean('remove_featured_image')) {
            if ($page->featured_image) {
                Storage::disk('s3')->delete($page->featured_image);
            }
            $updateData['featured_image'] = null;
        }
        // Handle new image upload
        elseif ($request->hasFile('featured_image')) {
            if ($page->featured_image) {
                Storage::disk('s3')->delete($page->featured_image);
            }
            $updateData['featured_image'] = $this->storeFeaturedImage(
                $request->file('featured_image'),
                $book->slug,
                $chapter->slug,
                $newSlug
            );
        }
        // Move existing image if slug changed
        elseif ($oldSlug !== $newSlug && $page->featured_image) {
            $updateData['featured_image'] = $this->moveFeaturedImage(
                $page->featured_image,
                $book->slug,
                $chapter->slug,
                $oldSlug,
                $newSlug
            );
        }

        // Create version before updating
        $page->createVersion($validated['change_summary'] ?? 'Content updated');

        $page->update($updateData);
        $page->incrementVersion();

        return redirect()->route('wiki.pages.show', [$book, $chapter, $page])
            ->with('success', 'Page updated successfully.');
    }

    public function destroy(WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {
        $this->authorize('delete', $page);

        // Delete featured image
        if ($page->featured_image) {
            Storage::disk('s3')->delete($page->featured_image);
        }

        $page->delete();

        return redirect()->route('wiki.chapters.show', [$book, $chapter])
            ->with('success', 'Page deleted successfully.');
    }

    public function versions(WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {
        $versions = $page->versions()->with('user')->paginate(10);

        return Inertia::render('Wiki/Pages/Versions', [
            'book' => $book,
            'chapter' => $chapter,
            'page' => $page,
            'versions' => $versions,
        ]);
    }

    public function compareVersions(Request $request, WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {
        $fromVersionNumber = $request->get('from', 1);
        $toVersionNumber = $request->get('to', $page->version);

        $fromVersion = $page->versions()->where('version_number', $fromVersionNumber)->with('user')->first();
        $toVersion = $page->versions()->where('version_number', $toVersionNumber)->with('user')->first();

        if (!$fromVersion || !$toVersion) {
            dd('Versions not found', $fromVersion, $toVersion, $page->versions()->pluck('version_number'));
        }
        $diff = $fromVersion->getContentDiff($toVersion);

        return Inertia::render('Wiki/Pages/Compare', [
            'book' => $book,
            'chapter' => $chapter,
            'page' => $page,
            'fromVersion' => array_merge($fromVersion->toArray(), ['word_count' => $fromVersion->getWordCount()]),
            'toVersion' => array_merge($toVersion->toArray(), ['word_count' => $toVersion->getWordCount()]),
            'availableVersions' => $page->versions()->with('user')->orderBy('version_number', 'desc')->get(),
            'diff' => $diff,
        ]);
    }

    public function restoreVersion(WikiBook $book, WikiChapter $chapter, WikiPage $page, $versionId)
    {
        $version = $page->versions()->findOrFail($versionId);
        $version->restoreToPage();

        return redirect()->route('wiki.pages.show', [$book, $chapter, $page])
            ->with('success', 'Page restored to version ' . $version->version_number);
    }

    /**
     * Store featured image in S3 with book/chapter/page structure
     */
    private function storeFeaturedImage($file, string $bookSlug, string $chapterSlug, string $pageSlug): string
    {
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = "wiki-images/{$bookSlug}/{$chapterSlug}/{$pageSlug}/featured/{$filename}";

        Storage::disk('s3')->put($path, file_get_contents($file));

        return $path;
    }

    /**
     * Move featured image to new slug folder
     */
    private function moveFeaturedImage(string $currentPath, string $bookSlug, string $chapterSlug, string $oldPageSlug, string $newPageSlug): string
    {
        $filename = basename($currentPath);
        $newPath = "wiki-images/{$bookSlug}/{$chapterSlug}/{$newPageSlug}/featured/{$filename}";

        // Copy to new location
        if (Storage::disk('s3')->exists($currentPath)) {
            Storage::disk('s3')->copy($currentPath, $newPath);
            Storage::disk('s3')->delete($currentPath);
        }

        return $newPath;
    }

    /**
     * Get temporary URL for wiki page featured image
     */
    private function getFeaturedImageUrl($page): ?string
    {
        if (!$page->featured_image) {
            return null;
        }

        try {
            return Storage::disk('s3')->temporaryUrl(
                $page->featured_image,
                now()->addHours(24)
            );
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Get temporary URL for template image
     */
    private function getTemplateImageUrl($template): ?string
    {
        if (!$template->featured_image) {
            return null;
        }

        try {
            return Storage::disk('s3')->temporaryUrl(
                $template->featured_image,
                now()->addHours(24)
            );
        } catch (\Exception $e) {
            return null;
        }
    }
}
