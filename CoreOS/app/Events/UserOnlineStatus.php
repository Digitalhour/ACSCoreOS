<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class UserOnlineStatus implements ShouldBroadcastNow
{
    use Dispatchable;

    public function __construct(public User $user) {}

    public function broadcastOn()
    {
        return new PresenceChannel('online-users');
    }

    public function broadcastWith(User $user)
    {
        return $user->only('id', 'name', 'avatar_url');
    }
}
