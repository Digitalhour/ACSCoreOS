<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Settings\EmergencyContactsController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

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
        'session_id' => session()->getId(),
        'ping' => $n,
        'csrf_token' => csrf_token(),
        'driver' => config('session.driver'),
        'domain' => config('session.domain'),
        'secure' => config('session.secure'),
        'same_site' => config('session.same_site'),
    ];
});

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth')
    ->middleware(ValidateSessionWithWorkOS::class)
    ->group(function () {

        /*

        |--------------------------------------------------------------------------
        | Dashboard Routes
        |--------------------------------------------------------------------------
        */
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/dashboard/monthly-sales-data', [DashboardController::class, 'monthlySalesData']);
        Route::get('/dashboard/yearly-sales-data', [DashboardController::class, 'yearlySalesData']);

        /*
        |--------------------------------------------------------------------------
        | Settings Routes
        |--------------------------------------------------------------------------
        */
        Route::prefix('settings')->name('emergency-contacts.')->group(function () {
            Route::get('emergency-contacts', [EmergencyContactsController::class, 'index'])->name('index');
            Route::post('emergency-contacts', [EmergencyContactsController::class, 'store'])->name('store');
            Route::patch('emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'update'])->name('update');
            Route::delete('emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'destroy'])->name('destroy');
        });

        /*
        |--------------------------------------------------------------------------
        | User Management Routes
        |--------------------------------------------------------------------------
        */
        Route::prefix('user-management')->name('user-management.')->group(function () {
            Route::get('/', [UserManagementController::class, 'index'])->name('index');
            Route::post('invite-user', [UserManagementController::class, 'inviteUserWithPto'])->name('invite');
        });

        // User Management API Routes
        Route::prefix('api')->group(function () {
            Route::get('/widget-token', [UserManagementController::class, 'getWidgetToken']);
            Route::get('/organization-users', [UserManagementController::class, 'getOrganizationUsers']);
            Route::post('/deactivate-user', [UserManagementController::class, 'deactivateUser']);
            Route::post('/reactivate-user', [UserManagementController::class, 'reactivateUser']);
            Route::post('/invite-user-with-pto', [UserManagementController::class, 'inviteUserWithPto']);

            // Online Users API
            Route::get('/online-users', [App\Http\Controllers\OnlineUsersController::class, 'index']);
            Route::post('/mark-online', [App\Http\Controllers\OnlineUsersController::class, 'markOnline']);
            Route::post('/mark-offline', [App\Http\Controllers\OnlineUsersController::class, 'markOffline']);
            Route::post('/update-last-seen', [App\Http\Controllers\OnlineUsersController::class, 'updateLastSeen']);
        });
    });
/*
|--------------------------------------------------------------------------
| Additional Route Files
|--------------------------------------------------------------------------
*/

// Authentication
require __DIR__.'/auth.php';

// Core Features
require __DIR__.'/warehouse-routes.php';
require __DIR__.'/ai-chat-routes.php';
require __DIR__.'/pto-routes.php';
require __DIR__.'/hr-routes.php';
require __DIR__.'/training.php';
require __DIR__.'/payroll-routes.php';

// Content Management
require __DIR__.'/wiki.php';
require __DIR__.'/blog-routes.php';
require __DIR__.'/company-documents-route.php';

// Technical Features
require __DIR__.'/vibtrack.php';
require __DIR__.'/product-picture-manager.php';

// Settings & Configuration
require __DIR__.'/settings.php';
require __DIR__.'/emergency-contacts.php';
require __DIR__.'/departments.php';
require __DIR__.'/access-control.php';

// Development & System
require __DIR__.'/impersonate.php';
require __DIR__.'/channels.php';
require __DIR__.'/api.php';
require __DIR__.'/debug-routes.php';
require __DIR__.'/developer-routes.php';

// Parts Database (commented out)
require __DIR__.'/parts-database.php';
require __DIR__.'/admin-routes.php';
