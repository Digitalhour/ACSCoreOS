<?php

namespace App\Http\Controllers;

use App\Models\DeviceAlias;
use App\Models\Vibetrack;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class DeviceAliasController extends Controller
{
    /**
     * Display the admin dashboard for managing device aliases.
     */
    public function index(): Response
    {
        // Fetch all existing aliases (active only)
        $aliases = DeviceAlias::query()
            ->orderBy('name')
            ->get()
            ->map(fn ($alias) => [
                'id' => $alias->id,
                'device_id' => $alias->device_id,
                'name' => $alias->name,
            ]);

        // Fetch soft-deleted aliases
        $deletedAliases = DeviceAlias::onlyTrashed()
            ->orderBy('name')
            ->get()
            ->map(fn ($alias) => [
                'id' => $alias->id,
                'device_id' => $alias->device_id,
                'name' => $alias->name,
                'deleted_at' => $alias->deleted_at,
            ]);

        // Get device IDs that already have active aliases
        $assignedDeviceIds = DeviceAlias::query()
            ->pluck('device_id')
            ->toArray();

        // Fetch all unique device IDs from the Vibetrack data, excluding those with existing aliases
        $deviceIds = Vibetrack::query()
            ->get()
            ->map(fn ($v) => $v->device_id)
            ->filter()
            ->unique()
            ->reject(fn ($deviceId) => in_array($deviceId, $assignedDeviceIds))
            ->sort()
            ->values();

        return Inertia::render('Vibetrack/Admin', [
            'aliases' => $aliases,
            'deletedAliases' => $deletedAliases,
            'deviceIds' => $deviceIds,
        ]);
    }

    /**
     * Store a new device alias.
     */
    public function store(Request $request)
    {
        $request->validate([
            'device_id' => 'required|string',
            'name' => 'required|string|max:255',
        ]);

        // Check if there's a soft-deleted record for this device_id
        $existingDeleted = DeviceAlias::onlyTrashed()
            ->where('device_id', $request->get('device_id'))
            ->first();

        if ($existingDeleted) {
            // Restore and update the soft-deleted record
            $existingDeleted->restore();
            $existingDeleted->update(['name' => $request->get('name')]);
        } else {
            // Check for existing active record and update, or create new
            DeviceAlias::query()->updateOrCreate(
                ['device_id' => $request->get('device_id')],
                ['name' => $request->get('name')]
            );
        }

        return Redirect::route('vibetrack.admin.index');
    }

    /**
     * Update an existing device alias.
     */
    public function update(Request $request, DeviceAlias $alias)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $alias->update([
            'name' => $request->get('name')
        ]);

        return Redirect::route('vibetrack.admin.index');
    }

    /**
     * Soft delete the specified device alias.
     */
    public function destroy(DeviceAlias $alias)
    {
        $alias->delete();

        return Redirect::route('vibetrack.admin.index');
    }

    /**
     * Restore a soft-deleted device alias.
     */
    public function restore($id)
    {
        $alias = DeviceAlias::onlyTrashed()->findOrFail($id);
        $alias->restore();

        return Redirect::route('vibetrack.admin.index');
    }
}
