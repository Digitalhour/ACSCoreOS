<?php

use App\Http\Controllers\PartsDataset\PartsAccessController;
use App\Http\Controllers\PartsDataset\PartsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Parts Database Routes
|--------------------------------------------------------------------------
| All routes for parts management, including uploads, browsing, and API access.
| Routes are protected by authentication, verification, and role permissions.
|--------------------------------------------------------------------------
*/
/*
|--------------------------------------------------------------------------
| Parts Management Web Routes
|--------------------------------------------------------------------------
*/
Route::group([
    'middleware' => ['auth', 'verified', 'route.permission'],
    'prefix' => 'parts',
    'as' => 'parts.',
], function () {
    Route::get('/', [PartsController::class, 'index'])->name('index');
    Route::get('/upload', [PartsController::class, 'create'])->name('create');
});

/*
|--------------------------------------------------------------------------
| Parts Browse & Access Routes
|--------------------------------------------------------------------------
*/
Route::group([
    'middleware' => ['auth', 'verified', 'route.permission'],
], function () {
    // Parts Browse Routes (duplicate route names cleaned up)
    Route::get('/parts-browse', [PartsAccessController::class, 'index'])
        ->name('parts-browse.index');

    /*
    |--------------------------------------------------------------------------
    | Parts Dataset API Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('parts-dataset')->name('parts-dataset.')->group(function () {
        Route::get('/api/parts-browse/parts', [PartsAccessController::class, 'parts'])
            ->name('parts-browse.parts');
        Route::get('/api/parts-browse/{partId}', [PartsAccessController::class, 'show'])
            ->name('parts-browse.show');
    });

    /*
    |--------------------------------------------------------------------------
    | Parts Management API Routes
    |--------------------------------------------------------------------------
    */
    Route::prefix('api/parts')->name('api.parts.')->group(function () {

        // Upload Management
        Route::post('/upload', [PartsController::class, 'store'])->name('upload');
        Route::get('/uploads/{uploadId}', [PartsController::class, 'showUpload'])->name('uploads.show');
        Route::delete('/uploads/{uploadId}', [PartsController::class, 'destroyUpload'])->name('uploads.destroy');
        Route::post('/uploads/{uploadId}/retry', [PartsController::class, 'retryUpload'])->name('uploads.retry');
        Route::post('/uploads/{uploadId}/cancel', [PartsController::class, 'cancelUpload'])->name('uploads.cancel');

        // Progress Tracking
        Route::get('/uploads/{uploadId}/progress', [PartsController::class, 'uploadProgress'])->name('uploads.progress');
        Route::post('/uploads/{uploadId}/progress/refresh', [PartsController::class, 'refreshUploadProgress'])->name('uploads.progress.refresh');
        Route::get('/uploads/{uploadId}/chunks', [PartsController::class, 'uploadChunks'])->name('uploads.chunks');
        Route::post('/uploads/progress-summary', [PartsController::class, 'uploadsProgressSummary'])->name('uploads.progress-summary');

        // Queue Monitoring
        Route::get('/queue-status', [PartsController::class, 'queueStatus'])->name('queue-status');
        Route::get('/queue-status-detailed', [PartsController::class, 'queueStatusDetailed'])->name('queue-status-detailed');

        // Parts Management
        Route::get('/parts', [PartsController::class, 'parts'])->name('parts.index');
        Route::put('/parts/{partId}', [PartsController::class, 'updatePart'])->name('parts.update');

        // Image Management
        Route::post('/parts/{partId}/image', [PartsController::class, 'uploadPartImage'])->name('parts.upload-image');
        Route::delete('/parts/{partId}/image', [PartsController::class, 'deletePartImage'])->name('parts.delete-image');

        // Shopify Integration
        Route::post('/sync-shopify', [PartsController::class, 'syncShopify'])->name('sync-shopify');
        Route::post('/uploads/{uploadId}/sync-shopify', [PartsController::class, 'syncUploadShopify'])->name('sync-upload-shopify');

        // Statistics
        Route::get('/statistics', [PartsController::class, 'statistics'])->name('statistics');
    });
});

// Standalone parts index route (if needed separately)
Route::get('/parts', [PartsController::class, 'index'])->name('parts.index');
