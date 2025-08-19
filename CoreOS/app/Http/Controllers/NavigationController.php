<?php

namespace App\Http\Controllers;

use App\Models\NavigationItem;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class NavigationController extends Controller
{
    public function index()
    {
        // For admin interface, we want ALL items (active and inactive)
        // We'll manually build the relationships to avoid the active filtering
        $navigationItems = NavigationItem::with(['parent'])
            ->ordered()
            ->get();

        // Manually attach all children (active and inactive) to their parents
        $navigationItems->each(function ($item) use ($navigationItems) {
            $item->children = $navigationItems->where('parent_id', $item->id)->values();
        });

        // Group by type
        $groupedItems = $navigationItems->groupBy('type');

        $roles = Role::select('id', 'name', 'description')->orderBy('name')->get();
        $permissions = Permission::select('id', 'name', 'description')->orderBy('name')->get();

        // Available icons (you can expand this list)
        $availableIcons = [
            'Activity', 'BookOpenText', 'BotMessageSquareIcon', 'ChevronDown', 'ChevronRight',
            'Clock', 'Cog', 'DollarSign', 'FileText', 'GraduationCap', 'ImageUp',
            'LayoutDashboard', 'LayoutList', 'Package', 'ShieldCheck', 'ShipWheel',
            'Smartphone', 'Users', 'Home', 'Settings', 'Bell', 'Calendar', 'Mail',
            'Search', 'Plus', 'Minus', 'Edit', 'Trash', 'Save', 'Download', 'Upload'
        ];

        return Inertia::render('NavigationManagement', [
            'navigationItems' => $groupedItems,
            'roles' => $roles,
            'permissions' => $permissions,
            'availableIcons' => $availableIcons,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'href' => 'required|string|max:255',
            'icon' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:1000',
            'parent_id' => 'nullable|exists:navigation_items,id',
            'type' => 'required|in:header,category,footer',
            'sort_order' => 'required|integer|min:0',
            'is_active' => 'boolean',
            'roles' => 'nullable|array',
            'roles.*' => 'string|exists:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        // Convert empty arrays to null for storage
        $validated['roles'] = !empty($validated['roles']) ? $validated['roles'] : null;
        $validated['permissions'] = !empty($validated['permissions']) ? $validated['permissions'] : null;

        NavigationItem::create($validated);

        return redirect()->back()->with('success', 'Navigation item created successfully!');
    }

    public function update(Request $request, NavigationItem $navigationItem)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'href' => 'required|string|max:255',
            'icon' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:1000',
            'parent_id' => 'nullable|exists:navigation_items,id',
            'type' => 'required|in:header,category,footer',
            'sort_order' => 'required|integer|min:0',
            'is_active' => 'boolean',
            'roles' => 'nullable|array',
            'roles.*' => 'string|exists:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        // Prevent circular reference
        if ($validated['parent_id'] && $this->wouldCreateCircularReference($navigationItem->id, $validated['parent_id'])) {
            return redirect()->back()->with('error', 'Cannot set parent - would create circular reference!');
        }

        // Convert empty arrays to null for storage
        $validated['roles'] = !empty($validated['roles']) ? $validated['roles'] : null;
        $validated['permissions'] = !empty($validated['permissions']) ? $validated['permissions'] : null;

        $navigationItem->update($validated);

        return redirect()->back()->with('success', 'Navigation item updated successfully!');
    }

    public function destroy(NavigationItem $navigationItem)
    {
        // Check if item has children (including inactive ones)
        if (NavigationItem::where('parent_id', $navigationItem->id)->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete navigation item that has children!');
        }

        $navigationItem->delete();

        return redirect()->back()->with('success', 'Navigation item deleted successfully!');
    }

    public function updateOrder(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:navigation_items,id',
            'items.*.sort_order' => 'required|integer|min:0',
            'items.*.parent_id' => 'nullable|exists:navigation_items,id',
        ]);

        try {
            \DB::beginTransaction();

            foreach ($validated['items'] as $item) {
                NavigationItem::where('id', $item['id'])->update([
                    'sort_order' => $item['sort_order'],
                    'parent_id' => $item['parent_id'],
                ]);
            }

            \DB::commit();
            return redirect()->back()->with('success', 'Navigation order updated successfully!');

        } catch (\Exception $e) {
            \DB::rollback();
            return redirect()->back()->with('error', 'Failed to update navigation order: ' . $e->getMessage());
        }
    }

    public function toggleActive(NavigationItem $navigationItem)
    {
        $navigationItem->update([
            'is_active' => !$navigationItem->is_active
        ]);

        $status = $navigationItem->is_active ? 'activated' : 'deactivated';
        return redirect()->back()->with('success', "Navigation item {$status} successfully!");
    }

    /**
     * Get navigation data for the sidebar (this uses the filtered methods)
     */
    public function getNavigationData()
    {
        $user = auth()->user();

        $headerItems = NavigationItem::getNavigationStructure('header', $user);
        $categoryItems = NavigationItem::getNavigationStructure('category', $user);
        $footerItems = NavigationItem::getNavigationStructure('footer', $user);

        return response()->json([
            'header' => $headerItems,
            'categories' => $categoryItems,
            'footer' => $footerItems,
        ]);
    }

//    /**
//     * Seed navigation with current hardcoded values
//     */
//    public function seedNavigation()
//    {
//        try {
//            \DB::beginTransaction();
//
//            // Clear existing navigation
//            NavigationItem::truncate();
//
//            // Header Navigation Items
//            $headerItems = [
//                [
//                    'title' => 'Dashboard',
//                    'href' => '/dashboard',
//                    'icon' => 'LayoutDashboard',
//                    'type' => 'header',
//                    'sort_order' => 1,
//                    'is_active' => true,
//                ],
//                [
//                    'title' => 'Billy The AI',
//                    'href' => '/billy',
//                    'icon' => 'BotMessageSquareIcon',
//                    'type' => 'header',
//                    'sort_order' => 2,
//                    'is_active' => true,
//                ],
//                [
//                    'title' => 'My Time Clock',
//                    'href' => '/time-clock/employee',
//                    'icon' => 'BookOpenText',
//                    'type' => 'header',
//                    'sort_order' => 3,
//                    'is_active' => true,
//                ],
//                [
//                    'title' => 'My PTO',
//                    'href' => '/employee/pto',
//                    'icon' => 'ShipWheel',
//                    'type' => 'header',
//                    'sort_order' => 4,
//                    'is_active' => true,
//                ],
//                [
//                    'title' => 'ACS Org',
//                    'href' => '/organization-chart',
//                    'icon' => 'Users',
//                    'type' => 'header',
//                    'sort_order' => 5,
//                    'is_active' => true,
//                ],
//                [
//                    'title' => 'ACS Parts Database',
//                    'href' => '/parts-catalog',
//                    'icon' => 'Cog',
//                    'type' => 'header',
//                    'sort_order' => 6,
//                    'is_active' => true,
//                ],
//                [
//                    'title' => 'ACS Wiki',
//                    'href' => '/wiki',
//                    'icon' => 'BookOpenText',
//                    'type' => 'header',
//                    'sort_order' => 7,
//                    'is_active' => true,
//                ],
//            ];
//
//            // Create header items
//            foreach ($headerItems as $item) {
//                NavigationItem::create($item);
//            }
//
//            // Footer Navigation Items
//            $footerItems = [
//                [
//                    'title' => 'HR Dashboard',
//                    'href' => '/hr/dashboard',
//                    'icon' => 'Users',
//                    'type' => 'footer',
//                    'sort_order' => 1,
//                    'roles' => ['Human Resources Employees', 'Developer'],
//                    'is_active' => true,
//                ],
//                [
//                    'title' => 'Admin Dashboard',
//                    'href' => '/admin',
//                    'icon' => 'ShieldCheck',
//                    'type' => 'footer',
//                    'sort_order' => 2,
//                    'is_active' => true,
//                ],
//            ];
//
//            // Create footer items
//            foreach ($footerItems as $item) {
//                NavigationItem::create($item);
//            }
//
//            // Category Navigation Items with Children
//            $categories = [
//                [
//                    'category' => [
//                        'title' => 'Time PTO Management',
//                        'href' => '#',
//                        'icon' => 'Clock',
//                        'type' => 'category',
//                        'sort_order' => 1,
//                        'roles' => ['Developer'],
//                        'is_active' => true,
//                    ],
//                    'children' => [
//                        [
//                            'title' => 'Department PTO',
//                            'href' => '/department-pto',
//                            'icon' => 'Users',
//                            'sort_order' => 1,
//                            'is_active' => true,
//                        ],
//                        [
//                            'title' => 'Timesheet Manager Dash',
//                            'href' => '/time-clock/manager/dashboard',
//                            'icon' => 'BookOpenText',
//                            'sort_order' => 2,
//                            'is_active' => true,
//                        ],
//                    ]
//                ],
//                [
//                    'category' => [
//                        'title' => 'Time & PTO Payroll',
//                        'href' => '#',
//                        'icon' => 'DollarSign',
//                        'type' => 'category',
//                        'sort_order' => 2,
//                        'roles' => ['Developer'],
//                        'is_active' => true,
//                    ],
//                    'children' => [
//                        [
//                            'title' => 'Timesheet Payroll Dash',
//                            'href' => '/time-clock/payroll/dashboard',
//                            'icon' => 'BookOpenText',
//                            'sort_order' => 1,
//                            'is_active' => true,
//                        ],
//                    ]
//                ],
//                [
//                    'category' => [
//                        'title' => 'Human Resources',
//                        'href' => '#',
//                        'icon' => 'Users',
//                        'type' => 'category',
//                        'sort_order' => 3,
//                        'roles' => ['Human Resources Employees', 'Developer'],
//                        'is_active' => true,
//                    ],
//                    'children' => [
//                        [
//                            'title' => 'Holiday',
//                            'href' => '/holidays',
//                            'icon' => 'Users',
//                            'sort_order' => 1,
//                            'is_active' => true,
//                        ],
//                        [
//                            'title' => 'ACS blog Admin',
//                            'href' => '/admin/blog',
//                            'icon' => 'ShipWheel',
//                            'sort_order' => 2,
//                            'is_active' => true,
//                        ],
//                        [
//                            'title' => 'Admin Documents',
//                            'href' => '/folders',
//                            'icon' => 'BookOpenText',
//                            'sort_order' => 3,
//                            'is_active' => true,
//                        ],
//                    ]
//                ],
//                [
//                    'category' => [
//                        'title' => 'Warehouse',
//                        'href' => '#',
//                        'icon' => 'Package',
//                        'type' => 'category',
//                        'sort_order' => 4,
//                        'roles' => ['Warehouse Manager', 'Warehouse Employees', 'Developer', 'Engineer'],
//                        'is_active' => true,
//                    ],
//                    'children' => [
//                        [
//                            'title' => 'Product Picture Manager',
//                            'href' => '/product-picture-manager',
//                            'icon' => 'ImageUp',
//                            'permissions' => ['Warehouse-Product Picture Manager'],
//                            'sort_order' => 1,
//                            'is_active' => true,
//                        ],
//                    ]
//                ],
//                [
//                    'category' => [
//                        'title' => 'Content & Documents',
//                        'href' => '#',
//                        'icon' => 'FileText',
//                        'type' => 'category',
//                        'sort_order' => 5,
//                        'is_active' => true,
//                    ],
//                    'children' => [
//                        [
//                            'title' => 'Company Documents',
//                            'href' => '/employee/documents',
//                            'icon' => 'BookOpenText',
//                            'sort_order' => 1,
//                            'is_active' => true,
//                        ],
//                    ]
//                ],
//                [
//                    'category' => [
//                        'title' => 'Vibetrack',
//                        'href' => '#',
//                        'icon' => 'Activity',
//                        'type' => 'category',
//                        'sort_order' => 6,
//                        'roles' => ['CEO', 'Developer', 'Engineer'],
//                        'permissions' => ['Vibetrack-view'],
//                        'is_active' => true,
//                    ],
//                    'children' => [
//                        [
//                            'title' => 'Vibetrack',
//                            'href' => '/vibetrack',
//                            'icon' => 'Smartphone',
//                            'sort_order' => 1,
//                            'is_active' => true,
//                        ],
//                        [
//                            'title' => 'Vibetrack Admin',
//                            'href' => '/vibetrack/admin',
//                            'icon' => 'LayoutList',
//                            'sort_order' => 2,
//                            'is_active' => true,
//                        ],
//                    ]
//                ],
//                [
//                    'category' => [
//                        'title' => 'Training & Learning',
//                        'href' => '#',
//                        'icon' => 'GraduationCap',
//                        'type' => 'category',
//                        'sort_order' => 7,
//                        'roles' => ['Developer'],
//                        'permissions' => ['Training-dashboard-view'],
//                        'is_active' => true,
//                    ],
//                    'children' => [
//                        [
//                            'title' => 'Training Dashboard',
//                            'href' => '/old-style-training-tracking',
//                            'icon' => 'BookOpenText',
//                            'sort_order' => 1,
//                            'is_active' => true,
//                        ],
//                    ]
//                ],
//                [
//                    'category' => [
//                        'title' => 'Tools & Resources',
//                        'href' => '#',
//                        'icon' => 'Cog',
//                        'type' => 'category',
//                        'sort_order' => 8,
//                        'roles' => ['Developer'],
//                        'is_active' => true,
//                    ],
//                    'children' => [
//                        // Add any tools & resources items here
//                    ]
//                ],
//            ];
//
//            // Create categories and their children
//            foreach ($categories as $categoryData) {
//                $category = NavigationItem::create($categoryData['category']);
//
//                foreach ($categoryData['children'] as $childData) {
//                    $childData['parent_id'] = $category->id;
//                    $childData['type'] = 'category';
//                    NavigationItem::create($childData);
//                }
//            }
//
//            \DB::commit();
//            return redirect()->back()->with('success', 'Navigation seeded successfully!');
//
//        } catch (\Exception $e) {
//            \DB::rollback();
//            return redirect()->back()->with('error', 'Failed to seed navigation: ' . $e->getMessage());
//        }
//    }

    /**
     * Check if setting parent would create circular reference
     */
    private function wouldCreateCircularReference($itemId, $parentId): bool
    {
        $parent = NavigationItem::find($parentId);

        while ($parent) {
            if ($parent->id === $itemId) {
                return true;
            }
            $parent = $parent->parent;
        }

        return false;
    }
}
