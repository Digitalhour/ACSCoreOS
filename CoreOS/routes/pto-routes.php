<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware([
'auth',
ValidateSessionWithWorkOS::class,
])->group(function () {

    Route::get('/pto', function () {
        return Inertia::render('employee/UserPtoDashboard');
    })->name('pto.dashboard');
    Route::get('/my-pto', function () {
        return redirect()->route('pto.dashboard');
    })->name('my-pto');









});
