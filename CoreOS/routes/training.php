<?php

// Old Style Training Tracking Routes
use App\Http\Controllers\OldStyleTrainingTrackingController;
use Illuminate\Support\Facades\Route;


Route::group([
    'middleware' => ['auth', 'verified', 'route.permission'],
    'prefix' => 'old-style-training-tracking',
], function () {
            Route::get('/', [OldStyleTrainingTrackingController::class, 'index'])
            ->name('old-style-training-tracking.index');

            Route::post('/', [OldStyleTrainingTrackingController::class, 'store'])
            ->name('old-style-training-tracking.store');

            Route::put('/{type}/{id}', [OldStyleTrainingTrackingController::class, 'update'])
            ->name('old-style-training-tracking.update');

            Route::delete('/{type}/{id}', [OldStyleTrainingTrackingController::class, 'destroy'])
            ->name('old-style-training-tracking.destroy');

            Route::get('/export-data', [OldStyleTrainingTrackingController::class, 'exportData'])
            ->name('old-style-training-tracking.export-data');

            Route::get('/export-logs', [OldStyleTrainingTrackingController::class, 'exportLogs'])
            ->name('old-style-training-tracking.export-logs');

});
