<?php

use App\Http\Controllers\EmployeePtoController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware([
'auth',
ValidateSessionWithWorkOS::class,
])->group(function () {




// Main user PTO dashboard
    Route::get('/employee/pto', [EmployeePtoController::class, 'index'])->name('pto.dashboard');

// User PTO request management
    Route::post('/pto/requests', [EmployeePtoController::class, 'store'])->name('pto.requests.store');
    Route::post('/pto/requests/{ptoRequest}/cancel',
        [EmployeePtoController::class, 'cancel'])->name('pto.requests.cancel');

// Legacy redirect
    Route::get('/request-pto', function () {
        return redirect()->route('pto.dashboard');
    })->name('request-pto');







});
