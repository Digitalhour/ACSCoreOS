<?php

use App\Http\Controllers\ManagerTimeClockController;
use App\Http\Controllers\PayrollTimeClockController;
use App\Http\Controllers\TimeClockController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('time-clock')->group(function () {
        Route::middleware(['permission:Manager-payroll'])->group(function () {
            // Manager routes (NEW)
            Route::prefix('manager')->group(function () {
                Route::get('/dashboard', [ManagerTimeClockController::class, 'dashboard'])->name('time-clock.manager.dashboard');
                Route::get('/timesheets', [ManagerTimeClockController::class, 'timesheets'])->name('time-clock.manager.timesheets');
                Route::post('/approve/{timesheet}', [ManagerTimeClockController::class, 'approve'])->name('time-clock.manager.approve');

                Route::get('/timesheet/{timesheet}', [ManagerTimeClockController::class, 'show'])->name('time-clock.manager.timesheet.show');
                Route::post('/resubmit/{timesheet}', [ManagerTimeClockController::class, 'resubmit'])->name('manager.resubmit');

                Route::get('/day-entries', [ManagerTimeClockController::class, 'getDayEntries'])->name('time-clock.manager.day-entries');
                Route::post('/clock-out/{timeClock}', [ManagerTimeClockController::class, 'clockOutEntry'])->name('time-clock.manager.clock-out');
                Route::post('/add-entry', [ManagerTimeClockController::class, 'addEntry'])->name('time-clock.manager.add-entry');
                Route::post('/update-entry/{timeClock}', [ManagerTimeClockController::class, 'updateEntry'])->name('time-clock.manager.update-entry');
                Route::delete('/delete-entry/{timeClock}', [ManagerTimeClockController::class, 'deleteEntry'])->name('time-clock.manager.delete-entry');
                Route::get('/day-entries-modal', [ManagerTimeClockController::class, 'getDayEntriesModal'])->name('time-clock.manager.day-entries-modal');
            });
        });

        Route::middleware(['permission:Corporate-payroll'])->group(function () {
            Route::prefix('payroll')->group(function () {
                Route::match(['get', 'post'], '/dashboard', [PayrollTimeClockController::class, 'dashboard'])->name('time-clock.payroll.dashboard');

                Route::post('/process/{timesheet}', [PayrollTimeClockController::class, 'process'])->name('time-clock.payroll.process');
                Route::post('/bulk-process', [PayrollTimeClockController::class, 'bulkProcess'])->name('time-clock.payroll.bulk-process');
                Route::get('/export', [PayrollTimeClockController::class, 'export'])->name('time-clock.payroll.export');
                Route::get('/reports', [PayrollTimeClockController::class, 'reports'])->name('time-clock.payroll.reports');
                Route::get('/timesheet/{timesheet}/punches', [PayrollTimeClockController::class, 'timesheetPunches'])->name('time-clock.payroll.timesheet.punches');
                Route::put('/punch/{timeClock}/edit', [PayrollTimeClockController::class, 'editPunch'])->name('time-clock.payroll.punch.edit');
                Route::put('/break/{audit}/edit', [PayrollTimeClockController::class, 'editBreak'])->name('time-clock.payroll.break.edit');
                Route::delete('/punch/{timeClock}/delete', [PayrollTimeClockController::class, 'deletePunch'])->name('time-clock.payroll.punch.delete');
                Route::delete('/break/{audit}/delete', [PayrollTimeClockController::class, 'deleteBreak'])->name('time-clock.payroll.break.delete');
                Route::post('/punch/create', [PayrollTimeClockController::class, 'addEntry'])->name('time-clock.payroll.punch.create');
                Route::post('/punch/{timeClock}/clock-out', [PayrollTimeClockController::class, 'clockOut'])->name('time-clock.payroll.punch.clock-out');
                Route::get('/export-punches', [PayrollTimeClockController::class, 'exportPunches'])->name('time-clock.payroll.export-punches');
                Route::post('/reject/{timesheet}', [PayrollTimeClockController::class, 'reject'])->name('payroll.reject');
                Route::post('/bulk-reject', [PayrollTimeClockController::class, 'bulkReject'])->name('payroll.bulk-reject');
                Route::post('/update-entry/{timeClock}', [PayrollTimeClockController::class, 'updateEntry'])->name('time-clock.payroll.update-entry');
                Route::post('/add-entry', [PayrollTimeClockController::class, 'addEntry'])->name('time-clock.payroll.add-entry');
            });
        });



            // Employee routes (existing)
            Route::get('/employee', [TimeClockController::class, 'employee'])->name('time-clock.employee');
            Route::post('/clock-in', [TimeClockController::class, 'clockIn'])->name('time-clock.clock-in');
            Route::post('/clock-out', [TimeClockController::class, 'clockOut'])->name('time-clock.clock-out');
            Route::post('/start-break', [TimeClockController::class, 'startBreak'])->name('time-clock.start-break');
            Route::post('/end-break', [TimeClockController::class, 'endBreak'])->name('time-clock.end-break');
            Route::get('/status', [TimeClockController::class, 'status'])->name('time-clock.status');

            // Timesheet submission routes (existing)
            Route::post('/submit-timesheet', [TimeClockController::class, 'submitTimesheet'])->name('time-clock.submit-timesheet');
            Route::post('/withdraw-timesheet', [TimeClockController::class, 'withdrawTimesheet'])->name('time-clock.withdraw-timesheet');
            Route::get('/week-timesheet', [TimeClockController::class, 'getWeekTimesheet'])->name('time-clock.week-timesheet');






    });

});
