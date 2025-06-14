<?php

use App\Http\Controllers\Admin\AdminStatsController;
use App\Http\Controllers\Api\CsvProcessController;
use App\Http\Controllers\Api\ImportedDataController;
use App\Http\Controllers\Api\PositionController;
use App\Http\Controllers\Api\PtoApi\DELETEPtoApprovalController;
use App\Http\Controllers\Api\PtoApi\PtoBalanceController;
use App\Http\Controllers\Api\PtoApi\PtoDetailController;
use App\Http\Controllers\Api\PtoApi\PtoPolicyController;
use App\Http\Controllers\Api\PtoApi\PtoRequestController;
use App\Http\Controllers\Api\PtoApi\PtoTypeController;
use App\Http\Controllers\Api\QueueStatusController;
use App\Http\Controllers\Api\UserHierarchyController;
use App\Http\Controllers\Api\UserPtoController;
use App\Http\Controllers\PartsCatalogController;
use App\Http\Controllers\UserController;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware([
'auth',
ValidateSessionWithWorkOS::class,
])->group(function () {
    Route::prefix('api')->name('api.')->group(function () {
        Route::get('/users/{user}/pto-types',
            [App\Http\Controllers\Admin\PtoAdminController::class, 'getPtoTypesForUser']);

        Route::get('pto/users/{user}/details', [PtoDetailController::class, 'getUserPtoDetails']);
        Route::get('pto/requests/{request}/activities', [PtoDetailController::class, 'getRequestActivities']);
        /*
        |--------------------------------------------------------------------------
        | PTO Approval API
        |--------------------------------------------------------------------------
        */
        Route::prefix('pto-approvals')->name('pto-approvals.')->group(function () {
            Route::get('dashboard',
                [DELETEPtoApprovalController::class, 'dashboard'])->name('dashboard');
            Route::get('pending',
                [DELETEPtoApprovalController::class, 'pendingApprovals'])->name('pending');
            Route::get('my-approvals',
                [DELETEPtoApprovalController::class, 'myApprovals'])->name('my-approvals');
            Route::get('{ptoRequest}/chain',
                [DELETEPtoApprovalController::class, 'getApprovalChain'])->name('chain');
        });

        /*
        |--------------------------------------------------------------------------
        | PTO Types API
        |--------------------------------------------------------------------------
        */

        Route::get('/users/list', [UserController::class, 'list'])->middleware('auth');
        Route::prefix('pto-types')->name('pto-types.')->group(function () {
            Route::get('/', [PtoTypeController::class, 'index'])->name('index');
            Route::post('/', [PtoTypeController::class, 'store'])->name('store');
            Route::get('{pto_type}', [PtoTypeController::class, 'show'])->name('show');
            Route::put('{pto_type}', [PtoTypeController::class, 'update'])->name('update');
            Route::delete('{pto_type}', [PtoTypeController::class, 'destroy'])->name('destroy');

// Custom endpoints
            Route::patch('{pto_type}/toggle-active', [PtoTypeController::class, 'toggleActive'])->name('toggle-active');
            Route::patch('sort-order', [PtoTypeController::class, 'updateSortOrder'])->name('sort-order');
        });

        /*
        |--------------------------------------------------------------------------
        | PTO Policies API
        |--------------------------------------------------------------------------
        */
        Route::prefix('pto-policies')->name('pto-policies.')->group(function () {
            Route::get('/', [PtoPolicyController::class, 'index'])->name('index');
            Route::post('/', [PtoPolicyController::class, 'store'])->name('store');
            Route::get('{pto_policy}', [PtoPolicyController::class, 'show'])->name('show');
            Route::put('{pto_policy}', [PtoPolicyController::class, 'update'])->name('update');
            Route::delete('{pto_policy}', [PtoPolicyController::class, 'destroy'])->name('destroy');
        });

// User-specific policy routes
        Route::get('users/{user}/pto-policies',
            [PtoPolicyController::class, 'getUserPolicies'])->name('users.pto-policies');

        /*
        |--------------------------------------------------------------------------
        | PTO Requests API
        |--------------------------------------------------------------------------
        */
        Route::prefix('pto-requests')->name('pto-requests.')->group(function () {
            Route::get('/', [PtoRequestController::class, 'index'])->name('index');
            Route::post('/', [PtoRequestController::class, 'store'])->name('store');
            Route::get('{pto_request}', [PtoRequestController::class, 'show'])->name('show');
            Route::put('{pto_request}', [PtoRequestController::class, 'update'])->name('update');
            Route::delete('{pto_request}', [PtoRequestController::class, 'destroy'])->name('destroy');

// Approval actions
            Route::post('{pto_request}/approve',
                [DELETEPtoApprovalController::class, 'approve'])->name('approve');
            Route::post('{pto_request}/deny',
                [DELETEPtoApprovalController::class, 'deny'])->name('deny');

// Cancel actions
            Route::patch('{pto_request}/cancel', [PtoRequestController::class, 'cancel'])->name('cancel');
            Route::post('{pto_request}/cancel-own',
                [PtoRequestController::class, 'cancelOwnRequest'])->name('cancel-own');
        });
        /*
        |--------------------------------------------------------------------------
        | User PTO API
        |--------------------------------------------------------------------------
        */
        Route::prefix('user-pto')->name('user-pto.')->group(function () {
            Route::get('dashboard',
                [UserPtoController::class, 'dashboard'])->name('dashboard');
            Route::get('summary', [UserPtoController::class, 'summary'])->name('summary');
            Route::get('my-requests',
                [UserPtoController::class, 'myRequests'])->name('my-requests');
        });
        /*
        |--------------------------------------------------------------------------
        | PTO Balances API
        |--------------------------------------------------------------------------
        */
        Route::prefix('pto-balances')->name('pto-balances.')->group(function () {
            Route::get('/', [PtoBalanceController::class, 'index'])->name('index'); // For current user
            Route::get('user/{user}', [PtoBalanceController::class, 'getUserBalances'])->name('user');
            Route::post('adjust', [PtoBalanceController::class, 'adjustBalance'])->name('adjust');
        });

        /*
        |--------------------------------------------------------------------------
        | PTO Transactions API (Admin only)
        |--------------------------------------------------------------------------
        */
        Route::prefix('pto-transactions')->name('pto-transactions.')->group(function () {
            Route::get('/', [PtoTransactionController::class, 'index'])->name('index');
            Route::get('user/{user}', [PtoTransactionController::class, 'getUserTransactions'])->name('user');
        });

        /*
        |--------------------------------------------------------------------------
        | Other API Routes
        |--------------------------------------------------------------------------
        */
        Route::get('/stats', [AdminStatsController::class, 'getStats']);
        Route::get('/stats/detailed', [AdminStatsController::class, 'getDetailedStats']);

        Route::get('pdf/{pdfId}', [PartsCatalogController::class, 'getPdf'])->name('pdf.show');

        Route::get('/imported-data/file-summaries', [ImportedDataController::class, 'getFileSummaries']);
        Route::get('/imported-data/statistics/{fileName}', [ImportedDataController::class, 'getFileStatistics']);
        Route::get('/imported-data/overall-statistics', [ImportedDataController::class, 'getOverallStatistics']);

// Export functionality
        Route::get('/imported-data/export/{fileName}', [ImportedDataController::class, 'exportFile']);

// Existing routes...
        Route::get('/imported-data', [ImportedDataController::class, 'index']);
        Route::get('/imported-data/unique-file-names', [ImportedDataController::class, 'getUniqueFileNames']);
        Route::get('/imported-data/manufacturers', [ImportedDataController::class, 'getManufacturers']);
        Route::get('/imported-data/models', [ImportedDataController::class, 'getModels']);
        Route::get('/imported-data/{importedDatum}', [ImportedDataController::class, 'show']);
        Route::put('/imported-data/{importedDatum}', [ImportedDataController::class, 'update']);
        Route::delete('/imported-data/{importedDatum}', [ImportedDataController::class, 'destroy']);
        Route::delete('/imported-data/by-filename', [ImportedDataController::class, 'destroyByFileName']);
        Route::get('/imported-data/file-details/{fileName}', [ImportedDataController::class, 'getFileDetails']);

// Part categories endpoint - this might be missing
        Route::get('/imported-data/part-categories', [ImportedDataController::class, 'getPartCategories']);

// Make sure these exist (they might already be there):
        Route::get('/imported-data/manufacturers', [ImportedDataController::class, 'getManufacturers']);
        Route::get('/imported-data/models', [ImportedDataController::class, 'getModels']);

// Individual part update/show routes (might already exist):
        Route::get('/imported-data/{id}', [ImportedDataController::class, 'show']);
        Route::put('/imported-data/{id}', [ImportedDataController::class, 'update']);

// CSV Processing API
        Route::post('/get-csv-headers', [CsvProcessController::class, 'getCsvHeaders'])->name('get-csv-headers');
        Route::post('/upload-csv', [CsvProcessController::class, 'uploadAndProcessCsv'])->name('upload-csv');

// Imported Data API
        Route::get('/imported-data/filenames',
            [ImportedDataController::class, 'getUniqueFileNames'])->name('imported-data.filenames');

        Route::apiResource('imported-data', ImportedDataController::class)->except(['store']);

        Route::prefix('queue-status')->group(function () {
            Route::get('/', [QueueStatusController::class, 'getStatus']);
            Route::get('/redis-details', [QueueStatusController::class, 'getRedisDetails']);
        });

        Route::post('/upload-zip-bundle', [CsvProcessController::class, 'uploadAndProcessZipBundle']);

// Positions API
        Route::apiResource('positions', PositionController::class);

// User Hierarchy API
        Route::get('/hierarchy-tree', [HierarchyController::class, 'getTreeData']);
        Route::get('/users/hierarchy', [UserHierarchyController::class, 'getHierarchy'])->name('users.hierarchy');

// User Hierarchy detailed routes
        Route::prefix('users-hierarchy')->name('users-hierarchy.')->group(function () {
            Route::get('/', [UserHierarchyController::class, 'getUsersWithHierarchyInfo'])->name('list');
            Route::post('/{user}/assign-position',
                [UserHierarchyController::class, 'assignPosition'])->name('assign-position');
            Route::post('/{user}/assign-manager',
                [UserHierarchyController::class, 'assignManager'])->name('assign-manager');
            Route::get('/{user}/details', [UserHierarchyController::class, 'getUserHierarchyDetails'])->name('details');
            Route::get('/{user}/assignable-managers',
                [UserHierarchyController::class, 'getAssignableManagers'])->name('assignable-managers');
        });

// Users API (for dropdowns)
        Route::get('users', function () {
            return response()->json(User::select('id', 'name', 'email', 'hire_date')->get());
        })->name('users.index');
    });

});
