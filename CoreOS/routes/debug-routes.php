<?php

use App\Models\PtoModels\PtoType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Route to update all PTO types to be active
Route::get('/debug/activate-pto-types', function () {
    // Get count of inactive PTO types before update
    $inactiveCount = PtoType::where('is_active', false)->count();

    // Update all PTO types to be active
    $updated = PtoType::where('is_active', false)->update(['is_active' => true]);

    return "Updated $updated PTO types to be active. There were $inactiveCount inactive PTO types before the update.";
});

Route::get('/debug/pto-types', function () {
    // Get all PTO types
    $ptoTypes = PtoType::withTrashed()->get();

    // Count active and inactive PTO types
    $activePtoTypes = $ptoTypes->where('is_active', true);
    $inactivePtoTypes = $ptoTypes->where('is_active', false);
    $trashedPtoTypes = $ptoTypes->whereNotNull('deleted_at');

    // Display the results
    echo "Total PTO Types: " . $ptoTypes->count() . "<br>";
    echo "Active PTO Types: " . $activePtoTypes->count() . "<br>";
    echo "Inactive PTO Types: " . $inactivePtoTypes->count() . "<br>";
    echo "Trashed PTO Types: " . $trashedPtoTypes->count() . "<br>";

    echo "<h3>Active PTO Types:</h3>";
    echo "<ul>";
    foreach ($activePtoTypes as $ptoType) {
        echo "<li>ID: {$ptoType->id}, Name: {$ptoType->name}, Code: {$ptoType->code}, Deleted: " . ($ptoType->deleted_at ? 'Yes' : 'No') . "</li>";
    }
    echo "</ul>";

    echo "<h3>Inactive PTO Types:</h3>";
    echo "<ul>";
    foreach ($inactivePtoTypes as $ptoType) {
        echo "<li>ID: {$ptoType->id}, Name: {$ptoType->name}, Code: {$ptoType->code}, Deleted: " . ($ptoType->deleted_at ? 'Yes' : 'No') . "</li>";
    }
    echo "</ul>";

    // Now check without the trashed items
    $nonTrashedPtoTypes = PtoType::all();
    $activeNonTrashedPtoTypes = $nonTrashedPtoTypes->where('is_active', true);
    $inactiveNonTrashedPtoTypes = $nonTrashedPtoTypes->where('is_active', false);

    echo "<h3>Non-Trashed PTO Types:</h3>";
    echo "Total Non-Trashed PTO Types: " . $nonTrashedPtoTypes->count() . "<br>";
    echo "Active Non-Trashed PTO Types: " . $activeNonTrashedPtoTypes->count() . "<br>";
    echo "Inactive Non-Trashed PTO Types: " . $inactiveNonTrashedPtoTypes->count() . "<br>";

    echo "<h3>Active Non-Trashed PTO Types:</h3>";
    echo "<ul>";
    foreach ($activeNonTrashedPtoTypes as $ptoType) {
        echo "<li>ID: {$ptoType->id}, Name: {$ptoType->name}, Code: {$ptoType->code}</li>";
    }
    echo "</ul>";

    echo "<h3>Inactive Non-Trashed PTO Types:</h3>";
    echo "<ul>";
    foreach ($inactiveNonTrashedPtoTypes as $ptoType) {
        echo "<li>ID: {$ptoType->id}, Name: {$ptoType->name}, Code: {$ptoType->code}</li>";
    }
    echo "</ul>";

    // Check the raw database values
    echo "<h3>Raw Database Values:</h3>";
    $rawPtoTypes = \DB::table('pto_types')->get();
    echo "<ul>";
    foreach ($rawPtoTypes as $ptoType) {
        echo "<li>ID: {$ptoType->id}, Name: {$ptoType->name}, Code: {$ptoType->code}, is_active: {$ptoType->is_active}, deleted_at: " . ($ptoType->deleted_at ?? 'NULL') . "</li>";
    }
    echo "</ul>";

    return '';
});
