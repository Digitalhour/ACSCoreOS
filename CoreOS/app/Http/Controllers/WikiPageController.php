<?php

namespace App\Http\Controllers;

use App\Models\WikiBook;
use App\Models\WikiChapter;
use App\Models\WikiPage;
use App\Models\WikiTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class WikiPageController extends Controller
{
    public function show(WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {
        $page->load(['user', 'chapter.book', 'attachments', 'versions.user']);

        // Record page view
        $page->recordView(
            auth()->user(),
            request()->ip(),
            request()->userAgent()
        );

        $pageArray = $page->toArray();
        $pageArray['featured_image_url'] = $page->getFeaturedImageUrl();
        $pageArray['reading_time'] = $page->reading_time;

        return Inertia::render('Wiki/Pages/Show', [
            'book' => $book,
            'chapter' => $chapter,
            'page' => $pageArray,
        ]);
    }

    public function create(WikiBook $book, WikiChapter $chapter, Request $request)
    {
        $templates = WikiTemplate::active()->ordered()->get()->map(function ($template) {
            return [
                'name' => $template->name,
                'html' => $template->content,
                'featured_image' => $template->getPreviewUrl(),
            ];
        });

        return Inertia::render('Wiki/Pages/Create', [
            'book' => $book,
            'chapter' => $chapter,
            'templates' => $templates,
        ]);
    }

    public function store(Request $request, WikiBook $book, WikiChapter $chapter)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string|max:500',
            'featured_image' => 'nullable|string',
            'status' => 'required|in:draft,published',
            'change_summary' => 'nullable|string|max:255',
        ]);

        $page = $chapter->pages()->create([
            'name' => $request->input('name'),
            'slug' => Str::slug($request->name),
            'content' => $request->input('content'),
            'excerpt' => $request->input('excerpt'),
            'featured_image' => $request->featured_image,
            'status' => $request->status,
            'user_id' => auth()->id(),
            'sort_order' => $chapter->pages()->max('sort_order') + 1,
            'published_at' => $request->status === 'published' ? now() : null,
            'version' => 1,
        ]);

        // Create initial version
        $page->createVersion($request->change_summary ?? 'Initial version');

        return redirect()->route('wiki.pages.show', [$book, $chapter, $page])
            ->with('success', 'Page created successfully.');
    }

    public function edit(WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {


        $templates = WikiTemplate::active()->ordered()->get()->map(function ($template) {
            return [
                'name' => $template->name,
                'html' => $template->content,
                'featured_image' => $template->getPreviewUrl(),
            ];
        });

        $pageArray = $page->toArray();
        $pageArray['featured_image_url'] = $page->getFeaturedImageUrl();

        return Inertia::render('Wiki/Pages/Edit', [
            'book' => $book,
            'chapter' => $chapter,
            'page' => $pageArray,
            'templates' => $templates,
        ]);
    }

    public function update(Request $request, WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {

        $request->validate([
            'name' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string|max:500',
            'featured_image' => 'nullable|string',
            'status' => 'required|in:draft,published',
            'change_summary' => 'nullable|string|max:255',
        ]);

        // Create version before updating
        $page->createVersion($request->change_summary ?? 'Content updated');

        $page->update([
            'name' => $request->input('name'),
            'content' => $request->input('content'),
            'excerpt' =>  $request->input('excerpt'),
            'featured_image' => $request->featured_image,
            'status' => $request->status,
            'published_at' => $request->status === 'published' && !$page->published_at ? now() : $page->published_at,
        ]);

        $page->incrementVersion();

        return redirect()->route('wiki.pages.show', [$book, $chapter, $page])
            ->with('success', 'Page updated successfully.');
    }

    public function destroy(WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {
        $this->authorize('delete', $page);

        $page->delete();

        return redirect()->route('wiki.chapters.show', [$book, $chapter])
            ->with('success', 'Page deleted successfully.');
    }

    public function versions(WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {
        $versions = $page->versions()->with('user')->paginate(10);

        return Inertia::render('Wiki/Pages/Versions', [
            'book' => $book,
            'chapter' => $chapter,
            'page' => $page,
            'versions' => $versions,
        ]);
    }
    public function compareVersions(Request $request, WikiBook $book, WikiChapter $chapter, WikiPage $page)
    {

        $fromVersionNumber = $request->get('from', 1);
        $toVersionNumber = $request->get('to', $page->version);

        $fromVersion = $page->versions()->where('version_number', $fromVersionNumber)->with('user')->first();
        $toVersion = $page->versions()->where('version_number', $toVersionNumber)->with('user')->first();

        if (!$fromVersion || !$toVersion) {
            dd('Versions not found', $fromVersion, $toVersion, $page->versions()->pluck('version_number'));
        }
        $diff = $fromVersion->getContentDiff($toVersion);

        return Inertia::render('Wiki/Pages/Compare', [
            'book' => $book,
            'chapter' => $chapter,
            'page' => $page,
            'fromVersion' => array_merge($fromVersion->toArray(), ['word_count' => $fromVersion->getWordCount()]),
            'toVersion' => array_merge($toVersion->toArray(), ['word_count' => $toVersion->getWordCount()]),
            'availableVersions' => $page->versions()->with('user')->orderBy('version_number', 'desc')->get(),
            'diff' => $diff,
        ]);
    }

    public function restoreVersion(WikiBook $book, WikiChapter $chapter, WikiPage $page, $versionId)
    {


        $version = $page->versions()->findOrFail($versionId);
        $version->restoreToPage();

        return redirect()->route('wiki.pages.show', [$book, $chapter, $page])
            ->with('success', 'Page restored to version ' . $version->version_number);
    }
}
