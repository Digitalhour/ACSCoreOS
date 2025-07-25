<?php

namespace App\Http\Controllers;

use App\Models\Reaction;
use Illuminate\Http\Request;

class ReactionController extends Controller
{
    public function toggle(Request $request)
    {
        $validated = $request->validate([
            'reactable_type' => 'required|string|in:App\Models\Article,App\Models\Comment',
            'reactable_id' => 'required|integer',
            'type' => 'required|string|in:like,love,laugh,wow,sad,angry',
        ]);

        $reactableClass = $validated['reactable_type'];
        $reactable = $reactableClass::findOrFail($validated['reactable_id']);

        $existingReaction = Reaction::where([
            'user_id' => auth()->id(),
            'reactable_type' => $validated['reactable_type'],
            'reactable_id' => $validated['reactable_id'],
        ])->first();

        if ($existingReaction) {
            if ($existingReaction->type === $validated['type']) {
                // Same reaction type - remove it (toggle off)
                $existingReaction->delete();
                $action = 'removed';
            } else {
                // Different reaction type - update it
                $existingReaction->update(['type' => $validated['type']]);
                $action = 'updated';
            }
        } else {
            // No existing reaction - create new one
            Reaction::create([
                'user_id' => auth()->id(),
                'reactable_type' => $validated['reactable_type'],
                'reactable_id' => $validated['reactable_id'],
                'type' => $validated['type'],
            ]);
            $action = 'added';
        }

        // Get updated reaction summary
        $reactionsSummary = $reactable->getReactionsSummary();
        $userReaction = $reactable->getUserReaction(auth()->id());

        // Return Inertia response with shared data
        return back()->with([
            'reactionUpdate' => [
                'action' => $action,
                'reactable_id' => $validated['reactable_id'],
                'reactable_type' => $validated['reactable_type'],
                'reactions_summary' => $reactionsSummary,
                'user_reaction' => $userReaction ? [
                    'type' => $userReaction->type,
                    'emoji' => $userReaction->emoji,
                ] : null,
                'total_reactions' => $reactable->reactions()->count(),
            ]
        ]);
    }

    public function getReactions(Request $request)
    {
        $validated = $request->validate([
            'reactable_type' => 'required|string|in:App\Models\Article,App\Models\Comment',
            'reactable_id' => 'required|integer',
            'type' => 'nullable|string|in:like,love,laugh,wow,sad,angry',
        ]);

        $reactableClass = $validated['reactable_type'];
        $reactable = $reactableClass::findOrFail($validated['reactable_id']);

        $query = $reactable->reactions()->with('user:id,name,email,avatar');

        if (!empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        $reactions = $query->latest()->get()->map(function ($reaction) {
            return [
                'id' => $reaction->id,
                'type' => $reaction->type,
                'emoji' => $reaction->emoji,
                'user' => [
                    'id' => $reaction->user->id,
                    'name' => $reaction->user->name,
                    'avatar' => $reaction->user->avatar,
                ],
                'created_at' => $reaction->created_at->diffForHumans(),
            ];
        });

        return back()
            ->with('reactions', $reactions)
            ->with('total', $reactions->count());
    }
}
