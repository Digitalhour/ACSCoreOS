<?php


use App\Http\Controllers\Admin\ImpersonateController;
use Illuminate\Support\Facades\Route;


Route::impersonate();
        Route::get('/impersonate', [ImpersonateController::class, 'index'])
            ->name('impersonate.index');
////        ->middleware('can:impersonate');



