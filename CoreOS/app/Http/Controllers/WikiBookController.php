<?php

namespace App\Http\Controllers;

use App\Models\WikiBook;
use Illuminate\Http\Request;
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
            $bookArray['cover_image_url'] = $book->getCoverImageUrl();
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
        $bookArray['cover_image_url'] = $book->getCoverImageUrl();

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
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|string',
            'status' => 'required|in:draft,published',
        ]);

        $book = WikiBook::create([
            'name' => $request->name,
            'description' => $request->description,
            'cover_image' => $request->cover_image,
            'status' => $request->status,
            'user_id' => auth()->id(),
            'published_at' => $request->status === 'published' ? now() : null,
        ]);

        return redirect()->route('wiki.books.show', $book)
            ->with('success', 'Book created successfully.');
    }

    public function edit(WikiBook $book)
    {
        $bookArray = $book->toArray();
        $bookArray['cover_image_url'] = $book->getCoverImageUrl();

        return Inertia::render('Wiki/Books/Edit', [
            'book' => $bookArray,
        ]);
    }

    public function update(Request $request, WikiBook $book)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|string',
            'status' => 'required|in:draft,published',
        ]);

        $book->update([
            'name' => $request->name,
            // Remove manual slug setting - let model handle it
            'description' => $request->description,
            'cover_image' => $request->cover_image,
            'status' => $request->status,
            'published_at' => $request->status === 'published' && !$book->published_at ? now() : $book->published_at,
        ]);

        return redirect()->route('wiki.books.show', $book)
            ->with('success', 'Book updated successfully.');
    }

    public function destroy(WikiBook $book)
    {
        $book->delete();

        return redirect()->route('wiki.books.index')
            ->with('success', 'Book deleted successfully.');
    }
}
