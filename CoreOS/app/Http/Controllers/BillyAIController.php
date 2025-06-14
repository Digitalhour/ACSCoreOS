<?php

namespace App\Http\Controllers;

use App\Models\AiMessageFeedback;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

// use Illuminate\Auth\Access\Gate; // Assuming Gate is not used based on prior request

// Your feedback model

class BillyAIController extends Controller
{
    // Display the main chat page (billy.tsx)
    public function chat()
    {
        // Assuming your Inertia page is named 'BillyChat' based on component export
        // If your file is resources/js/Pages/billy.tsx, Inertia usually expects 'billy'
        return Inertia::render('BillyAi/billy'); // Or 'BillyChat' if that's how you've registered it
    }

    public function storeMessageFeedback(Request $request, Message $message)
    {
        $request->validate([
            'rating' => 'required|in:up,down',
            'comment' => 'nullable|string|max:1000',
        ]);

        if ($message->role !== 'assistant') {
            return response()->json(['error' => 'Feedback can only be provided for assistant messages.'], 400);
        }

        $conversation = $message->conversation;
        if (!$conversation || $conversation->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized to give feedback for this message.'], 403);
        }

        $feedback = AiMessageFeedback::updateOrCreate(
            [
                'message_id' => $message->id,
                'user_id' => Auth::id(),
            ],
            [
                'rating' => $request->input('rating'),
                'comment' => $request->input('rating') === 'down' ? $request->input('comment') : null,
            ]
        );

        return response()->json(['success' => true, 'feedback' => $feedback], 201);
    }

    public function getConversations(Request $request)
    {
        $perPage = $request->input('per_page', 12);
        $conversations = Conversation::where('user_id', Auth::id())
            ->orderBy('updated_at', 'desc')
            ->paginate($perPage, ['id', 'title', 'updated_at', 'created_at']);
        return response()->json($conversations);
    }

    // Fetch a specific conversation with its messages and user-specific feedback
    public function getConversation(Conversation $conversation)
    {
        if ($conversation->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Eager load messages and for each message, load its userFeedback
        $conversation->load(['messages.userFeedback']);

        return response()->json($conversation);
    }

    public function storeMessage(Request $request)
    {
        $request->validate([
            'message_content' => 'required|string',
            'role' => 'required|in:user,assistant',
            'conversation_id' => 'nullable|exists:conversations,id',
            'conversation_title' => 'nullable|string|max:255',
        ]);

        $user = Auth::user();
        $conversationId = $request->input('conversation_id');
        $conversation = null;

        if ($conversationId) {
            $conversation = Conversation::where('id', $conversationId)
                ->where('user_id', $user->id)
                ->firstOrFail();
        } else {
            $title = $request->input('conversation_title');
            if (empty($title)) {
                $title = implode(' ', array_slice(explode(' ', $request->input('message_content')), 0, 5)).'...';
            }
            $conversation = Conversation::create([
                'user_id' => $user->id,
                'title' => $title,
            ]);
        }

        $message = $conversation->messages()->create([
            'role' => $request->input('role'),
            'content' => $request->input('message_content'),
            'timestamp' => now(),
        ]);

        $conversation->touch();

        return response()->json([
            'message' => $message->load([
                'conversation' => function ($query) {
                    $query->select('id', 'title', 'user_id', 'created_at', 'updated_at');
                }
            ]),
            'conversation_id' => $conversation->id,
            'conversation_title' => $conversation->title,
        ]);
    }

    public function updateConversationTitle(Request $request, Conversation $conversation)
    {
        if ($conversation->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $request->validate(['title' => 'required|string|max:255']);
        $conversation->update(['title' => $request->input('title')]);
        return response()->json($conversation);
    }

    public function deleteConversation(Conversation $conversation)
    {
        if ($conversation->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $conversation->delete();
        return response()->json(['message' => 'Conversation deleted successfully']);
    }

    public function feedbackIndex()
    {
        // Assuming your Inertia page is named 'BillyFeedback'
        return Inertia::render('BillyAi/billy-feedback'); // Or the correct name of your feedback overview page component
    }

    public function getFeedbackData(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $searchTerm = $request->input('search');
        $ratingFilter = $request->input('rating');
        $feedbackStatusFilter = $request->input('feedback_status', 'all');
        $deletionStatusFilter = $request->input('deletion_status', 'active');

        $conversationQuery = Conversation::query();

        if ($deletionStatusFilter === 'deleted') {
            $conversationQuery->onlyTrashed();
        } elseif ($deletionStatusFilter === 'all') {
            $conversationQuery->withTrashed();
        }

        if ($feedbackStatusFilter === 'rated') {
            $conversationQuery->whereHas('messages.allFeedback',
                function ($query) use ($ratingFilter) { // Changed to allFeedback for general check
                    if ($ratingFilter && in_array($ratingFilter, ['up', 'down'])) {
                        $query->where('rating', $ratingFilter);
                    }
                });
        } elseif ($feedbackStatusFilter === 'unrated') {
            $conversationQuery->whereDoesntHave('messages.allFeedback'); // Changed to allFeedback
        }

        $conversationQuery->with([
            'user' => function ($query) {
                $query->select('id', 'name', 'email');
            },
        ])
            ->select('conversations.*')
            ->addSelect(DB::raw('(SELECT COUNT(DISTINCT mf.id)
                                   FROM ai_message_feedback mf
                                   JOIN messages m ON mf.message_id = m.id
                                   WHERE m.conversation_id = conversations.id'.
                ($ratingFilter && in_array($ratingFilter, [
                    'up', 'down'
                ]) && $feedbackStatusFilter !== 'unrated' ? " AND mf.rating = '".$ratingFilter."'" : "").
                ') as feedback_count'))
            ->addSelect(DB::raw('(SELECT COUNT(DISTINCT mf.id)
                                   FROM ai_message_feedback mf
                                   JOIN messages m ON mf.message_id = m.id
                                   WHERE m.conversation_id = conversations.id AND mf.rating = "up"
                                 ) as thumbs_up_count'))
            ->addSelect(DB::raw('(SELECT COUNT(DISTINCT mf.id)
                                   FROM ai_message_feedback mf
                                   JOIN messages m ON mf.message_id = m.id
                                   WHERE m.conversation_id = conversations.id AND mf.rating = "down"
                                 ) as thumbs_down_count'))
            ->addSelect(DB::raw('(SELECT MAX(mf.created_at)
                                   FROM ai_message_feedback mf
                                   JOIN messages m ON mf.message_id = m.id
                                   WHERE m.conversation_id = conversations.id'.
                ($ratingFilter && in_array($ratingFilter, [
                    'up', 'down'
                ]) && $feedbackStatusFilter !== 'unrated' ? " AND mf.rating = '".$ratingFilter."'" : "").
                ') as last_feedback_at'))
            ->addSelect(DB::raw('conversations.deleted_at IS NOT NULL as is_deleted'))
            ->orderByRaw('last_feedback_at IS NULL ASC, last_feedback_at DESC, conversations.updated_at DESC');

        if ($searchTerm) {
            $conversationQuery->where(function ($query) use ($feedbackStatusFilter, $searchTerm) {
                $query->where('title', 'like', '%'.$searchTerm.'%')
                    ->orWhereHas('user', function ($q) use ($searchTerm) {
                        $q->where('name', 'like', '%'.$searchTerm.'%')
                            ->orWhere('email', 'like', '%'.$searchTerm.'%');
                    })
                    ->when($feedbackStatusFilter !== 'unrated', function ($q) use ($searchTerm) {
                        $q->orWhereHas('messages.allFeedback',
                            function ($subQ) use ($searchTerm) { // Changed to allFeedback
                                $subQ->where('comment', 'like', '%'.$searchTerm.'%');
                            });
                    });
            });
        }

        $conversationsWithData = $conversationQuery->paginate($perPage);
        return response()->json($conversationsWithData);
    }

    public function showConversationForAdmin(Request $request, $conversationId)
    {
        $conversation = Conversation::withTrashed()->findOrFail($conversationId);
        $conversation->load([
            'user' => function ($query) {
                $query->select('id', 'name', 'email');
            },
            'messages' => function ($query) {
                $query->orderBy('timestamp', 'asc');
            },
            'messages.allFeedback.user' => function ($query) { // Load all feedback and the user who gave it
                $query->select('id', 'name', 'email');
            }
        ]);
        return Inertia::render('BillyAi/BillyConversationView', [
            'conversation' => $conversation,
        ]);
    }
}
