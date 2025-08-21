<?php

use App\Http\Controllers\ActivityLogController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware('auth')
    ->middleware(ValidateSessionWithWorkOS::class)
    ->group(function () {

        // Admin dashboard with online users
        Route::get('/admin', function () {
            return Inertia::render('Admin/AdminDashboard', [
                'title' => 'Admin Dashboard',
            ]);
        })->name('admin.index');

        // Online users API endpoints

        Route::get('dev-ops/activity-log', [ActivityLogController::class, 'index'])->name('activity-log.index');
        Route::get('dev-ops/activity-log/{activity}', [ActivityLogController::class, 'show'])->name('activity-log.show');

    });
