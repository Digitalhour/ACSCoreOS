<?php

use App\Http\Controllers\AccessControlController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\NavigationController;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware('auth')->middleware(ValidateSessionWithWorkOS::class)->group(function () {
    Route::group(['middleware' => ['role_or_permission:Developer']], function () {
        //dev dashboard
        Route::get('/admin', function () {
            return Inertia::render('Admin/adminDashboard', [
                'title' => 'Admin Dashboard',
                'userStats' => [
                    'totalUsers' => User::count(),
                    'activeUsers' => User::where('last_login_at', '>=', now()->subDays(30))->count(),
                    'totalLogins' => User::sum('login_count')
                ]
            ]);
        })->name('admin.index');



        // Access Control
        Route::group(['prefix' => 'access-control'], function () {
            Route::get('/', [AccessControlController::class, 'index'])->name('access-control.index');
            // Matrix Updates
            Route::post('/role-permissions', [AccessControlController::class, 'updateRolePermissionMatrix'])->name('access-control.role-permissions.update');
            Route::post('/user-roles', [AccessControlController::class, 'updateUserRoleMatrix'])->name('access-control.user-roles.update');
            Route::post('/user-permissions', [AccessControlController::class, 'updateUserPermissions'])->name('access-control.user-permissions.update');
            // Permission Management
            Route::post('/permissions', [AccessControlController::class, 'storePermission'])->name('access-control.permissions.store');
            Route::put('/permissions/{permission}', [AccessControlController::class, 'updatePermission'])->name('access-control.permissions.update');
            Route::delete('/permissions/{permission}', [AccessControlController::class, 'destroyPermission'])->name('access-control.permissions.destroy');
            // Role Management
            Route::post('/roles', [AccessControlController::class, 'storeRole'])->name('access-control.roles.store');
            Route::put('/roles/{role}', [AccessControlController::class, 'updateRole'])->name('access-control.roles.update');
            Route::delete('/roles/{role}', [AccessControlController::class, 'destroyRole'])->name('access-control.roles.destroy');
            // User Management
            Route::post('/users', [AccessControlController::class, 'storeUser'])->name('access-control.users.store');
            // Search Endpoints
            Route::get('/api/search/permissions', [AccessControlController::class, 'searchPermissions'])->name('access-control.search.permissions');
            Route::get('/api/search/roles', [AccessControlController::class, 'searchRoles'])->name('access-control.search.roles');
            Route::get('/api/search/users', [AccessControlController::class, 'searchUsers'])->name('access-control.search.users');
            // Bulk Operations
            Route::post('/bulk/assign-roles', [AccessControlController::class, 'bulkAssignRoles'])->name('access-control.bulk.assign-roles');
            Route::post('/bulk/assign-permissions', [AccessControlController::class, 'bulkAssignPermissions'])->name('access-control.bulk.assign-permissions');
            // Export
            Route::get('/export', [AccessControlController::class, 'export'])->name('access-control.export');
            // Legacy route redirects (optional - for backward compatibility)
            Route::redirect('/roles-permissions', '/');
            Route::redirect('/user-roles-matrix', '/');

        });

        //Navigation Control
        Route::group(['prefix' => '/admin/navigation'], function () {
            Route::get('/', [NavigationController::class, 'index'])->name('navigation.index');

            // CRUD operations
            Route::post('/admin/navigation', [NavigationController::class, 'store'])->name('navigation.store');
            Route::put('/admin/navigation/{navigationItem}', [NavigationController::class, 'update'])->name('navigation.update');
            Route::delete('/admin/navigation/{navigationItem}', [NavigationController::class, 'destroy'])->name('navigation.destroy');

            // Special operations
            Route::post('/admin/navigation/update-order', [NavigationController::class, 'updateOrder'])->name('navigation.update-order');
            Route::post('/admin/navigation/{navigationItem}/toggle-active', [NavigationController::class, 'toggleActive'])->name('navigation.toggle-active');

        });
            // API endpoint for getting navigation data (used by sidebar)
            Route::get('/api/navigation-data', [NavigationController::class, 'getNavigationData'])->name('navigation.data');

            // Activity Log {Will change to Activity Log in the future}
        Route::group(['prefix' => '/dev-ops/'], function () {
            Route::get('activity-log', [ActivityLogController::class, 'index'])->name('activity-log.index');
            Route::get('activity-log/{activity}', [ActivityLogController::class, 'show'])->name('activity-log.show');
        });














    });
});
