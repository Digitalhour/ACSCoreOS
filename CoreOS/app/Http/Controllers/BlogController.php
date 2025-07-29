<?php

namespace App\Http\Controllers;

use App\Models\BlogArticle;
use App\Models\BlogComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BlogController extends Controller
{
    public function index(Request $request)
    {
        $query = BlogArticle::published()
            ->with(['user:id,name,email,avatar'])
            ->withCount('approvedComments');

        // Search functionality
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Filter by author
        if ($request->filled('author')) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->author}%");
            });
        }

        $articles = $query->latest('published_at')
            ->paginate(12)
            ->withQueryString()
            ->through(function ($article) {
                return [
                    'id' => $article->id,
                    'title' => $article->title,
                    'slug' => $article->slug,
                    'excerpt' => $article->excerpt,
                    'featured_image' => $article->featured_image,
                    'status' => $article->status,
                    'user' => $article->user,
                    'published_at' => $article->published_at,
                    'created_at' => $article->created_at,
                    'reading_time' => $article->reading_time,
                    'approved_comments_count' => $article->approved_comments_count,
                ];
            });

        return Inertia::render('Blog/Index', [
            'articles' => $articles,
            'filters' => $request->only(['search', 'author']),
        ]);
    }

    public function show(BlogArticle $blogArticle)
    {
        if (!$blogArticle->isPublished() && !$blogArticle->canBeEditedBy(Auth::user())) {
            abort(404);
        }

        $blogArticle->load(['user:id,name,email,avatar']);

        // Get comments with the package
        $comments = $blogArticle->comments()
            ->with(['user:id,name,email,avatar', 'replies.user:id,name,email,avatar'])
            ->whereNull('parent_id')
            ->latest()
            ->get();

        $relatedArticles = BlogArticle::published()
            ->where('id', '!=', $blogArticle->id)
            ->with('user:id,name,email,avatar')
            ->latest('published_at')
            ->limit(3)
            ->get();

        return Inertia::render('Blog/Show', [
            'article' => $blogArticle,
            'comments' => $comments,
            'relatedArticles' => $relatedArticles,
        ]);
    }

    public function create()
    {
        return Inertia::render('Blog/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:blog_articles,slug',
            'excerpt' => 'nullable|string|max:500',
            'content' => 'required|string',
            'featured_image' => 'nullable|image|max:2048',
            'status' => 'required|in:draft,published',
            'published_at' => 'nullable|date',
        ]);

        if (!$validated['slug']) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        // Handle featured image upload
        if ($request->hasFile('featured_image')) {
            $validated['featured_image'] = $request->file('featured_image')->store('blog-images', 'public');
        }

        // Set published_at if status is published and no date provided
        if ($validated['status'] === 'published' && !$validated['published_at']) {
            $validated['published_at'] = now();
        }

        $validated['user_id'] = Auth::id();

        $article = BlogArticle::create($validated);

        return redirect()->route('blog.show', $article)
            ->with('success', 'Article created successfully!');
    }

    public function edit(BlogArticle $blogArticle)
    {
        if (!$blogArticle->canBeEditedBy(Auth::user())) {
            abort(403);
        }

        return Inertia::render('Blog/Edit', [
            'article' => $blogArticle,
        ]);
    }

    public function update(Request $request, BlogArticle $blogArticle)
    {
        if (!$blogArticle->canBeEditedBy(Auth::user())) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('blog_articles', 'slug')->ignore($blogArticle->id),
            ],
            'excerpt' => 'nullable|string|max:500',
            'content' => 'required|string',
            'featured_image' => 'nullable|image|max:2048',
            'status' => 'required|in:draft,published,archived',
            'published_at' => 'nullable|date',
        ]);

        if (!$validated['slug']) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        // Handle featured image upload
        if ($request->hasFile('featured_image')) {
            // Delete old image
            if ($blogArticle->featured_image) {
                Storage::disk('public')->delete($blogArticle->featured_image);
            }
            $validated['featured_image'] = $request->file('featured_image')->store('blog-images', 'public');
        }

        // Set published_at if status is published and no date provided
        if ($validated['status'] === 'published' && !$validated['published_at'] && !$blogArticle->published_at) {
            $validated['published_at'] = now();
        }

        $blogArticle->update($validated);

        return redirect()->route('blog.show', $blogArticle)
            ->with('success', 'Article updated successfully!');
    }

    public function destroy(BlogArticle $blogArticle)
    {
        if (!$blogArticle->canBeEditedBy(Auth::user())) {
            abort(403);
        }

        $blogArticle->delete();

        return redirect()->route('blog.index')
            ->with('success', 'Article deleted successfully!');
    }

    // Comment methods
    public function storeComment(Request $request, BlogArticle $blogArticle)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:1000',
            'parent_id' => 'nullable|exists:blog_comments,id',
        ]);

        $validated['blog_article_id'] = $blogArticle->id;
        $validated['user_id'] = Auth::id();

        BlogComment::create($validated);

        return back()->with('success', 'Comment added successfully!');
    }

    public function updateComment(Request $request, BlogComment $blogComment)
    {
        if (!$blogComment->canBeEditedBy(Auth::user())) {
            abort(403);
        }

        $validated = $request->validate([
            'content' => 'required|string|max:1000',
        ]);

        $blogComment->update($validated);

        return back()->with('success', 'Comment updated successfully!');
    }

    public function destroyComment(BlogComment $blogComment)
    {
        if (!$blogComment->canBeDeletedBy(Auth::user())) {
            abort(403);
        }

        $blogComment->delete();

        return back()->with('success', 'Comment deleted successfully!');
    }

    // Admin methods
    public function manage(Request $request)
    {
        $query = BlogArticle::with(['user:id,name,email,avatar'])
            ->withCount('approvedComments');

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Search functionality
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        $articles = $query->latest('created_at')
            ->paginate(15)
            ->withQueryString()
            ->through(function ($article) {
                return [
                    'id' => $article->id,
                    'title' => $article->title,
                    'slug' => $article->slug,
                    'excerpt' => $article->excerpt,
                    'status' => $article->status,
                    'user' => $article->user,
                    'published_at' => $article->published_at,
                    'created_at' => $article->created_at,
                    'updated_at' => $article->updated_at,
                    'approved_comments_count' => $article->approved_comments_count,
                ];
            });

        return Inertia::render('Blog/Manage', [
            'articles' => $articles,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function uploadEditorImage(Request $request)
    {
        $request->validate([
            'file' => 'required|image|max:2048', // 2MB max
        ]);

        if ($request->hasFile('file')) {
            $path = $request->file('file')->store('blog-images', 'public');

            return response()->json([
                'url' => asset('storage/' . $path),
                'path' => $path
            ]);
        }

        return response()->json(['error' => 'No file uploaded'], 400);
    }
}
