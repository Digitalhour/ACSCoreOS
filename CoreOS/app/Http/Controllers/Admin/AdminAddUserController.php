<?php

namespace App\Http\Controllers\Admin;

// Or your preferred namespace

use App\Http\Controllers\Controller;
use App\Models\Position;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

// Assuming you have a Position model

// For creating new users and listing potential managers

// For sending welcome emails (optional)
// use App\Mail\NewUserWelcomeMail; // You might create this Mailable

// For Spatie roles

class AdminAddUserController extends Controller
{


    /**
     * Display the form to add a new user.
     */
    public function create(): Response
    {
        // Ensure this controller action is protected by admin-only middleware in your routes.

        $positions = Position::orderBy('name')->get(['id', 'name']);
        // Exclude potential for self-reporting or circular reporting if necessary
        $potentialManagers = User::orderBy('name')->get(['id', 'name']);
        $spatieRoles = Role::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/AddUserPage', [ // Adjust path to your React component
            'positions' => $positions,
            'potentialManagers' => $potentialManagers,
            'spatieRoles' => $spatieRoles,
        ]);
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(Request $request): \Illuminate\Http\RedirectResponse
    {
        // Ensure this controller action is protected by admin-only middleware.
        $randomPassword = Str::random(16);
        $validatedData = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'position_id' => ['required', 'integer', 'exists:positions,id'],
            'reports_to_user_id' => ['nullable', 'integer', 'exists:users,id', Rule::notIn([$request->input('id')])],
            // Prevent self-reporting if editing
            'role_name' => ['required', 'string', Rule::exists('roles', 'name')],
        ]);

        $user = User::create([
            'name' => $validatedData['name'],
            'email' => $validatedData['email'],
            'password' => Hash::make($randomPassword),
            'position_id' => $validatedData['position_id'], // Assuming position_id is on users table
            'reports_to_user_id' => $validatedData['reports_to_user_id'],
            // Assuming reports_to_user_id is on users table
            // 'email_verified_at' => now(), // Optionally mark as verified, or send verification email
        ]);

        // Assign Spatie role
        $user->assignRole($validatedData['role_name']);

        // Optionally, send a welcome email with login details or a password reset link
        // You'll need to create NewUserWelcomeMail Mailable: php artisan make:mail NewUserWelcomeMail --markdown=emails.user.welcome
        // Mail::to($user->email)->send(new NewUserWelcomeMail($user, $validatedData['password'])); // Sending plain password is not recommended for prod

        return redirect()->route('admin.user-hierarchy.index') // Or a route showing list of users
        ->with('success', 'User added successfully.');
    }
}
