<?php

use App\Http\Controllers\AccessControlController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\NavigationController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware('auth')->middleware(ValidateSessionWithWorkOS::class)->group(function () {


    Route::get('dev-ops/activity-log', [ActivityLogController::class, 'index'])->name('activity-log.index');
    Route::get('dev-ops/activity-log/{activity}', [ActivityLogController::class, 'show'])->name('activity-log.show');






//    Route::group(['middleware' => ['role_or_permission:Developer']], function () {
        //dev dashboard
//        Route::get('/admin', function () {
//            return Inertia::render('Admin/adminDashboard', [
//                'title' => 'Admin Dashboard',
//                'userStats' => [
//                    'totalUsers' => User::count(),
////                    'activeUsers' => User::where('last_login_at', '>=', now()->subDays(30))->count(),
////                    'totalLogins' => User::sum('login_count')
//                ]
//            ]);
//        })->name('admin.index');

        Route::get('/dev-ops/dashboard', function () {
            return Inertia::render('Admin/AdminDashboard', [
                'title' => 'Dev-Ops Dashboard',
            ]);
        })->name('admin.index');

        // Access Control
        Route::group(['prefix' => '/dev-ops/access-control'], function () {
            Route::get('/', [AccessControlController::class, 'index'])->name('access-control.index');

            // Category Management
            Route::post('/categories', [AccessControlController::class, 'storeCategory'])->name('access-control.categories.store');
            Route::put('/categories/{category}', [AccessControlController::class, 'updateCategory'])->name('access-control.categories.update');
            Route::delete('/categories/{category}', [AccessControlController::class, 'destroyCategory'])->name('access-control.categories.destroy');

            // Permission Management (updated)
            Route::post('/permissions', [AccessControlController::class, 'storePermission'])->name('access-control.permissions.store');
            Route::put('/permissions/{permission}', [AccessControlController::class, 'updatePermission'])->name('access-control.permissions.update');
            Route::delete('/permissions/{permission}', [AccessControlController::class, 'destroyPermission'])->name('access-control.permissions.destroy');

            // Role Management
            Route::post('/roles', [AccessControlController::class, 'storeRole'])->name('access-control.roles.store');
            Route::put('/roles/{role}', [AccessControlController::class, 'updateRole'])->name('access-control.roles.update');
            Route::delete('/roles/{role}', [AccessControlController::class, 'destroyRole'])->name('access-control.roles.destroy');

            // Matrix updates
            Route::post('/role-permissions', [AccessControlController::class, 'updateRolePermissionMatrix'])->name('access-control.role-permissions.update');
            Route::post('/user-roles', [AccessControlController::class, 'updateUserRoleMatrix'])->name('access-control.user-roles.update');
            Route::post('/route-permissions', [AccessControlController::class, 'updateRoutePermissions'])->name('access-control.route-permissions.update');
            Route::post('/user-permissions', [AccessControlController::class, 'updateUserPermissions'])->name('access-control.user-permissions.update');

            // Bulk operations
            Route::post('/bulk/assign-roles', [AccessControlController::class, 'bulkAssignRoles'])->name('access-control.bulk.assign-roles');
            Route::post('/bulk/assign-permissions', [AccessControlController::class, 'bulkAssignPermissions'])->name('access-control.bulk.assign-permissions');
            Route::post('/bulk/assign-permission-categories', [AccessControlController::class, 'bulkAssignPermissionCategories'])->name('access-control.bulk.assign-permission-categories');
            Route::post('/bulk/update-route-permissions', [AccessControlController::class, 'bulkUpdateRoutePermissions'])->name('access-control.bulk.update-route-permissions');

            // Route management
            Route::post('/sync-routes', [AccessControlController::class, 'syncRoutes'])->name('access-control.sync-routes');
            Route::put('/routes/{routePermission}', [AccessControlController::class, 'updateRoute'])->name('access-control.routes.update');

            // Search endpoints
            Route::get('/search/permissions', [AccessControlController::class, 'searchPermissions'])->name('access-control.search.permissions');
            Route::get('/search/roles', [AccessControlController::class, 'searchRoles'])->name('access-control.search.roles');
            Route::get('/search/users', [AccessControlController::class, 'searchUsers'])->name('access-control.search.users');
            Route::get('/search/routes', [AccessControlController::class, 'searchRoutes'])->name('access-control.search.routes');
            Route::get('/search/categories', [AccessControlController::class, 'searchCategories'])->name('access-control.search.categories');

            // Export endpoints
            Route::get('/export', [AccessControlController::class, 'export'])->name('access-control.export');
            Route::get('/export/route-permissions', [AccessControlController::class, 'exportRoutePermissions'])->name('access-control.export.route-permissions');

        });

        //Navigation Control

//Navigation Control
        Route::group(['prefix' => 'dev-ops/navigation'], function () {
            Route::get('/', [NavigationController::class, 'index'])->name('navigation.index'); // This becomes /admin/navigation

            // CRUD operations
            Route::post('/', [NavigationController::class, 'store'])->name('navigation.store');
            Route::put('/{navigationItem}', [NavigationController::class, 'update'])->name('navigation.update');
            Route::delete('/{navigationItem}', [NavigationController::class, 'destroy'])->name('navigation.destroy');

            // Special operations
            Route::post('/update-order', [NavigationController::class, 'updateOrder'])->name('navigation.update-order');
            Route::post('/{navigationItem}/toggle-active', [NavigationController::class, 'toggleActive'])->name('navigation.toggle-active');
        });
        // API endpoint for getting navigation data (used by sidebar)
        Route::get('/api/navigation-data', [NavigationController::class, 'getNavigationData'])->name('navigation.data');

        // Activity Log {Will change to Activity Log in the future}
        Route::group(['prefix' => '/dev-ops/'], function () {
            Route::get('activity-log', [ActivityLogController::class, 'index'])->name('activity-log.index');
            Route::get('activity-log/{activity}', [ActivityLogController::class, 'show'])->name('activity-log.show');
        });
        /*
          |--------------------------------------------------------------------------
          | User Management Routes BACKEND WORKOS
          |--------------------------------------------------------------------------
          */
        Route::prefix('user-management')->name('user-management.')->group(function () {
            Route::get('/', [UserManagementController::class, 'index'])->name('index');
            Route::post('invite-user', [UserManagementController::class, 'inviteUserWithPto'])->name('invite');
        });
        // User Management API Routes for WORKOS
        Route::prefix('api')->group(function () {
            Route::get('/widget-token', [UserManagementController::class, 'getWidgetToken']);
            Route::get('/organization-users', [UserManagementController::class, 'getOrganizationUsers']);
            Route::post('/deactivate-user', [UserManagementController::class, 'deactivateUser']);
            Route::post('/reactivate-user', [UserManagementController::class, 'reactivateUser']);
            Route::post('/invite-user-with-pto', [UserManagementController::class, 'inviteUserWithPto']);

        });














//    });
});
