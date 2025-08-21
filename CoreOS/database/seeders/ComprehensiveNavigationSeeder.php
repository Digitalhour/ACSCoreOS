<?php

namespace Database\Seeders;

use App\Models\NavigationItem;
use Illuminate\Database\Seeder;

class ComprehensiveNavigationSeeder extends Seeder
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
                'icon' => 'Clock',
                'type' => 'header',
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'title' => 'My PTO',
                'href' => '/employee/pto',
                'icon' => 'CalendarDays',
                'type' => 'header',
                'sort_order' => 4,
                'is_active' => true,
            ],
            [
                'title' => 'ACS Organization',
                'href' => '/organization-chart',
                'icon' => 'Users',
                'type' => 'header',
                'sort_order' => 5,
                'is_active' => true,
            ],
            [
                'title' => 'ACS Parts Database',
                'href' => '/parts-browse',
                'icon' => 'Database',
                'type' => 'header',
                'sort_order' => 6,
                'is_active' => true,
            ],
            [
                'title' => 'ACS Wiki',
                'href' => '/wiki',
                'icon' => 'BookOpen',
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
                'roles' => ['Human Resources Employees', 'Developer', 'CEO', 'COO'],
                'is_active' => true,
            ],
            [
                'title' => 'Admin Dashboard',
                'href' => '/admin',
                'icon' => 'ShieldCheck',
                'type' => 'footer',
                'sort_order' => 2,
                'roles' => ['Developer', 'CEO', 'COO'],
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
                    'title' => 'Time & Attendance',
                    'href' => '#',
                    'icon' => 'Clock',
                    'type' => 'category',
                    'sort_order' => 1,
                    'roles' => ['Developer', 'Human Resources Employees', 'CEO', 'COO'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Employee Time Clock',
                        'href' => '/time-clock/employee',
                        'icon' => 'Clock',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Manager Dashboard',
                        'href' => '/time-clock/manager/dashboard',
                        'icon' => 'Users',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Payroll Dashboard',
                        'href' => '/time-clock/payroll/dashboard',
                        'icon' => 'DollarSign',
                        'sort_order' => 3,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'PTO Management',
                    'href' => '#',
                    'icon' => 'CalendarDays',
                    'type' => 'category',
                    'sort_order' => 2,
                    'roles' => ['Developer', 'Human Resources Employees', 'CEO', 'COO'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'My PTO',
                        'href' => '/employee/pto',
                        'icon' => 'Calendar',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Department PTO',
                        'href' => '/department-pto',
                        'icon' => 'Users',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'PTO Calendar',
                        'href' => '/hr/pto-calendar',
                        'icon' => 'CalendarRange',
                        'sort_order' => 3,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'PTO Policies',
                        'href' => '/hr/pto-policies',
                        'icon' => 'FileText',
                        'sort_order' => 4,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'PTO Types',
                        'href' => '/hr/pto-types',
                        'icon' => 'Tags',
                        'sort_order' => 5,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'PTO Requests',
                        'href' => '/hr/time-off-requests',
                        'icon' => 'ClipboardList',
                        'sort_order' => 6,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Blackouts',
                        'href' => '/admin/blackouts',
                        'icon' => 'Ban',
                        'sort_order' => 7,
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
                    'roles' => ['Human Resources Employees', 'Developer', 'CEO', 'COO'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Employees',
                        'href' => '/hr/employees',
                        'icon' => 'Users',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'User Management',
                        'href' => '/user-management',
                        'icon' => 'UserPlus',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Onboard Employee',
                        'href' => '/user-management/onboard',
                        'icon' => 'UserCheck',
                        'sort_order' => 3,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Holidays',
                        'href' => '/holidays',
                        'icon' => 'Calendar',
                        'sort_order' => 4,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Departments',
                        'href' => '/departments',
                        'icon' => 'Building',
                        'sort_order' => 5,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Team Directory',
                        'href' => '/team',
                        'icon' => 'Users',
                        'sort_order' => 6,
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
                    'sort_order' => 4,
                    'roles' => ['Developer', 'Human Resources Employees', 'CEO', 'COO'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Training Modules',
                        'href' => '/training',
                        'icon' => 'BookOpen',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Training Dashboard',
                        'href' => '/old-style-training-tracking',
                        'icon' => 'BarChart',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Admin Modules',
                        'href' => '/admin/modules',
                        'icon' => 'Settings',
                        'sort_order' => 3,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Training Reports',
                        'href' => '/admin/reports',
                        'icon' => 'FileText',
                        'sort_order' => 4,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Student Progress',
                        'href' => '/admin/reports/student-progress',
                        'icon' => 'TrendingUp',
                        'sort_order' => 5,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Parts & Inventory',
                    'href' => '#',
                    'icon' => 'Package',
                    'type' => 'category',
                    'sort_order' => 5,
                    'roles' => ['Developer', 'Warehouse Manager', 'Warehouse Employees', 'Engineer'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Parts Browse',
                        'href' => '/parts-browse',
                        'icon' => 'Search',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Parts Upload',
                        'href' => '/parts/upload',
                        'icon' => 'Upload',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Parts Management',
                        'href' => '/parts',
                        'icon' => 'Package',
                        'sort_order' => 3,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Warehouse Operations',
                    'href' => '#',
                    'icon' => 'Warehouse',
                    'type' => 'category',
                    'sort_order' => 6,
                    'roles' => ['Warehouse Manager', 'Warehouse Employees', 'Developer', 'Engineer'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Container Expander',
                        'href' => '/warehouse/container-expander',
                        'icon' => 'Package',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Product Picture Manager',
                        'href' => '/product-picture-manager',
                        'icon' => 'Image',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Content Management',
                    'href' => '#',
                    'icon' => 'FileText',
                    'type' => 'category',
                    'sort_order' => 7,
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Wiki',
                        'href' => '/wiki',
                        'icon' => 'BookOpen',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Blog',
                        'href' => '/admin/blog',
                        'icon' => 'PenTool',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Company Documents',
                        'href' => '/employee/documents',
                        'icon' => 'Files',
                        'sort_order' => 3,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Document Folders',
                        'href' => '/folders',
                        'icon' => 'Folder',
                        'sort_order' => 4,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'AI & Automation',
                    'href' => '#',
                    'icon' => 'Bot',
                    'type' => 'category',
                    'sort_order' => 8,
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Billy AI Chat',
                        'href' => '/billy',
                        'icon' => 'MessageSquare',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Billy Conversations',
                        'href' => '/billy/conversations',
                        'icon' => 'MessageCircle',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Billy Feedback',
                        'href' => '/billy/feedback',
                        'icon' => 'ThumbsUp',
                        'sort_order' => 3,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Analytics & Tracking',
                    'href' => '#',
                    'icon' => 'BarChart',
                    'type' => 'category',
                    'sort_order' => 9,
                    'roles' => ['CEO', 'Developer', 'Engineer'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Vibetrack',
                        'href' => '/vibetrack',
                        'icon' => 'Activity',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Vibetrack Admin',
                        'href' => '/vibetrack/admin',
                        'icon' => 'Settings',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'System Administration',
                    'href' => '#',
                    'icon' => 'Settings',
                    'type' => 'category',
                    'sort_order' => 10,
                    'roles' => ['Developer', 'CEO', 'COO'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Access Control',
                        'href' => '/access-control',
                        'icon' => 'Shield',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Roles & Permissions',
                        'href' => '/roles-permissions',
                        'icon' => 'UserCheck',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'User Hierarchy',
                        'href' => '/admin/user-hierarchy',
                        'icon' => 'Sitemap',
                        'sort_order' => 3,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Activity Log',
                        'href' => '/dev-ops/activity-log',
                        'icon' => 'FileText',
                        'sort_order' => 4,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Navigation Management',
                        'href' => '/admin/navigation',
                        'icon' => 'Menu',
                        'sort_order' => 5,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Developer Tools',
                    'href' => '#',
                    'icon' => 'Code',
                    'type' => 'category',
                    'sort_order' => 11,
                    'roles' => ['Developer'],
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Data Management',
                        'href' => '/admin/data-management',
                        'icon' => 'Database',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'CSV Uploader',
                        'href' => '/admin/csv-uploader',
                        'icon' => 'Upload',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Queue Status',
                        'href' => '/queue-status',
                        'icon' => 'Clock',
                        'sort_order' => 3,
                        'is_active' => true,
                    ],
                ]
            ],
            [
                'category' => [
                    'title' => 'Personal Settings',
                    'href' => '#',
                    'icon' => 'User',
                    'type' => 'category',
                    'sort_order' => 12,
                    'is_active' => true,
                ],
                'children' => [
                    [
                        'title' => 'Emergency Contacts',
                        'href' => '/settings/emergency-contacts',
                        'icon' => 'Phone',
                        'sort_order' => 1,
                        'is_active' => true,
                    ],
                    [
                        'title' => 'Profile Settings',
                        'href' => '/profile',
                        'icon' => 'User',
                        'sort_order' => 2,
                        'is_active' => true,
                    ],
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

        $this->command->info('Comprehensive navigation created successfully!');
        $this->command->info('Total items created: ' . NavigationItem::count());
    }
}