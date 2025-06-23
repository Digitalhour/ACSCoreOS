<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\Admin\PtoAdminController;
use App\Http\Controllers\Api\PositionController;
use App\Http\Controllers\Api\PtoApi\HRDashboardController;
use App\Http\Controllers\Api\PtoApi\PtoApprovalRuleController;
use App\Http\Controllers\Api\PtoApi\PtoOverviewController;
use App\Http\Controllers\Api\UserPtoController;
use App\Http\Controllers\DepartmentTimeOffController;
use App\Http\Controllers\HolidayController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\WidgetController;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware([
    'auth',
    ValidateSessionWithWorkOS::class,
])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');



    Route::middleware(['auth', 'verified'])->group(function () {

        Route::get('/user-management', [UserManagementController::class, 'index'])->name('user-management');
        Route::get('/api/widget-token', [UserManagementController::class, 'getWidgetToken']);
        Route::get('/api/organization-users', [UserManagementController::class, 'getOrganizationUsers']);
        Route::post('/api/deactivate-user', [UserManagementController::class, 'deactivateUser']);
        Route::post('/api/reactivate-user', [UserManagementController::class, 'reactivateUser']);
        Route::post('/api/invite-user-with-pto', [UserManagementController::class, 'inviteUserWithPto']);
        Route::get('/pto-types', [UserManagementController::class, 'getPtoTypes']);
        Route::post('/user-management/invite-user', [UserManagementController::class, 'inviteUserWithPto'])
            ->name('user-management.invite');

        Route::post('/department-pto/{ptoRequest}/approve', [DepartmentTimeOffController::class, 'approve'])
            ->name('department.pto.approve');

        // Deny PTO Request
        Route::post('/department-pto/{ptoRequest}/deny', [DepartmentTimeOffController::class, 'deny'])
            ->name('department.pto.deny');

        // Approve Emergency Override
        Route::post('/department-pto/{ptoRequest}/approve-override', [DepartmentTimeOffController::class, 'approveOverride'])
            ->name('department.pto.approve-override');





        Route::get('/activity-log', [ActivityLogController::class, 'index'])->name('activity-log.index');
        Route::get('/activity-log/{activity}', [ActivityLogController::class, 'show'])->name('activity-log.show');


        Route::resource('holidays', HolidayController::class)->names('holidays');

        /*
    |--------------------------------------------------------------------------
    | User PTO Dashboard Routes (Employee-facing)
    |--------------------------------------------------------------------------
    */

        /*
        |--------------------------------------------------------------------------
        | Admin PTO Management Routes
        |--------------------------------------------------------------------------
        */
// Admin PTO dashboard and views
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


//       Route::get('/admin/pto-balances', [PtoOverviewController::class, 'index'])->name('admin.pto.balances');
//        Route::get('/admin/pto-Blackouts', [PtoAdminController::class, 'blackouts'])->name('admin.pto.Blackouts');

// Admin PTO request approval/denial (from admin interface)
        Route::post('/admin/pto-requests/{ptoRequest}/approve',
            [PtoAdminController::class, 'approveRequest'])->name('admin.pto-requests.approve');
        Route::post('/admin/pto-requests/{ptoRequest}/deny',
            [PtoAdminController::class, 'denyRequest'])->name('admin.pto-requests.deny');


        Route::get('/api/pto-requests/user-details', [HRDashboardController::class, 'getUserDetails'])->name('api.pto-requests.user-details');

        // Historical PTO submission

        /*
        |--------------------------------------------------------------------------
        | Department Manager PTO Approval Routes
        |--------------------------------------------------------------------------
        */
// Department manager PTO dashboard

        /*
        |--------------------------------------------------------------------------
        | PTO Overview for Admins
        |--------------------------------------------------------------------------
        */
        Route::get('/hr/overview', [PtoOverviewController::class, 'index'])->name('pto.overview');
//            Route::get('/users/hierarchy', [UserHierarchyController::class, 'getHierarchy'])->name('users.hierarchy');
//
//            // User Hierarchy detailed routes
//            Route::prefix('users-hierarchy')->name('users-hierarchy.')->group(function () {
//                Route::get('/', [UserHierarchyController::class, 'getUsersWithHierarchyInfo'])->name('list');
//                Route::post('/{user}/assign-position',
//                    [UserHierarchyController::class, 'assignPosition'])->name('assign-position');
//                Route::post('/{user}/assign-manager',
//                    [UserHierarchyController::class, 'assignManager'])->name('assign-manager');
//                Route::get('/{user}/details', [UserHierarchyController::class, 'getUserHierarchyDetails'])->name('details');
//                Route::get('/{user}/assignable-managers',
//                    [UserHierarchyController::class, 'getAssignableManagers'])->name('assignable-managers');
//            });
        Route::get('/admin/user-hierarchy', function () {
            return Inertia::render('Admin/UserHierarchy/IndexPage');
        })->name('admin.user-hierarchy.index');
//
////    Route::middleware(['auth', 'verified'])->group(function () {
//
//
////        Route::get('/kpi', [KpiController::class, 'index'])->name('kpi.index');
////        Route::get('/kpi/builder', [KpiController::class, 'builder'])->name('kpi.builder');
////        Route::post('/api/kpi/preview', [KpiController::class, 'getKpiPreview'])->name('api.kpi.preview');
////        Route::post('/api/data-table/preview',
////            [KpiController::class, 'getDataTablePreview'])->name('api.data-table.preview');
////        // API routes for KPI data
////        Route::get('/api/kpi/tables', [KpiController::class, 'getTables'])->name('api.kpi.tables');
////        Route::get('/api/kpi/columns', [KpiController::class, 'getTableColumns'])->name('api.kpi.columns');
////        Route::post('/api/kpi/data', [KpiController::class, 'getKpiData'])->name('api.kpi.data');
////        Route::get('/api/kpi/test-connection', [KpiController::class, 'testConnection'])->name('api.kpi.test');
////    Route::prefix('bi')->group(function () {
////        // Main dashboard routes
////        Route::get('/bidashboard', [DashboardController::class, 'index'])->name('bi.dashboard.index');
////
////        // Saved dashboard routes
////        Route::get('/dashboard/{slug}', [DashboardController::class, 'viewSaved'])->name('bi.dashboard.view');
////        Route::get('/public/{slug}', [DashboardController::class, 'viewPublic'])->name('bi.dashboard.public');
////
////        // Dashboard management API routes
////        Route::post('/bidashboard/save', [DashboardController::class, 'saveDashboard'])->name('bi.dashboard.save');
////        Route::put('/bidashboard/{id}', [DashboardController::class, 'updateDashboard'])->name('bi.dashboard.update');
////        Route::delete('/bidashboard/{id}',
////            [DashboardController::class, 'deleteDashboard'])->name('bi.dashboard.delete');
////        Route::get('/bidashboard/list', [DashboardController::class, 'listSavedDashboards'])->name('bi.dashboard.list');
////
////        // Data query routes (existing)
////        Route::get('/bidashboard/table-details',
////            [DashboardController::class, 'getTableDetails'])->name('bi.dashboard.details');
////        Route::get('/bidashboard/filter-options',
////            [DashboardController::class, 'getFilterOptions'])->name('bi.dashboard.filters');
////        Route::get('/bidashboard/query', [DashboardController::class, 'query'])->name('bi.dashboard.query');
////    });
//        /*
//        |--------------------------------------------------------------------------
//        | User Impersonation Routes
//        |--------------------------------------------------------------------------
//        */
//        Route::impersonate();
//        Route::get('/impersonate', [ImpersonateController::class, 'index'])
//            ->name('impersonate.index');
////        ->middleware('can:impersonate');
//
//        Route::get('/departments', [DepartmentController::class, 'index'])->name('departments.index');
//        Route::post('/departments', [DepartmentController::class, 'store'])->name('departments.store');
//        Route::put('/departments/{department}', [DepartmentController::class, 'update'])->name('departments.update');
//        Route::delete('/departments/{department}', [DepartmentController::class, 'destroy'])->name('departments.destroy');
//        Route::post('/departments/{department}/assign-users',
//            [DepartmentController::class, 'assignUsers'])->name('departments.assign-users');
//
//        /*
//        |--------------------------------------------------------------------------
//        | Dashboard & Basic Pages
//        |--------------------------------------------------------------------------
//        */
//        // Main dashboard
//        Route::get('dashboard', function () {
//            return Inertia::render('dashboard');
//        })->name('dashboard');
//        Route::get('/activity-log', [ActivityLogController::class, 'index'])->name('activity-log.index');
//        Route::get('/activity-log/{activity}', [ActivityLogController::class, 'show'])->name('activity-log.show');
//        // Parts database page
//        Route::get('Parts-Database', function () {
//            return Inertia::render('Parts-Database');
//        })->name('Parts-Database');
//
//        // Product picture manager
//        Route::prefix('product-picture-manager')->name('product-picture-manager.')->middleware(['App\Http\Middleware\HandleGoogleAuthRedirect'])->group(function (
//        ) {
//            // Main page
//            Route::get('/', [ProductPictureManagerController::class, 'index'])->name('index');
//
//            // Search operations
//            Route::get('/search-folders',
//                [ProductPictureManagerController::class, 'searchFolders'])->name('search-folders');
//            Route::get('/search-netsuite',
//                [ProductPictureManagerController::class, 'searchNetSuite'])->name('search-netsuite');
//
//            // Google Drive operations
//            Route::get('/fetch-drive-images',
//                [ProductPictureManagerController::class, 'fetchDriveImages'])->name('fetch-drive-images');
//            Route::post('/delete-drive-image',
//                [ProductPictureManagerController::class, 'deleteGoogleDriveImage'])->name('delete-drive-image');
//            Route::post('/create-folders',
//                [ProductPictureManagerController::class, 'createFolders'])->name('create-folders');
//
//            // Image upload operations
//            Route::post('/upload-images', [ProductPictureManagerController::class, 'uploadImages'])->name('upload-images');
//            Route::post('/upload-processed-images',
//                [ProductPictureManagerController::class, 'uploadProcessedImages'])->name('upload-processed-images');
//
//            // Shopify operations
//            Route::get('/shopify-images',
//                [ProductPictureManagerController::class, 'getShopifyImages'])->name('shopify-images');
//            Route::post('/delete-shopify-image',
//                [ProductPictureManagerController::class, 'deleteShopifyImage'])->name('delete-shopify-image');
//        });
//        Route::get('/pto/overview', [PtoOverviewController::class, 'index'])->name('pto.overview');
//        // Parts catalog
//        Route::get('/parts-catalog', [PartsCatalogController::class, 'index'])->name('parts.catalog');
//
//        /*
//        |--------------------------------------------------------------------------
//        | User Profile Routes
//        |--------------------------------------------------------------------------
//        */
////        Route::get('/users/{user}', [UserPublicProfileViewController::class, 'show'])
////            ->name('profile.show')
////            ->middleware(['auth', 'verified']);
//
//        /*
//        |--------------------------------------------------------------------------
//        | PTO System Routes
//        |--------------------------------------------------------------------------
//        */
//    Route::get('/pto', [EmployeePtoController::class, 'index'])->name('pto.dashboard');
//        // User PTO Dashboard
////        Route::get('/pto', function () {
////            return Inertia::render('Employee/EmployeePtoDashboard');
////        })->name('pto.dashboard');
//        // Legacy route redirects (if you have existing bookmarks)
////        Route::get('/my-pto', function () {
////            return redirect()->route('pto.dashboard');
////        })->name('my-pto');
//
//
//        Route::get('/request-pto', function () {
//            return redirect()->route('pto.dashboard');
//        })->name('request-pto');
//
//        /*
//        |--------------------------------------------------------------------------
//        | Shopify Routes
//        |--------------------------------------------------------------------------
//        */
//        Route::prefix('shopify')->name('shopify.')->group(function () {
//            Route::post('/force-update', [AdminShopifyController::class, 'forceUpdateMatches'])
//                ->name('/force-update');
//
//            Route::get('/stats', [AdminShopifyController::class, 'stats'])
//                ->name('/stats');
//
//            Route::get('/batches', [AdminShopifyController::class, 'getBatches'])
//                ->name('/batches');
//
//            Route::post('/clear-matches', [AdminShopifyController::class, 'clearAllMatches'])
//                ->name('clear-matches');
//        });
//        /*
//         *
//         * Emergancy Contact Routes
//         *
//         */
//        Route::get('/emergency-contacts', [EmergencyContactsController::class, 'index'])
//            ->name('emergency-contacts.index');
//        Route::post('/emergency-contacts', [EmergencyContactsController::class, 'store'])
//            ->name('emergency-contacts.store');
//        Route::patch('/emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'update'])
//            ->name('emergency-contacts.update');
//        Route::delete('/emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'destroy'])
//            ->name('emergency-contacts.destroy');
//        /*
//        |--------------------------------------------------------------------------
//        | Admin Pages
//        |--------------------------------------------------------------------------
//        */
//        // Admin dashboard
//        Route::get('/admin', function () {
//            return Inertia::render('Admin/adminDashboard', [
//                'title' => 'Admin Dashboard',
//                'userStats' => [
//                    'totalUsers' => User::count(),
//                    'activeUsers' => User::where('last_login_at', '>=', now()->subDays(30))->count(),
//                    'totalLogins' => User::sum('login_count')
//                ]
//            ]);
//        })->name('admin.index');
//
//        Route::get('/new', [DepartmentController::class, 'dashboard'])->name('dash.departments.index');
//
//        // Admin PTO Pages
//        Route::get('/admin/pto', [PtoAdminController::class, 'dashboard'])
//            ->name('admin.pto.dashboard');
//
//        Route::get('/admin/pto-types', [PtoTypeController::class, 'types'])
//            ->name('admin.pto.types');
//
//        Route::get('/admin/pto-policies', [PtoAdminController::class, 'policies'])
//            ->name('admin.pto.policies');
//
//        Route::get('/admin/pto-requests', [PtoAdminController::class, 'requests'])
//            ->name('admin.pto.requests');
//
//        Route::get('/admin/pto-balances', [PtoOverviewController::class, 'index'])
//            ->name('admin.pto.balances');
//
//        Route::get('/admin/pto-Blackouts', [PtoAdminController::class, 'Blackouts'])
//            ->name('admin.pto.Blackouts');
//        Route::post('/admin/pto/submit-historical',
//            [PtoAdminController::class, 'submitHistoricalPto'])->name('submit-historical');
//
//        Route::prefix('admin')->name('admin.')->middleware(['auth'])->group(function () {
//            Route::post('pto-requests/{ptoRequest}/approve', [PtoAdminController::class, 'approveRequest'])->name('pto-requests.approve');
//            Route::post('pto-requests/{ptoRequest}/deny', [PtoAdminController::class, 'denyRequest'])->name('pto-requests.deny');
//
//            //Emergency Copntacts
////            Route::get('/emergency-contacts', [AdminEmergencyContactsController::class, 'index'])
////                ->name('admin.emergency-contacts.index');
//            Route::get('/emergency-contacts/export', [AdminEmergencyContactsController::class, 'export'])
//                ->name('admin.emergency-contacts.export');
//            // User Activity Monitoring
//            Route::get('/user-activity', [UserActivityController::class, 'index'])->name('user-activity.index');
//
//            // API routes for real-time data
//            Route::get('/user-activity/realtime',
//                [UserActivityController::class, 'realTimeData'])->name('user-activity.realtime');
//            Route::get('/user-activity/chart',
//                [UserActivityController::class, 'activityChart'])->name('user-activity.chart');
//            Route::get('/user-activity/top-actions',
//                [UserActivityController::class, 'topActions'])->name('user-activity.top-actions');
//
//            // User-specific activity
//            Route::get('/user-activity/user/{user}',
//                [UserActivityController::class, 'userActivity'])->name('user-activity.user');
//
//            // Cleanup old activities
//            Route::delete('/user-activity/cleanup',
//                [UserActivityController::class, 'cleanup'])->name('user-activity.cleanup');
//        });
//
//        // Cleanup old activities
//        Route::delete('/user-activity/cleanup', [UserActivityController::class, 'cleanup'])->name('user-activity.cleanup');
//
//        // CSV & Data Management
//        Route::get('/csv-uploader', function () {
//            return Inertia::render('CsvUploaderPage');
//        })->name('csv.uploader');
//
//        Route::get('/data-management', function () {
//            return Inertia::render('DataManagementPage');
//        })->name('data.management');
//
//        Route::get('/data-management/file/{fileName}', function (string $fileName) {
//            return Inertia::render('FileDetailsPage', [
//                'fileName' => $fileName
//            ]);
//        })->name('data.file.details');
//
        // Positions management


//        // User hierarchy management
//        Route::get('/admin/user-hierarchy', function () {
//            return Inertia::render('Admin/UserHierarchy/IndexPage');
//        })->name('admin.user-hierarchy.index');
//
//        Route::get('/admin/organization-chart', function () {
//            return Inertia::render('Admin/UserHierarchy/OrgChartPage');
//        })->name('admin.organization-chart.view');
//
//        Route::get('/organization-chart', function () {
//            return Inertia::render('Admin/OrganizationChartPage');
//        })->name('acs-origination');
//
//        Route::get('/admin/users/add', [AdminAddUserController::class, 'create'])->name('adduser.create');
//
//        // Route to handle the submission of the "Add New User" form
//        Route::post('/admin/users/add', [AdminAddUserController::class, 'store'])->name('adduser.store');
//
//    Route::get('/department-pto', [DepartmentTimeOffController::class, 'dashboard'])
//        ->name('department.manager.pto.dashboard');
//
//    Route::post('/pto-requests/{ptoRequest}/approve', [PtoAdminController::class, 'approveRequest'])
//        ->name('pto.requests.approve');
//    Route::post('/pto-requests/{ptoRequest}/deny', [PtoAdminController::class, 'denyRequest'])
//        ->name('pto.requests.deny');
//        /*
//        |--------------------------------------------------------------------------
//        | Roles & Permissions Routes
//        |--------------------------------------------------------------------------
//        */
//        // Main roles & permissions page
//        Route::get('/roles-permissions', [RolePermissionController::class, 'index'])->name('roles-permissions.index');
//
//        // Permissions management
//        Route::post('/permissions', [RolePermissionController::class, 'storePermission'])->name('permissions.store');
//        Route::put('/permissions/{permission}',
//            [RolePermissionController::class, 'updatePermission'])->name('permissions.update');
//        Route::delete('/permissions/{permission}',
//            [RolePermissionController::class, 'destroyPermission'])->name('permissions.destroy');
//
//        // Roles management
//        Route::post('/roles', [RolePermissionController::class, 'storeRole'])->name('roles.store');
//        Route::put('/roles/{role}', [RolePermissionController::class, 'updateRole'])->name('roles.update');
//        Route::delete('/roles/{role}', [RolePermissionController::class, 'destroyRole'])->name('roles.destroy');
//        Route::post('/roles/permissions',
//            [RolePermissionController::class, 'updateRolePermissions'])->name('roles.permissions.update');
//
//        // User roles & permissions
//        Route::post('/users/sync-roles', [RolePermissionController::class, 'syncUserRoles'])->name('users.roles.sync');
//        Route::post('/users/sync-direct-permissions',
//            [RolePermissionController::class, 'syncUserDirectPermissions'])->name('users.syncDirectPermissions');
//
//        /*
//        |--------------------------------------------------------------------------
//        | BillyAI Routes
//        |--------------------------------------------------------------------------
//        */
//        // Main chat interface
//        Route::get('/billy', [BillyAIController::class, 'chat'])->name('billy');
//
//        // Messages & feedback
//        Route::post('/billy/messages', [BillyAIController::class, 'storeMessage'])->name('billy.messages.store');
//        Route::post('/billy/messages/{message}/feedback',
//            [BillyAIController::class, 'storeMessageFeedback'])->name('billy.messages.feedback');
//
//        // Feedback management
//        Route::get('/billy/feedback', [BillyAIController::class, 'feedbackIndex'])->name('billy.feedback.index');
//        Route::get('/billy/feedback-data', [BillyAIController::class, 'getFeedbackData'])->name('billy.feedback.data');
//
//        // Conversations management
//        Route::get('/billy/conversations',
//            [BillyAIController::class, 'getConversations'])->name('billy.conversations.index');
//        Route::get('/billy/conversations/all', [BillyAIController::class, 'getAllConversations']);
//        Route::get('/billy/conversations/{conversation}',
//            [BillyAIController::class, 'getConversation'])->name('billy.conversations.show');
//        Route::get('/billy/conversation/{conversation}',
//            [BillyAIController::class, 'showConversationForAdmin'])->name('billy.conversation.show.admin');
//        Route::put('/billy/conversations/{conversation}/title',
//            [BillyAIController::class, 'updateConversationTitle'])->name('billy.conversations.update.title');
//        Route::delete('/billy/conversations/{conversation}',
//            [BillyAIController::class, 'deleteConversation'])->name('billy.conversations.destroy');
//
//        /*
//        |--------------------------------------------------------------------------
//        | API Routes
//        |--------------------------------------------------------------------------
//        */
//
//        Route::delete(
//            '/imported-data-batch/{file_name}',
//            [ImportedDataController::class, 'destroyByFileName']
//        );
//
        Route::prefix('api')->name('api.')->group(function () {
//            Route::get('/users/list', [UserController::class, 'list'])->middleware('auth');
//
//            Route::get('/users/{user}/pto-types',
//                [App\Http\Controllers\Admin\PtoAdminController::class, 'getPtoTypesForUser']);
//            Route::get('pto/users/{user}/details', [PtoDetailController::class, 'getUserPtoDetails']);
//            Route::get('pto/requests/{request}/activities', [PtoDetailController::class, 'getRequestActivities']);
//            /*
//            |--------------------------------------------------------------------------
//            | PTO Approval API
//            |--------------------------------------------------------------------------
//            */
//            Route::prefix('pto-approvals')->name('pto-approvals.')->group(function () {
//                Route::get('dashboard',
//                    [DepartmentTimeOffController::class, 'dashboard'])->name('dashboard');
//                Route::get('pending',
//                    [DepartmentTimeOffController::class, 'pendingApprovals'])->name('pending');
//                Route::get('my-approvals',
//                    [DepartmentTimeOffController::class, 'myApprovals'])->name('my-approvals');
//                Route::get('{ptoRequest}/chain',
//                    [DepartmentTimeOffController::class, 'getApprovalChain'])->name('chain');
//            });
//
//            /*
//            |--------------------------------------------------------------------------
//            | PTO Types API
//            |--------------------------------------------------------------------------
//            */
//            Route::prefix('pto-types')->name('pto-types.')->group(function () {
//                Route::get('/', [PtoTypeController::class, 'index'])->name('index');
//                Route::post('/', [PtoTypeController::class, 'store'])->name('store');
//                Route::get('{pto_type}', [PtoTypeController::class, 'show'])->name('show');
//                Route::put('{pto_type}', [PtoTypeController::class, 'update'])->name('update');
//                Route::delete('{pto_type}', [PtoTypeController::class, 'destroy'])->name('destroy');
//
//                // Custom endpoints
//                Route::patch('{pto_type}/toggle-active', [PtoTypeController::class, 'toggleActive'])->name('toggle-active');
//                Route::patch('sort-order', [PtoTypeController::class, 'updateSortOrder'])->name('sort-order');
//            });
//
//            /*
//            |--------------------------------------------------------------------------
//            | PTO Policies API
//            |--------------------------------------------------------------------------
//            */
//            Route::prefix('pto-policies')->name('pto-policies.')->group(function () {
//                Route::get('/', [PtoPolicyController::class, 'index'])->name('index');
//                Route::post('/', [PtoPolicyController::class, 'store'])->name('store');
//                Route::get('{pto_policy}', [PtoPolicyController::class, 'show'])->name('show');
//                Route::put('{pto_policy}', [PtoPolicyController::class, 'update'])->name('update');
//                Route::delete('{pto_policy}', [PtoPolicyController::class, 'destroy'])->name('destroy');
//            });
//
//            // User-specific policy routes
//            Route::get('users/{user}/pto-policies',
//                [PtoPolicyController::class, 'getUserPolicies'])->name('users.pto-policies');
//
//            /*
//            |--------------------------------------------------------------------------
//            | PTO Requests API
//            |--------------------------------------------------------------------------
//            */
//            Route::prefix('pto-requests')->name('pto-requests.')->group(function () {
//                Route::get('/', [PtoAdminController::class, 'index'])->name('index');
//                Route::post('/', [PtoRequestController::class, 'store'])->name('store');
//                Route::get('{pto_request}', [PtoRequestController::class, 'show'])->name('show');
//                Route::put('{pto_request}', [PtoRequestController::class, 'update'])->name('update');
//                Route::delete('{pto_request}', [PtoRequestController::class, 'destroy'])->name('destroy');
//
//                // Approval actions
//                Route::post('{pto_request}/approve',
//                    [DepartmentTimeOffController::class, 'approve'])->name('approve');
//                Route::post('{pto_request}/deny',
//                    [DepartmentTimeOffController::class, 'deny'])->name('deny');
//
//                // Cancel actions
//                Route::patch('{pto_request}/cancel', [PtoRequestController::class, 'cancel'])->name('cancel');
//                Route::post('{pto_request}/cancel-own',
//                    [PtoRequestController::class, 'cancelOwnRequest'])->name('cancel-own');
//            });
//            /*
//                    |--------------------------------------------------------------------------
//                    | User PTO API
//                    |--------------------------------------------------------------------------
//                    */
//            Route::prefix('user-pto')->name('user-pto.')->group(function () {
//                Route::get('dashboard',
//                    [UserPtoController::class, 'dashboard'])->name('dashboard');
//                Route::get('summary', [UserPtoController::class, 'summary'])->name('summary');
//                Route::get('my-requests',
//                    [UserPtoController::class, 'myRequests'])->name('my-requests');
//            });
//            /*
//            |--------------------------------------------------------------------------
//            | PTO Balances API
//            |--------------------------------------------------------------------------
//            */
//            Route::prefix('pto-balances')->name('pto-balances.')->group(function () {
//                Route::get('/', [PtoBalanceController::class, 'index'])->name('index'); // For current user
//                Route::get('user/{user}', [PtoBalanceController::class, 'getUserBalances'])->name('user');
//                Route::post('adjust', [PtoBalanceController::class, 'adjustBalance'])->name('adjust');
//            });
//
//            /*
//            |--------------------------------------------------------------------------
//            | PTO Transactions API (Admin only)
//            |--------------------------------------------------------------------------
//            */
////            Route::prefix('pto-transactions')->name('pto-transactions.')->group(function () {
////                Route::get('/', [PtoTransactionController::class, 'index'])->name('index');
////                Route::get('user/{user}', [PtoTransactionController::class, 'getUserTransactions'])->name('user');
////            });
//
//            /*
//            |--------------------------------------------------------------------------
//            | Other API Routes
//            |--------------------------------------------------------------------------
//            */
//            Route::get('/stats', [AdminStatsController::class, 'getStats']);
//            Route::get('/stats/detailed', [AdminStatsController::class, 'getDetailedStats']);
//
//            Route::get('pdf/{pdfId}', [PartsCatalogController::class, 'getPdf'])->name('pdf.show');
//
//            Route::get('/imported-data/file-summaries', [ImportedDataController::class, 'getFileSummaries']);
//            Route::get('/imported-data/statistics/{fileName}', [ImportedDataController::class, 'getFileStatistics']);
//            Route::get('/imported-data/overall-statistics', [ImportedDataController::class, 'getOverallStatistics']);
//
//            // Export functionality
//            Route::get('/imported-data/export/{fileName}', [ImportedDataController::class, 'exportFile']);
//
//            // Existing routes...
//            Route::get('/imported-data', [ImportedDataController::class, 'index']);
//            Route::get('/imported-data/unique-file-names', [ImportedDataController::class, 'getUniqueFileNames']);
//            Route::get('/imported-data/manufacturers', [ImportedDataController::class, 'getManufacturers']);
//            Route::get('/imported-data/models', [ImportedDataController::class, 'getModels']);
//            Route::get('/imported-data/{importedDatum}', [ImportedDataController::class, 'show']);
//            Route::put('/imported-data/{importedDatum}', [ImportedDataController::class, 'update']);
//            Route::delete('/imported-data/{importedDatum}', [ImportedDataController::class, 'destroy']);
//            Route::delete('/imported-data/by-filename', [ImportedDataController::class, 'destroyByFileName']);
//            Route::get('/imported-data/file-details/{fileName}', [ImportedDataController::class, 'getFileDetails']);
//
//            // Part categories endpoint - this might be missing
//            Route::get('/imported-data/part-categories', [ImportedDataController::class, 'getPartCategories']);
//
//            // Make sure these exist (they might already be there):
//            Route::get('/imported-data/manufacturers', [ImportedDataController::class, 'getManufacturers']);
//            Route::get('/imported-data/models', [ImportedDataController::class, 'getModels']);
//
//            // Individual part update/show routes (might already exist):
//            Route::get('/imported-data/{id}', [ImportedDataController::class, 'show']);
//            Route::put('/imported-data/{id}', [ImportedDataController::class, 'update']);
//
//            // CSV Processing API
//            Route::post('/get-csv-headers', [CsvProcessController::class, 'getCsvHeaders'])->name('get-csv-headers');
//            Route::post('/upload-csv', [CsvProcessController::class, 'uploadAndProcessCsv'])->name('upload-csv');
//
//            // Imported Data API
//            Route::get('/imported-data/filenames',
//                [ImportedDataController::class, 'getUniqueFileNames'])->name('imported-data.filenames');
//
//            Route::apiResource('imported-data', ImportedDataController::class)->except(['store']);
//
//            Route::prefix('queue-status')->group(function () {
//                Route::get('/', [QueueStatusController::class, 'getStatus']);
//                Route::get('/redis-details', [QueueStatusController::class, 'getRedisDetails']);
//            });
//
//            Route::post('/upload-zip-bundle', [CsvProcessController::class, 'uploadAndProcessZipBundle']);
//
//            // Positions API
            Route::apiResource('positions', PositionController::class);
//
//            // User Hierarchy API
////            Route::get('/hierarchy-tree', [HierarchyController::class, 'getTreeData']);
//            Route::get('/users/hierarchy', [UserHierarchyController::class, 'getHierarchy'])->name('users.hierarchy');
//
//            // User Hierarchy detailed routes
//            Route::prefix('users-hierarchy')->name('users-hierarchy.')->group(function () {
//                Route::get('/', [UserHierarchyController::class, 'getUsersWithHierarchyInfo'])->name('list');
//                Route::post('/{user}/assign-position',
//                    [UserHierarchyController::class, 'assignPosition'])->name('assign-position');
//                Route::post('/{user}/assign-manager',
//                    [UserHierarchyController::class, 'assignManager'])->name('assign-manager');
//                Route::get('/{user}/details',
//                    [UserHierarchyController::class, 'getUserHierarchyDetails'])->name('details');
//                Route::get('/{user}/assignable-managers',
//                    [UserHierarchyController::class, 'getAssignableManagers'])->name('assignable-managers');
//            });

            // Users API (for dropdowns)
            Route::get('users', function () {
                return response()->json(User::select('id', 'name', 'email', 'hire_date')->get());
            })->name('users.index');
        });
    });
});
require __DIR__.'/settings.php';
require __DIR__.'/impersonate.php';
require __DIR__.'/emergency-contacts.php';
require __DIR__.'/pto-routes.php';
//require __DIR__.'/parts-database.php';
//require __DIR__.'/admin-routes.php';.
require __DIR__.'/department.php';
require __DIR__.'/api.php';
require __DIR__.'/auth.php';
require __DIR__.'/hr-routes.php';
require __DIR__.'/channels.php';
