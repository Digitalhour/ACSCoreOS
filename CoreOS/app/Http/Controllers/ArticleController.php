<?php

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ArticleController extends Controller
{
    public function index(): Response
    {
        $articles = Article::with(['user:id,name,email,avatar'])
            ->withEngagementCounts()
            ->latest()
            ->paginate(10);

        // Add engagement data for each article
        $articles->getCollection()->transform(function ($article) {
            $article->reactions_summary = $article->getReactionsSummary();
            $article->user_reaction = auth()->check() ? $article->getUserReaction(auth()->id()) : null;
            return $article;
        });

        return Inertia::render('Articles/Index', [
            'articles' => $articles,
        ]);
    }

    public function show(Article $article): Response
    {
        $article->load([
            'user:id,name,email,avatar',
            'comments.user:id,name,email,avatar',
            'comments.replies.user:id,name,email,avatar',
        ]);

        $article->loadCount(['reactions', 'allComments as comments_count']);

        // Add engagement data
        $article->reactions_summary = $article->getReactionsSummary();
        $article->user_reaction = auth()->check() ? $article->getUserReaction(auth()->id()) : null;

        return Inertia::render('Articles/Show', [
            'article' => $article,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Articles/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:articles,slug',
            'excerpt' => 'nullable|string',
            'content' => 'required|string',
            'status' => 'required|in:draft,published',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        $validated['user_id'] = auth()->id();

        if ($validated['status'] === 'published' && !isset($validated['published_at'])) {
            $validated['published_at'] = now();
        }

        $article = Article::create($validated);

        return redirect()->route('articles.show', $article)
            ->with('success', 'Article created successfully.');
    }

    public function edit(Article $article): Response
    {
        return Inertia::render('Articles/Edit', [
            'article' => $article,
        ]);
    }

    public function update(Request $request, Article $article): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:articles,slug,'.$article->id,
            'excerpt' => 'nullable|string',
            'content' => 'required|string',
            'status' => 'required|in:draft,published',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        if ($validated['status'] === 'published' && $article->status === 'draft') {
            $validated['published_at'] = now();
        }

        $article->update($validated);

        return redirect()->route('articles.show', $article)
            ->with('success', 'Article updated successfully.');
    }

    public function destroy(Article $article): RedirectResponse
    {
        $article->delete();

        return redirect()->route('articles.index')
            ->with('success', 'Article deleted successfully.');
    }
}
