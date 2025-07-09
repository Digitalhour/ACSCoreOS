<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BreakTypesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $breakTypes = [
            [
                'name' => 'lunch',
                'label' => 'Lunch Break',
                'description' => 'Standard lunch break',
                'is_paid' => false,
                'max_duration_minutes' => 60,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'personal',
                'label' => 'Personal Break',
                'description' => 'Personal time break',
                'is_paid' => true,
                'max_duration_minutes' => 15,
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'extended',
                'label' => 'Extended Break',
                'description' => 'Extended time break',
                'is_paid' => false,
                'max_duration_minutes' => 120,
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'medical',
                'label' => 'Medical Break',
                'description' => 'Medical/health related break',
                'is_paid' => true,
                'max_duration_minutes' => null,
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'other',
                'label' => 'Other',
                'description' => 'Other type of break',
                'is_paid' => false,
                'max_duration_minutes' => null,
                'is_active' => true,
                'sort_order' => 5,
            ],
        ];

        foreach ($breakTypes as $breakType) {
            DB::table('break_types')->insert([
                ...$breakType,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
