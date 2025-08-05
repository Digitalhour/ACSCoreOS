<?php

namespace App\Http\Controllers;

use App\Models\WikiTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class WikiTemplateController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->get('search');
        $category = $request->get('category');

        $templates = WikiTemplate::with('user')
            ->when($search, fn($query) => $query->where('name', 'like', "%{$search}%"))
            ->when($category, fn($query) => $query->byCategory($category))
            ->ordered()
            ->paginate(12);

        $templates->getCollection()->transform(function ($template) {
            $templateArray = $template->toArray();
            $templateArray['preview_url'] = $template->getPreviewUrl();
            return $templateArray;
        });

        $categories = WikiTemplate::select('category')
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category');

        return Inertia::render('Wiki/Templates/Index', [
            'templates' => $templates,
            'categories' => $categories,
            'search' => $search,
            'category' => $category,
        ]);
    }

    public function show(WikiTemplate $template)
    {
        $templateArray = $template->toArray();
        $templateArray['preview_url'] = $template->getPreviewUrl();

        return Inertia::render('Wiki/Templates/Show', [
            'template' => $templateArray,
        ]);
    }

    public function create()
    {
        return Inertia::render('Wiki/Templates/Create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'content' => 'required|string',
            'featured_image' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $template = WikiTemplate::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'description' => $request->description,
            'content' => $request->content,
            'featured_image' => $request->featured_image,
            'category' => $request->category,
            'is_active' => $request->boolean('is_active', true),
            'user_id' => auth()->id(),
            'sort_order' => WikiTemplate::max('sort_order') + 1,
        ]);

        return redirect()->route('wiki.templates.show', $template)
            ->with('success', 'Template created successfully.');
    }

    public function edit(WikiTemplate $template)
    {
        $this->authorize('update', $template);

        $templateArray = $template->toArray();
        $templateArray['preview_url'] = $template->getPreviewUrl();

        return Inertia::render('Wiki/Templates/Edit', [
            'template' => $templateArray,
        ]);
    }

    public function update(Request $request, WikiTemplate $template)
    {
        $this->authorize('update', $template);

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'content' => 'required|string',
            'featured_image' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $template->update([
            'name' => $request->name,
            'description' => $request->description,
            'content' => $request->content,
            'featured_image' => $request->featured_image,
            'category' => $request->category,
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('wiki.templates.show', $template)
            ->with('success', 'Template updated successfully.');
    }

    public function destroy(WikiTemplate $template)
    {
        $this->authorize('delete', $template);

        $template->delete();

        return redirect()->route('wiki.templates.index')
            ->with('success', 'Template deleted successfully.');
    }

    public function apiIndex()
    {
        $templates = WikiTemplate::active()
            ->ordered()
            ->get()
            ->map(function ($template) {
                return [
                    'name' => $template->name,
                    'html' => $template->content,
                    'featured_image' => $template->getPreviewUrl(),
                ];
            });

        return response()->json($templates);
    }
}
