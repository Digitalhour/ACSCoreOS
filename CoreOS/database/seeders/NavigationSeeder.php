<?php

namespace Database\Seeders;

use App\Models\NavigationItem;
use Illuminate\Database\Seeder;

class NavigationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing navigation items
        NavigationItem::truncate();

        // Header Navigation Items
        $headerItems = [
            [
                'title' => 'Dashboard',
                'href' => '/dashboard',
                'icon' => 'LayoutDashboard',
                'type' => 'header',
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'title' => 'Billy The AI',
                'href' => '/billy',
                'icon' => 'BotMessageSquareIcon',
                'type' => 'header',
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'title' => 'My Time Clock',
                'href' => '/time-clock/employee',
                'icon' => 'BookOpenText',
                'type' => 'header',
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'title' => 'My PTO',
                'href' => '/employee/pto',
                'icon' => 'ShipWheel',
                'type' => 'header',
                'sort_order' => 4,
                'is_active' => true,
            ],
            [
                'title' => 'ACS Org',
                'href' => '/organization-chart',
                'icon' => 'Users',
                'type' => 'header',
                'sort_order' => 5,
                'is_active' => true,
            ],
            [
                'title' => 'ACS Parts Database',
                'href' => '/parts-catalog',
                'icon' => 'Cog',
                'type' => 'header',
                'sort_order' => 6,
                'is_active' => true,
            ],
            [
                'title' => 'ACS Wiki',
                'href' => '/wiki',
                'icon' => 'BookOpenText',
                'type' => 'header',
                'sort_order' => 7,
                'is_active' => true,
            ],
        ];

        // Create header items
        foreach ($headerItems as $item) {
            NavigationItem::create($item);
        }

        // Footer Navigation Items
        $footerItems = [
            [
                'title' => 'HR Dashboard',
                'href' => '/hr/dashboard',
                'icon' => 'Users',
                'type' => 'footer',
                'sort_order' => 1,
                'roles' => ['Human Resources Employee', 'Developer'],
                'is_active' => true,
            ],
            [
                'title' => 'Admin Dashboard',
                'href' => '/admin',
                'icon' => 'ShieldCheck',
                'type' => 'footer',
                'sort_order' => 2,
                'is_active' => true,
            ],
        ];

        // Create footer items
        foreach ($footerItems as $item) {
            NavigationItem::create($item);
        }

        // Category Navigation Items with Children
        $categories = [
            [
                'category' => [
                    'title' => 'Time PTO Management',
                    'href' => '#',
                    'icon' => 'Clock',
                    'type' => 'category',
                    'sort_order' => 1,
                    'roles' => ['Developer'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Department PTO',
                        'href' => '/department-pto',
                        'icon' => 'Users',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Timesheet Manager Dash',
                        'href' => '/time-clock/manager/dashboard',
                        'icon' => 'BookOpenText',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Time & PTO Payroll',
                    'href' => '#',
                    'icon' => 'DollarSign',
                    'type' => 'category',
                    'sort_order' => 2,
                    'roles' => ['Developer'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Timesheet Payroll Dash',
                        'href' => '/time-clock/payroll/dashboard',
                        'icon' => 'BookOpenText',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Human Resources',
                    'href' => '#',
                    'icon' => 'Users',
                    'type' => 'category',
                    'sort_order' => 3,
                    'roles' => ['Human Resources Employee', 'Developer'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Holiday',
                        'href' => '/holidays',
                        'icon' => 'Users',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'ACS blog Admin',
                        'href' => '/admin/blog',
                        'icon' => 'ShipWheel',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Admin Documents',
                        'href' => '/folders',
                        'icon' => 'BookOpenText',
                        'sort_order' => 3,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Warehouse',
                    'href' => '#',
                    'icon' => 'Package',
                    'type' => 'category',
                    'sort_order' => 4,
                    'roles' => ['Warehouse Manager', 'Warehouse Employee', 'Developer', 'Engineer'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Product Picture Manager',
                        'href' => '/product-picture-manager',
                        'icon' => 'ImageUp',
                        'permissions' => ['Warehouse-Product Picture Manager'],
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Content & Documents',
                    'href' => '#',
                    'icon' => 'FileText',
                    'type' => 'category',
                    'sort_order' => 5,
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Company Documents',
                        'href' => '/employee/documents',
                        'icon' => 'BookOpenText',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Vibetrack',
                    'href' => '#',
                    'icon' => 'Activity',
                    'type' => 'category',
                    'sort_order' => 6,
                    'roles' => ['CEO', 'Developer', 'Engineer'],
                    'permissions' => ['Vibetrack-view'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Vibetrack',
                        'href' => '/vibetrack',
                        'icon' => 'Smartphone',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Vibetrack Admin',
                        'href' => '/vibetrack/admin',
                        'icon' => 'LayoutList',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Training & Learning',
                    'href' => '#',
                    'icon' => 'GraduationCap',
                    'type' => 'category',
                    'sort_order' => 7,
                    'roles' => ['Developer'],
                    'permissions' => ['Training-dashboard-view'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Training Dashboard',
                        'href' => '/old-style-training-tracking',
                        'icon' => 'BookOpenText',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Tools & Resources',
                    'href' => '#',
                    'icon' => 'Cog',
                    'type' => 'category',
                    'sort_order' => 8,
                    'roles' => ['Developer'],
                    'is_active' => true,
                ],
                'children' => [
                    // Add any tools & resources items here
                ]
            ],
        ];

        // Create categories and their children
        foreach ($categories as $categoryData) {
            $category = NavigationItem::create($categoryData['category']);

            foreach ($categoryData['children'] as $childData) {
                $childData['parent_id'] = $category->id;
                $childData['type'] = 'category';
                NavigationItem::create($childData);
            }
        }
    }
}
