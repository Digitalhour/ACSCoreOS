<?php

namespace App\Http\Controllers;

use App\Models\WikiBook;
use App\Models\WikiChapter;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class WikiChapterController extends Controller
{
    public function show(WikiBook $book, WikiChapter $chapter)
    {
        $chapter->load(['pages', 'user', 'book']);

        return Inertia::render('Wiki/Chapters/Show', [
            'book' => $book,
            'chapter' => $chapter,
        ]);
    }

    public function create(WikiBook $book)
    {
        return Inertia::render('Wiki/Chapters/Create', [
            'book' => $book,
        ]);
    }

    public function store(Request $request, WikiBook $book)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:draft,published',
        ]);

        $chapter = $book->chapters()->create([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'description' => $request->description,
            'status' => $request->status,
            'user_id' => auth()->id(),
            'sort_order' => $book->chapters()->max('sort_order') + 1,
            'published_at' => $request->status === 'published' ? now() : null,
        ]);

        return redirect()->route('wiki.chapters.show', [$book, $chapter])
            ->with('success', 'Chapter created successfully.');
    }

    public function edit(WikiBook $book, WikiChapter $chapter)
    {


        return Inertia::render('Wiki/Chapters/Edit', [
            'book' => $book,
            'chapter' => $chapter,
        ]);
    }

    public function update(Request $request, WikiBook $book, WikiChapter $chapter)
    {


        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:draft,published',
        ]);

        $chapter->update([
            'name' => $request->name,
            'description' => $request->description,
            'status' => $request->status,
            'published_at' => $request->status === 'published' && !$chapter->published_at ? now() : $chapter->published_at,
        ]);

        return redirect()->route('wiki.chapters.show', [$book, $chapter])
            ->with('success', 'Chapter updated successfully.');
    }

    public function destroy(WikiBook $book, WikiChapter $chapter)
    {


        $chapter->delete();

        return redirect()->route('wiki.books.show', $book)
            ->with('success', 'Chapter deleted successfully.');
    }
}
