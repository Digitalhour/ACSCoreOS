<?php

namespace App\Http\Controllers;

use App\Models\BlogTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BlogTemplateController extends Controller
{
    public function index(Request $request)
    {
        $query = BlogTemplate::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%")
                    ->orWhere('category', 'like', "%{$request->search}%");
            });
        }

        // Filter by category
        if ($request->filled('category')) {
            $query->byCategory($request->category);
        }

        // Filter by status
        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->active();
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $templates = $query->ordered()
            ->paginate(15)
            ->withQueryString()
            ->through(function ($template) {
                return [
                    'id' => $template->id,
                    'name' => $template->name,
                    'slug' => $template->slug,
                    'description' => $template->description,
                    'category' => $template->category,
                    'featured_image' => $template->featured_image,
                    'preview_url' => $this->getTemplateImageUrl($template),
                    'is_active' => $template->is_active,
                    'sort_order' => $template->sort_order,
                    'created_at' => $template->created_at,
                    'updated_at' => $template->updated_at,
                ];
            });

        $categories = BlogTemplate::distinct()
            ->pluck('category')
            ->filter()
            ->sort()
            ->values();

        return Inertia::render('Admin/blog-templates/Index', [
            'templates' => $templates,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category', 'status']),
        ]);
    }

    public function create()
    {
        $categories = BlogTemplate::distinct()
            ->pluck('category')
            ->filter()
            ->sort()
            ->values();

        // Add default categories if none exist
        $defaultCategories = ['general', 'newsletter', 'brief', 'article', 'announcement', 'update'];
        if ($categories->isEmpty()) {
            $categories = collect($defaultCategories);
        }

        return Inertia::render('Admin/blog-templates/Create', [
            'categories' => $categories
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:blog_templates,slug',
            'description' => 'nullable|string|max:1000',
            'content' => 'required|string',
            'featured_image' => 'nullable|image|max:12288',
            'category' => 'required|string|max:100',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        if (!$validated['slug']) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        // Handle featured image upload
        if ($request->hasFile('featured_image')) {
            $validated['featured_image'] = $this->storeTemplateImage(
                $request->file('featured_image'),
                $validated['slug']
            );
        }

        BlogTemplate::create($validated);

        return redirect()->route('admin.blog-templates.index')
            ->with('success', 'Template created successfully!');
    }

    public function show(BlogTemplate $blogTemplate)
    {
        return Inertia::render('Admin/blog-templates/Show', [
            'template' => [
                'id' => $blogTemplate->id,
                'name' => $blogTemplate->name,
                'slug' => $blogTemplate->slug,
                'description' => $blogTemplate->description,
                'content' => $blogTemplate->content,
                'featured_image' => $blogTemplate->featured_image,
                'preview_url' => $this->getTemplateImageUrl($blogTemplate),
                'category' => $blogTemplate->category,
                'metadata' => $blogTemplate->metadata,
                'is_active' => $blogTemplate->is_active,
                'sort_order' => $blogTemplate->sort_order,
                'created_at' => $blogTemplate->created_at,
                'updated_at' => $blogTemplate->updated_at,
            ]
        ]);
    }

    public function edit(BlogTemplate $blogTemplate)
    {
        // Transform template with proper image URL
        $template = $blogTemplate->toArray();
        $template['preview_url'] = $this->getTemplateImageUrl($blogTemplate);

        return Inertia::render('Admin/blog-templates/Edit', [
            'template' => $template
        ]);
    }

    public function update(Request $request, BlogTemplate $blogTemplate)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('blog_templates', 'slug')->ignore($blogTemplate->id),
            ],
            'description' => 'nullable|string|max:1000',
            'content' => 'required|string',
            'featured_image' => 'nullable|image|max:2048',
            'category' => 'required|string|max:100',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        $oldSlug = $blogTemplate->slug;

        if (!$validated['slug']) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        // Handle featured image upload
        if ($request->hasFile('featured_image')) {
            // Delete old image
            if ($blogTemplate->featured_image) {
                Storage::disk('s3')->delete($blogTemplate->featured_image);
            }

            $validated['featured_image'] = $this->storeTemplateImage(
                $request->file('featured_image'),
                $validated['slug']
            );
        } else if ($oldSlug !== $validated['slug'] && $blogTemplate->featured_image) {
            // Move existing image to new slug folder if slug changed
            $validated['featured_image'] = $this->moveTemplateImage(
                $blogTemplate->featured_image,
                $oldSlug,
                $validated['slug']
            );
        }

        $blogTemplate->update($validated);

        return redirect()->route('admin.blog-templates.index')
            ->with('success', 'Template updated successfully!');
    }

    public function destroy(BlogTemplate $blogTemplate)
    {
        // Delete featured image
        if ($blogTemplate->featured_image) {
            Storage::disk('s3')->delete($blogTemplate->featured_image);
        }

        $blogTemplate->delete();

        return redirect()->route('admin.blog-templates.index')
            ->with('success', 'Template deleted successfully!');
    }

    // API endpoint for fetching templates (for SunEditor)
    public function apiIndex()
    {
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

        return response()->json($templates);
    }

    /**
     * Store template image in S3 with slug-based folder
     */
    private function storeTemplateImage($file, string $slug): string
    {
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = "blog-images/{$slug}/template/{$filename}";

        Storage::disk('s3')->put($path, file_get_contents($file));

        return $path;
    }

    /**
     * Move template image to new slug folder
     */
    private function moveTemplateImage(string $currentPath, string $oldSlug, string $newSlug): string
    {
        $filename = basename($currentPath);
        $newPath = "blog-images/{$newSlug}/template/{$filename}";

        // Copy to new location
        if (Storage::disk('s3')->exists($currentPath)) {
            Storage::disk('s3')->copy($currentPath, $newPath);
            Storage::disk('s3')->delete($currentPath);
        }

        return $newPath;
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
