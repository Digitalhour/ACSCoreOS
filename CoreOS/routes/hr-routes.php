<?php

use App\Http\Controllers\Api\PtoApi\HRPtoDashboardController;

use App\Http\Controllers\Api\PtoApi\PTOSubmitHistoricalController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;


Route::middleware(['auth', ValidateSessionWithWorkOS::class,])->group(function () {

    Route::middleware(['auth', 'verified'])->group(function () {

        Route::get('/admin/pto', [HRPtoDashboardController::class, 'index'])->name('admin.pto.dashboard');
        Route::post('/hr/pto/submit-historical',
            [PTOSubmitHistoricalController::class, 'submitHistoricalPto'])->name('submit-historical');


    });
});
