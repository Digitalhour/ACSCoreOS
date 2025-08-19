<?php

use App\Http\Controllers\Api\PtoApi\PtoApprovalRuleController;
use App\Http\Controllers\Api\UserPtoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PartsDataset\PartsAccessController;
use App\Http\Controllers\PartsDataset\PartsController;
use App\Http\Controllers\Settings\EmergencyContactsController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\WidgetController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');


Route::get('/test', function () {
    return 'Homepage test working!';
});


Route::get('/_debug-session', function () {
    $n = session('ping', 0) + 1;
    session(['ping' => $n]);
    return [
        'session_id'  => session()->getId(),
        'ping'        => $n,
        'csrf_token'  => csrf_token(),
        'driver'      => config('session.driver'),
        'domain'      => config('session.domain'),
        'secure'      => config('session.secure'),
        'same_site'   => config('session.same_site'),
    ];
});

Route::middleware('auth')->middleware(ValidateSessionWithWorkOS::class)->group(function () {



Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
// sales numbers on the dashboard
   Route::get('/dashboard/monthly-sales-data', [DashboardController::class, 'monthlySalesData']);
   Route::get('/dashboard/yearly-sales-data', [DashboardController::class, 'yearlySalesData']);

    /*
    *
    * Emergancy Contact Routes
    *
    */




        Route::get('settings/emergency-contacts', [EmergencyContactsController::class, 'index'])->name('emergency-contacts.index');
        Route::post('settings/emergency-contacts', [EmergencyContactsController::class, 'store'])->name('emergency-contacts.store');
        Route::patch('settings/emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'update'])->name('emergency-contacts.update');
        Route::delete('settings/emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'destroy'])->name('emergency-contacts.destroy');





        Route::get('/user-management', [UserManagementController::class, 'index'])->name('user-management');
        Route::get('/api/widget-token', [UserManagementController::class, 'getWidgetToken']);
        Route::get('/api/organization-users', [UserManagementController::class, 'getOrganizationUsers']);
        Route::post('/api/deactivate-user', [UserManagementController::class, 'deactivateUser']);
        Route::post('/api/reactivate-user', [UserManagementController::class, 'reactivateUser']);
        Route::post('/api/invite-user-with-pto', [UserManagementController::class, 'inviteUserWithPto']);
        Route::post('/user-management/invite-user', [UserManagementController::class, 'inviteUserWithPto'])->name('user-management.invite');






// Parts Dataset Routes (using Inertia for web routes)
    Route::middleware(['auth', 'verified'])->prefix('parts')->name('parts.')->group(function () {

        // Web routes (Inertia)
        Route::get('/', [PartsController::class, 'index'])->name('index');
        Route::get('/upload', [PartsController::class, 'create'])->name('create');

    });

    Route::get('/parts-browse', [PartsAccessController::class, 'index'])->name('parts-browse.index');
    Route::get('/parts-dataset/parts-browse', [PartsAccessController::class, 'index'])->name('parts-dataset.parts-browse.index');

    Route::prefix('parts-dataset')->name('parts-dataset.')->group(function () {
        // ... existing routes ...

        // Parts Browse Routes

        Route::get('/api/parts-browse/parts', [PartsAccessController::class, 'parts'])->name('parts-browse.parts');
        Route::get('/api/parts-browse/{partId}', [PartsAccessController::class, 'show'])->name('parts-browse.show');
    });

// API routes for Parts Dataset
    // API routes for Parts Dataset
    Route::middleware(['auth'])->prefix('api/parts')->name('api.parts.')->group(function () {

        // Existing routes...
        Route::post('/upload', [PartsController::class, 'store'])->name('upload');
        Route::get('/uploads', [PartsController::class, 'uploads'])->name('uploads.index');
        Route::get('/uploads/{uploadId}', [PartsController::class, 'showUpload'])->name('uploads.show');
        Route::delete('/uploads/{uploadId}', [PartsController::class, 'destroyUpload'])->name('uploads.destroy');
        Route::post('/uploads/{uploadId}/retry', [PartsController::class, 'retryUpload'])->name('uploads.retry');
        Route::post('/uploads/{uploadId}/cancel', [PartsController::class, 'cancelUpload'])->name('uploads.cancel');

        // Enhanced Progress Tracking Routes
        Route::get('/uploads/{uploadId}/progress', [PartsController::class, 'uploadProgress'])->name('uploads.progress');
        Route::post('/uploads/{uploadId}/progress/refresh', [PartsController::class, 'refreshUploadProgress'])->name('uploads.progress.refresh');
        Route::get('/uploads/{uploadId}/chunks', [PartsController::class, 'uploadChunks'])->name('uploads.chunks');
        Route::post('/uploads/progress-summary', [PartsController::class, 'uploadsProgressSummary'])->name('uploads.progress-summary');

        // Enhanced Queue Monitoring
        Route::get('/queue-status', [PartsController::class, 'queueStatus'])->name('queue-status');
        Route::get('/queue-status-detailed', [PartsController::class, 'queueStatusDetailed'])->name('queue-status-detailed');

        // Existing routes...
        Route::get('/parts', [PartsController::class, 'parts'])->name('parts.index');
        Route::put('/parts/{partId}', [PartsController::class, 'updatePart'])->name('parts.update');
        Route::post('/parts/{partId}/image', [PartsController::class, 'uploadPartImage'])->name('parts.upload-image');
        Route::delete('/parts/{partId}/image', [PartsController::class, 'deletePartImage'])->name('parts.delete-image');
        Route::post('/sync-shopify', [PartsController::class, 'syncShopify'])->name('sync-shopify');
        Route::post('/uploads/{uploadId}/sync-shopify', [PartsController::class, 'syncUploadShopify'])->name('sync-upload-shopify');
        Route::get('/statistics', [PartsController::class, 'statistics'])->name('statistics');
    });







});
require __DIR__.'/warehouse-routes.php';
require __DIR__ .'/ai-chat-routes.php';
require __DIR__.'/settings.php';
require __DIR__.'/impersonate.php';
require __DIR__.'/emergency-contacts.php';
require __DIR__.'/pto-routes.php';
//require __DIR__.'/parts-database.php';
//require __DIR__.'/admin-routes.php';.
require __DIR__.'/departments.php';
require __DIR__.'/api.php';
require __DIR__.'/product-picture-manager.php';
require __DIR__.'/auth.php';
require __DIR__.'/hr-routes.php';
require __DIR__.'/channels.php';
require __DIR__.'/vibtrack.php';
require __DIR__.'/wiki.php';
require __DIR__.'/blog-routes.php';
require __DIR__.'/training.php';
require __DIR__.'/payroll-routes.php';
require __DIR__.'/company-documents-route.php';
require __DIR__.'/debug-routes.php';
require __DIR__.'/access-control.php';
require __DIR__.'/developer-routes.php';

