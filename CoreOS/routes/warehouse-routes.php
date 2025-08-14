<?php

use App\Http\Controllers\Warehouse\ContainerExpanderController;
use Illuminate\Support\Facades\Route;


Route::group([
    'middleware' => ['auth', 'verified', 'route.permission'],
    'prefix' => 'warehouse',
    'as' => 'Warehouse.',
], function () {

        Route::get('/container-expander', [ContainerExpanderController::class, 'index'])->name('container-expander');
//    Route::post('/container-expander/upload', [ContainerExpanderController::class, 'upload'])->name('container-expander.upload');
//    Route::post('/container-expander/update-columns', [ContainerExpanderController::class, 'updateColumns'])->name('container-expander.update-columns');
//    Route::post('/container-expander/expand', [ContainerExpanderController::class, 'expand'])->name('container-expander.expand');
        Route::get('/container-expander/download',
            [ContainerExpanderController::class, 'download'])->name('container-expander.download');

});

Route::prefix('/api/warehouse')->name('api.warehouse.')->group(function () {
    Route::post('/container-expander/upload', [ContainerExpanderController::class, 'upload'])->name('container-expander.upload');
    Route::post('/container-expander/update-columns', [ContainerExpanderController::class, 'updateColumns'])->name('container-expander.update-columns');
    Route::post('/container-expander/expand', [ContainerExpanderController::class, 'expand'])->name('container-expander.expand');
});
