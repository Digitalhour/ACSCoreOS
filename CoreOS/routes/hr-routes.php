<?php

use App\Http\Controllers\Admin\BlackoutController;
use App\Http\Controllers\Admin\PtoAdminController;
use App\Http\Controllers\Api\PtoApi\HREmployeesController;
use App\Http\Controllers\Api\PtoApi\PtoOverviewController;
use App\Http\Controllers\Api\PtoApi\PTOSubmitHistoricalController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;


Route::middleware(['auth', ValidateSessionWithWorkOS::class,])->group(function () {














    Route::get('/user-management', [UserManagementController::class, 'index'])
        ->name('user-management.index');

    Route::get('/user-management/onboard', [UserManagementController::class, 'onboard'])
        ->name('user-management.onboard');

// Main invite route - returns back to same page with wizard data
    Route::post('/user-management/invite-user', [UserManagementController::class, 'inviteUserWithPto'])
        ->name('user-management.invite-user');

// Department routes
    Route::post('/departments/{department}/add-user', [DepartmentController::class, 'addUser'])
        ->name('departments.add-user');




    Route::prefix('admin')->name('admin.')->group(function () {




        Route::resource('blackouts', BlackoutController::class);
        Route::post('/blackouts/user-check', [BlackoutController::class, 'getBlackoutsForUser'])->name('blackouts.user-check');

    });

    Route::post('/admin/blackouts/get-blackouts-for-user', [BlackoutController::class, 'getBlackoutsForUser'])
        ->name('admin.blackouts.get-blackouts-for-user');



    Route::prefix('hr')->name('hr.')->group(function () {
        Route::get('/employees', [HREmployeesController::class, 'index'])->name('employees.index');
        Route::delete('/employees/{user}', [HREmployeesController::class, 'destroy'])->name('employees.destroy');
        Route::patch('/employees/{id}/restore', [HREmployeesController::class, 'restore'])->name('employees.restore');
    });




        Route::get('/hr/dashboard', [PtoOverviewController::class, 'index'])->name('hr.pto.dashboard');
        Route::post('/hr/pto/submit-historical',
            [PTOSubmitHistoricalController::class, 'submitHistoricalPto'])->name('submit-historical');

        Route::get('/hr/pto-policies', [PtoAdminController::class, 'policies'])->name('hr.pto.policies');
        Route::get('/hr/pto-types', [PtoAdminController::class, 'types'])->name('hr.pto.types');
        Route::get('/hr/time-off-requests', [PtoAdminController::class, 'requests'])->name('hr.pto.requests');

        Route::prefix('api')->name('api.')->group(function () {
            Route::get('/pto-overview/dashboard', [PtoOverviewController::class, 'getDashboardData']);
            Route::get('/pto-overview/stats', [PtoOverviewController::class, 'getStats']);


    });
});
