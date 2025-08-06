<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RolesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            'Human Resources Employee',
            'Inside Sales Rep',
            'Inside Sales Manager',
            'Field Sales Rep',
            'Sales Executive',
            'Warehouse Employee',
            'Warehouse Manager',
            'Warehouse Intern',
            'Warehouse Contractor',
            'Finance Executive',
            'Finance Employee',
            'Purchasing Manager',
            'Product Manager',
            'Product Development Employee',
            'Product Development Intern',
            'Product Development Contractor',
            'Customer Support Rep',
            'Customer Support Manager',
            'Sales Support Employee',
            'Marketing Executive',
            'Marketing Employee',
            'Marketing Intern',
            'Service Executive',
            'Service Support Employee',
            'Service Technician',
            'Service Contractor',
            'Engineer',
            'Technology Executive',
            'Developer',
            'Sales Operations Specialist',
            'Revenue Operations Specialist',
            'Data Architect',
            'COO',
            'CEO',
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate([
                'name' => $role,
                'guard_name' => 'web'
            ]);
        }

        $this->command->info('Roles created successfully!');
    }
}
