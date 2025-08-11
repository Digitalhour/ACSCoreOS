<?php

use App\Http\Controllers\Admin\PtoAdminController;
use App\Http\Controllers\Api\PtoApi\HRDashboardController;
use App\Http\Controllers\Api\PtoApi\PtoOverviewController;
use App\Http\Controllers\Api\PtoApi\PtoTypeController;
use App\Http\Controllers\DepartmentTimeOffController;
use App\Http\Controllers\EmployeePtoController;
use Illuminate\Support\Facades\Route;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware('auth')
    ->middleware(ValidateSessionWithWorkOS::class)
    ->group(function () {

        // Department manager approval actions (from manager interface)
        Route::middleware('permission:Manager-Department-Pto')->group(function () {
            Route::get('/department-pto',[DepartmentTimeOffController::class, 'dashboard'])->name('department.manager.pto.dashboard');
            Route::post('/pto-requests/{ptoRequest}/approve',[DepartmentTimeOffController::class, 'approve'])->name('pto.requests.approve');
            Route::post('/pto-requests/{ptoRequest}/deny',[DepartmentTimeOffController::class, 'deny'])->name('pto.requests.deny');
        });
        // User PTO dashboard
            Route::get('/employee/pto', [EmployeePtoController::class, 'index'])->name('pto.dashboard');
        // User PTO request management
            Route::post('/pto/requests', [EmployeePtoController::class, 'store'])->name('pto.requests.store');
            Route::post('/pto/requests/{ptoRequest}/cancel',[EmployeePtoController::class, 'cancel'])->name('pto.requests.cancel');

        // Legacy redirect
            Route::get('/request-pto', function () {
                return redirect()->route('pto.dashboard');
            })->name('request-pto');


        Route::get('/admin/pto', [PtoAdminController::class, 'dashboard'])->name('admin.pto.dashboard');
        Route::get('/admin/pto-types', [PtoTypeController::class, 'types'])->name('admin.pto.types');
        Route::get('/admin/pto-policies', [PtoAdminController::class, 'policies'])->name('admin.pto.policies');
        Route::get('/admin/pto-requests', [PtoAdminController::class, 'requests'])->name('admin.pto.requests');
        Route::get('/admin/pto-balances', [PtoOverviewController::class, 'index'])->name('admin.pto.balances');
        Route::get('/admin/pto-Blackouts', [PtoAdminController::class, 'blackouts'])->name('admin.pto.Blackouts');
        Route::post('/admin/pto/submit-historical',[PtoAdminController::class, 'submitHistoricalPto'])->name('submit-historical');


        // Approve PTO Request
        Route::post('/department-pto/{ptoRequest}/approve', [DepartmentTimeOffController::class, 'approve'])->name('department.pto.approve');
        // Deny PTO Request
        Route::post('/department-pto/{ptoRequest}/deny', [DepartmentTimeOffController::class, 'deny'])->name('department.pto.deny');
        // Approve Emergency Override
        Route::post('/department-pto/{ptoRequest}/approve-override', [DepartmentTimeOffController::class, 'approveOverride'])->name('department.pto.approve-override');

        // Admin PTO request approval/denial (from admin interface)
        Route::post('/admin/pto-requests/{ptoRequest}/approve',[PtoAdminController::class, 'approveRequest'])->name('admin.pto-requests.approve');
        Route::post('/admin/pto-requests/{ptoRequest}/deny',[PtoAdminController::class, 'denyRequest'])->name('admin.pto-requests.deny');
        Route::get('/api/pto-requests/user-details', [HRDashboardController::class, 'getUserDetails'])->name('api.pto-requests.user-details');

    });
