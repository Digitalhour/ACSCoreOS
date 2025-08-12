<?php

use App\Http\Controllers\ActivityLogController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;


Route::middleware('auth')
    ->middleware(ValidateSessionWithWorkOS::class)
    ->group(function () {


    Route::get('/admin', function () {
        return Inertia::render('Admin/adminDashboard', [
            'title' => 'Admin Dashboard',
//            'userStats' => [
//                'totalUsers' => User::count(),
//                'activeUsers' => User::where('last_login_at', '>=', now()->subDays(30))->count(),
//                'totalLogins' => User::sum('login_count')
//            ]
        ]);
    })->name('admin.index');


    Route::get('dev-ops/activity-log', [ActivityLogController::class, 'index'])->name('activity-log.index');
    Route::get('dev-ops/activity-log/{activity}', [ActivityLogController::class, 'show'])->name('activity-log.show');



});
