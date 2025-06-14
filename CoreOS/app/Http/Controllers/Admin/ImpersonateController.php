<?php

namespace App\Http\Controllers\Admin;


use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ImpersonateController extends Controller
{
    /**
     * Display the user impersonation page.
     */
    public function index()
    {
        // Get all users except the currently authenticated user
        $users = User::where('id', '!=', Auth::id())
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'avatar']);

        return Inertia::render('Admin/Impersonate/Index', [
            'users' => $users,
            'isImpersonating' => Auth::user()->isImpersonated(),
        ]);
    }
}
