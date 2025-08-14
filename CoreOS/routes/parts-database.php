<?php

use App\Http\Controllers\Admin\AdminShopifyController;
use App\Http\Controllers\PartsCatalogController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;


Route::middleware('auth')
    ->middleware(ValidateSessionWithWorkOS::class)
    ->group(function () {

        // CSV & Data Management
        Route::get('/csv-uploader', function () {
            return Inertia::render('CsvUploaderPage');
        })->name('csv.uploader');

        Route::get('/data-management', function () {
            return Inertia::render('DataManagementPage');
        })->name('data.management');

        Route::get('/data-management/file/{fileName}', function (string $fileName) {
            return Inertia::render('FileDetailsPage', [
                'fileName' => $fileName
            ]);
        })->name('data.file.details');
        Route::get('/debug-shopify', [PartsCatalogController::class, 'debugShopifyData']);
        // Parts Catalog - MAIN ROUTE (removed duplicate)
        Route::get('/parts-catalog', [PartsCatalogController::class, 'index'])->name('parts.catalog');

        // PDF Route
        Route::get('pdf/{pdfId}', [PartsCatalogController::class, 'getPdf'])->name('pdf.show');

        /*
        |--------------------------------------------------------------------------
        | Shopify Routes
        |--------------------------------------------------------------------------
        */
        Route::prefix('shopify')->name('shopify.')->group(function () {
            Route::post('/force-update', [AdminShopifyController::class, 'forceUpdateMatches'])
                ->name('/force-update');

            Route::get('/stats', [AdminShopifyController::class, 'stats'])
                ->name('/stats');

            Route::get('/batches', [AdminShopifyController::class, 'getBatches'])
                ->name('/batches');

            Route::post('/clear-matches', [AdminShopifyController::class, 'clearAllMatches'])
                ->name('clear-matches');
        });
    });
