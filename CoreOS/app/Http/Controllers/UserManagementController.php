<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Position;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoPolicy;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class UserManagementController extends Controller
{
    public function index()
    {
        return Inertia::render('UserManagement/Index');
    }

    public function onboard()
    {
        return Inertia::render('UserManagement/OnboardEmployee');
    }

    public function getWidgetToken(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'User not authenticated'], 401);
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('WORKOS_API_KEY'),
                'Content-Type' => 'application/json',
            ])->post('https://api.workos.com/widgets/token', [
                'user_id' => $user->workos_id ?? (string)$user->id,
                'organization_id' => env('WORKOS_ORGID') ?: null,
                'scopes' => ['widgets:users-table:manage'],
            ]);

            if (!$response->successful()) {
                \Log::error('WorkOS API error: ' . $response->body());
                return response()->json(['error' => 'Failed to get token from WorkOS'], 500);
            }

            $data = $response->json();
            return response()->json(['token' => $data['token']]);

        } catch (\Exception $e) {
            \Log::error('Widget token error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function deactivateUser(Request $request): RedirectResponse
    {
        $request->validate([
            'membership_id' => 'required|string'
        ]);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('WORKOS_API_KEY'),
            ])->put("https://api.workos.com/user_management/organization_memberships/{$request->membership_id}/deactivate");

            if (!$response->successful()) {
                \Log::error('Deactivate user error: ' . $response->body());
                return redirect()->back()->with('error', 'Failed to deactivate user.');
            }

            return redirect()->route('user-management.index')->with('success', 'User deactivated successfully.');

        } catch (\Exception $e) {
            \Log::error('Deactivate user error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'An error occurred.');
        }
    }

    public function reactivateUser(Request $request): RedirectResponse
    {
        $request->validate([
            'membership_id' => 'required|string'
        ]);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('WORKOS_API_KEY'),
            ])->put("https://api.workos.com/user_management/organization_memberships/{$request->membership_id}/reactivate");

            if (!$response->successful()) {
                \Log::error('Reactivate user error: ' . $response->body());
                return redirect()->back()->with('error', 'Failed to reactivate user.');
            }

            return redirect()->route('user-management.index')->with('success', 'User reactivated successfully.');

        } catch (\Exception $e) {
            \Log::error('Reactivate user error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'An error occurred.');
        }
    }

    public function getOrganizationUsers(): JsonResponse
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('WORKOS_API_KEY'),
            ])->get('https://api.workos.com/user_management/organization_memberships', [
                'organization_id' => env('WORKOS_ORGID'),
                'limit' => 100
            ]);

            if (!$response->successful()) {
                return response()->json(['error' => 'Failed to fetch users'], 500);
            }

            return response()->json($response->json());

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function inviteUserWithPto(Request $request): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'invite.email' => 'required|email',
            'invite.first_name' => 'required|string|max:255',
            'invite.last_name' => 'required|string|max:255',
            'invite.role' => 'required|string|in:member,admin',
            'invite.create_pto_policy' => 'boolean',
            'pto_policy.pto_type_id' => 'required_if:invite.create_pto_policy,true|exists:pto_types,id',
            'pto_policy.initial_days' => 'nullable|numeric|min:0|max:999.99',
            'pto_policy.annual_accrual_amount' => 'nullable|numeric|min:0|max:999.99',
            'pto_policy.accrual_frequency' => 'nullable|in:monthly,quarterly,annually',
            'pto_policy.effective_date' => 'required_if:invite.create_pto_policy,true|date',
            'pto_policy.rollover_enabled' => 'boolean',
            'pto_policy.max_rollover_days' => 'nullable|numeric|min:0|max:999.99',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        try {
            DB::beginTransaction();

            $inviteData = $request->input('invite');

            // ADD THIS LOG HERE


            // Send WorkOS invitation
            $workosResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('WORKOS_API_KEY'),
                'Content-Type' => 'application/json',
            ])->post('https://api.workos.com/user_management/invitations', [
                'email' => $inviteData['email'],
                'organization_id' => env('WORKOS_ORGID'),
                'expires_in_days' => 7,
                'inviter_user_id' => Auth::user()->workos_id ?? (string)Auth::id(),
                'role_slug' => $inviteData['role']
            ]);



            if (!$workosResponse->successful()) {
                DB::rollBack();
                return back()->with('error', 'Failed to send invitation');
            }

            $workosData = $workosResponse->json();

            // Create user in local database
            $user = User::firstOrCreate(
                ['email' => $inviteData['email']],
                [
                    'name' => $inviteData['first_name'] . ' ' . $inviteData['last_name'],
                    'workos_id' => 'inv_' . $workosData['id'],
                    'avatar' => null,
                ]
            );



            // Create PTO policy if requested
            if ($inviteData['create_pto_policy'] && $request->has('pto_policy')) {
                $ptoPolicyData = $request->input('pto_policy');
                $ptoType = PtoType::findOrFail($ptoPolicyData['pto_type_id']);

                PtoPolicy::create([
                    'name' => "{$inviteData['first_name']} {$inviteData['last_name']} - {$ptoType->name} Policy",
                    'description' => $ptoPolicyData['description'] ?? "Initial {$ptoType->name} policy",
                    'initial_days' => $ptoPolicyData['initial_days'] ?? 0,
                    'annual_accrual_amount' => $ptoPolicyData['annual_accrual_amount'] ?? 0,
                    'bonus_days_per_year' => $ptoPolicyData['bonus_days_per_year'] ?? 0,
                    'rollover_enabled' => $ptoPolicyData['rollover_enabled'] ?? false,
                    'max_rollover_days' => $ptoPolicyData['max_rollover_days'] ?? 0,
                    'max_negative_balance' => $ptoPolicyData['max_negative_balance'] ?? 0,
                    'years_for_bonus' => $ptoPolicyData['years_for_bonus'] ?? 1,
                    'accrual_frequency' => $ptoPolicyData['accrual_frequency'] ?? 'annually',
                    'prorate_first_year' => $ptoPolicyData['prorate_first_year'] ?? true,
                    'effective_date' => $ptoPolicyData['effective_date'],
                    'end_date' => $ptoPolicyData['end_date'] ?? null,
                    'pto_type_id' => $ptoPolicyData['pto_type_id'],
                    'user_id' => $user->id,
                    'is_active' => true,
                ]);

                // Create PTO balance if needed
                if ($ptoType->uses_balance) {
                    $existingBalance = PtoBalance::where('user_id', $user->id)
                        ->where('pto_type_id', $ptoPolicyData['pto_type_id'])
                        ->where('year', now()->year)
                        ->first();

                    if (!$existingBalance) {
                        PtoBalance::create([
                            'user_id' => $user->id,
                            'pto_type_id' => $ptoPolicyData['pto_type_id'],
                            'balance' => $ptoPolicyData['initial_days'] ?? 0,
                            'pending_balance' => 0,
                            'used_balance' => 0,
                            'year' => now()->year,
                        ]);
                    }
                }
            }

            DB::commit();

            $message = 'User invited successfully';
            if ($inviteData['create_pto_policy']) {
                $message .= ' with PTO policy';
            }

            // Simply return back with success message
            return back()->with('success', $message);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Invite error: ' . $e->getMessage());
            return back()->with('error', 'Failed to invite user');
        }
    }

    public function getPtoTypes(): JsonResponse
    {
        try {
            $ptoTypes = PtoType::active()
                ->ordered()
                ->get(['id', 'name', 'code', 'description', 'uses_balance']);

            return response()->json([
                'data' => $ptoTypes,
                'meta' => [
                    'total' => $ptoTypes->count()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching PTO types: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch PTO types.',
                'details' => 'An unexpected error occurred.'
            ], 500);
        }
    }

    public function getDepartments(): JsonResponse
    {
        try {
            $departments = Department::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'description']);

            return response()->json([
                'data' => $departments,
                'meta' => [
                    'total' => $departments->count()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching departments: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch departments.',
                'details' => 'An unexpected error occurred.'
            ], 500);
        }
    }

    public function getPositions(): JsonResponse
    {
        try {
            $positions = Position::orderBy('name')
                ->get(['id', 'name']);

            return response()->json([
                'data' => $positions,
                'meta' => [
                    'total' => $positions->count()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching positions: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch positions.',
                'details' => 'An unexpected error occurred.'
            ], 500);
        }
    }

    public function continueSetup($userId)
    {
        try {
            $user = User::findOrFail($userId);

            Log::info('Continue setup page loaded for user', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_email' => $user->email
            ]);

            // Render a dedicated continue setup page instead of the main index
            return Inertia::render('UserManagement/ContinueSetup', [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error loading continue setup page: ' . $e->getMessage());
            return redirect()->route('user-management.index')->with('error', 'User not found.');
        }
    }

    public function getManagers(Request $request): JsonResponse
    {
        try {
            $query = User::whereNotNull('position_id')
                ->orderBy('name');

            // Exclude specific user if provided (e.g., current user who can't be their own manager)
            if ($request->filled('exclude_user_id')) {
                $query->where('id', '!=', $request->input('exclude_user_id'));
            }

            $managers = $query->get(['id', 'name', 'email']);

            return response()->json([
                'data' => $managers,
                'meta' => [
                    'total' => $managers->count()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching managers: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch managers.',
                'details' => 'An unexpected error occurred.'
            ], 500);
        }
    }

    public function getDepartmentUsers($departmentId): JsonResponse
    {
        try {
            $department = Department::findOrFail($departmentId);
            $users = $department->users()->get(['id', 'name', 'email']);

            return response()->json([
                'data' => $users,
                'meta' => [
                    'total' => $users->count(),
                    'department_id' => $departmentId
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching department users: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch department users.',
                'details' => 'An unexpected error occurred.'
            ], 500);
        }
    }

    public function getUserByEmail(Request $request): JsonResponse
    {
        try {
            $email = $request->query('email');

            if (!$email) {
                return response()->json(['error' => 'Email required'], 400);
            }

            $user = User::where('email', $email)->first();

            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching user by email: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch user'], 500);
        }
    }
}
