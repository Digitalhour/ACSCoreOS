<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AddressesController extends Controller
{
    /**
     * Display the addresses page.
     */
    public function index()
    {
        $user = auth()->user();

        $addresses = $user->addresses()
            ->orderBy('is_primary', 'desc')
            ->orderBy('type')
            ->orderBy('created_at')
            ->get()
            ->map(function ($address) {
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
                    'created_at' => $address->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $address->updated_at->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('settings/addresses', [
            'addresses' => $addresses
        ]);
    }

    /**
     * Store a new address.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'max:255'],
            'label' => ['nullable', 'string', 'max:255'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'state' => ['required', 'string', 'max:255'],
            'postal_code' => ['required', 'string', 'max:20'],
            'country' => ['required', 'string', 'max:255'],
            'is_primary' => ['boolean'],
            'is_active' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $validated['user_id'] = auth()->id();

        // If this is the first address, make it primary
        if (!auth()->user()->addresses()->exists()) {
            $validated['is_primary'] = true;
        }

        Address::create($validated);

        return back()->with('success', 'Address added successfully.');
    }

    /**
     * Update an existing address.
     */
    public function update(Request $request, Address $address)
    {
        // Ensure the address belongs to the authenticated user
        if ($address->user_id !== auth()->id()) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'type' => ['required', 'string', 'max:255'],
            'label' => ['nullable', 'string', 'max:255'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'state' => ['required', 'string', 'max:255'],
            'postal_code' => ['required', 'string', 'max:20'],
            'country' => ['required', 'string', 'max:255'],
            'is_primary' => ['boolean'],
            'is_active' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $address->update($validated);

        return back()->with('success', 'Address updated successfully.');
    }

    /**
     * Delete an address.
     */
    public function destroy(Address $address)
    {
        // Ensure the address belongs to the authenticated user
        if ($address->user_id !== auth()->id()) {
            abort(403, 'Unauthorized action.');
        }

        // If this is the primary address, make another address primary
        if ($address->is_primary) {
            $nextAddress = auth()->user()->addresses()
                ->where('id', '!=', $address->id)
                ->where('is_active', true)
                ->first();

            if ($nextAddress) {
                $nextAddress->update(['is_primary' => true]);
            }
        }

        $address->delete();

        return back()->with('success', 'Address deleted successfully.');
    }

    /**
     * Set an address as primary.
     */
    public function setPrimary(Address $address)
    {
        // Ensure the address belongs to the authenticated user
        if ($address->user_id !== auth()->id()) {
            abort(403, 'Unauthorized action.');
        }

        $address->update(['is_primary' => true]);

        return back()->with('success', 'Primary address updated successfully.');
    }

    /**
     * Toggle address active status.
     */
    public function toggleActive(Address $address)
    {
        // Ensure the address belongs to the authenticated user
        if ($address->user_id !== auth()->id()) {
            abort(403, 'Unauthorized action.');
        }

        $address->update(['is_active' => !$address->is_active]);

        $status = $address->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "Address {$status} successfully.");
    }
}
