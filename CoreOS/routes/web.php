<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeePtoController;
use App\Http\Controllers\Settings\EmergencyContactsController;
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

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth')
    ->middleware(ValidateSessionWithWorkOS::class)
    ->group(function () {

        // User PTO dashboard
        Route::get('/employee/pto', [EmployeePtoController::class, 'index'])->name('pto.dashboard');
        // User PTO request management
        Route::post('/pto/requests', [EmployeePtoController::class, 'store'])->name('pto.requests.store');
        Route::post('/pto/requests/{ptoRequest}/cancel', [EmployeePtoController::class, 'cancel'])->name('pto.requests.cancel');

        // Legacy redirect
        Route::get('/request-pto', function () {
            return redirect()->route('pto.dashboard');
        })->name('request-pto');

        /*

        |--------------------------------------------------------------------------
        | Dashboard Routes
        |--------------------------------------------------------------------------
        */
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/dashboard/monthly-sales-data', [DashboardController::class, 'monthlySalesData']);
        Route::get('/dashboard/yearly-sales-data', [DashboardController::class, 'yearlySalesData']);

        // Notifications
        Route::get('notifications', function () {
            return Inertia::render('NotificationsView');
        })->name('notifications.index');

        /*
        |--------------------------------------------------------------------------
        | User Settings Routes
        |--------------------------------------------------------------------------
        */
        Route::prefix('settings')->name('emergency-contacts.')->group(function () {
            Route::get('emergency-contacts', [EmergencyContactsController::class, 'index'])->name('index');
            Route::post('emergency-contacts', [EmergencyContactsController::class, 'store'])->name('store');
            Route::patch('emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'update'])->name('update');
            Route::delete('emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'destroy'])->name('destroy');
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
// require __DIR__.'/admin-routes.php';
