<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PositionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $positions = Position::orderBy('name', 'asc')->get();
        return response()->json($positions);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:positions,name|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $position = Position::create($request->all());
            Log::info("Position created: ID {$position->id}, Name: {$position->name}");
            return response()->json($position, 201);
        } catch (\Exception $e) {
            Log::error("Error creating position: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to create position.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Position $position): JsonResponse
    {
        return response()->json($position);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Position $position): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:positions,name,'.$position->id,
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $position->update($request->all());
            Log::info("Position updated: ID {$position->id}, Name: {$position->name}");
            return response()->json($position);
        } catch (\Exception $e) {
            Log::error("Error updating position ID {$position->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to update position.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Position $position): JsonResponse
    {
        try {
            if ($position->users()->count() > 0) {
                Log::warning("Attempt to delete position ID {$position->id} which has users assigned. Current users' position_id will be set to null.");
            }

            $positionName = $position->name;
            $positionId = $position->id;
            $position->delete();

            Log::info("Position deleted: ID {$positionId}, Name: {$positionName}");
            return response()->json(['message' => "Position '{$positionName}' deleted successfully."], 200);
        } catch (\Exception $e) {
            Log::error("Error deleting position ID {$position->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to delete position.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }
}
