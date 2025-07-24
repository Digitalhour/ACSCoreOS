<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoPolicy;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class PtoPolicyController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = PtoPolicy::with(['ptoType', 'user']);

            if ($request->boolean('active_only')) {
                $query->active();
            }

            if ($request->has('pto_type_id')) {
                $query->forPtoType($request->pto_type_id);
            }

            if ($request->has('user_id')) {
                $query->forUser($request->user_id);
            }

            $policies = $query->orderBy('user_id')->orderBy('pto_type_id')->get();

            return Inertia::render('PtoPolicies/Index', [
                'policies' => $policies,
                'meta' => [
                    'total' => $policies->count(),
                    'active_count' => $policies->filter(fn($p) => $p->isCurrentlyActive())->count(),
                ],
                'filters' => $request->only(['active_only', 'pto_type_id', 'user_id'])
            ]);
        } catch (\Exception $e) {
            Log::error("Error fetching PTO Policies: ".$e->getMessage());

            return Inertia::render('PtoPolicies/Index', [
                'policies' => [],
                'meta' => ['total' => 0, 'active_count' => 0],
                'error' => 'Failed to fetch PTO Policies.'
            ]);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'initial_days' => 'required|numeric|min:0|max:999.99',
            'annual_accrual_amount' => 'required|numeric|min:0|max:999.99',
            'bonus_days_per_year' => 'nullable|numeric|min:0|max:999.99',
            'rollover_enabled' => 'boolean',
            'max_rollover_days' => 'nullable|numeric|min:0|max:999.99',
            'max_negative_balance' => 'nullable|numeric|min:0|max:999.99',
            'years_for_bonus' => 'nullable|integer|min:1|max:50',
            'accrual_frequency' => 'nullable|in:monthly,quarterly,annually',
            'prorate_first_year' => 'boolean',
            'effective_date' => 'required|date',
            'end_date' => 'nullable|date|after:effective_date',
            'pto_type_id' => 'required|exists:pto_types,id',
            'user_id' => 'required|exists:users,id',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        try {
            DB::beginTransaction();

            $data = $request->all();
            $data['bonus_days_per_year'] = $data['bonus_days_per_year'] ?? 0;
            $data['max_negative_balance'] = $data['max_negative_balance'] ?? 0;
            $data['years_for_bonus'] = $data['years_for_bonus'] ?? 1;
            $data['accrual_frequency'] = $data['accrual_frequency'] ?? 'annually';
            $data['is_active'] = $data['is_active'] ?? true;
            $data['prorate_first_year'] = $data['prorate_first_year'] ?? true;

            // Generate name if not provided
            if (!$data['name']) {
                $user = User::findOrFail($data['user_id']);
                $ptoType = PtoType::findOrFail($data['pto_type_id']);
                $data['name'] = "{$user->name} - {$ptoType->name} Policy";
            }

            $ptoPolicy = PtoPolicy::create($data);
            $ptoPolicy->load(['ptoType', 'user']);

            // Automatically create or update PTO balance
            $this->createOrUpdateBalance($ptoPolicy);

            DB::commit();

            Log::info("PTO Policy created: ID {$ptoPolicy->id}");

            return redirect()->route('pto-policies.index')
                ->with('success', 'PTO Policy created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error creating PTO Policy: ".$e->getMessage());

            return redirect()->back()
                ->withErrors(['error' => 'Failed to create PTO Policy.'])
                ->withInput();
        }
    }

    public function show(PtoPolicy $ptoPolicy)
    {
        try {
            $ptoPolicy->load(['ptoType', 'user']);

            return Inertia::render('PtoPolicies/Show', [
                'policy' => $ptoPolicy
            ]);
        } catch (\Exception $e) {
            Log::error("Error fetching PTO Policy ID {$ptoPolicy->id}: ".$e->getMessage());

            return redirect()->route('pto-policies.index')
                ->withErrors(['error' => 'Failed to fetch PTO Policy.']);
        }
    }

    public function update(Request $request, PtoPolicy $ptoPolicy)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'initial_days' => 'required|numeric|min:0|max:999.99',
            'annual_accrual_amount' => 'required|numeric|min:0|max:999.99',
            'bonus_days_per_year' => 'nullable|numeric|min:0|max:999.99',
            'rollover_enabled' => 'boolean',
            'max_rollover_days' => 'nullable|numeric|min:0|max:999.99',
            'max_negative_balance' => 'nullable|numeric|min:0|max:999.99',
            'years_for_bonus' => 'nullable|integer|min:1|max:50',
            'accrual_frequency' => 'nullable|in:monthly,quarterly,annually',
            'prorate_first_year' => 'boolean',
            'effective_date' => 'required|date',
            'end_date' => 'nullable|date|after:effective_date',
            'pto_type_id' => 'required|exists:pto_types,id',
            'user_id' => 'required|exists:users,id',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        try {
            DB::beginTransaction();

            $data = $request->all();
            $data['bonus_days_per_year'] = $data['bonus_days_per_year'] ?? 0;
            $data['max_negative_balance'] = $data['max_negative_balance'] ?? 0;
            $data['years_for_bonus'] = $data['years_for_bonus'] ?? 1;

            $oldInitialDays = $ptoPolicy->initial_days;
            $ptoPolicy->update($data);
            $ptoPolicy->load(['ptoType', 'user']);

            // Update PTO balance if initial days changed
            if ($oldInitialDays != $ptoPolicy->initial_days) {
                $this->createOrUpdateBalance($ptoPolicy);
            }

            DB::commit();

            return redirect()->route('pto-policies.show', $ptoPolicy)
                ->with('success', 'PTO Policy updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error updating PTO Policy ID {$ptoPolicy->id}: ".$e->getMessage());

            return redirect()->back()
                ->withErrors(['error' => 'Failed to update PTO Policy.'])
                ->withInput();
        }
    }

    public function destroy(PtoPolicy $ptoPolicy)
    {
        try {
            DB::beginTransaction();

            $ptoPolicyId = $ptoPolicy->id;
            $userId = $ptoPolicy->user_id;
            $ptoTypeId = $ptoPolicy->pto_type_id;

            // Hard delete the policy (not soft delete)
            $ptoPolicy->forceDelete();

            // Also delete the associated balance
            PtoBalance::where('user_id', $userId)
                ->where('pto_type_id', $ptoTypeId)
                ->delete();

            DB::commit();

            Log::info("PTO Policy deleted: ID {$ptoPolicyId}");

            return redirect()->route('pto-policies.index')
                ->with('success', 'PTO Policy deleted successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error deleting PTO Policy ID {$ptoPolicy->id}: ".$e->getMessage());

            return redirect()->route('pto-policies.index')
                ->withErrors(['error' => 'Failed to delete PTO Policy.']);
        }
    }

    public function getUserPolicies(Request $request, User $user)
    {
        try {
            $query = PtoPolicy::with(['ptoType'])->forUser($user->id);

            if ($request->boolean('active_only')) {
                $query->active();
            }

            $policies = $query->get();

            return Inertia::render('Users/PtoPolicies', [
                'user' => $user->only(['id', 'name', 'email']),
                'policies' => $policies,
                'meta' => [
                    'total' => $policies->count(),
                    'active_count' => $policies->filter(fn($p) => $p->isCurrentlyActive())->count(),
                ],
                'filters' => $request->only(['active_only'])
            ]);
        } catch (\Exception $e) {
            Log::error("Error fetching policies for user {$user->id}: ".$e->getMessage());

            return Inertia::render('Users/PtoPolicies', [
                'user' => $user->only(['id', 'name', 'email']),
                'policies' => [],
                'meta' => ['total' => 0, 'active_count' => 0],
                'error' => 'Failed to fetch user policies.'
            ]);
        }
    }

    /**
     * Create or update PTO balance based on policy.
     */
    private function createOrUpdateBalance(PtoPolicy $policy): void
    {
        $existingBalance = PtoBalance::where('user_id', $policy->user_id)
            ->where('pto_type_id', $policy->pto_type_id)
            ->first();

        if ($existingBalance) {
            // Update existing balance using correct field names
            $existingBalance->update([
                'balance' => $policy->initial_days,
                'accrued_balance' => $policy->initial_days,
            ]);

            Log::info("PTO Balance updated for User ID {$policy->user_id}, PTO Type ID {$policy->pto_type_id}: {$policy->initial_days} days");
        } else {
            // Create new balance using correct field names
            PtoBalance::create([
                'user_id' => $policy->user_id,
                'pto_type_id' => $policy->pto_type_id,
                'balance' => $policy->initial_days,
                'pending_balance' => 0,
                'used_balance' => 0,
                'accrued_balance' => $policy->initial_days,
                'rollover_balance' => 0,
                'year' => now()->year,
            ]);

            Log::info("PTO Balance created for User ID {$policy->user_id}, PTO Type ID {$policy->pto_type_id}: {$policy->initial_days} days");
        }
    }
}
