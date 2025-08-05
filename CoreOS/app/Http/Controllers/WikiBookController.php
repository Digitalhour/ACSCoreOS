<?php

namespace App\Http\Controllers;

use App\Models\WikiBook;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class WikiBookController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->get('search');

        $books = WikiBook::with(['user', 'chapters'])
            ->when($search, fn($query) => $query->search($search))
            ->ordered()
            ->paginate(15);

        $books->getCollection()->transform(function ($book) {
            $bookArray = $book->toArray();
            $bookArray['cover_image_url'] = $this->getCoverImageUrl($book);
            $bookArray['chapter_count'] = $book->getChapterCount();
            $bookArray['page_count'] = $book->getPageCount();
            return $bookArray;
        });

        return Inertia::render('Wiki/Books/Index', [
            'books' => $books,
            'search' => $search,
        ]);
    }

    public function show(WikiBook $book)
    {
        $book->load(['chapters.pages', 'user']);

        $bookArray = $book->toArray();
        $bookArray['cover_image_url'] = $this->getCoverImageUrl($book);

        return Inertia::render('Wiki/Books/Show', [
            'book' => $bookArray,
        ]);
    }

    public function create()
    {
        return Inertia::render('Wiki/Books/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'required|in:draft,published',
        ]);

        // Generate slug
        $slug = Str::slug($validated['name']);
        $validated['slug'] = $this->generateUniqueSlug($slug);

        // Handle cover image upload
        if ($request->hasFile('cover_image')) {
            $validated['cover_image'] = $this->storeCoverImage(
                $request->file('cover_image'),
                $validated['slug']
            );
        }

        $validated['user_id'] = auth()->id();
        $validated['published_at'] = $validated['status'] === 'published' ? now() : null;

        $book = WikiBook::create($validated);

        return redirect()->route('wiki.books.show', $book)
            ->with('success', 'Book created successfully.');
    }

    public function edit(WikiBook $book)
    {
        $bookArray = $book->toArray();
        $bookArray['cover_image_url'] = $this->getCoverImageUrl($book);

        return Inertia::render('Wiki/Books/Edit', [
            'book' => $bookArray,
        ]);
    }

    public function update(Request $request, WikiBook $book)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'required|in:draft,published',
            'remove_cover_image' => 'sometimes|boolean',
        ]);

        $oldSlug = $book->slug;

        // Generate new slug if name changed
        if ($validated['name'] !== $book->name) {
            $newSlug = Str::slug($validated['name']);
            $validated['slug'] = $this->generateUniqueSlug($newSlug, $book->id);
        }

        $updateData = [
            'name' => $validated['name'],
            'description' => $validated['description'],
            'status' => $validated['status'],
            'published_at' => $validated['status'] === 'published' && !$book->published_at ? now() : $book->published_at,
        ];

        // Add slug if it changed
        if (isset($validated['slug'])) {
            $updateData['slug'] = $validated['slug'];
        }

        // Handle image removal
        if ($request->boolean('remove_cover_image')) {
            if ($book->cover_image) {
                Storage::disk('s3')->delete($book->cover_image);
            }
            $updateData['cover_image'] = null;
        }
        // Handle new image upload
        elseif ($request->hasFile('cover_image')) {
            if ($book->cover_image) {
                Storage::disk('s3')->delete($book->cover_image);
            }
            $updateData['cover_image'] = $this->storeCoverImage(
                $request->file('cover_image'),
                $validated['slug'] ?? $book->slug
            );
        }
        // Move existing image if slug changed
        elseif (isset($validated['slug']) && $oldSlug !== $validated['slug'] && $book->cover_image) {
            $updateData['cover_image'] = $this->moveCoverImage(
                $book->cover_image,
                $oldSlug,
                $validated['slug']
            );
        }

        $book->update($updateData);

        return redirect()->route('wiki.books.show', $book)
            ->with('success', 'Book updated successfully.');
    }

    public function destroy(WikiBook $book)
    {
        // Delete cover image
        if ($book->cover_image) {
            Storage::disk('s3')->delete($book->cover_image);
        }

        $book->delete();

        return redirect()->route('wiki.books.index')
            ->with('success', 'Book deleted successfully.');
    }

    /**
     * Store cover image in S3 with slug-based folder
     */
    private function storeCoverImage($file, string $slug): string
    {
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = "wiki-images/{$slug}/cover/{$filename}";

        Storage::disk('s3')->put($path, file_get_contents($file));

        return $path;
    }

    /**
     * Move cover image to new slug folder
     */
    private function moveCoverImage(string $currentPath, string $oldSlug, string $newSlug): string
    {
        $filename = basename($currentPath);
        $newPath = "wiki-images/{$newSlug}/cover/{$filename}";

        // Copy to new location
        if (Storage::disk('s3')->exists($currentPath)) {
            Storage::disk('s3')->copy($currentPath, $newPath);
            Storage::disk('s3')->delete($currentPath);
        }

        return $newPath;
    }

    /**
     * Get temporary URL for wiki book cover image
     */
    private function getCoverImageUrl($book): ?string
    {
        if (!$book->cover_image) {
            return null;
        }

        try {
            return Storage::disk('s3')->temporaryUrl(
                $book->cover_image,
                now()->addHours(24)
            );
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Generate unique slug
     */
    private function generateUniqueSlug(string $value, ?int $excludeId = null): string
    {
        $baseSlug = Str::slug($value);
        $slug = $baseSlug;
        $counter = 1;

        while ($this->slugExists($slug, $excludeId)) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Check if slug exists
     */
    private function slugExists(string $slug, ?int $excludeId = null): bool
    {
        $query = WikiBook::where('slug', $slug);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }
}
