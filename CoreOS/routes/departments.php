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

            Route::get('/human-resources/departments', [DepartmentController::class, 'index'])->name('departments.index');
                Route::get('/api/departments', [UserManagementController::class, 'getDepartments']);
                    Route::post('/human-resources/departments', [DepartmentController::class, 'store'])->name('departments.store');
                    Route::put('/human-resources/departments/{department}', [DepartmentController::class, 'update'])->name('departments.update');
                    Route::delete('/human-resources/departments/{department}', [DepartmentController::class, 'destroy'])->name('departments.destroy');
                    Route::post('/human-resources/departments/{department}/assign-users',
                        [DepartmentController::class, 'assignUsers'])->name('departments.assign-users');




});
