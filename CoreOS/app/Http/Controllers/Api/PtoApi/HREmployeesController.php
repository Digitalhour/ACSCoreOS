<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class HREmployeesController extends Controller
{
    public function index()
    {
        $users = User::withTrashed()
            ->with([
                'departments',
                'emergencyContacts',
                'currentPosition',
                'addresses', // Add this line
                'ptoRequests.ptoType',
                'ptoRequests.approvedBy',
                'ptoRequests.deniedBy',
                'ptoBalances.ptoType',
                'roles.permissions'
            ])
            ->get()
            ->map(function ($user) {
                $ptoRequests = $user->ptoRequests;
                $ptoStats = [
                    'total' => $ptoRequests->count(),
                    'pending' => $ptoRequests->where('status', 'pending')->count(),
                    'approved' => $ptoRequests->where('status', 'approved')->count(),
                    'denied' => $ptoRequests->where('status', 'denied')->count(),
                    'cancelled' => $ptoRequests->where('status', 'cancelled')->count(),
                ];

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'deleted_at' => $user->deleted_at?->toISOString(),
                    'departments' => $user->departments->pluck('name')->join(', ') ?: 'No Department',
                    'position' => $user->currentPosition?->name ?? 'No Position',
                    'roles' => $user->roles->map(function($role) {
                        return [
                            'id' => $role->id,
                            'name' => $role->name,
                            'permissions' => $role->permissions->pluck('name')->toArray(),
                        ];
                    }),
                    'all_permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
                    'pto_stats' => $ptoStats,
                    'emergency_contacts' => $user->emergencyContacts->map(function($contact) {
                        return [
                            'id' => $contact->id,
                            'name' => $contact->name,
                            'relationship' => $contact->relationship,
                            'phone' => $contact->phone,
                            'email' => $contact->email,
                            'address' => $contact->address,
                            'is_primary' => $contact->is_primary,
                        ];
                    }),
                    'addresses' => $user->addresses->map(function($address) {
                        return [
                            'id' => $address->id,
                            'type' => $address->type,
                            'label' => $address->label,
                            'address_line_1' => $address->address_line_1,
                            'address_line_2' => $address->address_line_2,
                            'city' => $address->city,
                            'state' => $address->state,
                            'postal_code' => $address->postal_code,
                            'country' => $address->country,
                            'is_primary' => $address->is_primary,
                            'is_active' => $address->is_active,
                            'notes' => $address->notes,
                            'full_address' => $address->full_address,
                            'single_line_address' => $address->single_line_address,
                        ];
                    }),
                    'pto_balances' => $user->ptoBalances->map(function($balance) {
                        return [
                            'id' => $balance->id,
                            'type' => $balance->ptoType->name ?? 'Unknown Type',
                            'balance' => (float) $balance->balance,
                            'used_balance' => (float) $balance->used_balance,
                            'pending_balance' => (float) $balance->pending_balance,
                            'year' => $balance->year,
                        ];
                    }),
                    'pto_requests' => $user->ptoRequests->map(function($request) {
                        return [
                            'id' => $request->id,
                            'request_number' => $request->request_number,
                            'pto_type' => $request->ptoType->name ?? 'Unknown Type',
                            'start_date' => $request->start_date->format('Y-m-d'),
                            'end_date' => $request->end_date->format('Y-m-d'),
                            'total_days' => (float) $request->total_days,
                            'status' => $request->status,
                            'reason' => $request->reason,
                            'approval_notes' => $request->approval_notes,
                            'denial_reason' => $request->denial_reason,
                            'approved_by' => $request->approvedBy?->name,
                            'denied_by' => $request->deniedBy?->name,
                            'created_at' => $request->created_at->format('Y-m-d H:i:s'),
                            'approved_at' => $request->approved_at?->format('Y-m-d H:i:s'),
                            'denied_at' => $request->denied_at?->format('Y-m-d H:i:s'),
                            'has_blackout_conflicts' => method_exists($request, 'hasBlackoutConflicts') ? $request->hasBlackoutConflicts() : false,
                            'has_blackout_warnings' => method_exists($request, 'hasBlackoutWarnings') ? $request->hasBlackoutWarnings() : false,
                            'blackouts' => $this->getFormattedBlackouts($request),
                        ];
                    }),
                ];
            });

        return Inertia::render('human-resources/employees', [
            'users' => $users
        ]);
    }

    public function destroy(User $user)
    {
        // First deactivate in WorkOS
        $this->deactivateUserInWorkOS($user);

        // Then soft delete locally
        $user->delete();

        return back()->with('success', 'Employee has been deactivated successfully.');
    }

    public function restore($id)
    {
        $user = User::withTrashed()->findOrFail($id);

        // First reactivate in WorkOS
        $this->reactivateUserInWorkOS($user);

        // Then restore locally
        $user->restore();

        return back()->with('success', 'Employee has been activated successfully.');
    }

    private function deactivateUserInWorkOS(User $user)
    {
        try {
            // Get user's organization membership
            $membershipResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('WORKOS_API_KEY'),
            ])->get('https://api.workos.com/user_management/organization_memberships', [
                'user_id' => $user->workos_id ?? $user->id,
                'organization_id' => env('WORKOS_ORGID'),
            ]);

            if ($membershipResponse->successful()) {
                $memberships = $membershipResponse->json()['data'] ?? [];

                foreach ($memberships as $membership) {
                    if ($membership['status'] === 'active') {
                        Http::withHeaders([
                            'Authorization' => 'Bearer ' . env('WORKOS_API_KEY'),
                        ])->put("https://api.workos.com/user_management/organization_memberships/{$membership['id']}/deactivate");
                    }
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to deactivate user in WorkOS: ' . $e->getMessage());
        }
    }

    private function reactivateUserInWorkOS(User $user)
    {
        try {
            // Get user's organization membership
            $membershipResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('WORKOS_API_KEY'),
            ])->get('https://api.workos.com/user_management/organization_memberships', [
                'user_id' => $user->workos_id ?? $user->id,
                'organization_id' => env('WORKOS_ORGID'),
                'statuses' => ['inactive'], // Only get inactive memberships
            ]);

            if ($membershipResponse->successful()) {
                $memberships = $membershipResponse->json()['data'] ?? [];

                foreach ($memberships as $membership) {
                    if ($membership['status'] === 'inactive') {
                        Http::withHeaders([
                            'Authorization' => 'Bearer ' . env('WORKOS_API_KEY'),
                        ])->put("https://api.workos.com/user_management/organization_memberships/{$membership['id']}/reactivate");
                    }
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to reactivate user in WorkOS: ' . $e->getMessage());
        }
    }

    private function getFormattedBlackouts($request)
    {
        $allBlackouts = [];

        if (method_exists($request, 'hasBlackoutConflicts') && $request->hasBlackoutConflicts()) {
            if (method_exists($request, 'getFormattedBlackoutConflicts')) {
                foreach ($request->getFormattedBlackoutConflicts() as $conflict) {
                    $allBlackouts[] = array_merge($conflict, ['type' => 'conflict']);
                }
            }
        }

        if (method_exists($request, 'hasBlackoutWarnings') && $request->hasBlackoutWarnings()) {
            if (method_exists($request, 'getFormattedBlackoutWarnings')) {
                foreach ($request->getFormattedBlackoutWarnings() as $warning) {
                    $allBlackouts[] = array_merge($warning, ['type' => 'warning']);
                }
            }
        }

        return $allBlackouts;
    }
}
