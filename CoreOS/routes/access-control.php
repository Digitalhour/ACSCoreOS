<?php

use App\Http\Controllers\AccessControlController;
use Illuminate\Support\Facades\Route;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;


//        Route::group(['middleware' => ['role_or_permission:Developer|Access Control-Edit Roles']], function () {
//
//            // Access Control Management - Combined System
//
//            Route::get('/access-control', [AccessControlController::class, 'index'])->name('access-control.index');
//
//            // Matrix Updates
//            Route::post('/access-control/role-permissions', [AccessControlController::class, 'updateRolePermissionMatrix'])->name('access-control.role-permissions.update');
//            Route::post('/access-control/user-roles', [AccessControlController::class, 'updateUserRoleMatrix'])->name('access-control.user-roles.update');
//            Route::post('/access-control/user-permissions', [AccessControlController::class, 'updateUserPermissions'])->name('access-control.user-permissions.update');
//
//            // Permission Management
//            Route::post('/access-control/permissions', [AccessControlController::class, 'storePermission'])->name('access-control.permissions.store');
//            Route::put('/access-control/permissions/{permission}', [AccessControlController::class, 'updatePermission'])->name('access-control.permissions.update');
//            Route::delete('/access-control/permissions/{permission}', [AccessControlController::class, 'destroyPermission'])->name('access-control.permissions.destroy');
//
//            // Role Management
//            Route::post('/access-control/roles', [AccessControlController::class, 'storeRole'])->name('access-control.roles.store');
//            Route::put('/access-control/roles/{role}', [AccessControlController::class, 'updateRole'])->name('access-control.roles.update');
//            Route::delete('/access-control/roles/{role}', [AccessControlController::class, 'destroyRole'])->name('access-control.roles.destroy');
//
//            // User Management
//            Route::post('/access-control/users', [AccessControlController::class, 'storeUser'])->name('access-control.users.store');
//
//            // Search Endpoints
//            Route::get('/api/access-control/search/permissions', [AccessControlController::class, 'searchPermissions'])->name('access-control.search.permissions');
//            Route::get('/api/access-control/search/roles', [AccessControlController::class, 'searchRoles'])->name('access-control.search.roles');
//            Route::get('/api/access-control/search/users', [AccessControlController::class, 'searchUsers'])->name('access-control.search.users');
//
//            // Bulk Operations
//            Route::post('/access-control/bulk/assign-roles', [AccessControlController::class, 'bulkAssignRoles'])->name('access-control.bulk.assign-roles');
//            Route::post('/access-control/bulk/assign-permissions', [AccessControlController::class, 'bulkAssignPermissions'])->name('access-control.bulk.assign-permissions');
//
//            // Export
//            Route::get('/access-control/export', [AccessControlController::class, 'export'])->name('access-control.export');
//
//            // Legacy route redirects (optional - for backward compatibility)
//            Route::redirect('/roles-permissions', '/access-control');
//            Route::redirect('/user-roles-matrix', '/access-control');
//        });


        Route::middleware('auth')
            ->middleware(ValidateSessionWithWorkOS::class)->prefix('access-control')->name('access-control.')->group(function () {
            // Main access control page
            Route::get('/', [AccessControlController::class, 'index'])->name('index');
                Route::post('/bulk/update-route-permissions', [AccessControlController::class, 'bulkUpdateRoutePermissions'])->name('bulk-update-route-permissions');
            // Matrix updates
            Route::post('/role-permissions',
                [AccessControlController::class, 'updateRolePermissionMatrix'])->name('update-role-permissions');
            Route::post('/user-roles',
                [AccessControlController::class, 'updateUserRoleMatrix'])->name('update-user-roles');
            Route::post('/user-permissions',
                [AccessControlController::class, 'updateUserPermissions'])->name('update-user-permissions');

            // NEW: Route permission management
            Route::post('/route-permissions',
                [AccessControlController::class, 'updateRoutePermissions'])->name('update-route-permissions');
            Route::post('/sync-routes', [AccessControlController::class, 'syncRoutes'])->name('sync-routes');
            Route::patch('/routes/{routePermission}',
                [AccessControlController::class, 'updateRoute'])->name('update-route');

            // Permission management
            Route::post('/permissions', [AccessControlController::class, 'storePermission'])->name('store-permission');
            Route::patch('/permissions/{permission}',
                [AccessControlController::class, 'updatePermission'])->name('update-permission');
            Route::delete('/permissions/{permission}',
                [AccessControlController::class, 'destroyPermission'])->name('destroy-permission');

            // Role management
            Route::post('/roles', [AccessControlController::class, 'storeRole'])->name('store-role');
            Route::patch('/roles/{role}', [AccessControlController::class, 'updateRole'])->name('update-role');
            Route::delete('/roles/{role}', [AccessControlController::class, 'destroyRole'])->name('destroy-role');

            // User management
            Route::post('/users', [AccessControlController::class, 'storeUser'])->name('store-user');

            // Search endpoints
            Route::get('/search/permissions',
                [AccessControlController::class, 'searchPermissions'])->name('search-permissions');
            Route::get('/search/roles', [AccessControlController::class, 'searchRoles'])->name('search-roles');
            Route::get('/search/users', [AccessControlController::class, 'searchUsers'])->name('search-users');
            Route::get('/search/routes', [AccessControlController::class, 'searchRoutes'])->name('search-routes');

            // Bulk operations
            Route::post('/bulk/assign-roles',
                [AccessControlController::class, 'bulkAssignRoles'])->name('bulk-assign-roles');
            Route::post('/bulk/assign-permissions',
                [AccessControlController::class, 'bulkAssignPermissions'])->name('bulk-assign-permissions');
            Route::post('/bulk/update-route-permissions',
                [AccessControlController::class, 'bulkUpdateRoutePermissions'])->name('bulk-update-route-permissions');

            // Exports
            Route::get('/export', [AccessControlController::class, 'export'])->name('export');
            Route::get('/export/route-permissions',
                [AccessControlController::class, 'exportRoutePermissions'])->name('export-route-permissions');
        });

