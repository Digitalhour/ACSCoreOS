<?php

use App\Http\Controllers\DeviceAliasController;
use App\Http\Controllers\VibetrackController;
use Illuminate\Support\Facades\Route;


// Vibetrack Routes, only accessible by users with the Vibetrack-view permission, will have to add Vibetrack-edit later for the admin part of the app.
Route::group([
    'middleware' => ['auth', 'verified', 'route.permission'],
    'prefix' => 'vibetrack',
    'as' => 'vibetrack.',
], function () {
    // Vibetrack
    Route::get('/', [VibetrackController::class, 'index'])->name('index');
    Route::get('/charts/data', [VibetrackController::class, 'charts'])->name('charts');
    Route::get('/{vibetrack}', [VibetrackController::class, 'show'])->name('show');

    // Admin (Device Aliases)

});
Route::group([
    'middleware' => ['auth', 'verified', 'route.permission'],
    'prefix' => 'vibetrack',
    'as' => 'vibetrack.',
], function () {
Route::prefix('admin')->name('admin.')->controller(DeviceAliasController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    Route::post('/', 'store')->name('store');
    Route::put('{alias}', 'update')->name('update');
    Route::delete('{alias}', 'destroy')->name('destroy');
    Route::patch('{alias}/restore', 'restore')->name('restore');
});
});
