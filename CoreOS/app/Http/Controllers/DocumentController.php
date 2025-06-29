<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Document;
use App\Models\Folder;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
    /**
     * Display a listing of the documents.
     *
     * @param Request $request
     * @return Response
     */
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

    /**
     * Show the form for creating a new document.
     *
     * @return Response
     */
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

    /**
     * Store a newly created document in storage.
     *
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
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

            $filename = Str::uuid() . '.' . $extension;
            $s3Key = "Company Documents/{$folder->s3_path}/{$filename}";

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

            if ($request->tag_ids) {
                $document->tags()->attach($request->tag_ids);
            }

            $documents[] = $document;
        }

        return redirect()->route('folders.index', ['parent_id' => $folder->id])
            ->with('success', count($documents) . ' document(s) uploaded successfully.');
    }

    /**
     * Display the specified document.
     *
     * @param Document $document
     * @return Response
     */
    public function show(Document $document): Response
    {
        $user = request()->user();

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

        $document->load(['folder.parent', 'uploader', 'tags']);

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

    /**
     * Show the form for editing the specified document.
     *
     * @param Document $document
     * @return Response
     */
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

    /**
     * Update the specified document in storage.
     *
     * @param Request $request
     * @param Document $document
     * @return \Illuminate\Http\RedirectResponse
     */
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

        $document->tags()->sync($request->tag_ids ?? []);

        return redirect()->route('folders.index', ['parent_id' => $document->folder_id])
            ->with('success', 'Document updated successfully.');
    }

    /**
     * Remove the specified document from storage.
     *
     * @param Document $document
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy(Document $document)
    {
        $user = request()->user();

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

        $folderId = $document->folder_id;

        Storage::disk('s3')->delete($document->s3_key);
        $document->delete();

        return redirect()->route('folders.index', ['parent_id' => $folderId])
            ->with('success', 'Document deleted successfully.');
    }

    /**
     * Redirect to a pre-signed URL for downloading the document.
     *
     * @param Document $document
     * @return \Illuminate\Http\RedirectResponse
     */
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
     * Generate a temporary URL and redirect to view the document inline.
     *
     * @param Document $document
     * @return \Illuminate\Http\RedirectResponse
     */
    public function view(Document $document)
    {
        $user = request()->user();

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

        // Increment view count as the user is accessing the file.
        $document->incrementDownloadCount();

        // Dynamically determine the MIME type for the response header.
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
            default => 'application/octet-stream' // A generic byte stream
        };

        try {
            // Generate a temporary, pre-signed URL to the file on S3.
            // This URL is valid for a short time (e.g., 15 minutes).
            // We override the response headers to ensure it's displayed inline in the browser.
            $temporaryUrl = Storage::disk('s3')->temporaryUrl(
                $document->s3_key,
                now()->addMinutes(15),
                [
                    'ResponseContentType' => $mimeType,
                    'ResponseContentDisposition' => 'inline; filename="' . $document->original_filename . '"',
                ]
            );

            // Redirect the user's browser directly to the S3 file.
            return redirect($temporaryUrl);

        } catch (\Exception $e) {
            // Log the error for debugging purposes.
            Log::error("Could not generate temporary URL for document ID {$document->id}: " . $e->getMessage());

            // As a fallback, redirect to the permanent S3 URL.
            // Note: This may not display correctly if the S3 bucket objects are private.
            return redirect($document->s3_url);
        }
    }

    /**
     * Employee view for documents - uses the same view method for generating S3 URLs
     */
    public function employeeView(Document $document): Response
    {
        $user = request()->user();

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

        $document->load(['folder.parent', 'uploader', 'tags']);

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

        return Inertia::render('Documents/EmployeeView', [
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
                'created_at' => $document->created_at,
                'download_url' => $document->getDownloadUrl(),
                'view_url' => route('documents.view', $document->id), // This should work the same as show method
            ],
            'folderPath' => $folderPath,
        ]);
    }

    /**
     * Alternative employee view method that generates temporary URL directly
     */
    public function employeeViewFile(Document $document)
    {
        $user = request()->user();

        if (!$document->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this document.');
        }

        // This is the same logic as the view method but for employee context
        $document->incrementDownloadCount();

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

        try {
            $temporaryUrl = Storage::disk('s3')->temporaryUrl(
                $document->s3_key,
                now()->addMinutes(15),
                [
                    'ResponseContentType' => $mimeType,
                    'ResponseContentDisposition' => 'inline; filename="' . $document->original_filename . '"',
                ]
            );

            return redirect($temporaryUrl);

        } catch (\Exception $e) {
            Log::error("Could not generate temporary URL for document ID {$document->id}: " . $e->getMessage());
            return redirect($document->s3_url);
        }
    }
}
