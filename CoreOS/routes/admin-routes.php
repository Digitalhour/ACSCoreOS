<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\Admin\OnlineUsersController;
use Illuminate\Support\Facades\Route;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;
use Inertia\Inertia;


Route::middleware('auth')
    ->middleware(ValidateSessionWithWorkOS::class)
    ->group(function () {

    // Admin dashboard with online users
    Route::get('/admin', function () {
        return Inertia::render('Admin/AdminDashboard', [
            'title' => 'Admin Dashboard'
        ]);
    })->name('admin.index');

    // Online users API endpoints
    Route::prefix('api/admin')->group(function () {
        Route::get('/online-users', [OnlineUsersController::class, 'getOnlineUsers'])->name('admin.online-users');
        Route::post('/user-status', [OnlineUsersController::class, 'updateUserStatus'])->name('admin.user-status');
        Route::post('/heartbeat', [OnlineUsersController::class, 'heartbeat'])->name('admin.heartbeat');
    });

    Route::get('dev-ops/activity-log', [ActivityLogController::class, 'index'])->name('activity-log.index');
    Route::get('dev-ops/activity-log/{activity}', [ActivityLogController::class, 'show'])->name('activity-log.show');

});
