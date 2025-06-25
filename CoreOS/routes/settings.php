<?php

use App\Http\Controllers\Settings\AddressesController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Middleware\ValidateSessionWithWorkOS;

Route::middleware([
    'auth',
    ValidateSessionWithWorkOS::class,
])->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');


    Route::get('settings/addresses', [AddressesController::class, 'index'])->name('settings.addresses.index');
    Route::post('settings/addresses', [AddressesController::class, 'store'])->name('settings.addresses.store');
    Route::put('settings/addresses/{address}', [AddressesController::class, 'update'])->name('settings.addresses.update');
    Route::delete('settings/addresses/{address}', [AddressesController::class, 'destroy'])->name('settings.addresses.destroy');
    Route::patch('settings/addresses/{address}/set-primary', [AddressesController::class, 'setPrimary'])->name('settings.addresses.set-primary');
    Route::patch('settings/addresses/{address}/toggle-active', [AddressesController::class, 'toggleActive'])->name('settings.addresses.toggle-active');







    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');
});
