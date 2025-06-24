<?php


use App\Http\Controllers\Admin\AdminShopifyController;
use App\Http\Controllers\PartsCatalogController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware([
'auth',
ValidateSessionWithWorkOS::class,
])->group(function () {




    Route::get('/parts-catalog', [PartsCatalogController::class, 'index'])->name('parts.catalog');

    Route::get('Parts-Database', function () {
        return Inertia::render('parts_pages/Parts-Database');
    })->name('Parts-Database');
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
