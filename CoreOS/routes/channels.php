<?php

use Illuminate\Support\Facades\Broadcast;


// User's private channel
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// PTO request channel - managers can listen to their team's requests
//Broadcast::channel('pto-requests.manager.{managerId}', function ($user, $managerId) {
//    return (int) $user->id === (int) $managerId;
//});
//Broadcast::channel('presence.online', function ($user) {
//    return $user ? [
//        'id' => $user->id,
//        'name' => $user->name,
//        // add avatar, role, etc. if you want them in the presence list
//    ] : false;
//});
//// Alternative: Department-based PTO channel
//Broadcast::channel('pto-requests.department.{departmentId}', function ($user, $departmentId) {
//    return $user->departments()->where('department_id', $departmentId)->exists();
//});
