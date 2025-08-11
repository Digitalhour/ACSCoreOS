<?php


use App\Http\Controllers\DeviceAliasController;
use App\Http\Controllers\VibetrackController;
use Illuminate\Support\Facades\Route;

Route::group(['middleware' => ['auth', 'verified']], function () {
    Route::group(['middleware' => ['permission:Vibetrack-view']], function () {

   Route::prefix('vibetrack')->name('vibetrack.')->group(function () {
            Route::get('/', [VibetrackController::class, 'index'])->name('index');
            Route::get('/admin', [DeviceAliasController::class, 'index'])->name('admin.index');
            Route::post('/admin', [DeviceAliasController::class, 'store'])->name('admin.store');
            Route::put('/admin/{alias}', [DeviceAliasController::class, 'update'])->name('admin.update');
            Route::delete('/admin/{alias}', [DeviceAliasController::class, 'destroy'])->name('admin.destroy');
            Route::patch('/admin/{alias}/restore', [DeviceAliasController::class, 'restore'])->name('admin.restore');
            Route::get('/charts/data', [VibetrackController::class, 'charts'])->name('charts');
            // NOTE: The dynamic route '{vibetrack}' is placed last to avoid conflicts with static routes like '/admin'.
            Route::get('/{vibetrack}', [VibetrackController::class, 'show'])->name('show');
        });


    });



});

