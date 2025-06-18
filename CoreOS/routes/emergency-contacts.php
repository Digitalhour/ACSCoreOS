<?php

use App\Http\Controllers\Settings\EmergencyContactsController;
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
Route::get('settings/emergency-contacts', [EmergencyContactsController::class, 'index'])
->name('emergency-contacts.index');
Route::post('settings/emergency-contacts', [EmergencyContactsController::class, 'store'])
->name('emergency-contacts.store');
Route::patch('settings/emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'update'])
->name('emergency-contacts.update');
Route::delete('settings/emergency-contacts/{emergencyContact}', [EmergencyContactsController::class, 'destroy'])
->name('emergency-contacts.destroy');

});
