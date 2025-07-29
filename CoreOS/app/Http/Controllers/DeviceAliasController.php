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
        // Fetch all existing aliases
        $aliases = DeviceAlias::query()
            ->orderBy('name')
            ->get()
            ->map(fn ($alias) => [
                'id' => $alias->id,
                'device_id' => $alias->device_id,
                'name' => $alias->name,
            ]);

        // Fetch all unique device IDs from the Vibetrack data
        $deviceIds = Vibetrack::query()
            ->get()
            ->map(fn ($v) => $v->device_id)
            ->filter()
            ->unique()
            ->sort()
            ->values();

        return Inertia::render('Vibetrack/Admin', [
            'aliases' => $aliases,
            'deviceIds' => $deviceIds,
        ]);
    }

    /**
     * Store a new or updated device alias.
     */
    public function store(Request $request)
    {
        $request->validate([
            'device_id' => 'required|string',
            'name' => 'required|string|max:255',
        ]);

        DeviceAlias::query()->updateOrCreate(
            ['device_id' => $request->get('device_id')],
            ['name' => $request->get('name')]
        );

        return Redirect::route('vibetrack.admin.index');
    }

    /**
     * Remove the specified device alias.
     */
    public function destroy(DeviceAlias $alias)
    {
        $alias->delete();

        return Redirect::route('vibetrack.admin.index');
    }
}
