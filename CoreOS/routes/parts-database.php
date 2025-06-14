<?php


use App\Http\Controllers\PartsCatalogController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware([
'auth',
ValidateSessionWithWorkOS::class,
])->group(function () {


    Route::get('Parts-Database', function () {
        return Inertia::render('Parts-Database');
    })->name('Parts-Database');

    Route::get('/parts-catalog', [PartsCatalogController::class, 'index'])->name('parts.catalog');




});
