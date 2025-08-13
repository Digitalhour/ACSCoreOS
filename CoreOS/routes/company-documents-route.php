<?php


// Tag Routes
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\TagController;
use Illuminate\Support\Facades\Route;


/*
|--------------------------------------------------------------------------
| Unified Folder Management (includes documents)
|--------------------------------------------------------------------------
*/
    Route::get('/employee/documents', [FolderController::class, 'employeeIndex'])
        ->name('employee.folders.index');


    // Additional folder routes
    Route::get('/folders/{document}/document', [FolderController::class, 'showDocument'])
        ->name('folders.show-document');



/*
|--------------------------------------------------------------------------
| Document Operations (Backend + Show page)
|--------------------------------------------------------------------------
*/

    // Document show page (keep existing)
    Route::get('/documents/{document}', [DocumentController::class, 'show'])
        ->name('documents.show');
    // Document access operations
    Route::get('/documents/{document}/download', [DocumentController::class, 'download'])
        ->name('documents.download');
    Route::get('/documents/{document}/view', [DocumentController::class, 'view'])
        ->name('documents.view');

    Route::get('/employee/documents/{document}/view', [DocumentController::class, 'employeeView'])
        ->name('employee.documents.view');



Route::group([
    'middleware' => ['auth', 'verified', 'route.permission']
], function () {
    // Main folder management routes
    Route::get('/folders', [FolderController::class, 'index'])->name('folders.index');
    Route::get('/admin/folders', [FolderController::class, 'index'])->name('admin.folders.index');


    Route::resource('folders', FolderController::class);
    Route::prefix('tags')->name('tags.')->group(function () {
        Route::get('/', [TagController::class, 'index'])->name('index');
        Route::get('/{tag}', [TagController::class, 'show'])->name('show');
        Route::get('/create', [TagController::class, 'create'])->name('create');
        Route::post('/', [TagController::class, 'store'])->name('store');

        Route::get('/{tag}/edit', [TagController::class, 'edit'])->name('edit');
        Route::put('/{tag}', [TagController::class, 'update'])->name('update');
        Route::delete('/{tag}', [TagController::class, 'destroy'])->name('destroy');

// AJAX search route for tags
        Route::get('/search/ajax', [TagController::class, 'search'])->name('search');
    });
    // Bulk operations
    Route::post('/folders/bulk-delete', [FolderController::class, 'bulkDelete'])
        ->name('folders.bulk-delete');
    Route::post('/folders/bulk-move', [FolderController::class, 'bulkMove'])
        ->name('folders.bulk-move');




    Route::get('/documents/{document}/edit', [DocumentController::class, 'edit'])
        ->name('documents.edit');

    // Document CRUD operations (called from folder interface)
    Route::post('/documents', [DocumentController::class, 'store'])
        ->name('documents.store');
    Route::put('/documents/{document}', [DocumentController::class, 'update'])
        ->name('documents.update');
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy'])
        ->name('documents.destroy');


    Route::prefix('manager/folders')->name('manager.folders.')->group(function () {
        Route::get('create', [FolderController::class, 'managerCreate'])->name('create');
        Route::post('/', [FolderController::class, 'managerStore'])->name('store');
        Route::get('{folder}/edit', [FolderController::class, 'managerEdit'])->name('edit');
        Route::put('{folder}', [FolderController::class, 'managerUpdate'])->name('update');
    });



});
