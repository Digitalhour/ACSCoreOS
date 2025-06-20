<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class UserManagementController extends Controller
{
    public function index()
    {
        return Inertia::render('UserManagement/Index');
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
}
