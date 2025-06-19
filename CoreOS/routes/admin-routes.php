<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\Admin\PtoAdminController;
use App\Http\Controllers\Api\PtoApi\PtoOverviewController;
use App\Http\Controllers\Api\PtoApi\PtoTypeController;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;


Route::middleware([
    'auth',
    ValidateSessionWithWorkOS::class,
])->group(function () {


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

    Route::get('/admin/pto', [PtoAdminController::class, 'dashboard'])
        ->name('admin.pto.dashboard');

    Route::get('/admin/pto-types', [PtoTypeController::class, 'types'])
        ->name('admin.pto.types');

    Route::get('/admin/pto-policies', [PtoAdminController::class, 'policies'])
        ->name('admin.pto.policies');

    Route::get('/admin/pto-requests', [PtoAdminController::class, 'requests'])
        ->name('admin.pto.requests');

    Route::get('/admin/pto-balances', [PtoOverviewController::class, 'index'])
        ->name('admin.pto.balances');

//    Route::get('/admin/pto-Blackouts', [PtoAdminController::class, 'blackouts'])
//        ->name('admin.pto.Blackouts');
    Route::post('/admin/pto/submit-historical',
        [PtoAdminController::class, 'submitHistoricalPto'])->name('submit-historical');



    Route::get('dev-ops/activity-log', [ActivityLogController::class, 'index'])->name('activity-log.index');
    Route::get('dev-ops/activity-log/{activity}', [ActivityLogController::class, 'show'])->name('activity-log.show');




});
