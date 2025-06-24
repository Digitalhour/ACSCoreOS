<?php

namespace App\Events;

use App\Models\PtoModels\PtoRequest;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PtoRequestSubmitted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public PtoRequest $ptoRequest
    ) {}

    public function broadcastOn(): array
    {
        $channels = [];

        // Broadcast to the manager's PTO channel
        if ($this->ptoRequest->user->manager) {
            $channels[] = new PrivateChannel('pto-requests.manager.' . $this->ptoRequest->user->manager->id);
        }

        return $channels;
    }

    public function broadcastWith(): array
    {
        return [
            'notification' => [
                'id' => $this->ptoRequest->id,
                'title' => 'New PTO Request',
                'message' => "{$this->ptoRequest->user->name} submitted a {$this->ptoRequest->ptoType->name} request for {$this->ptoRequest->total_days} days",
                'pto_request_id' => $this->ptoRequest->id,
                'employee_name' => $this->ptoRequest->user->name,
                'employee_id' => $this->ptoRequest->user->id,
                'pto_type' => $this->ptoRequest->ptoType->name,
                'start_date' => $this->ptoRequest->start_date->format('Y-m-d'),
                'end_date' => $this->ptoRequest->end_date->format('Y-m-d'),
                'total_days' => $this->ptoRequest->total_days,
            ]
        ];
    }
}
