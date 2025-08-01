<?php

namespace App\Notifications;

use App\Models\PtoModels\PtoRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class PtoDenied extends Notification implements ShouldQueue
{
    use Queueable;

    protected $ptoRequest;
    protected $isForManager;

    public function __construct(PtoRequest $ptoRequest, bool $isForManager = false)
    {
        $this->ptoRequest = $ptoRequest;
        $this->isForManager = $isForManager;
        // Use default queue connection from config
        $this->onQueue('default');

        Log::info('PTO Denied notification constructed', [
            'pto_request_id' => $ptoRequest->id,
            'user' => $ptoRequest->user->name,
            'denier' => $ptoRequest->deniedBy?->name,
            'is_for_manager' => $isForManager,
            'time' => now()->toDateTimeString(),
            'queue_connection' => config('queue.default'),
        ]);
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $employee = $this->ptoRequest->user;
        $ptoType = $this->ptoRequest->ptoType;
        $denier = $this->ptoRequest->deniedBy;

        // Determine which email template to use
        $template = $this->isForManager ? 'emails.pto.denied-manager' : 'emails.pto.denied-user';

        // Different subject lines for manager vs user
        $subject = $this->isForManager
            ? "PTO Request Denied - {$employee->name}"
            : "Your PTO Request Has Been Denied";

        $mailMessage = (new MailMessage)
            ->subject($subject)
            ->view($template, [
                'ptoRequest' => $this->ptoRequest,
                'employee' => $employee,
                'ptoType' => $ptoType,
                'denier' => $denier,
                'recipient' => $notifiable,
                'isForManager' => $this->isForManager,
                'denialReason' => $this->ptoRequest->denial_reason,
            ]);

        return $mailMessage;
    }
}
