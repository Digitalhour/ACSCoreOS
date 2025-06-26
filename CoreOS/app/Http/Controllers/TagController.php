<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TagController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Tag::with('creator')
            ->withCount(['documents', 'folders']);

        if ($request->search) {
            $query->byName($request->search);
        }

        $tags = $query->latest()->paginate(20);

        return Inertia::render('Tags/Index', [
            'tags' => $tags,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Tags/Create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:tags,name',
            'color' => 'required|string|regex:/^#[0-9A-F]{6}$/i',
            'description' => 'nullable|string',
        ]);

        Tag::create([
            'name' => $request->name,
            'color' => $request->color,
            'description' => $request->description,
            'created_by' => $request->user()->id,
        ]);

        return redirect()->route('tags.index')
            ->with('success', 'Tag created successfully.');
    }

    public function show(Tag $tag): Response
    {
        $tag->load(['creator', 'documents.folder', 'folders']);

        return Inertia::render('Tags/Show', [
            'tag' => [
                'id' => $tag->id,
                'name' => $tag->name,
                'color' => $tag->color,
                'description' => $tag->description,
                'creator' => $tag->creator->name,
                'usage_count' => $tag->getUsageCount(),
                'created_at' => $tag->created_at,
            ],
            'documents' => $tag->documents->map(function ($document) {
                return [
                    'id' => $document->id,
                    'name' => $document->name,
                    'folder' => [
                        'id' => $document->folder->id,
                        'name' => $document->folder->name,
                        'full_path' => $document->folder->getFullPath(),
                    ],
                    'file_type' => $document->file_type,
                    'created_at' => $document->created_at,
                ];
            }),
            'folders' => $tag->folders->map(function ($folder) {
                return [
                    'id' => $folder->id,
                    'name' => $folder->name,
                    'full_path' => $folder->getFullPath(),
                    'documents_count' => $folder->documents->count(),
                    'created_at' => $folder->created_at,
                ];
            }),
        ]);
    }

    public function edit(Tag $tag): Response
    {
        return Inertia::render('Tags/Edit', [
            'tag' => $tag,
        ]);
    }

    public function update(Request $request, Tag $tag)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:tags,name,' . $tag->id,
            'color' => 'required|string|regex:/^#[0-9A-F]{6}$/i',
            'description' => 'nullable|string',
        ]);

        $tag->update([
            'name' => $request->name,
            'color' => $request->color,
            'description' => $request->description,
        ]);

        return redirect()->route('tags.show', $tag)
            ->with('success', 'Tag updated successfully.');
    }

    public function destroy(Tag $tag)
    {
        if ($tag->getUsageCount() > 0) {
            return back()->withErrors(['tag' => 'Cannot delete tag that is currently in use.']);
        }

        $tag->delete();

        return redirect()->route('tags.index')
            ->with('success', 'Tag deleted successfully.');
    }

    public function search(Request $request)
    {
        $search = $request->get('q', '');

        $tags = Tag::when($search, function ($query) use ($search) {
            $query->byName($search);
        })
            ->whereNotNull('id')
            ->where('id', '>', 0)
            ->whereNotNull('name')
            ->where('name', '!=', '')
            ->limit(10)
            ->get(['id', 'name', 'color'])
            ->filter(function ($tag) {
                return !empty($tag->id) && !empty(trim($tag->name));
            });

        return response()->json($tags);
    }
}
