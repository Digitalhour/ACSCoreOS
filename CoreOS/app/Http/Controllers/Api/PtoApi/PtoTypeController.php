<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PtoTypeController extends Controller
{
    public function types()
    {
        return Inertia::render('Admin/PTO/AdminPtoTypesView', [
            'title' => 'PTO Types Administration',
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = PtoType::query();

            if ($request->boolean('active_only')) {
                $query->active();
            }

            $ptoTypes = $query->ordered()->get();

            if ($request->boolean('with_stats')) {
                $ptoTypes->each(function ($ptoType) {
                    $ptoType->usage_stats = $ptoType->getUsageStats();
                });
            }

            return response()->json([
                'data' => $ptoTypes,
                'meta' => [
                    'total' => $ptoTypes->count(),
                    'active_count' => $ptoTypes->where('is_active', true)->count(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error("Error fetching PTO Types: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch PTO Types.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:pto_types,name|max:255',
            'code' => 'nullable|string|max:10|unique:pto_types,code',
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'multi_level_approval' => 'boolean',
            'disable_hierarchy_approval' => 'boolean',
            'specific_approvers' => 'nullable|array',
            'specific_approvers.*' => 'integer|exists:users,id',
            'uses_balance' => 'boolean',
            'carryover_allowed' => 'boolean',
            'negative_allowed' => 'boolean',
            'affects_schedule' => 'boolean',
            'show_in_department_calendar' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);


        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $validatedData = $validator->validated();
            if (!$request->input('multi_level_approval', false)) {
                $validatedData['disable_hierarchy_approval'] = false;
                $validatedData['specific_approvers'] = null;
            }

            $ptoType = PtoType::create($validatedData);

            DB::commit();

            Log::info("PTO Type created: ID {$ptoType->id}, Name: {$ptoType->name}");

            return response()->json([
                'data' => $ptoType,
                'message' => "PTO Type '{$ptoType->name}' created successfully."
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error creating PTO Type: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to create PTO Type.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(PtoType $ptoType, Request $request): JsonResponse
    {
        try {
            if ($request->boolean('with_stats')) {
                $ptoType->usage_stats = $ptoType->getUsageStats();
            }

            return response()->json(['data' => $ptoType]);
        } catch (\Exception $e) {
            Log::error("Error fetching PTO Type ID {$ptoType->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch PTO Type.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PtoType $ptoType): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255', Rule::unique('pto_types')->ignore($ptoType->id)],
            'code' => ['nullable', 'string', 'max:10', Rule::unique('pto_types')->ignore($ptoType->id)],
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'multi_level_approval' => 'boolean',
            'disable_hierarchy_approval' => 'boolean',
            'specific_approvers' => 'nullable|array',
            'specific_approvers.*' => 'integer|exists:users,id',
            'uses_balance' => 'boolean',
            'carryover_allowed' => 'boolean',
            'negative_allowed' => 'boolean',
            'affects_schedule' => 'boolean',
            'show_in_department_calendar' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Validation failed.', 'errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            $validatedData = $validator->validated();

            if (!$request->input('multi_level_approval', false)) {
                $validatedData['disable_hierarchy_approval'] = false;
                $validatedData['specific_approvers'] = null;
            }

            $ptoType->update($validatedData);

            DB::commit();

            return response()->json([
                'data' => $ptoType,
                'message' => "PTO Type '{$ptoType->name}' updated successfully."
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error updating PTO Type ID {$ptoType->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to update PTO Type.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    // ... other methods
}
