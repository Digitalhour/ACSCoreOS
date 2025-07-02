<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LessonContent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class LessonContentController extends Controller
{
    public function create(Lesson $lesson)
    {
        return Inertia::render('Admin/Content/Create', [
            'lesson' => $lesson->load('module')
        ]);
    }

    public function store(Request $request, Lesson $lesson)
    {
        $validated = $request->validate([
            'type' => 'required|in:video,document,slideshow,audio',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'file' => 'required|file|max:102400', // 100MB max
            'order' => 'integer|min:0'
        ]);

        $file = $request->file('file');
        $path = $file->store('training/content/' . $lesson->id, 's3');

        // Get file metadata
        $metadata = [
            'original_name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'mime_type' => $file->getMimeType()
        ];

        // For videos, you might want to extract duration and create thumbnail
        // This would require additional processing with FFmpeg or similar

        $content = LessonContent::create([
            'lesson_id' => $lesson->id,
            'type' => $validated['type'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'file_path' => $path,
            'file_url' => null,
            'metadata' => $metadata,
            'order' => $validated['order'] ?? 0
        ]);

        return redirect()->route('admin.modules.lessons.show', [$lesson->module, $lesson])
            ->with('success', 'Content uploaded successfully');
    }

    public function edit(Lesson $lesson, LessonContent $content)
    {
        return Inertia::render('Admin/Content/Edit', [
            'lesson' => $lesson->load('module'),
            'content' => $content
        ]);
    }

    public function update(Request $request, Lesson $lesson, LessonContent $content)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'integer|min:0'
        ]);

        $content->update($validated);

        return redirect()->route('admin.modules.lessons.show', [$lesson->module, $lesson])
            ->with('success', 'Content updated successfully');
    }

    public function destroy(LessonContent $content)
    {
        // Delete file from S3
        if ($content->file_path) {
            Storage::disk('s3')->delete($content->file_path);
        }

        $lesson = $content->lesson;
        $content->delete();

        return redirect()->route('admin.modules.lessons.show', [$lesson->module, $lesson])
            ->with('success', 'Content deleted successfully');
    }

    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:102400', // 100MB max
            'lesson_id' => 'required|exists:lessons,id'
        ]);

        $lesson = Lesson::findOrFail($request->lesson_id);
        $file = $request->file('file');

        $path = $file->store('training/content/' . $lesson->id, 's3');
        $url = Storage::disk('s3')->url($path);

        return response()->json([
            'success' => true,
            'path' => $path,
            'url' => $url,
            'name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'type' => $file->getMimeType()
        ]);
    }
}
