<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Document;
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

        $query = Folder::with(['parent', 'children', 'creator', 'tags', 'documents'])
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

        // Get breadcrumb path and current folder info
        $breadcrumbs = [];
        $currentFolder = null;
        if ($request->parent_id) {
            $currentFolder = Folder::with(['documents.uploader', 'documents.tags'])->find($request->parent_id);
            if ($currentFolder) {
                $temp = $currentFolder;
                while ($temp) {
                    $breadcrumbs[] = [
                        'id' => $temp->id,
                        'name' => $temp->name,
                    ];
                    $temp = $temp->parent;
                }
                $breadcrumbs = array_reverse($breadcrumbs);
            }
        }

        // Get documents in current folder ONLY if we're inside a folder
        $documents = collect();
        if ($currentFolder) {
            $documentsQuery = $currentFolder->documents()->with(['uploader', 'tags']);

            // Apply search filter to documents as well
            if ($request->search) {
                $search = $request->search;
                $documentsQuery->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('original_filename', 'like', "%{$search}%");
                });
            }

            // Apply tag filter to documents
            if ($request->tag_ids) {
                $tagIds = explode(',', $request->tag_ids);
                $documentsQuery->whereHas('tags', function ($q) use ($tagIds) {
                    $q->whereIn('tags.id', $tagIds);
                });
            }

            $documents = $documentsQuery->get()->map(function ($document) {
                return [
                    'id' => $document->id,
                    'name' => $document->name,
                    'original_filename' => $document->original_filename,
                    'description' => $document->description,
                    'file_type' => $document->file_type,
                    'file_size' => $document->getFormattedFileSize(),
                    'download_count' => $document->download_count,
                    'uploader' => $document->uploader->name,
                    'tags' => $document->tags->map(function ($tag) {
                        return [
                            'id' => $tag->id,
                            'name' => $tag->name,
                            'color' => $tag->color,
                        ];
                    }),
                    'created_at' => $document->created_at,
                    'folder_id' => $document->folder_id,
                    'assignment_type' => $document->assignment_type,
                    'assignment_ids' => $document->assignment_ids,
                    'download_url' => $document->getDownloadUrl(),
                    'view_url' => route('documents.show', $document->id), // Use the existing show route
                ];
            });
        }
        // At root level, don't show any documents - only folders

        $tags = Tag::withCount(['documents', 'folders'])->get();

        // Get data for creating folders/documents
        $availableFolders = Folder::accessibleByUser($user)
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

        $availableTags = Tag::whereNotNull('id')
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
            'documents' => $documents,
            'breadcrumbs' => $breadcrumbs,
            'currentFolder' => $currentFolder ? [
                'id' => $currentFolder->id,
                'name' => $currentFolder->name,
                'description' => $currentFolder->description,
                'full_path' => $currentFolder->getFullPath(),
                'creator' => $currentFolder->creator->name,
                'created_at' => $currentFolder->created_at,
                'assignment_type' => $currentFolder->assignment_type,
                'assigned_entities' => $currentFolder->getAssignedEntities(),
                'tags' => $currentFolder->tags,
            ] : null,
            'tags' => $tags,
            'availableFolders' => $availableFolders,
            'availableTags' => $availableTags,
            'departments' => $departments,
            'users' => $users,
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
        // Redirect to the unified index view with this folder as parent
        return redirect()->route('folders.index', ['parent_id' => $folder->id]);
    }

    public function showDocument($documentId)
    {
        $user = request()->user();
        $document = Document::findOrFail($documentId);

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

        // Redirect to the folder containing this document
        return redirect()->route('folders.index', [
            'parent_id' => $document->folder_id,
            'highlight' => $documentId
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

        // Transform parent_id before validation (same as store method)
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

        // Check if parent folder is accessible
        if ($parentId) {
            $parentFolder = Folder::findOrFail($parentId);
            if (!$parentFolder->isAccessibleBy($user)) {
                return back()->withErrors(['parent_id' => 'You do not have access to the parent folder.']);
            }

            // Prevent circular references
            if ($parentFolder->s3_path && str_starts_with($parentFolder->s3_path, $folder->s3_path . '/')) {
                return back()->withErrors(['parent_id' => 'Cannot move folder to its own descendant.']);
            }
        }

        $folder->update([
            'name' => $validationData['name'],
            'description' => $validationData['description'],
            'parent_id' => $parentId,
            'assignment_type' => $validationData['assignment_type'],
            'assignment_ids' => $validationData['assignment_ids'],
        ]);

        // Sync tags
        $folder->tags()->sync($validationData['tag_ids'] ?? []);

        return redirect()->route('folders.index', ['parent_id' => $folder->id])
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

    /**
     * Bulk operations for documents and folders
     */
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'folder_ids' => 'nullable|array',
            'folder_ids.*' => 'exists:folders,id',
            'document_ids' => 'nullable|array',
            'document_ids.*' => 'exists:documents,id',
        ]);

        $user = $request->user();
        $deletedCount = 0;

        // Delete folders
        if ($request->folder_ids) {
            foreach ($request->folder_ids as $folderId) {
                $folder = Folder::find($folderId);
                if ($folder && $folder->isAccessibleBy($user) &&
                    $folder->children()->count() === 0 && $folder->documents()->count() === 0) {
                    $folder->delete();
                    $deletedCount++;
                }
            }
        }

        // Delete documents
        if ($request->document_ids) {
            foreach ($request->document_ids as $documentId) {
                $document = Document::find($documentId);
                if ($document && $document->isAccessibleBy($user)) {
                    // Delete from S3
                    \Storage::disk('s3')->delete($document->s3_key);
                    $document->delete();
                    $deletedCount++;
                }
            }
        }

        return back()->with('success', "Deleted {$deletedCount} item(s) successfully.");
    }

    /**
     * Move documents and folders
     */
    public function bulkMove(Request $request)
    {
        $request->validate([
            'target_folder_id' => 'required|exists:folders,id',
            'folder_ids' => 'nullable|array',
            'folder_ids.*' => 'exists:folders,id',
            'document_ids' => 'nullable|array',
            'document_ids.*' => 'exists:documents,id',
        ]);

        $user = $request->user();
        $targetFolder = Folder::findOrFail($request->target_folder_id);

        if (!$targetFolder->isAccessibleBy($user)) {
            return back()->withErrors(['target_folder_id' => 'You do not have access to the target folder.']);
        }

        $movedCount = 0;

        // Move folders
        if ($request->folder_ids) {
            foreach ($request->folder_ids as $folderId) {
                $folder = Folder::find($folderId);
                if ($folder && $folder->isAccessibleBy($user)) {
                    // Prevent circular references
                    if (!str_starts_with($targetFolder->s3_path, $folder->s3_path . '/')) {
                        $folder->update(['parent_id' => $targetFolder->id]);
                        $movedCount++;
                    }
                }
            }
        }

        // Move documents
        if ($request->document_ids) {
            foreach ($request->document_ids as $documentId) {
                $document = Document::find($documentId);
                if ($document && $document->isAccessibleBy($user)) {
                    $document->update(['folder_id' => $targetFolder->id]);
                    $movedCount++;
                }
            }
        }

        return back()->with('success', "Moved {$movedCount} item(s) successfully.");
    }




    /**
     * Employee-focused index view for browsing accessible documents and folders
     */
    public function employeeIndex(Request $request): Response
    {
        $user = $request->user();

        $query = Folder::with(['parent', 'children', 'creator', 'tags', 'documents'])
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

        $folders = $query->latest()->get();

        // Get breadcrumb path and current folder info
        $breadcrumbs = [];
        $currentFolder = null;
        if ($request->parent_id) {
            $currentFolder = Folder::with(['documents.uploader', 'documents.tags'])->find($request->parent_id);
            if ($currentFolder && $currentFolder->isAccessibleBy($user)) {
                $temp = $currentFolder;
                while ($temp) {
                    $breadcrumbs[] = [
                        'id' => $temp->id,
                        'name' => $temp->name,
                    ];
                    $temp = $temp->parent;
                }
                $breadcrumbs = array_reverse($breadcrumbs);
            } else {
                // User doesn't have access to this folder
                abort(403, 'You do not have access to this folder.');
            }
        }

        // Get documents in current folder ONLY if we're inside a folder
        $documents = collect();
        if ($currentFolder) {
            $documentsQuery = $currentFolder->documents()
                ->with(['uploader', 'tags'])
                ->accessibleByUser($user);

            // Apply search filter to documents as well
            if ($request->search) {
                $search = $request->search;
                $documentsQuery->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('original_filename', 'like', "%{$search}%");
                });
            }

            $documents = $documentsQuery->get()->map(function ($document) {
                return [
                    'id' => $document->id,
                    'name' => $document->name,
                    'original_filename' => $document->original_filename,
                    'description' => $document->description,
                    'file_type' => $document->file_type,
                    'file_size' => $document->getFormattedFileSize(),
                    'download_count' => $document->download_count,
                    'uploader' => $document->uploader->name,
                    'tags' => $document->tags->map(function ($tag) {
                        return [
                            'id' => $tag->id,
                            'name' => $tag->name,
                            'color' => $tag->color,
                        ];
                    }),
                    'created_at' => $document->created_at,
                    'download_url' => $document->getDownloadUrl(),
                    'view_url' => route('documents.view', $document->id),
                ];
            });
        }

        return Inertia::render('Folders/EmployeeIndex', [
            'folders' => $folders->map(function ($folder) {
                return [
                    'id' => $folder->id,
                    'name' => $folder->name,
                    'description' => $folder->description,
                    'children_count' => $folder->children->count(),
                    'documents_count' => $folder->documents->count(),
                    'creator' => $folder->creator->name,
                    'tags' => $folder->tags->map(function ($tag) {
                        return [
                            'id' => $tag->id,
                            'name' => $tag->name,
                            'color' => $tag->color,
                        ];
                    }),
                    'created_at' => $folder->created_at,
                ];
            }),
            'documents' => $documents,
            'breadcrumbs' => $breadcrumbs,
            'currentFolder' => $currentFolder ? [
                'id' => $currentFolder->id,
                'name' => $currentFolder->name,
                'description' => $currentFolder->description,
                'full_path' => $currentFolder->getFullPath(),
                'creator' => $currentFolder->creator->name,
                'created_at' => $currentFolder->created_at,
                'tags' => $currentFolder->tags->map(function ($tag) {
                    return [
                        'id' => $tag->id,
                        'name' => $tag->name,
                        'color' => $tag->color,
                    ];
                }),
            ] : null,
            'filters' => $request->only(['parent_id', 'search']),
        ]);
    }
}
