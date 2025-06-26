<?php

use App\Http\Controllers\Admin\BlackoutController;
use App\Http\Controllers\Admin\PtoAdminController;
use App\Http\Controllers\Api\PtoApi\HREmployeesController;
use App\Http\Controllers\Api\PtoApi\PtoOverviewController;
use App\Http\Controllers\Api\PtoApi\PTOSubmitHistoricalController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;


Route::middleware(['auth', ValidateSessionWithWorkOS::class,])->group(function () {


    // Document Routes
    Route::prefix('documents')->name('documents.')->group(function () {
        Route::get('/', [DocumentController::class, 'index'])->name('index');
        Route::get('/create', [DocumentController::class, 'create'])->name('create');
        Route::post('/', [DocumentController::class, 'store'])->name('store');
        Route::get('/{document}', [DocumentController::class, 'show'])->name('show');
        Route::get('/{document}/edit', [DocumentController::class, 'edit'])->name('edit');
        Route::put('/{document}', [DocumentController::class, 'update'])->name('update');
        Route::delete('/{document}', [DocumentController::class, 'destroy'])->name('destroy');
        Route::get('/{document}/download', [DocumentController::class, 'download'])->name('download');

    });
    Route::get('/documents/{document}/view', [DocumentController::class, 'view'])->name('documents.view');
    // Folder Routes
    Route::prefix('folders')->name('folders.')->group(function () {
        Route::get('/', [FolderController::class, 'index'])->name('index');
        Route::get('/create', [FolderController::class, 'create'])->name('create');
        Route::post('/', [FolderController::class, 'store'])->name('store');
        Route::get('/{folder}', [FolderController::class, 'show'])->name('show');
        Route::get('/{folder}/edit', [FolderController::class, 'edit'])->name('edit');
        Route::put('/{folder}', [FolderController::class, 'update'])->name('update');
        Route::delete('/{folder}', [FolderController::class, 'destroy'])->name('destroy');
    });

    // Tag Routes
    Route::prefix('tags')->name('tags.')->group(function () {
        Route::get('/', [TagController::class, 'index'])->name('index');
        Route::get('/create', [TagController::class, 'create'])->name('create');
        Route::post('/', [TagController::class, 'store'])->name('store');
        Route::get('/{tag}', [TagController::class, 'show'])->name('show');
        Route::get('/{tag}/edit', [TagController::class, 'edit'])->name('edit');
        Route::put('/{tag}', [TagController::class, 'update'])->name('update');
        Route::delete('/{tag}', [TagController::class, 'destroy'])->name('destroy');

        // AJAX search route for tags
        Route::get('/search/ajax', [TagController::class, 'search'])->name('search');
    });











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
