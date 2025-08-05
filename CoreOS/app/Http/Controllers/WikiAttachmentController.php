<?php

namespace App\Http\Controllers;

use App\Models\WikiAttachment;
use App\Models\WikiPage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class WikiAttachmentController extends Controller
{
    public function store(Request $request, WikiPage $page)
    {
        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
        ]);

        try {
            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $path = "core_wiki/attachments/{$page->id}/{$filename}";

            // Upload to S3
            Storage::disk('s3')->put($path, file_get_contents($file));

            // Create attachment record
            $attachment = WikiAttachment::create([
                'name' => pathinfo($originalName, PATHINFO_FILENAME),
                'original_name' => $originalName,
                'file_path' => $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'wiki_page_id' => $page->id,
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'attachment' => [
                    'id' => $attachment->id,
                    'name' => $attachment->name,
                    'original_name' => $attachment->original_name,
                    'file_size_formatted' => $attachment->getFileSizeFormatted(),
                    'mime_type' => $attachment->mime_type,
                    'is_image' => $attachment->isImage(),
                    'download_url' => route('wiki.attachments.download', $attachment),
                    'created_at' => $attachment->created_at,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload file: ' . $e->getMessage()
            ], 500);
        }
    }

    public function download(WikiAttachment $attachment)
    {


        try {
            $attachment->incrementDownloadCount();

            return Storage::disk('s3')->response($attachment->file_path, $attachment->original_name);
        } catch (\Exception $e) {
            abort(404, 'File not found');
        }
    }

    public function destroy(WikiAttachment $attachment)
    {


        $attachment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Attachment deleted successfully.',
        ]);
    }

    public function index(WikiPage $page)
    {
        $attachments = $page->attachments()
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($attachment) {
                return [
                    'id' => $attachment->id,
                    'name' => $attachment->name,
                    'original_name' => $attachment->original_name,
                    'file_size_formatted' => $attachment->getFileSizeFormatted(),
                    'mime_type' => $attachment->mime_type,
                    'is_image' => $attachment->isImage(),
                    'download_count' => $attachment->download_count,
                    'download_url' => route('wiki.attachments.download', $attachment),
                    'user' => $attachment->user,
                    'created_at' => $attachment->created_at,
                ];
            });

        return response()->json($attachments);
    }
}
