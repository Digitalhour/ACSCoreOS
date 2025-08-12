<?php

// Old Style Training Tracking Routes
use App\Http\Controllers\OldStyleTrainingTrackingController;
use Illuminate\Support\Facades\Route;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;


Route::middleware('auth')
    ->middleware(ValidateSessionWithWorkOS::class)
    ->group(function () {

        Route::group([
            'middleware' => ['auth', 'verified', 'route.permission'],
            'as' => 'old-style-training-tracking.',
        ], function () {
            Route::get('/old-style-training-tracking', [OldStyleTrainingTrackingController::class, 'index'])
            ->name('old-style-training-tracking.index');

            Route::post('/old-style-training-tracking', [OldStyleTrainingTrackingController::class, 'store'])
            ->name('old-style-training-tracking.store');

            Route::put('/old-style-training-tracking/{type}/{id}', [OldStyleTrainingTrackingController::class, 'update'])
            ->name('old-style-training-tracking.update');

            Route::delete('/old-style-training-tracking/{type}/{id}', [OldStyleTrainingTrackingController::class, 'destroy'])
            ->name('old-style-training-tracking.destroy');

            Route::get('/old-style-training-tracking/export-data', [OldStyleTrainingTrackingController::class, 'exportData'])
            ->name('old-style-training-tracking.export-data');

            Route::get('/old-style-training-tracking/export-logs', [OldStyleTrainingTrackingController::class, 'exportLogs'])
            ->name('old-style-training-tracking.export-logs');

        });
});
