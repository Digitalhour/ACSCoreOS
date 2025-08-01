<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoType;
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
        return Inertia::render('human-resources/PtoTypesView', [
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

            // Only filter by active status if explicitly requested
            if ($request->has('active_only') && $request->boolean('active_only')) {
                $query->active();
            }

            // Get all PTO types, both active and inactive, ordered properly
            $ptoTypes = $query->ordered()->get();

            // Ensure proper boolean casting for each item
            $ptoTypes->transform(function ($ptoType) {
                $ptoType->is_active = (bool) $ptoType->is_active;
                $ptoType->multi_level_approval = (bool) $ptoType->multi_level_approval;
                $ptoType->disable_hierarchy_approval = (bool) $ptoType->disable_hierarchy_approval;
                $ptoType->uses_balance = (bool) $ptoType->uses_balance;
                $ptoType->carryover_allowed = (bool) $ptoType->carryover_allowed;
                $ptoType->negative_allowed = (bool) $ptoType->negative_allowed;
                $ptoType->affects_schedule = (bool) $ptoType->affects_schedule;
                $ptoType->show_in_department_calendar = (bool) $ptoType->show_in_department_calendar;
                return $ptoType;
            });

            // Add usage stats if requested
            if ($request->boolean('with_stats')) {
                $ptoTypes->each(function ($ptoType) {
                    $ptoType->usage_stats = $ptoType->getUsageStats();
                });
            }

            // Log the count of active and inactive PTO types for debugging
            $activeCount = $ptoTypes->where('is_active', true)->count();
            $inactiveCount = $ptoTypes->where('is_active', false)->count();

            Log::info("PTO Types fetched", [
                'total' => $ptoTypes->count(),
                'active' => $activeCount,
                'inactive' => $inactiveCount,
                'types_data' => $ptoTypes->map(function($pt) {
                    return [
                        'id' => $pt->id,
                        'name' => $pt->name,
                        'is_active' => $pt->is_active,
                        'is_active_type' => gettype($pt->is_active)
                    ];
                })
            ]);

            return response()->json([
                'data' => $ptoTypes->values(), // Reset array keys
                'meta' => [
                    'total' => $ptoTypes->count(),
                    'active_count' => $activeCount,
                    'inactive_count' => $inactiveCount,
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

            // Ensure boolean values are properly set
            $validatedData['is_active'] = $request->boolean('is_active', true);
            $validatedData['multi_level_approval'] = $request->boolean('multi_level_approval', false);
            $validatedData['uses_balance'] = $request->boolean('uses_balance', true);
            $validatedData['carryover_allowed'] = $request->boolean('carryover_allowed', false);
            $validatedData['negative_allowed'] = $request->boolean('negative_allowed', false);
            $validatedData['affects_schedule'] = $request->boolean('affects_schedule', true);
            $validatedData['show_in_department_calendar'] = $request->boolean('show_in_department_calendar', true);

            if (!$validatedData['multi_level_approval']) {
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

            // Ensure boolean values are properly set
            $validatedData['is_active'] = $request->boolean('is_active');
            $validatedData['multi_level_approval'] = $request->boolean('multi_level_approval');
            $validatedData['uses_balance'] = $request->boolean('uses_balance');
            $validatedData['carryover_allowed'] = $request->boolean('carryover_allowed');
            $validatedData['negative_allowed'] = $request->boolean('negative_allowed');
            $validatedData['affects_schedule'] = $request->boolean('affects_schedule');
            $validatedData['show_in_department_calendar'] = $request->boolean('show_in_department_calendar');

            if (!$validatedData['multi_level_approval']) {
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

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(PtoType $ptoType): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Check if PTO type can be safely deleted
            if (!$ptoType->canBeDeleted()) {
                $stats = $ptoType->getUsageStats();
                $usageDetails = [];

                if ($stats['policies_count'] > 0) {
                    $usageDetails[] = "{$stats['policies_count']} policy/policies";
                }
                if ($stats['requests_count'] > 0) {
                    $usageDetails[] = "{$stats['requests_count']} request(s)";
                }
                if ($stats['users_with_balance_count'] > 0) {
                    $usageDetails[] = "{$stats['users_with_balance_count']} user balance(s)";
                }

                return response()->json([
                    'error' => 'Cannot delete PTO Type.',
                    'message' => "This PTO type is being used by: " . implode(', ', $usageDetails) . ". Please reassign or resolve these dependencies first."
                ], 422);
            }

            $ptoTypeName = $ptoType->name;
            $ptoTypeId = $ptoType->id;

            // Soft delete the PTO type
            $ptoType->delete();

            DB::commit();

            Log::info("PTO Type soft deleted: ID {$ptoTypeId}, Name: {$ptoTypeName}");

            return response()->json([
                'message' => "PTO Type '{$ptoTypeName}' deleted successfully."
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error deleting PTO Type ID {$ptoType->id}: " . $e->getMessage());

            return response()->json([
                'error' => 'Failed to delete PTO Type.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Toggle the active status of the specified PTO type.
     */
    public function toggleActive(PtoType $ptoType): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Toggle the is_active status
            $ptoType->is_active = !$ptoType->is_active;
            $ptoType->save();

            DB::commit();

            $status = $ptoType->is_active ? 'active' : 'inactive';
            Log::info("PTO Type status toggled: ID {$ptoType->id}, Name: {$ptoType->name}, Status: {$status}");

            return response()->json([
                'data' => $ptoType,
                'message' => "PTO Type '{$ptoType->name}' is now {$status}."
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error toggling PTO Type status ID {$ptoType->id}: " . $e->getMessage());

            return response()->json([
                'error' => 'Failed to toggle PTO Type status.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }
}
