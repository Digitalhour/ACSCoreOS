<?php

namespace App\Http\Controllers;

use App\Models\WikiBook;
use App\Models\WikiPage;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WikiController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->get('search');

        $books = WikiBook::with(['user', 'chapters.pages'])
            ->published()
            ->when($search, fn($query) => $query->search($search))
            ->ordered()
            ->paginate(12);

        $books->getCollection()->transform(function ($book) {
            $bookArray = $book->toArray();
            $bookArray['cover_image_url'] = $book->getCoverImageUrl();
            $bookArray['chapter_count'] = $book->getChapterCount();
            $bookArray['page_count'] = $book->getPageCount();
            return $bookArray;
        });

        return Inertia::render('Wiki/Index', [
            'books' => $books,
            'search' => $search,
        ]);
    }

    public function search(Request $request)
    {
        $search = $request->get('q');

        if (!$search) {
            return response()->json([]);
        }

        $pages = WikiPage::with(['user', 'chapter.book'])
            ->published()
            ->search($search)
            ->limit(10)
            ->get()
            ->map(function ($page) {
                return [
                    'id' => $page->id,
                    'name' => $page->name,
                    'excerpt' => $page->excerpt,
                    'url' => route('wiki.pages.show', [
                        'book' => $page->chapter->book->slug,
                        'chapter' => $page->chapter->slug,
                        'page' => $page->slug
                    ]),
                    'book_name' => $page->chapter->book->name,
                    'chapter_name' => $page->chapter->name,
                ];
            });

        return response()->json($pages);
    }

    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        try {
            $image = $request->file('image');
            $filename = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $path = "core_wiki/images/{$filename}";

            // Upload to S3
            \Storage::disk('s3')->put($path, file_get_contents($image), 'public');

            // Get the URL
            $url = \Storage::disk('s3')->url($path);

            return response()->json([
                'success' => true,
                'url' => $url,
                'path' => $path
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload image: ' . $e->getMessage()
            ], 500);
        }
    }
}
