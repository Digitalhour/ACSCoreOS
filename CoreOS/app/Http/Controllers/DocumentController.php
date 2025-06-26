<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Document;
use App\Models\Folder;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = Document::with(['folder', 'uploader', 'tags'])
            ->accessibleByUser($user)
            ->active();

        // Apply filters
        if ($request->folder_id) {
            $query->where('folder_id', $request->folder_id);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('original_filename', 'like', "%{$search}%");
            });
        }

        if ($request->file_type) {
            $query->byFileType($request->file_type);
        }

        if ($request->tag_ids) {
            $tagIds = explode(',', $request->tag_ids);
            $query->whereHas('tags', function ($q) use ($tagIds) {
                $q->whereIn('tags.id', $tagIds);
            });
        }

        $documents = $query->latest()->paginate(20)->through(function ($document) {
            return [
                'id' => $document->id,
                'name' => $document->name,
                'original_filename' => $document->original_filename,
                'description' => $document->description,
                'file_type' => $document->file_type,
                'file_size' => $document->file_size,
                'folder' => [
                    'id' => $document->folder->id,
                    'name' => $document->folder->name,
                    'full_path' => $document->folder->getFullPath(),
                ],
                'uploader' => [
                    'id' => $document->uploader->id,
                    'name' => $document->uploader->name,
                ],
                'tags' => $document->tags->map(function ($tag) {
                    return [
                        'id' => $tag->id,
                        'name' => $tag->name,
                        'color' => $tag->color,
                    ];
                }),
                'download_count' => $document->download_count,
                'created_at' => $document->created_at->toISOString(),
            ];
        });

        $folders = Folder::with(['children', 'parent'])
            ->accessibleByUser($user)
            ->active()
            ->whereNotNull('id')
            ->where('id', '>', 0)
            ->get()
            ->map(function ($folder) {
                return [
                    'id' => $folder->id,
                    'name' => $folder->name,
                    'full_path' => $folder->getFullPath(),
                    'parent_id' => $folder->parent_id,
                ];
            })
            ->filter(function ($folder) {
                return !empty($folder['id']) && !empty(trim($folder['name']));
            });

        $tags = Tag::withCount(['documents', 'folders'])->get();

        $fileTypes = Document::accessibleByUser($user)
            ->active()
            ->distinct()
            ->pluck('file_type')
            ->filter(function ($type) {
                return !empty($type) && !empty(trim($type));
            })
            ->sort()
            ->values();

        return Inertia::render('Documents/Index', [
            'documents' => $documents,
            'folders' => $folders,
            'tags' => $tags,
            'fileTypes' => $fileTypes,
            'filters' => $request->only(['folder_id', 'search', 'file_type', 'tag_ids']),
        ]);
    }

    public function create(): Response
    {
        $user = request()->user();

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

        return Inertia::render('Documents/Create', [
            'folders' => $folders,
            'tags' => $tags,
            'departments' => $departments,
            'users' => $users,
            'preselected_folder_id' => request()->get('folder_id'),
        ]);
    }

    public function store(Request $request)
    {
        // Handle the "none" value from frontend before validation
        if ($request->folder_id === 'none') {
            return back()->withErrors(['folder_id' => 'Please select a valid folder.']);
        }

        $request->validate([
            'files.*' => 'required|file|max:102400', // 100MB max
            'folder_id' => 'required|exists:folders,id',
            'assignment_type' => 'required|in:company_wide,department,user,hierarchy',
            'assignment_ids' => 'nullable|array',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'exists:tags,id',
        ]);

        $user = $request->user();
        $folder = Folder::findOrFail($request->folder_id);

        if (!$folder->isAccessibleBy($user)) {
            return back()->withErrors(['folder_id' => 'You do not have access to this folder.']);
        }

        $documents = [];

        foreach ($request->file('files') as $file) {
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $fileSize = $file->getSize();

            // Generate unique filename
            $filename = Str::uuid() . '.' . $extension;
            $s3Key = "Company Documents/{$folder->s3_path}/{$filename}";

            // Upload to S3 with proper headers for inline viewing
            $headers = [
                'ContentType' => $file->getMimeType(),
                'ContentDisposition' => 'inline; filename="' . $originalName . '"',
                'CacheControl' => 'max-age=31536000'
            ];

            $path = Storage::disk('s3')->putFileAs(
                "Company Documents/{$folder->s3_path}",
                $file,
                $filename,
                $headers
            );

            $s3Url = Storage::disk('s3')->url($path);

            $document = Document::create([
                'name' => pathinfo($originalName, PATHINFO_FILENAME),
                'original_filename' => $originalName,
                'file_type' => $extension,
                'file_size' => $fileSize,
                's3_key' => $s3Key,
                's3_url' => $s3Url,
                'folder_id' => $folder->id,
                'assignment_type' => $request->assignment_type,
                'assignment_ids' => $request->assignment_ids,
                'uploaded_by' => $user->id,
            ]);

            // Attach tags
            if ($request->tag_ids) {
                $document->tags()->attach($request->tag_ids);
            }

            $documents[] = $document;
        }

        return redirect()->route('documents.index', ['folder_id' => $folder->id])
            ->with('success', count($documents) . ' document(s) uploaded successfully.');
    }

    public function show(Document $document): Response
    {
        $user = request()->user();

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

        $document->load(['folder.parent', 'uploader', 'tags']);

        // Build folder path for breadcrumbs
        $folderPath = [];
        $currentFolder = $document->folder;
        while ($currentFolder) {
            $folderPath[] = [
                'id' => $currentFolder->id,
                'name' => $currentFolder->name,
            ];
            $currentFolder = $currentFolder->parent;
        }
        $folderPath = array_reverse($folderPath);

        return Inertia::render('Documents/Show', [
            'document' => [
                'id' => $document->id,
                'name' => $document->name,
                'original_filename' => $document->original_filename,
                'description' => $document->description,
                'file_type' => $document->file_type,
                'file_size' => $document->getFormattedFileSize(),
                'folder' => [
                    'id' => $document->folder->id,
                    'name' => $document->folder->name,
                    'full_path' => $document->folder->getFullPath(),
                ],
                'uploader' => [
                    'id' => $document->uploader->id,
                    'name' => $document->uploader->name,
                ],
                'tags' => $document->tags,
                'download_count' => $document->download_count,
                'last_accessed_at' => $document->last_accessed_at,
                'created_at' => $document->created_at,
                'updated_at' => $document->updated_at,
                'assigned_entities' => $document->getAssignedEntities(),
                'download_url' => $document->getDownloadUrl(),
                'view_url' => route('documents.view', $document->id),
            ],
            'folderPath' => $folderPath,
        ]);
    }

    public function edit(Document $document): Response
    {
        $user = request()->user();

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

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

        $tags = Tag::all();
        $departments = Department::active()->get();
        $users = User::select('id', 'name', 'email')->get();

        $document->load(['tags']);

        return Inertia::render('Documents/Edit', [
            'document' => $document,
            'folders' => $folders,
            'tags' => $tags,
            'departments' => $departments,
            'users' => $users,
        ]);
    }

    public function update(Request $request, Document $document)
    {
        $user = $request->user();

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'folder_id' => 'required|exists:folders,id',
            'assignment_type' => 'required|in:company_wide,department,user,hierarchy',
            'assignment_ids' => 'nullable|array',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => 'exists:tags,id',
        ]);

        $folder = Folder::findOrFail($request->folder_id);
        if (!$folder->isAccessibleBy($user)) {
            return back()->withErrors(['folder_id' => 'You do not have access to this folder.']);
        }

        $document->update([
            'name' => $request->name,
            'description' => $request->description,
            'folder_id' => $request->folder_id,
            'assignment_type' => $request->assignment_type,
            'assignment_ids' => $request->assignment_ids,
        ]);

        // Sync tags
        $document->tags()->sync($request->tag_ids ?? []);

        return redirect()->route('documents.show', $document)
            ->with('success', 'Document updated successfully.');
    }

    public function destroy(Document $document)
    {
        $user = request()->user();

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

        // Delete from S3
        Storage::disk('s3')->delete($document->s3_key);

        // Soft delete the document
        $document->delete();

        return redirect()->route('documents.index')
            ->with('success', 'Document deleted successfully.');
    }

    public function download(Document $document)
    {
        $user = request()->user();

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

        $document->incrementDownloadCount();

        return redirect($document->getDownloadUrl());
    }

    /**
     * View document inline (especially for PDFs)
     */
    public function view(Document $document)
    {
        $user = request()->user();

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

        // Increment view count
        $document->incrementDownloadCount();

        try {
            // Get file content from S3
            $fileContent = Storage::disk('s3')->get($document->s3_key);

            // Determine mime type
            $mimeType = match(strtolower($document->file_type)) {
                'pdf' => 'application/pdf',
                'jpg', 'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'txt' => 'text/plain',
                'html' => 'text/html',
                'css' => 'text/css',
                'js' => 'application/javascript',
                'json' => 'application/json',
                'xml' => 'application/xml',
                default => 'application/octet-stream'
            };

            return response($fileContent)
                ->header('Content-Type', $mimeType)
                ->header('Content-Disposition', 'inline; filename="' . $document->original_filename . '"')
                ->header('Cache-Control', 'public, max-age=31536000')
                ->header('X-Content-Type-Options', 'nosniff')
                ->header('Access-Control-Allow-Origin', '*');

        } catch (\Exception $e) {
            // Fallback to S3 direct URL if file serving fails
            return redirect($document->s3_url);
        }
    }
}
