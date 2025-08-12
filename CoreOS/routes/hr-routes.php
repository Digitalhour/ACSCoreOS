<?php

use App\Http\Controllers\Admin\BlackoutController;
use App\Http\Controllers\Admin\PtoAdminController;
use App\Http\Controllers\Api\PtoApi\HREmployeesController;
use App\Http\Controllers\Api\PtoApi\PtoOverviewController;
use App\Http\Controllers\Api\PtoApi\PtoPolicyController;
use App\Http\Controllers\Api\PtoApi\PTOSubmitHistoricalController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\HolidayController;
use App\Http\Controllers\HumanResources\LessonContentController;
use App\Http\Controllers\HumanResources\LessonController;
use App\Http\Controllers\HumanResources\ModuleController;
use App\Http\Controllers\HumanResources\QuestionController;
use App\Http\Controllers\HumanResources\QuizController;
use App\Http\Controllers\HumanResources\ReportController;
use App\Http\Controllers\HumanResources\TestController;
use App\Http\Controllers\HumanResources\TestQuestionController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\Team;
use App\Http\Controllers\Training\TrainingController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

//use App\Http\Controllers\TrainingController;


Route::middleware('auth')
    ->middleware(ValidateSessionWithWorkOS::class)
    ->group(function () {



        Route::middleware(['role:Human Resources Employee|Developer'])->group(function () {
    Route::resource('holidays', HolidayController::class)->names('holidays');
    Route::get('/team', [Team::class, 'index'])->name('team.index');


    // User Hierarchy view route
            Route::get('/admin/user-hierarchy', function () {
                return Inertia::render('Admin/UserHierarchy/IndexPage');
            })->name('admin.user-hierarchy.index');

        Route::get('/roles-permissions', [RolePermissionController::class, 'index'])->name('roles-permissions.index');

        // Permissions management
        Route::post('/permissions', [RolePermissionController::class, 'storePermission'])->name('permissions.store');
        Route::put('/permissions/{permission}',
            [RolePermissionController::class, 'updatePermission'])->name('permissions.update');
        Route::delete('/permissions/{permission}',
            [RolePermissionController::class, 'destroyPermission'])->name('permissions.destroy');

        // Roles management
        Route::post('/roles', [RolePermissionController::class, 'storeRole'])->name('roles.store');
        Route::put('/roles/{role}', [RolePermissionController::class, 'updateRole'])->name('roles.update');
        Route::delete('/roles/{role}', [RolePermissionController::class, 'destroyRole'])->name('roles.destroy');
        Route::post('/roles/permissions',
            [RolePermissionController::class, 'updateRolePermissions'])->name('roles.permissions.update');

        // User roles & permissions
        Route::post('/users/sync-roles', [RolePermissionController::class, 'syncUserRoles'])->name('users.roles.sync');
        Route::post('/users/sync-direct-permissions',
            [RolePermissionController::class, 'syncUserDirectPermissions'])->name('users.syncDirectPermissions');



        Route::get('/hr/overview', [PtoOverviewController::class, 'index'])->name('pto.overview');
    // Time Clock
//    Route::get('/timeclock', function () {
//        return Inertia::render('TimeClock/Index');
//    })->name('timeclock.index');
//
//    // Employee Timesheet
//    Route::get('/timesheet', function () {
//        return Inertia::render('Timesheet/Employee');
//    })->name('timesheet.employee');

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


    // Employee document browsing routes
//    Route::prefix('employee')->name('employee.')->group(function () {
//        Route::get('folders', [FolderController::class, 'employeeIndex'])->name('folders.index');
//        Route::get('documents/{document}', [DocumentController::class, 'employeeView'])->name('documents.view');
//    });






    Route::get('/user-management', [UserManagementController::class, 'index'])->name('user-management.index');

    Route::get('/user-management/onboard', [UserManagementController::class, 'onboard'])->name('user-management.onboard');

// Main invite route - returns back to same page with wizard data
    Route::post('/user-management/invite-user', [UserManagementController::class, 'inviteUserWithPto'])->name('user-management.invite-user');

// Department routes
    Route::post('/departments/{department}/add-user', [DepartmentController::class, 'addUser'])->name('departments.add-user');




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

        Route::get('/hr/pto-policies', [PtoPolicyController::class, 'policies'])->name('hr.pto.policies');
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




});
