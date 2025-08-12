<?php

use App\Http\Controllers\Api\PtoApi\PtoApprovalRuleController;
use App\Http\Controllers\Api\UserPtoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Settings\EmergencyContactsController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\WidgetController;
use App\Models\BlogArticle;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');
Route::get('/test', function () {
    return 'Homepage test working!';
});
Route::middleware('auth')->middleware(ValidateSessionWithWorkOS::class)->group(function () {

   Route::get('dashboard', function () {
        $articles = BlogArticle::with(['user:id,name,email,avatar'])
            ->withCount('approvedComments')
            ->published()
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($article) {
                $articleArray = $article->toArray();
                $articleArray['featured_image'] = $article->featured_image
                    ? Storage::disk('s3')->temporaryUrl($article->featured_image, now()->addHours(24))
                    : null;
                return $articleArray;
            });

        return Inertia::render('dashboard', [
            'articles' => $articles
        ]);
    })->name('dashboard');


// sales numbers on the dashboard
   Route::get('/dashboard/monthly-sales-data', [DashboardController::class, 'monthlySalesData']);
   Route::get('/dashboard/yearly-sales-data', [DashboardController::class, 'yearlySalesData']);

    /*
    *
    * Emergancy Contact Routes
    *
    */




        Route::get('settings/emergency-contacts', [EmergencyContactsController::class, 'index'])->name('emergency-contacts.index');
        Route::post('settings/emergency-contacts', [EmergencyContactsController::class, 'store'])->name('emergency-contacts.store');
        Route::patch('settings/emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'update'])->name('emergency-contacts.update');
        Route::delete('settings/emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'destroy'])->name('emergency-contacts.destroy');





        Route::get('/user-management', [UserManagementController::class, 'index'])->name('user-management');
        Route::get('/api/widget-token', [UserManagementController::class, 'getWidgetToken']);
        Route::get('/api/organization-users', [UserManagementController::class, 'getOrganizationUsers']);
        Route::post('/api/deactivate-user', [UserManagementController::class, 'deactivateUser']);
        Route::post('/api/reactivate-user', [UserManagementController::class, 'reactivateUser']);
        Route::post('/api/invite-user-with-pto', [UserManagementController::class, 'inviteUserWithPto']);
        Route::post('/user-management/invite-user', [UserManagementController::class, 'inviteUserWithPto'])->name('user-management.invite');









        Route::get('/organization-chart', function () {
            return Inertia::render('Admin/OrganizationChartPage');
        })->name('acs-origination');




});

require __DIR__ . '/ai-chat-routes.php';
require __DIR__.'/settings.php';
require __DIR__.'/impersonate.php';
require __DIR__.'/emergency-contacts.php';
//require __DIR__.'/pto-routes.php';
//require __DIR__.'/parts-database.php';
////require __DIR__.'/admin-routes.php';.
//require __DIR__.'/department.php';
//require __DIR__.'/api.php';
//require __DIR__.'/product-picture-manager.php';
require __DIR__.'/auth.php';
//require __DIR__.'/hr-routes.php';
//require __DIR__.'/channels.php';
//require __DIR__.'/vibtrack.php';
//require __DIR__.'/wiki.php';
//require __DIR__.'/blog-routes.php';
//require __DIR__.'/training.php';
//require __DIR__.'/payroll-routes.php';
//require __DIR__.'/company-documents-route.php';
//require __DIR__.'/debug-routes.php';
//require __DIR__.'/access-control.php';
//require __DIR__.'/developer-routes.php';
