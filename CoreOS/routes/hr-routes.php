<?php

use App\Http\Controllers\Admin\BlackoutController;
use App\Http\Controllers\Admin\PtoAdminController;
use App\Http\Controllers\Api\PtoApi\HREmployeesController;
use App\Http\Controllers\Api\PtoApi\PtoOverviewController;
use App\Http\Controllers\Api\PtoApi\PTOSubmitHistoricalController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\HumanResources\LessonContentController;
use App\Http\Controllers\HumanResources\LessonController;
use App\Http\Controllers\HumanResources\ModuleController;
use App\Http\Controllers\HumanResources\QuestionController;
use App\Http\Controllers\HumanResources\QuizController;
use App\Http\Controllers\HumanResources\ReportController;
use App\Http\Controllers\HumanResources\TestController;
use App\Http\Controllers\HumanResources\TestQuestionController;
use App\Http\Controllers\ManagerTimeClockController;
use App\Http\Controllers\OldStyleTrainingTrackingController;
use App\Http\Controllers\PayrollTimeClockController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TimeClockController;
use App\Http\Controllers\Training\TrainingController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

//use App\Http\Controllers\TrainingController;


Route::middleware(['auth', ValidateSessionWithWorkOS::class,])->group(function () {


    // Time Clock
    Route::get('/timeclock', function () {
        return Inertia::render('TimeClock/Index');
    })->name('timeclock.index');

    // Employee Timesheet
    Route::get('/timesheet', function () {
        return Inertia::render('Timesheet/Employee');
    })->name('timesheet.employee');

    // Manager Views
//    Route::get('/timesheet/manage', function () {
//        return Inertia::render('Timesheet/Manager');
//    })->name('timesheet.manager');

//// Weekly timesheet data for manager view
//    Route::get('/timesheet/weekly-data', [TimesheetManagerController::class, 'getWeeklyData']);
//
//    // Time Entry CRUD (Manager functions)
//    Route::post('/time-entries', [TimesheetManagerController::class, 'store']);
//    Route::delete('/time-entries/{timeEntry}', [TimesheetManagerController::class, 'destroy']);
//
//    // Time Adjustment History
//    Route::get('/time-adjustments/history/{timeEntry}', [TimeAdjustmentController::class, 'getHistoryForEntry']);
//
//    // Manager Time Correction (for the edit functionality)
//    Route::post('/time-adjustments/manager/time-correction', [TimeAdjustmentController::class, 'managerTimeCorrection']);
//
//    Route::get('/api/timesheet/manageable-users', [TimesheetManagerController::class, 'getManageableUsers']);
//    Route::get('/api/timesheet/weekly-data', [TimesheetManagerController::class, 'getWeeklyData']);
//

    Route::prefix('time-clock')->group(function () {

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

        // Manager routes (NEW)
        Route::prefix('manager')->group(function () {
            Route::get('/dashboard', [ManagerTimeClockController::class, 'dashboard'])->name('time-clock.manager.dashboard');
            Route::get('/timesheets', [ManagerTimeClockController::class, 'timesheets'])->name('time-clock.manager.timesheets');
            Route::post('/approve/{timesheet}', [ManagerTimeClockController::class, 'approve'])->name('time-clock.manager.approve');
            Route::get('/timesheet/{timesheet}', [ManagerTimeClockController::class, 'show'])->name('time-clock.manager.timesheet.show');
        });

        Route::prefix('payroll')->group(function () {
            Route::get('/dashboard', [PayrollTimeClockController::class, 'dashboard'])->name('time-clock.payroll.dashboard');
            Route::post('/process/{timesheet}', [PayrollTimeClockController::class, 'process'])->name('time-clock.payroll.process');
            Route::post('/bulk-process', [PayrollTimeClockController::class, 'bulkProcess'])->name('time-clock.payroll.bulk-process');
            Route::get('/export', [PayrollTimeClockController::class, 'export'])->name('time-clock.payroll.export');
            Route::get('/reports', [PayrollTimeClockController::class, 'reports'])->name('time-clock.payroll.reports');
        });

    });










// Old Style Training Tracking Routes
    Route::get('/old-style-training-tracking', [OldStyleTrainingTrackingController::class, 'index'])
        ->name('old-style-training-tracking.index');

    Route::post('/old-style-training-tracking', [OldStyleTrainingTrackingController::class, 'store'])
        ->name('old-style-training-tracking.store');

    Route::put('/old-style-training-tracking/{type}/{id}', [OldStyleTrainingTrackingController::class, 'update'])
        ->name('old-style-training-tracking.update');

    Route::delete('/old-style-training-tracking/{type}/{id}', [OldStyleTrainingTrackingController::class, 'destroy'])
        ->name('old-style-training-tracking.destroy');

    Route::get('/old-style-training-tracking/export-data', [OldStyleTrainingTrackingController::class, 'exportData'])
        ->name('old-style-training-tracking.export-data');

    Route::get('/old-style-training-tracking/export-logs', [OldStyleTrainingTrackingController::class, 'exportLogs'])
        ->name('old-style-training-tracking.export-logs');

//    // Document Routes
//    Route::prefix('documents')->name('documents.')->group(function () {
//        Route::get('/', [DocumentController::class, 'index'])->name('index');
//        Route::get('/create', [DocumentController::class, 'create'])->name('create');
//        Route::post('/', [DocumentController::class, 'store'])->name('store');
//        Route::get('/{document}', [DocumentController::class, 'show'])->name('show');
//        Route::get('/{document}/edit', [DocumentController::class, 'edit'])->name('edit');
//        Route::put('/{document}', [DocumentController::class, 'update'])->name('update');
//        Route::delete('/{document}', [DocumentController::class, 'destroy'])->name('destroy');
//        Route::get('/{document}/download', [DocumentController::class, 'download'])->name('download');
//
//    });
//    Route::get('/documents/{document}/view', [DocumentController::class, 'view'])->name('documents.view');
//    // Folder Routes
//    Route::prefix('folders')->name('folders.')->group(function () {
//        Route::get('/', [FolderController::class, 'index'])->name('index');
//        Route::get('/create', [FolderController::class, 'create'])->name('create');
//        Route::post('/', [FolderController::class, 'store'])->name('store');
//        Route::get('/{folder}', [FolderController::class, 'show'])->name('show');
//        Route::get('/{folder}/edit', [FolderController::class, 'edit'])->name('edit');
//        Route::put('/{folder}', [FolderController::class, 'update'])->name('update');
//        Route::delete('/{folder}', [FolderController::class, 'destroy'])->name('destroy');
//    });
//
    // Tag Routes
    Route::prefix('tags')->name('tags.')->group(function () {
        Route::get('/', [TagController::class, 'index'])->name('index');
        Route::get('/create', [TagController::class, 'create'])->name('create');
        Route::post('/', [TagController::class, 'store'])->name('store');
        Route::get('/{tag}', [TagController::class, 'show'])->name('show');
        Route::get('/{tag}/edit', [TagController::class, 'edit'])->name('edit');
        Route::put('/{tag}', [TagController::class, 'update'])->name('update');
        Route::delete('/{tag}', [TagController::class, 'destroy'])->name('destroy');

        // AJAX search route for tags
        Route::get('/search/ajax', [TagController::class, 'search'])->name('search');
    });

    /*
    |--------------------------------------------------------------------------
    | Additional API-like routes for AJAX operations
    |--------------------------------------------------------------------------
    */


    /*
       |--------------------------------------------------------------------------
       | Unified Folder Management (includes documents)
       |--------------------------------------------------------------------------
       */
    Route::get('/employee/documents', [FolderController::class, 'employeeIndex'])
        ->name('employee.folders.index');
    // Main folder management routes
    Route::resource('folders', FolderController::class);

    // Additional folder routes
    Route::get('/folders/{document}/document', [FolderController::class, 'showDocument'])
        ->name('folders.show-document');

    // Bulk operations
    Route::post('/folders/bulk-delete', [FolderController::class, 'bulkDelete'])
        ->name('folders.bulk-delete');
    Route::post('/folders/bulk-move', [FolderController::class, 'bulkMove'])
        ->name('folders.bulk-move');

    /*
    |--------------------------------------------------------------------------
    | Document Operations (Backend + Show page)
    |--------------------------------------------------------------------------
    */

    // Document show page (keep existing)
    Route::get('/documents/{document}', [DocumentController::class, 'show'])
        ->name('documents.show');
    Route::get('/documents/{document}/edit', [DocumentController::class, 'edit'])
        ->name('documents.edit');

    // Document CRUD operations (called from folder interface)
    Route::post('/documents', [DocumentController::class, 'store'])
        ->name('documents.store');
    Route::put('/documents/{document}', [DocumentController::class, 'update'])
        ->name('documents.update');
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy'])
        ->name('documents.destroy');

    // Document access operations
    Route::get('/documents/{document}/download', [DocumentController::class, 'download'])
        ->name('documents.download');
    Route::get('/documents/{document}/view', [DocumentController::class, 'view'])
        ->name('documents.view');

    Route::get('/employee/documents/{document}/view', [DocumentController::class, 'employeeView'])
        ->name('employee.documents.view');

    Route::prefix('manager/folders')->name('manager.folders.')->group(function () {
        Route::get('create', [FolderController::class, 'managerCreate'])->name('create');
        Route::post('/', [FolderController::class, 'managerStore'])->name('store');
        Route::get('{folder}/edit', [FolderController::class, 'managerEdit'])->name('edit');
        Route::put('{folder}', [FolderController::class, 'managerUpdate'])->name('update');
    });

    // Employee document browsing routes
//    Route::prefix('employee')->name('employee.')->group(function () {
//        Route::get('folders', [FolderController::class, 'employeeIndex'])->name('folders.index');
//        Route::get('documents/{document}', [DocumentController::class, 'employeeView'])->name('documents.view');
//    });






    Route::get('/user-management', [UserManagementController::class, 'index'])
        ->name('user-management.index');

    Route::get('/user-management/onboard', [UserManagementController::class, 'onboard'])
        ->name('user-management.onboard');

// Main invite route - returns back to same page with wizard data
    Route::post('/user-management/invite-user', [UserManagementController::class, 'inviteUserWithPto'])
        ->name('user-management.invite-user');

// Department routes
    Route::post('/departments/{department}/add-user', [DepartmentController::class, 'addUser'])
        ->name('departments.add-user');




    Route::prefix('admin')->name('admin.')->group(function () {




        Route::resource('blackouts', BlackoutController::class);
        Route::post('/blackouts/user-check', [BlackoutController::class, 'getBlackoutsForUser'])->name('blackouts.user-check');

    });

    Route::post('/admin/blackouts/get-blackouts-for-user', [BlackoutController::class, 'getBlackoutsForUser'])
        ->name('admin.blackouts.get-blackouts-for-user');



    Route::prefix('hr')->name('hr.')->group(function () {
        Route::get('/employees', [HREmployeesController::class, 'index'])->name('employees.index');
        Route::delete('/employees/{user}', [HREmployeesController::class, 'destroy'])->name('employees.destroy');
        Route::patch('/employees/{id}/restore', [HREmployeesController::class, 'restore'])->name('employees.restore');
    });




        Route::get('/hr/dashboard', [PtoOverviewController::class, 'index'])->name('hr.pto.dashboard');
        Route::post('/hr/pto/submit-historical',
            [PTOSubmitHistoricalController::class, 'submitHistoricalPto'])->name('submit-historical');

        Route::get('/hr/pto-policies', [PtoAdminController::class, 'policies'])->name('hr.pto.policies');
        Route::get('/hr/pto-types', [PtoAdminController::class, 'types'])->name('hr.pto.types');
        Route::get('/hr/time-off-requests', [PtoAdminController::class, 'requests'])->name('hr.pto.requests');

        Route::prefix('api')->name('api.')->group(function () {
            Route::get('/pto-overview/dashboard', [PtoOverviewController::class, 'getDashboardData']);
            Route::get('/pto-overview/stats', [PtoOverviewController::class, 'getStats']);


    });




    Route::prefix('training')->name('training.')->group(function () {
        Route::get('/', [TrainingController::class, 'index'])->name('index');
        Route::get('/modules/{module}', [TrainingController::class, 'module'])->name('module');
        Route::get('/modules/{module}/enroll', [TrainingController::class, 'enroll'])->name('enroll');

        Route::get('/modules/{module}/lessons/{lesson}', [TrainingController::class, 'lesson'])->name('lesson');
        Route::post('/content/{content}/complete', [TrainingController::class, 'completeContent'])->name('content.complete');

        Route::get('/modules/{module}/lessons/{lesson}/quiz', [TrainingController::class, 'quiz'])->name('quiz');
        Route::post('/modules/{module}/lessons/{lesson}/quiz', [TrainingController::class, 'submitQuiz'])->name('quiz.submit');

        Route::get('/modules/{module}/test', [TrainingController::class, 'test'])->name('test');
        Route::post('/modules/{module}/test', [TrainingController::class, 'submitTest'])->name('test.submit');
    });
    Route::get('/training/content/{content}/file', [TrainingController::class, 'serveFile'])
        ->name('training.content.file');
    // Updated Admin Training Routes with Combined Reports
    Route::prefix('admin')->name('admin.')->group(function () {
        // Modules Management
        Route::resource('modules', ModuleController::class);
        Route::post('modules/reorder', [ModuleController::class, 'reorder'])->name('modules.reorder');
// Module Assignment Routes
        Route::get('modules/{module}/assignments', [ModuleController::class, 'assignments'])->name('modules.assignments');
        Route::post('modules/{module}/assignments', [ModuleController::class, 'storeAssignment'])->name('modules.assignments.store');
        Route::delete('modules/{module}/assignments/{assignment}', [ModuleController::class, 'destroyAssignment'])->name('modules.assignments.destroy');
        // Lessons Management
        Route::resource('modules.lessons', LessonController::class)->except(['index']);
        Route::post('lessons/reorder', [LessonController::class, 'reorder'])->name('lessons.reorder');

        // Lesson Content Management
        Route::resource('lessons.contents', LessonContentController::class)->except(['index', 'show']);
        Route::post('content/upload', [LessonContentController::class, 'upload'])->name('content.upload');
        Route::delete('content/{content}', [LessonContentController::class, 'destroy'])->name('content.destroy');

        // Quiz Management
        Route::resource('lessons.quizzes', QuizController::class)->except(['index']);
        Route::resource('quizzes.questions', QuestionController::class)->except(['index', 'show']);

        // Test Management
        Route::resource('modules.tests', TestController::class)->except(['index']);
        Route::resource('tests.questions', TestQuestionController::class)->except(['index', 'show']);

        // Reports
        Route::get('students/{user}/details', [ReportController::class, 'studentDetails'])->name('reports.student.details');
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/modules', [ReportController::class, 'modules'])->name('reports.modules');

        // Combined Students & Progress Report (NEW - Primary Route)
        Route::get('reports/student-progress', [ReportController::class, 'combinedStudentsProgress'])->name('reports.combined-students-progress');

        // Legacy routes - now redirect to combined report for seamless transition
        Route::get('reports/students', [ReportController::class, 'students'])->name('reports.students');
        Route::get('reports/progress', [ReportController::class, 'progress'])->name('reports.progress');

        // Export functionality for combined report
        Route::get('reports/export/combined', [ReportController::class, 'exportCombinedReport'])->name('reports.export.combined');
    });











});
