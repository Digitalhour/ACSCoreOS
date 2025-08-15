<?php

namespace App\Http\Controllers;

use App\Models\DeviceAlias;
use App\Models\Vibetrack;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class VibetrackController extends Controller
{
    private function mapVibetrackData(Vibetrack $vibetrack, $name = null)
    {
        $json = $vibetrack->json ?? [];

        // Extract runtime data from JSON if available, otherwise use database columns
        $startTime = $json['start_time'] ?? $vibetrack->start_time;
        $stopTime = $json['stop_time'] ?? $vibetrack->stop_time;
        $runtimeSec = $json['runtime_sec'] ?? $vibetrack->runtime_seconds;

        return [
            'id' => $vibetrack->id,
            'device_id' => $vibetrack->device_id,
            'name' => $name,
            'is_runtime_data' => $vibetrack->is_runtime_data,
            'is_status_data' => $vibetrack->is_status_data,
            'signal_strength' => $vibetrack->signal_strength,
            'device_type' => $vibetrack->device_type,
            'start_time' => $startTime, // This will be in milliseconds from JSON
            'stop_time' => $stopTime,   // This will be in milliseconds from JSON
            'runtime_seconds' => $runtimeSec,
            'runtime_minutes' => $runtimeSec ? round($runtimeSec / 60, 2) : null,
            'battery_voltage' => $vibetrack->battery_voltage,
            'battery_soc' => $vibetrack->battery_soc,
            'temperature' => $vibetrack->temperature,
            'hum' => $vibetrack->humidity,
            'json' => $vibetrack->json,
            'created_at' => $vibetrack->created_at->toISOString(),
            'updated_at' => $vibetrack->updated_at->toISOString(),
        ];
    }

    public function index(Request $request): Response
    {
        // This subquery finds the latest 'id' for each unique device ID from status messages.
        // This runs on the 'coreold' connection because it's part of the Vibetrack query.
        $latestStatusIdsSubquery = Vibetrack::query()
            ->selectRaw('max(id) as id')
            ->whereNotNull('json->modem->device_id')
            ->groupBy(DB::raw("json_unquote(json_extract(`json`, '$.\"modem\".\"device_id\"'))"));

        $query = Vibetrack::query()
            ->joinSub($latestStatusIdsSubquery, 'latest_vibes', function ($join) {
                $join->on('Vibetrack.id', '=', 'latest_vibes.id');
            });

        // Handle search filter, which might involve a separate query to the default DB
        if ($request->filled('search')) {
            $search = $request->get('search');

            // Find device IDs from aliases that match the search term.
            // This query runs on the default connection because it uses the DeviceAlias model.
            $aliasedDeviceIds = DeviceAlias::query()
                ->where('name', 'like', "%{$search}%")
                ->pluck('device_id')
                ->toArray();

            $query->where(function ($q) use ($search, $aliasedDeviceIds) {
                // Search the device ID in the JSON
                $q->where(DB::raw("json_unquote(json_extract(`json`, '$.\"modem\".\"device_id\"'))"), 'like', "%{$search}%");
                // Also include results where the name matched in the other database
                if (!empty($aliasedDeviceIds)) {
                    $q->orWhereIn(DB::raw("json_unquote(json_extract(`json`, '$.\"modem\".\"device_id\"'))"), $aliasedDeviceIds);
                }
            });
        }

        // Apply date filters
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->get('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->get('date_to'));
        }

        // Paginate the results from the 'coreold' connection
        $devices = $query->latest('created_at')->paginate(24);

        // Now that we have the paginated devices, get their IDs
        $deviceIdsOnPage = $devices->map(fn ($device) => $device->device_id)->filter()->unique()->values();

        // Fetch the aliases for ONLY the devices on the current page.
        // This runs on the default connection.
        $aliases = collect();
        if ($deviceIdsOnPage->isNotEmpty()) {
            $aliases = DeviceAlias::query()
                ->whereIn('device_id', $deviceIdsOnPage)
                ->pluck('name', 'device_id'); // Creates a map of [device_id => name]
        }

        // Manually add the 'name' to each device object before passing to the view.
        $mappedDevices = $devices->through(function ($device) use ($aliases) {
            $name = $aliases->get($device->device_id);
            return $this->mapVibetrackData($device, $name);
        });

        return Inertia::render('Vibetrack/Index', [
            'devices' => $mappedDevices,
            'filters' => $request->only(['search', 'date_from', 'date_to']),
        ]);
    }

    public function show(Vibetrack $vibetrack): Response
    {
        $deviceId = $vibetrack->device_id;
        $alias = $deviceId ? DeviceAlias::where('device_id', $deviceId)->first() : null;

        if (!$deviceId) {
            return Inertia::render('Vibetrack/Show', [
                'vibetrack' => $this->mapVibetrackData($vibetrack),
                'runtimeHistory' => [],
                'statusHistory' => [],
            ]);
        }

        $history = Vibetrack::query()
            ->where(function ($query) use ($deviceId) {
                $query->where('json->device_id', $deviceId)
                    ->orWhere('json->modem->device_id', $deviceId);
            })
            ->orderBy('created_at', 'asc')
            ->get();

        $runtimeHistory = $history
            ->filter(fn ($item) => $item->is_runtime_data)
            ->map(fn ($item) => [
                'runtime_sec' => $item->json['runtime_sec'] ?? $item->runtime_seconds,
                'start_time' => $item->json['start_time'] ?? $item->start_time,
                'stop_time' => $item->json['stop_time'] ?? $item->stop_time,
                'created_at' => $item->created_at->toIso8601String(),
            ])->values();

        $statusHistory = $history
            ->filter(fn ($item) => $item->is_status_data)
            ->map(fn ($item) => [
                'battery_soc' => $item->battery_soc,
                'temperature' => $item->temperature,
                'signal_strength' => $item->signal_strength,
                'sht4x_temp' => $item->json['sht4x']['temp'] ?? null,
                'sht4x_humidity' => $item->json['sht4x']['hum'] ?? null,
                'modem_temp' => $item->json['modem']['temp'] ?? null,
                'created_at' => $item->created_at->toIso8601String(),
            ])->values();

        $latestStatusRecord = $history->filter(fn($item) => $item->is_status_data)->last();
        $displayRecord = $latestStatusRecord ?: $vibetrack;

        return Inertia::render('Vibetrack/Show', [
            'vibetrack' => $this->mapVibetrackData($displayRecord, $alias?->name),
            'runtimeHistory' => $runtimeHistory,
            'statusHistory' => $statusHistory,
        ]);
    }

    public function getVibetrackDeviceData(string $vibetrack)
    {
        $deviceId = $vibetrack;
        $alias = DeviceAlias::where('device_id', $deviceId)->first();

        // Get all data for this device
        $allData = Vibetrack::query()
            ->where(function ($query) use ($deviceId) {
                $query->where('json->device_id', $deviceId)
                    ->orWhere('json->modem->device_id', $deviceId);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        if ($allData->isEmpty()) {
            return response()->json([
                'error' => 'Device not found',
            ], 404);
        }

        // Separate runtime and status data based on JSON structure
        $statusData = $allData->filter(function ($item) {
            $json = $item->json;
            return isset($json['modem']) || isset($json['battery']) || isset($json['sht4x']);
        });

        $runtimeData = $allData->filter(function ($item) {
            $json = $item->json;
            return isset($json['start_time']) || isset($json['stop_time']) || isset($json['runtime_sec']);
        });

        // Get the latest status data
        $latestStatus = $statusData->first() ?: $allData->first();

        // Build runtime history - use JSON values consistently
        $runtimeHistory = $runtimeData->map(function ($item) {
            $json = $item->json;
            return [
                'runtime_sec' => $json['runtime_sec'] ?? null,
                'start_time' => $json['start_time'] ?? null, // Already in milliseconds
                'stop_time' => $json['stop_time'] ?? null,   // Already in milliseconds
                'created_at' => $item->created_at->toIso8601String(),
            ];
        })->values();

        // Build status history
        $statusHistory = $statusData->map(function ($item) {
            $json = $item->json;
            return [
                'battery_soc' => $json['battery']['SoC'] ?? null,
                'temperature' => $json['sht4x']['temp'] ?? $json['modem']['temp'] ?? null,
                'signal_strength' => $json['modem']['rssi_dBm'] ?? null,
                'sht4x_temp' => $json['sht4x']['temp'] ?? null,
                'sht4x_humidity' => $json['sht4x']['hum'] ?? null,
                'modem_temp' => $json['modem']['temp'] ?? null,
                'created_at' => $item->created_at->toIso8601String(),
            ];
        })->values();

        return response()->json([
            'vibetrack' => $this->mapVibetrackData($latestStatus, $alias?->name),
            'runtimeHistory' => $runtimeHistory,
            'statusHistory' => $statusHistory,
        ]);
    }
}
