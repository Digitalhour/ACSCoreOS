<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;

class HREmployeesController extends Controller
{
    public function index()
    {
        $users = User::with([
            'departments',
            'emergencyContacts',
            'currentPosition',
            'ptoRequests.ptoType',
            'ptoRequests.approvedBy',
            'ptoRequests.deniedBy',
            'ptoBalances.ptoType',
            'roles.permissions'
        ])
            ->get()
            ->map(function ($user) {
                // Calculate PTO stats from the loaded requests
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
                        ];
                    }),
                ];
            });

        return Inertia::render('human-resources/employees', [
            'users' => $users
        ]);
    }
}
