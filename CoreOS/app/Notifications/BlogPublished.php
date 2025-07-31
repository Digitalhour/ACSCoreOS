<?php

namespace App\Notifications;

use App\Models\BlogArticle;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class BlogPublished extends Notification implements ShouldQueue
{
    use Queueable;

    protected $blogArticle;

    public function __construct(BlogArticle $blogArticle)
    {
        $this->blogArticle = $blogArticle;
        // Use default queue connection from config
        $this->onQueue('default');

        Log::info('Blog Published notification constructed', [
            'blog_id' => $blogArticle->id,
            'blog_title' => $blogArticle->title,
            'author' => $blogArticle->user->name,
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
        $author = $this->blogArticle->user;
        $blogUrl = url('/blog/' . $this->blogArticle->slug);

        $mailMessage = (new MailMessage)
            ->subject("New Blog Post Published: " . $this->blogArticle->title)
            ->view('emails.blog-published', [
                'article' => $this->blogArticle,
                'author' => $author,
                'blogUrl' => $blogUrl,
            ]);

        return $mailMessage;
    }
}
