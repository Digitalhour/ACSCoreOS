<?php





/*
       |--------------------------------------------------------------------------
       | BillyAI Routes
       |--------------------------------------------------------------------------
       */
// Main chat interface
use App\Http\Controllers\BillyAIController;
use Illuminate\Support\Facades\Route;

Route::group([
    'middleware' => ['auth', 'verified', 'route.permission'],
    'prefix' => 'billy',
    'as' => 'billy.',
], function () {
    Route::get('/', [BillyAIController::class, 'chat'])->name('billy');

// Messages & feedback
    Route::post('/messages', [BillyAIController::class, 'storeMessage'])->name('billy.messages.store');
    Route::post('/messages/{message}/feedback',
        [BillyAIController::class, 'storeMessageFeedback'])->name('billy.messages.feedback');

// Feedback management
    Route::get('/feedback', [BillyAIController::class, 'feedbackIndex'])->name('billy.feedback.index');
    Route::get('/feedback-data', [BillyAIController::class, 'getFeedbackData'])->name('billy.feedback.data');

// Conversations management
    Route::get('/conversations',
        [BillyAIController::class, 'getConversations'])->name('billy.conversations.index');
    Route::get('/conversations/all', [BillyAIController::class, 'getAllConversations']);
    Route::get('/conversations/{conversation}',
        [BillyAIController::class, 'getConversation'])->name('billy.conversations.show');
    Route::get('/conversation/{conversation}',
        [BillyAIController::class, 'showConversationForAdmin'])->name('billy.conversation.show.admin');
    Route::put('/conversations/{conversation}/title',
        [BillyAIController::class, 'updateConversationTitle'])->name('billy.conversations.update.title');
    Route::delete('/conversations/{conversation}',
        [BillyAIController::class, 'deleteConversation'])->name('billy.conversations.destroy');
});
