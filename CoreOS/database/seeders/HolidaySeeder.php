<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Holiday;
use Carbon\Carbon;

class HolidaySeeder extends Seeder
{
    public function run(): void
    {
        $currentYear = now()->year;

        $holidays = [
            [
                'name' => 'New Year\'s Day',
                'date' => Carbon::create($currentYear, 1, 1),
                'description' => 'First day of the year',
                'type' => 'public',
                'is_recurring' => true,
            ],
            [
                'name' => 'Independence Day',
                'date' => Carbon::create($currentYear, 7, 4),
                'description' => 'Celebrating American independence',
                'type' => 'public',
                'is_recurring' => true,
            ],
            [
                'name' => 'Christmas Day',
                'date' => Carbon::create($currentYear, 12, 25),
                'description' => 'Christmas celebration',
                'type' => 'public',
                'is_recurring' => true,
            ],
            [
                'name' => 'Company Founding Day',
                'date' => Carbon::create($currentYear, 3, 15),
                'description' => 'Anniversary of company founding',
                'type' => 'company',
                'is_recurring' => true,
            ],
            [
                'name' => 'Summer Break',
                'date' => Carbon::create($currentYear, 8, 15),
                'description' => 'Company summer break',
                'type' => 'company',
                'is_recurring' => false,
            ],
        ];

        foreach ($holidays as $holiday) {
            Holiday::create($holiday);
        }
    }
}
