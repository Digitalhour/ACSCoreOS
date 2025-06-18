<?php

use App\Http\Controllers\Admin\PtoAdminController;
use App\Http\Controllers\Api\PtoApi\HREmployeesController;
use App\Http\Controllers\Api\PtoApi\PtoOverviewController;
use App\Http\Controllers\Api\PtoApi\PTOSubmitHistoricalController;
use Illuminate\Support\Facades\Route;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;


Route::middleware(['auth', ValidateSessionWithWorkOS::class,])->group(function () {

    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/hr/employees', [HREmployeesController::class, 'index'])
            ->name('hr.employees');




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
});
