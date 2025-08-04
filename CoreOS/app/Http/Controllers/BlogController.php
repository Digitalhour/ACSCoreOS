<?php

namespace App\Http\Controllers;

use App\Models\BlogArticle;
use App\Models\BlogComment;
use App\Models\BlogTemplate;
use App\Notifications\BlogPublished;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
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
        if ($query->count() > 0) {
            $firstArticle = $query->first();
            \Log::info('Featured image path: ' . $firstArticle->featured_image);
            \Log::info('Generated URL: ' . $this->getFeaturedImageUrl($firstArticle));
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
                    'featured_image' => $this->getFeaturedImageUrl($article),
                    'status' => $article->status,
                    'user' => $article->user,
                    'published_at' => $article->published_at,
                    'created_at' => $article->created_at,
                    'reading_time' => $article->reading_time,
                    'approved_comments_count' => $article->approved_comments_count,
                ];
            });


        return Inertia::render('blog/Index', [
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

        // Transform the article with proper image URL
        $article = $blogArticle->toArray();
        $article['featured_image'] = $this->getFeaturedImageUrl($blogArticle);

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
            ->get()
            ->map(function ($article) {
                $articleArray = $article->toArray();
                $articleArray['featured_image'] = $this->getFeaturedImageUrl($article);
                return $articleArray;
            });

        return Inertia::render('blog/Show', [
            'article' => $article,
            'comments' => $comments,
            'relatedArticles' => $relatedArticles,
        ]);
    }

    public function create()
    {
        // Get active templates for the editor
        $templates = BlogTemplate::active()
            ->ordered()
            ->get()
            ->map(function ($template) {
                return [
                    'name' => $template->name,
                    'slug' => $template->slug,
                    'html' => $template->content,
                    'featured_image' => $this->getTemplateImageUrl($template),
                ];
            });

        return Inertia::render('blog/Create', [
            'templates' => $templates
        ]);
    }
    private function copyTemplateImage($template, $slug): string
    {
        $templatePath = $template->featured_image;
        $filename = basename($templatePath);
        $newPath = "blog-images/{$slug}/featured/{$filename}";

        Storage::disk('s3')->copy($templatePath, $newPath);
        return $newPath;
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
            'selected_template' => 'nullable|string',
        ]);

        if (!$validated['slug']) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        // Handle template image copying
        if ($validated['selected_template'] && !$request->hasFile('featured_image')) {
            $template = BlogTemplate::where('name', $validated['selected_template'])->first();
            if ($template?->featured_image) {
                $validated['featured_image'] = $this->copyTemplateImage($template, $validated['slug']);
            }
        }

        // Handle manual upload
        if ($request->hasFile('featured_image')) {
            $validated['featured_image'] = $this->storeFeaturedImage(
                $request->file('featured_image'),
                $validated['slug']
            );
        }

        // Set published_at if status is published and no date provided
        if ($validated['status'] === 'published' && !$validated['published_at']) {
            $validated['published_at'] = now();
        }

        $validated['user_id'] = Auth::id();

        $article = BlogArticle::create($validated);

        // Send notification if blog is published
        if ($validated['status'] === 'published') {
            Notification::route('mail', 'caldridge@aircompressorservices.com')
                ->notify(new BlogPublished($article));
        }

        return redirect()->route('blog.show', $article)
            ->with('success', 'Article created successfully!');
    }

    public function edit(BlogArticle $blogArticle)
    {
        if (!$blogArticle->canBeEditedBy(Auth::user())) {
            abort(403);
        }

        // Get active templates for the editor
        $templates = BlogTemplate::active()
            ->ordered()
            ->get()
            ->map(function ($template) {
                return [
                    'name' => $template->name,
                    'slug' => $template->slug,
                    'html' => $template->content,
                    'featured_image' => $this->getTemplateImageUrl($template),
                ];
            });

        // Transform article with proper image URL
        $article = $blogArticle->toArray();
        $article['featured_image'] = $this->getFeaturedImageUrl($blogArticle);

        return Inertia::render('blog/Edit', [
            'article' => $article,
            'templates' => $templates
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

        $oldSlug = $blogArticle->slug;

        if (!$validated['slug']) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        // Handle featured image upload
        if ($request->hasFile('featured_image')) {
            // Delete old image if slug changed or replacing image
            if ($blogArticle->featured_image) {
                Storage::disk('s3')->delete($blogArticle->featured_image);
            }

            $validated['featured_image'] = $this->storeFeaturedImage(
                $request->file('featured_image'),
                $validated['slug']
            );
        } else if ($oldSlug !== $validated['slug'] && $blogArticle->featured_image) {
            // Move existing image to new slug folder if slug changed
            $validated['featured_image'] = $this->moveFeaturedImage(
                $blogArticle->featured_image,
                $oldSlug,
                $validated['slug']
            );
        }

        // Set published_at if status is published and no date provided
        if ($validated['status'] === 'published' && !$validated['published_at'] && !$blogArticle->published_at) {
            $validated['published_at'] = now();
        }

        // Check if blog is being published for the first time
        $wasNotPublished = $blogArticle->status !== 'published';
        $isNowPublished = $validated['status'] === 'published';

        $blogArticle->update($validated);

        // Send notification if blog is being published for the first time
        if ($wasNotPublished && $isNowPublished) {
            Notification::route('mail', 'caldridge@aircompressorservices.com')
                ->notify(new BlogPublished($blogArticle->fresh()));
        }

        return redirect()->route('blog.show', $blogArticle)
            ->with('success', 'Article updated successfully!');
    }

    public function destroy(BlogArticle $blogArticle)
    {
        if (!$blogArticle->canBeEditedBy(Auth::user())) {
            abort(403);
        }

        // Delete featured image
        if ($blogArticle->featured_image) {
            Storage::disk('s3')->delete($blogArticle->featured_image);
        }

        $blogArticle->delete();

        return redirect()->route('admin.blog.manage')
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
                    'featured_image' => $this->getFeaturedImageUrl($article),
                    'status' => $article->status,
                    'user' => $article->user,
                    'published_at' => $article->published_at,
                    'created_at' => $article->created_at,
                    'updated_at' => $article->updated_at,
                    'approved_comments_count' => $article->approved_comments_count,
                ];
            });

        return Inertia::render('blog/Manage', [
            'articles' => $articles,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function uploadEditorImage(Request $request)
    {
        $request->validate([
            'file' => 'required|image|max:2048', // 2MB max
        ]);

        if (!$request->hasFile('file')) {
            return response()->json(['error' => 'No file uploaded'], 400);
        }

        // Get slug from request or generate a temporary one
        $slug = $request->input('slug', 'temp-' . uniqid());

        $file = $request->file('file');
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = "blog-images/{$slug}/editor/{$filename}";

        Storage::disk('s3')->put($path, file_get_contents($file));

        // Generate temporary URL (expires in 24 hours)
        $url = Storage::disk('s3')->temporaryUrl($path, now()->addHours(24));

        return response()->json([
            'url' => $url,
            'path' => $path
        ]);
    }

    /**
     * Store featured image in S3 with slug-based folder
     */
    private function storeFeaturedImage($file, string $slug): string
    {
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = "blog-images/{$slug}/featured/{$filename}";

        Storage::disk('s3')->put($path, file_get_contents($file));

        return $path;
    }

    /**
     * Move featured image to new slug folder
     */
    private function moveFeaturedImage(string $currentPath, string $oldSlug, string $newSlug): string
    {
        $filename = basename($currentPath);
        $newPath = "blog-images/{$newSlug}/featured/{$filename}";

        // Copy to new location
        if (Storage::disk('s3')->exists($currentPath)) {
            Storage::disk('s3')->copy($currentPath, $newPath);
            Storage::disk('s3')->delete($currentPath);
        }

        return $newPath;
    }

    /**
     * Get temporary URL for blog article featured image
     */
    private function getFeaturedImageUrl($article): ?string
    {
        if (!$article->featured_image) {
            return null;
        }

        return Storage::disk('s3')->url($article->featured_image);
    }


    /**
     * Get temporary URL for template image
     */
    private function getTemplateImageUrl($template): ?string
    {
        if (!$template->featured_image) {
            return null;
        }

        return Storage::disk('s3')->url($template->featured_image);
    }
}
