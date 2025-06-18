<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\EmergencyContact;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmergencyContactsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('settings/EmergencyContacts', [
            'emergencyContacts' => auth()->user()->emergencyContacts()
                ->orderBy('is_primary', 'desc')
                ->orderBy('created_at', 'desc')
                ->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'relationship' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'is_primary' => 'boolean',
        ]);

        auth()->user()->emergencyContacts()->create($validated);

        return redirect()->back()->with('success', 'Emergency contact added successfully.');
    }

    public function update(Request $request, EmergencyContact $emergencyContact)
    {
        if ($emergencyContact->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'relationship' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'is_primary' => 'boolean',
        ]);

        $emergencyContact->update($validated);

        return redirect()->back()->with('success', 'Emergency contact updated successfully.');
    }

    public function destroy(EmergencyContact $emergencyContact)
    {
        if ($emergencyContact->user_id !== auth()->id()) {
            abort(403);
        }

        $emergencyContact->delete();

        return redirect()->back()->with('success', 'Emergency contact removed successfully.');
    }
}
