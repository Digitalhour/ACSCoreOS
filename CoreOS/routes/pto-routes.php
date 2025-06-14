<?php

use App\Http\Controllers\UserPtoDashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware([
'auth',
ValidateSessionWithWorkOS::class,
])->group(function () {




// Main user PTO dashboard
    Route::get('/pto', [UserPtoDashboardController::class, 'index'])->name('pto.dashboard');

// User PTO request management
    Route::post('/pto/requests', [UserPtoDashboardController::class, 'store'])->name('pto.requests.store');
    Route::post('/pto/requests/{ptoRequest}/cancel',
        [UserPtoDashboardController::class, 'cancel'])->name('pto.requests.cancel');

// Legacy redirect
    Route::get('/request-pto', function () {
        return redirect()->route('pto.dashboard');
    })->name('request-pto');







});
