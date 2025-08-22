<?php
//
//use App\Http\Controllers\AccessControlController;
//use Illuminate\Support\Facades\Route;
//use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;
//
//
////        Route::group(['middleware' => ['role_or_permission:Developer|Access Control-Edit Roles']], function () {
////
////            // Access Control Management - Combined System
////
////            Route::get('/access-control', [AccessControlController::class, 'index'])->name('access-control.index');
////
////            // Matrix Updates
////            Route::post('/access-control/role-permissions', [AccessControlController::class, 'updateRolePermissionMatrix'])->name('access-control.role-permissions.update');
////            Route::post('/access-control/user-roles', [AccessControlController::class, 'updateUserRoleMatrix'])->name('access-control.user-roles.update');
////            Route::post('/access-control/user-permissions', [AccessControlController::class, 'updateUserPermissions'])->name('access-control.user-permissions.update');
////
////            // Permission Management
////            Route::post('/access-control/permissions', [AccessControlController::class, 'storePermission'])->name('access-control.permissions.store');
////            Route::put('/access-control/permissions/{permission}', [AccessControlController::class, 'updatePermission'])->name('access-control.permissions.update');
////            Route::delete('/access-control/permissions/{permission}', [AccessControlController::class, 'destroyPermission'])->name('access-control.permissions.destroy');
////
////            // Role Management
////            Route::post('/access-control/roles', [AccessControlController::class, 'storeRole'])->name('access-control.roles.store');
////            Route::put('/access-control/roles/{role}', [AccessControlController::class, 'updateRole'])->name('access-control.roles.update');
////            Route::delete('/access-control/roles/{role}', [AccessControlController::class, 'destroyRole'])->name('access-control.roles.destroy');
////
////            // User Management
////            Route::post('/access-control/users', [AccessControlController::class, 'storeUser'])->name('access-control.users.store');
////
////            // Search Endpoints
////            Route::get('/api/access-control/search/permissions', [AccessControlController::class, 'searchPermissions'])->name('access-control.search.permissions');
////            Route::get('/api/access-control/search/roles', [AccessControlController::class, 'searchRoles'])->name('access-control.search.roles');
////            Route::get('/api/access-control/search/users', [AccessControlController::class, 'searchUsers'])->name('access-control.search.users');
////
////            // Bulk Operations
////            Route::post('/access-control/bulk/assign-roles', [AccessControlController::class, 'bulkAssignRoles'])->name('access-control.bulk.assign-roles');
////            Route::post('/access-control/bulk/assign-permissions', [AccessControlController::class, 'bulkAssignPermissions'])->name('access-control.bulk.assign-permissions');
////
////            // Export
////            Route::get('/access-control/export', [AccessControlController::class, 'export'])->name('access-control.export');
////
////            // Legacy route redirects (optional - for backward compatibility)
////            Route::redirect('/roles-permissions', '/access-control');
////            Route::redirect('/user-roles-matrix', '/access-control');
////        });
//
//
//Route::middleware('auth')
//    ->middleware(ValidateSessionWithWorkOS::class)->name('access-control.')->group(function () {
//        // Main access control page
//        // Access Control routes
//        Route::get('/access-control', [AccessControlController::class, 'index'])->name('access-control.index');
//
//        // Category Management
//        Route::post('/access-control/categories', [AccessControlController::class, 'storeCategory'])->name('access-control.categories.store');
//        Route::put('/access-control/categories/{category}', [AccessControlController::class, 'updateCategory'])->name('access-control.categories.update');
//        Route::delete('/access-control/categories/{category}', [AccessControlController::class, 'destroyCategory'])->name('access-control.categories.destroy');
//
//        // Permission Management (updated)
//        Route::post('/access-control/permissions', [AccessControlController::class, 'storePermission'])->name('access-control.permissions.store');
//        Route::put('/access-control/permissions/{permission}', [AccessControlController::class, 'updatePermission'])->name('access-control.permissions.update');
//        Route::delete('/access-control/permissions/{permission}', [AccessControlController::class, 'destroyPermission'])->name('access-control.permissions.destroy');
//
//        // Role Management
//        Route::post('/access-control/roles', [AccessControlController::class, 'storeRole'])->name('access-control.roles.store');
//        Route::put('/access-control/roles/{role}', [AccessControlController::class, 'updateRole'])->name('access-control.roles.update');
//        Route::delete('/access-control/roles/{role}', [AccessControlController::class, 'destroyRole'])->name('access-control.roles.destroy');
//
//        // Matrix updates
//        Route::post('/access-control/role-permissions', [AccessControlController::class, 'updateRolePermissionMatrix'])->name('access-control.role-permissions.update');
//        Route::post('/access-control/user-roles', [AccessControlController::class, 'updateUserRoleMatrix'])->name('access-control.user-roles.update');
//        Route::post('/access-control/route-permissions', [AccessControlController::class, 'updateRoutePermissions'])->name('access-control.route-permissions.update');
//        Route::post('/access-control/user-permissions', [AccessControlController::class, 'updateUserPermissions'])->name('access-control.user-permissions.update');
//
//        // Bulk operations
//        Route::post('/access-control/bulk/assign-roles', [AccessControlController::class, 'bulkAssignRoles'])->name('access-control.bulk.assign-roles');
//        Route::post('/access-control/bulk/assign-permissions', [AccessControlController::class, 'bulkAssignPermissions'])->name('access-control.bulk.assign-permissions');
//        Route::post('/access-control/bulk/assign-permission-categories', [AccessControlController::class, 'bulkAssignPermissionCategories'])->name('access-control.bulk.assign-permission-categories');
//        Route::post('/access-control/bulk/update-route-permissions', [AccessControlController::class, 'bulkUpdateRoutePermissions'])->name('access-control.bulk.update-route-permissions');
//
//        // Route management
//        Route::post('/access-control/sync-routes', [AccessControlController::class, 'syncRoutes'])->name('access-control.sync-routes');
//        Route::put('/access-control/routes/{routePermission}', [AccessControlController::class, 'updateRoute'])->name('access-control.routes.update');
//
//        // Search endpoints
//        Route::get('/access-control/search/permissions', [AccessControlController::class, 'searchPermissions'])->name('access-control.search.permissions');
//        Route::get('/access-control/search/roles', [AccessControlController::class, 'searchRoles'])->name('access-control.search.roles');
//        Route::get('/access-control/search/users', [AccessControlController::class, 'searchUsers'])->name('access-control.search.users');
//        Route::get('/access-control/search/routes', [AccessControlController::class, 'searchRoutes'])->name('access-control.search.routes');
//        Route::get('/access-control/search/categories', [AccessControlController::class, 'searchCategories'])->name('access-control.search.categories');
//
//        // Export endpoints
//        Route::get('/access-control/export', [AccessControlController::class, 'export'])->name('access-control.export');
//        Route::get('/access-control/export/route-permissions', [AccessControlController::class, 'exportRoutePermissions'])->name('access-control.export.route-permissions');
//    });
//
