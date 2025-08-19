<?php

use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware('auth')
    ->middleware(ValidateSessionWithWorkOS::class)
    ->group(function () {
    Route::get('/admin/positions', function () {
        return Inertia::render('Admin/Positions/IndexPage');
    })->name('admin.positions.index');

            Route::get('/departments', [DepartmentController::class, 'index'])->name('departments.index');
                Route::get('/api/departments', [UserManagementController::class, 'getDepartments']);
                    Route::post('/departments', [DepartmentController::class, 'store'])->name('departments.store');
                    Route::put('/departments/{department}', [DepartmentController::class, 'update'])->name('departments.update');
                    Route::delete('/departments/{department}', [DepartmentController::class, 'destroy'])->name('departments.destroy');
                    Route::post('/departments/{department}/assign-users',
                        [DepartmentController::class, 'assignUsers'])->name('departments.assign-users');




});
