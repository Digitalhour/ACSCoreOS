'use client';

import {router, usePage} from '@inertiajs/react'; // Import Inertia router and usePage
import {Calculator, CreditCard, FileCog, Settings, Shield, Smile, UploadCloud, User} from 'lucide-react'; // Added UploadCloud and Database
import * as React from 'react';

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';

export default function AdminCommandDialog() {
    const [open, setOpen] = React.useState(false);
    const { ziggy } = usePage().props as any; // For using route() helper

    // Keyboard shortcut to open/close the command dialog (Cmd+J or Ctrl+J)
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((prevOpen) => !prevOpen);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    // Function to navigate using Inertia router and close dialog
    const navigateTo = (routeName: string) => {
        if (ziggy.routes[routeName]) {
            router.visit(route(routeName));
            setOpen(false);
        } else {
            console.error(`Route [${routeName}] not found.`);
            // Optionally, show a toast notification for route not found
        }
    };

    // Specific navigation functions
    const goToRolesAndPermissions = () => navigateTo('roles-permissions.index'); // Assuming this is the correct route name
    const goToCsvUploader = () => navigateTo('csv.uploader');
    const goToDataManagement = () => navigateTo('data.management');
    const goToAddUser = () => navigateTo('adduser.create');
    const goToAdminDashboard = () => navigateTo('admin.dashboard');

    // Keyboard shortcut for Ctrl+P to navigate to Roles and Permissions
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'p' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                goToRolesAndPermissions();
            }
            // Example for other shortcuts if needed
            if (e.key.toLowerCase() === 'u' && (e.metaKey || e.ctrlKey)) {
                // Ctrl+U for Add User
                e.preventDefault();
                goToAddUser();
            }

            // if (e.key.toLowerCase() === 'm' && (e.metaKey || e.ctrlKey)) { // Ctrl+M for Data Management
            //     e.preventDefault();
            //     goToDataManagement();
            // }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    return (
        <>
            {/* Trigger for opening the dialog, e.g., a button in your sidebar or header */}
            {/* <Button onClick={() => setOpen(true)}>Open Command</Button> */}
            {/* Or, if you prefer the text hint:
            <p className="text-muted-foreground text-sm">
                Press{' '}
                <kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
                    <span className="text-xs">⌘</span>J
                </kbd>
            </p>
            */}
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Data Tools">
                        <CommandItem onSelect={goToAdminDashboard} value="csv-uploader">
                            <UploadCloud className="mr-2 h-4 w-4" />
                            <span>Devops Dash</span>
                            {/* <CommandShortcut>⌘U</CommandShortcut>  Example shortcut */}
                        </CommandItem>
                        <CommandItem onSelect={goToDataManagement} value="data-management">
                            <FileCog className="mr-2 h-4 w-4" /> {/* Changed icon for better distinction */}
                            <span>Data Management</span>
                            {/* <CommandShortcut>⌘M</CommandShortcut> Example shortcut */}
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Admin & Permissions">
                        <CommandItem onSelect={goToRolesAndPermissions} value="roles-permissions">
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Roles and Permissions</span>
                            <CommandShortcut>⌘P</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="User">
                        <CommandItem onSelect={goToAddUser} value="roles-permissions">
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Test</span>
                            <CommandShortcut>⌘P</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Suggestions">
                        <CommandItem value="search-emoji">
                            <Smile className="mr-2 h-4 w-4" />
                            <span>Search Emoji</span>
                        </CommandItem>
                        <CommandItem value="calculator">
                            <Calculator className="mr-2 h-4 w-4" />
                            <span>Calculator</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Settings">
                        <CommandItem value="profile" onSelect={() => navigateTo('profile.edit')}>
                            {' '}
                            {/* Assuming 'profile.edit' route */}
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                            {/* <CommandShortcut>⌘P</CommandShortcut> */}
                        </CommandItem>
                        <CommandItem value="billing">
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Billing</span>
                            {/* <CommandShortcut>⌘B</CommandShortcut> */}
                        </CommandItem>
                        <CommandItem value="settings">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                            {/* <CommandShortcut>⌘S</CommandShortcut> */}
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
