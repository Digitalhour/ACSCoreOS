<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OvertimeRulesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $overtimeRules = [
            [
                'name' => 'Standard Daily Overtime',
                'description' => 'Overtime after 8 hours per day',
                'type' => 'daily',
                'daily_threshold' => 8.00,
                'weekly_threshold' => null,
                'multiplier' => 1.5,
                'priority' => 1,
                'is_active' => true,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'conditions' => null,
            ],
            [
                'name' => 'Standard Weekly Overtime',
                'description' => 'Overtime after 40 hours per week',
                'type' => 'weekly',
                'daily_threshold' => null,
                'weekly_threshold' => 40.00,
                'multiplier' => 1.5,
                'priority' => 2,
                'is_active' => true,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'conditions' => null,
            ],
            [
                'name' => 'Double Time Daily',
                'description' => 'Double time after 12 hours per day',
                'type' => 'daily',
                'daily_threshold' => 12.00,
                'weekly_threshold' => null,
                'multiplier' => 2.0,
                'priority' => 3,
                'is_active' => false, // Disabled by default
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'conditions' => null,
            ],
        ];

        foreach ($overtimeRules as $rule) {
            DB::table('overtime_rules')->insert([
                ...$rule,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
