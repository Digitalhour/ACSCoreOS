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
            'Human Resources Employees',
            'Inside Sales Rep',
            'Inside Sales Manager',
            'Field Sales Rep',
            'Sales Executive',
            'Warehouse Employees',
            'Warehouse Manager',
            'Warehouse Intern',
            'Warehouse Contractor',
            'Finance Executive',
            'Finance Employees',
            'Purchasing Manager',
            'Product Manager',
            'Product Development Employees',
            'Product Development Intern',
            'Product Development Contractor',
            'Customer Support Rep',
            'Customer Support Manager',
            'Sales Support Employees',
            'Marketing Executive',
            'Marketing Employees',
            'Marketing Intern',
            'Service Executive',
            'Service Support Employees',
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
