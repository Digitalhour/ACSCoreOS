<?php

use App\Http\Controllers\DepartmentTimeOffController;
use App\Http\Controllers\EmployeePtoController;
use Illuminate\Support\Facades\Route;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware(['auth',ValidateSessionWithWorkOS::class,])->group(function () {


    Route::middleware(['permission:Manager-Department-Pto'])->group(function () {


        Route::get('/department-pto',
            [DepartmentTimeOffController::class, 'dashboard'])->name('department.manager.pto.dashboard');

// Department manager approval actions (from manager interface)
        Route::post('/pto-requests/{ptoRequest}/approve',
            [DepartmentTimeOffController::class, 'approve'])->name('pto.requests.approve');
        Route::post('/pto-requests/{ptoRequest}/deny',
            [DepartmentTimeOffController::class, 'deny'])->name('pto.requests.deny');

    });

//// Main user PTO dashboard
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
