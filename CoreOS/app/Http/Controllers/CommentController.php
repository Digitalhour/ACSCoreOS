<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'commentable_type' => 'required|string|in:App\Models\Article',
            'commentable_id' => 'required|integer',
            'page' => 'integer|min:1',
            'per_page' => 'integer|min:1|max:50',
        ]);

        $commentableClass = $validated['commentable_type'];
        $commentable = $commentableClass::findOrFail($validated['commentable_id']);

        $comments = $commentable->comments()
            ->with([
                'user:id,name,email,avatar',
                'replies.user:id,name,email,avatar',
                'replies.reactions'
            ])
            ->withCount(['reactions', 'replies'])
            ->paginate($validated['per_page'] ?? 10);

        return response()->json([
            'comments' => $comments->items(),
            'pagination' => [
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
                'per_page' => $comments->perPage(),
                'total' => $comments->total(),
                'has_more' => $comments->hasMorePages(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'commentable_type' => 'required|string|in:App\Models\Article',
            'commentable_id' => 'required|integer',
            'parent_id' => 'nullable|integer|exists:comments,id',
            'content' => 'required|string|max:2000',
        ]);

        // Verify the commentable exists
        $commentableClass = $validated['commentable_type'];
        $commentable = $commentableClass::findOrFail($validated['commentable_id']);

        // If parent_id is provided, verify it belongs to the same commentable
        $parentId = $validated['parent_id'] ?? null;
        if (!empty($parentId)) {
            $parentComment = Comment::findOrFail($parentId);
            if ($parentComment->commentable_type !== $validated['commentable_type'] ||
                $parentComment->commentable_id !== $validated['commentable_id']) {
                return back()->withErrors(['error' => 'Invalid parent comment']);
            }
        }

        $comment = Comment::create([
            'user_id' => auth()->id(),
            'commentable_type' => $validated['commentable_type'],
            'commentable_id' => $validated['commentable_id'],
            'parent_id' => $parentId,
            'content' => $validated['content'],
        ]);

        $comment->load([
            'user:id,name,email,avatar',
            'reactions'
        ]);

        return back()->with([
            'commentData' => [
                'comment' => $comment,
                'action' => 'added',
                'message' => 'Comment added successfully',
            ]
        ]);
    }

    public function update(Request $request, Comment $comment)
    {
        // Check if user owns the comment
        if ($comment->user_id !== auth()->id()) {
            return back()->withErrors(['error' => 'Unauthorized']);
        }

        $validated = $request->validate([
            'content' => 'required|string|max:2000',
        ]);

        $comment->update([
            'content' => $validated['content'],
            'edited_at' => now(),
        ]);

        $comment->load([
            'user:id,name,email,avatar',
            'reactions'
        ]);

        return back()->with([
            'commentData' => [
                'comment' => $comment,
                'action' => 'updated',
                'message' => 'Comment updated successfully',
            ]
        ]);
    }

    public function destroy(Comment $comment)
    {
        // Check if user owns the comment
        if ($comment->user_id !== auth()->id()) {
            return back()->withErrors(['error' => 'Unauthorized']);
        }

        $commentId = $comment->id;
        $comment->delete();

        return back()->with([
            'commentData' => [
                'commentId' => $commentId,
                'action' => 'deleted',
                'message' => 'Comment deleted successfully',
            ]
        ]);
    }

    public function getReplies(Comment $comment): JsonResponse
    {
        $replies = $comment->replies()
            ->with([
                'user:id,name,email,avatar',
                'reactions'
            ])
            ->withCount(['reactions', 'replies'])
            ->get();

        return response()->json([
            'replies' => $replies,
            'total' => $replies->count(),
        ]);
    }
}
