<?php


use App\Http\Controllers\BlogController;
use App\Http\Controllers\BlogTemplateController;
use Illuminate\Support\Facades\Route;

Route::get('/blog', [BlogController::class, 'index'])->name('blog.index');

Route::post('/blog/{blogArticle}/comments', [BlogController::class, 'storeComment'])->name('blog.comments.store');
Route::put('/blog-comments/{blogComment}', [BlogController::class, 'updateComment'])->name('blog.comments.update');
Route::delete('/blog-comments/{blogComment}', [BlogController::class, 'destroyComment'])->name('blog.comments.destroy');
Route::get('/blog/{blogArticle}', [BlogController::class, 'show'])->name('blog.show');

Route::get('/blog/create', [BlogController::class, 'create'])->name('blog.create');



Route::middleware(['permission:blog-create'])->group(function () {
    // Admin blog management
    Route::get('/admin/blog', [BlogController::class, 'manage'])->name('admin.blog.manage');
    // blog management routes

        Route::post('/blog', [BlogController::class, 'store'])->name('blog.store');
        Route::get('/blog/{blogArticle}/edit', [BlogController::class, 'edit'])->name('blog.edit');
        Route::put('/blog/{blogArticle}', [BlogController::class, 'update'])->name('blog.update');
        Route::delete('/blog/{blogArticle}', [BlogController::class, 'destroy'])->name('blog.destroy');
        Route::post('/blog/upload-image', [BlogController::class, 'uploadEditorImage'])->name('blog.upload-image');
    // blog comment routes
    Route::prefix('admin')->group(function () {
        Route::get('/blog-templates', [BlogTemplateController::class, 'index'])->name('admin.blog-templates.index');
        Route::get('/blog-templates/create', [BlogTemplateController::class, 'create'])->name('admin.blog-templates.create');
        Route::post('/blog-templates', [BlogTemplateController::class, 'store'])->name('admin.blog-templates.store');
        Route::get('/blog-templates/{blogTemplate}', [BlogTemplateController::class, 'show'])->name('admin.blog-templates.show');
        Route::get('/blog-templates/{blogTemplate}/edit', [BlogTemplateController::class, 'edit'])->name('admin.blog-templates.edit');
        Route::put('/blog-templates/{blogTemplate}', [BlogTemplateController::class, 'update'])->name('admin.blog-templates.update');
        Route::delete('/blog-templates/{blogTemplate}', [BlogTemplateController::class, 'destroy'])->name('admin.blog-templates.destroy');
    });



    // API route for SunEditor to fetch templates
    Route::get('/api/blog-templates', [BlogTemplateController::class, 'apiIndex'])->name('api.blog-templates.index');


});
