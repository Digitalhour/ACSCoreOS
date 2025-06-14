<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmergencyContact;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;

class AdminEmergencyContactsController extends Controller
{
    public function index(Request $request)
    {
        $query = EmergencyContact::with('user')
            ->orderBy('created_at', 'desc');

        // Search functionality
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('relationship', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by primary contacts only
        if ($request->primary_only) {
            $query->where('is_primary', true);
        }

        $emergencyContacts = $query->paginate(50)->withQueryString();

        return Inertia::render('Admin/EmergencyContacts/Index', [
            'emergencyContacts' => $emergencyContacts,
            'filters' => $request->only(['search', 'primary_only']),
            'totalCount' => EmergencyContact::count(),
            'primaryCount' => EmergencyContact::where('is_primary', true)->count(),
        ]);
    }

    public function export(Request $request)
    {
        $query = EmergencyContact::with('user')
            ->orderBy('created_at', 'desc');

        // Apply same filters as index
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('relationship', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->primary_only) {
            $query->where('is_primary', true);
        }

        $contacts = $query->get();

        $filename = 'emergency_contacts_'.now()->format('Y-m-d_H-i-s').'.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($contacts) {
            $file = fopen('php://output', 'w');

            // CSV Headers
            fputcsv($file, [
                'ID',
                'User Name',
                'User Email',
                'Contact Name',
                'Relationship',
                'Phone',
                'Email',
                'Address',
                'Is Primary',
                'Created At',
                'Updated At'
            ]);

            // CSV Data
            foreach ($contacts as $contact) {
                fputcsv($file, [
                    $contact->id,
                    $contact->user->name,
                    $contact->user->email,
                    $contact->name,
                    $contact->relationship,
                    $contact->phone,
                    $contact->email ?: '',
                    $contact->address ?: '',
                    $contact->is_primary ? 'Yes' : 'No',
                    $contact->created_at->format('Y-m-d H:i:s'),
                    $contact->updated_at->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
