<?php





/*
       |--------------------------------------------------------------------------
       | BillyAI Routes
       |--------------------------------------------------------------------------
       */
// Main chat interface
use App\Http\Controllers\BillyAIController;
use Illuminate\Support\Facades\Route;

Route::get('/billy', [BillyAIController::class, 'chat'])->name('billy');

// Messages & feedback
Route::post('/billy/messages', [BillyAIController::class, 'storeMessage'])->name('billy.messages.store');
Route::post('/billy/messages/{message}/feedback',
    [BillyAIController::class, 'storeMessageFeedback'])->name('billy.messages.feedback');

// Feedback management
Route::get('/billy/feedback', [BillyAIController::class, 'feedbackIndex'])->name('billy.feedback.index');
Route::get('/billy/feedback-data', [BillyAIController::class, 'getFeedbackData'])->name('billy.feedback.data');

// Conversations management
Route::get('/billy/conversations',
    [BillyAIController::class, 'getConversations'])->name('billy.conversations.index');
Route::get('/billy/conversations/all', [BillyAIController::class, 'getAllConversations']);
Route::get('/billy/conversations/{conversation}',
    [BillyAIController::class, 'getConversation'])->name('billy.conversations.show');
Route::get('/billy/conversation/{conversation}',
    [BillyAIController::class, 'showConversationForAdmin'])->name('billy.conversation.show.admin');
Route::put('/billy/conversations/{conversation}/title',
    [BillyAIController::class, 'updateConversationTitle'])->name('billy.conversations.update.title');
Route::delete('/billy/conversations/{conversation}',
    [BillyAIController::class, 'deleteConversation'])->name('billy.conversations.destroy');
