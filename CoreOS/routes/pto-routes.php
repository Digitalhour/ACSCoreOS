<?php

use App\Http\Controllers\Employee\EmergencyContactsController;
use App\Http\Controllers\EmployeePtoController;
use App\Http\Controllers\DepartmentTimeOffController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware([
'auth',
ValidateSessionWithWorkOS::class,
])->group(function () {


    /*
         *
         * Emergancy Contact Routes
         *
         */
        Route::get('/emergency-contacts', [EmergencyContactsController::class, 'index'])
            ->name('emergency-contacts.index');
        Route::post('/emergency-contacts', [EmergencyContactsController::class, 'store'])
            ->name('emergency-contacts.store');
        Route::patch('/emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'update'])
            ->name('emergency-contacts.update');
        Route::delete('/emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'destroy'])
            ->name('emergency-contacts.destroy');


    Route::get('/department-pto',
        [DepartmentTimeOffController::class, 'dashboard'])->name('department.manager.pto.dashboard');

// Department manager approval actions (from manager interface)
    Route::post('/pto-requests/{ptoRequest}/approve',
        [DepartmentTimeOffController::class, 'approve'])->name('pto.requests.approve');
    Route::post('/pto-requests/{ptoRequest}/deny',
        [DepartmentTimeOffController::class, 'deny'])->name('pto.requests.deny');



//// Main user PTO dashboard
    Route::get('/employee/pto', [EmployeePtoController::class, 'index'])->name('pto.dashboard');

// User PTO request management
    Route::post('/pto/requests', [EmployeePtoController::class, 'store'])->name('pto.requests.store');
    Route::post('/pto/requests/{ptoRequest}/cancel',
        [EmployeePtoController::class, 'cancel'])->name('pto.requests.cancel');

// Legacy redirect
    Route::get('/request-pto', function () {
        return redirect()->route('pto.dashboard');
    })->name('request-pto');







});
