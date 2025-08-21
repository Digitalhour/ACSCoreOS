<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class UserOnlineStatus implements ShouldBroadcast
{
    use Dispatchable;

    public function __construct(public User $user) {}

    public function broadcastOn()
    {
        return new PresenceChannel('online-users');
    }

    public function broadcastWith()
    {
        return ['id' => $this->user->id, 'name' => $this->user->name];
    }
}
