<?php


use App\Http\Controllers\WikiAttachmentController;
use App\Http\Controllers\WikiBookController;
use App\Http\Controllers\WikiChapterController;
use App\Http\Controllers\WikiController;
use App\Http\Controllers\WikiPageController;
use App\Http\Controllers\WikiTemplateController;
use Illuminate\Support\Facades\Route;

Route::group([
    'middleware' => ['auth', 'verified', 'route.permission'],
    'prefix' => 'wiki',
    'as' => 'wiki.',
], function () {
        // Public routes (read-only)
        Route::get('/', [WikiController::class, 'index'])->name('index');
        Route::get('/search', [WikiController::class, 'search'])->name('search');
        Route::get('/books', [WikiBookController::class, 'index'])->name('books.index');
        Route::get('/templates', [WikiTemplateController::class, 'index'])->name('templates.index');
        Route::get('/api/wiki-templates', [WikiTemplateController::class, 'apiIndex'])->name('api.wiki-templates.index');
        Route::get('/attachments/{attachment}/download', [WikiAttachmentController::class, 'download'])->name('attachments.download');

        // Create permissions

            Route::post('/upload-image', [WikiController::class, 'uploadImage'])->name('upload-image');
            Route::get('/books/create', [WikiBookController::class, 'create'])->name('books.create');
            Route::post('/books', [WikiBookController::class, 'store'])->name('books.store');
            Route::get('/templates/create', [WikiTemplateController::class, 'create'])->name('templates.create');
            Route::post('/templates', [WikiTemplateController::class, 'store'])->name('templates.store');
            Route::get('/{book}/chapters/create', [WikiChapterController::class, 'create'])->name('chapters.create');
            Route::post('/{book}/chapters', [WikiChapterController::class, 'store'])->name('chapters.store');
            Route::get('/{book}/{chapter}/pages/create', [WikiPageController::class, 'create'])->name('pages.create');
            Route::post('/{book}/{chapter}/pages', [WikiPageController::class, 'store'])->name('pages.store');
            Route::post('/{book}/{chapter}/{page}/attachments', [WikiAttachmentController::class, 'store'])->name('attachments.store');


        // Edit permissions

            Route::get('/books/{book}/edit', [WikiBookController::class, 'edit'])->name('books.edit');
            Route::put('/books/{book}', [WikiBookController::class, 'update'])->name('books.update');
            Route::get('/templates/{template}/edit', [WikiTemplateController::class, 'edit'])->name('templates.edit');
            Route::put('/templates/{template}', [WikiTemplateController::class, 'update'])->name('templates.update');
            Route::get('/{book}/{chapter}/edit', [WikiChapterController::class, 'edit'])->name('chapters.edit');
            Route::put('/{book}/{chapter}', [WikiChapterController::class, 'update'])->name('chapters.update');
            Route::get('/{book}/{chapter}/{page}/edit', [WikiPageController::class, 'edit'])->name('pages.edit');
            Route::put('/{book}/{chapter}/{page}', [WikiPageController::class, 'update'])->name('pages.update');
            Route::post('/{book}/{chapter}/{page}/versions/{version}/restore', [WikiPageController::class, 'restoreVersion'])->name('pages.restore-version');


        // Delete permissions

            Route::delete('/books/{book}', [WikiBookController::class, 'destroy'])->name('books.destroy');
            Route::delete('/templates/{template}', [WikiTemplateController::class, 'destroy'])->name('templates.destroy');
            Route::delete('/{book}/{chapter}', [WikiChapterController::class, 'destroy'])->name('chapters.destroy');
            Route::delete('/{book}/{chapter}/{page}', [WikiPageController::class, 'destroy'])->name('pages.destroy');
            Route::delete('/attachments/{attachment}', [WikiAttachmentController::class, 'destroy'])->name('attachments.destroy');


        // Read routes (dynamic - place after static)
        Route::get('/books/{book}', [WikiBookController::class, 'show'])->name('books.show');
        Route::get('/templates/{template}', [WikiTemplateController::class, 'show'])->name('templates.show');
        Route::get('/{book}/{chapter}', [WikiChapterController::class, 'show'])->name('chapters.show');
        Route::get('/{book}/{chapter}/{page}', [WikiPageController::class, 'show'])->name('pages.show');
        Route::get('/{book}/{chapter}/{page}/versions', [WikiPageController::class, 'versions'])->name('pages.versions');
        Route::get('/{book}/{chapter}/{page}/versions/compare', [WikiPageController::class, 'compareVersions'])->name('pages.compare-versions');
        Route::get('/{book}/{chapter}/{page}/attachments', [WikiAttachmentController::class, 'index'])->name('attachments.index');


});

