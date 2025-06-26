<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Folder;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class FolderController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = Folder::with(['parent', 'children', 'creator', 'tags'])
            ->accessibleByUser($user)
            ->active();

        // Apply filters
        if ($request->parent_id) {
            $query->where('parent_id', $request->parent_id);
        } else {
            $query->rootFolders();
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->tag_ids) {
            $tagIds = explode(',', $request->tag_ids);
            $query->whereHas('tags', function ($q) use ($tagIds) {
                $q->whereIn('tags.id', $tagIds);
            });
        }

        $folders = $query->latest()->get();

        // Get breadcrumb path
        $breadcrumbs = [];
        if ($request->parent_id) {
            $currentFolder = Folder::find($request->parent_id);
            while ($currentFolder) {
                $breadcrumbs[] = [
                    'id' => $currentFolder->id,
                    'name' => $currentFolder->name,
                ];
                $currentFolder = $currentFolder->parent;
            }
            $breadcrumbs = array_reverse($breadcrumbs);
        }

        $tags = Tag::withCount(['documents', 'folders'])->get();

        return Inertia::render('Folders/Index', [
            'folders' => $folders->map(function ($folder) {
                return [
                    'id' => $folder->id,
                    'name' => $folder->name,
                    'description' => $folder->description,
                    'parent_id' => $folder->parent_id,
                    'assignment_type' => $folder->assignment_type,
                    'children_count' => $folder->children->count(),
                    'documents_count' => $folder->documents->count(),
                    'creator' => $folder->creator->name,
                    'tags' => $folder->tags,
                    'created_at' => $folder->created_at,
                    'assigned_entities' => $folder->getAssignedEntities(),
                ];
            }),
            'breadcrumbs' => $breadcrumbs,
            'tags' => $tags,
            'filters' => $request->only(['parent_id', 'search', 'tag_ids']),
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();

        $folders = Folder::accessibleByUser($user)
            ->active()
            ->whereNotNull('id')
            ->where('id', '>', 0)
            ->with('parent')
            ->get()
            ->map(function ($folder) {
                return [
                    'id' => $folder->id,
                    'name' => $folder->name,
                    'full_path' => $folder->getFullPath(),
                ];
            })
            ->filter(function ($folder) {
                return !empty($folder['id']) && !empty(trim($folder['name']));
            });

        $tags = Tag::whereNotNull('id')
            ->where('id', '>', 0)
            ->whereNotNull('name')
            ->where('name', '!=', '')
            ->get()
            ->filter(function ($tag) {
                return !empty($tag->id) && !empty(trim($tag->name));
            });

        $departments = Department::active()
            ->whereNotNull('id')
            ->where('id', '>', 0)
            ->whereNotNull('name')
            ->where('name', '!=', '')
            ->get()
            ->filter(function ($dept) {
                return !empty($dept->id) && !empty(trim($dept->name));
            });

        $users = User::select('id', 'name', 'email')
            ->whereNotNull('id')
            ->where('id', '>', 0)
            ->whereNotNull('name')
            ->where('name', '!=', '')
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->get()
            ->filter(function ($user) {
                return !empty($user->id) && !empty(trim($user->name)) && !empty(trim($user->email));
            });

        return Inertia::render('Folders/Create', [
            'folders' => $folders,
            'tags' => $tags,
            'departments' => $departments,
            'users' => $users,
            'parent_id' => $request->parent_id,
        ]);
    }

    public function store(Request $request)
    {

        // Transform parent_id before validation
        $validationData = $request->all();
        if ($validationData['parent_id'] === 'none') {
            $validationData['parent_id'] = null;
        }

        $validator = \Validator::make($validationData, [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:folders,id',
            'assignment_type' => 'required|in:company_wide,department,user,hierarchy',
            'assignment_ids' => 'nullable|array',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'exists:tags,id',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $parentId = $validationData['parent_id'];

        $user = $request->user();

        // Check if parent folder is accessible
        if ($parentId) {
            $parentFolder = Folder::findOrFail($parentId);
            if (!$parentFolder->isAccessibleBy($user)) {
                return back()->withErrors(['parent_id' => 'You do not have access to the parent folder.']);
            }
            $s3Path = $parentFolder->s3_path . '/' . Str::slug($validationData['name']);
        } else {
            $s3Path = Str::slug($validationData['name']);
        }

        $folder = Folder::create([
            'name' => $validationData['name'],
            'description' => $validationData['description'],
            'parent_id' => $parentId,
            's3_path' => $s3Path,
            'assignment_type' => $validationData['assignment_type'],
            'assignment_ids' => $validationData['assignment_ids'],
            'created_by' => $user->id,
        ]);

        // Attach tags
        if (!empty($validationData['tag_ids'])) {
            $folder->tags()->attach($validationData['tag_ids']);
        }

        return redirect()->route('folders.index', $parentId ? ['parent_id' => $parentId] : [])
            ->with('success', 'Folder created successfully.');
    }

        public function show(Folder $folder): Response
    {
        $user = request()->user();

        if (!$folder->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this folder.');
        }

        $folder->load(['parent', 'children', 'documents', 'creator', 'tags']);

        // Get child folders with stats
        $childFolders = $folder->children->map(function ($child) {
            return [
                'id' => $child->id,
                'name' => $child->name,
                'description' => $child->description,
                'children_count' => $child->children->count(),
                'documents_count' => $child->documents->count(),
                'created_at' => $child->created_at,
            ];
        });

        // Get documents in this folder
        $documents = $folder->documents->map(function ($document) {
            return [
                'id' => $document->id,
                'name' => $document->name,
                'original_filename' => $document->original_filename,
                'file_type' => $document->file_type,
                'file_size' => $document->getFormattedFileSize(),
                'download_count' => $document->download_count,
                'uploader' => $document->uploader->name,
                'created_at' => $document->created_at,
            ];
        });

        return Inertia::render('Folders/Show', [
            'folder' => [
                'id' => $folder->id,
                'name' => $folder->name,
                'description' => $folder->description,
                'full_path' => $folder->getFullPath(),
                'parent_id' => $folder->parent_id,
                'assignment_type' => $folder->assignment_type,
                'creator' => $folder->creator->name,
                'tags' => $folder->tags,
                'created_at' => $folder->created_at,
                'assigned_entities' => $folder->getAssignedEntities(),
            ],
            'childFolders' => $childFolders,
            'documents' => $documents,
        ]);
    }

        public function edit(Folder $folder): Response
    {
        $user = request()->user();

        if (!$folder->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this folder.');
        }

        $folders = Folder::accessibleByUser($user)
            ->active()
            ->whereNotNull('id')
            ->where('id', '>', 0)
            ->where('id', '!=', $folder->id) // Exclude self
            ->with('parent')
            ->get()
            ->filter(function ($f) use ($folder) {
                // Exclude descendants to prevent circular references
                return !str_starts_with($f->s3_path, $folder->s3_path . '/');
            })
            ->map(function ($f) {
                return [
                    'id' => $f->id,
                    'name' => $f->name,
                    'full_path' => $f->getFullPath(),
                ];
            })
            ->filter(function ($folderData) {
                return !empty($folderData['id']) && !empty(trim($folderData['name']));
            })
            ->values();

        $tags = Tag::all();
        $departments = Department::active()->get();
        $users = User::select('id', 'name', 'email')->get();

        $folder->load(['tags']);

        return Inertia::render('Folders/Edit', [
            'folder' => $folder,
            'folders' => $folders,
            'tags' => $tags,
            'departments' => $departments,
            'users' => $users,
        ]);
    }

        public function update(Request $request, Folder $folder)
    {
        $user = $request->user();

        if (!$folder->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this folder.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:folders,id',
            'assignment_type' => 'required|in:company_wide,department,user,hierarchy',
            'assignment_ids' => 'nullable|array',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'exists:tags,id',
        ]);

        // Check if parent folder is accessible
        if ($request->parent_id) {
            $parentFolder = Folder::findOrFail($request->parent_id);
            if (!$parentFolder->isAccessibleBy($user)) {
                return back()->withErrors(['parent_id' => 'You do not have access to the parent folder.']);
            }

            // Prevent circular references
            if ($parentFolder->s3_path && str_starts_with($parentFolder->s3_path, $folder->s3_path . '/')) {
                return back()->withErrors(['parent_id' => 'Cannot move folder to its own descendant.']);
            }
        }

        $folder->update([
            'name' => $request->name,
            'description' => $request->description,
            'parent_id' => $request->parent_id,
            'assignment_type' => $request->assignment_type,
            'assignment_ids' => $request->assignment_ids,
        ]);

        // Sync tags
        $folder->tags()->sync($request->tag_ids ?? []);

        return redirect()->route('folders.show', $folder)
            ->with('success', 'Folder updated successfully.');
    }

        public function destroy(Folder $folder)
    {
        $user = request()->user();

        if (!$folder->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this folder.');
        }

        // Check if folder has children or documents
        if ($folder->children()->count() > 0 || $folder->documents()->count() > 0) {
            return back()->withErrors(['folder' => 'Cannot delete folder that contains subfolders or documents.']);
        }

        $parentId = $folder->parent_id;
        $folder->delete();

        return redirect()->route('folders.index', ['parent_id' => $parentId])
            ->with('success', 'Folder deleted successfully.');
    }
    }
