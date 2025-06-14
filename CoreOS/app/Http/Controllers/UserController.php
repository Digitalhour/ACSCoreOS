<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;


class UserController extends Controller
{
    public function index(Request $request)
    {

        $users = User::all();

        return Inertia::render('Users', [
            'users' => $users,
        ]);
    }
    public function list(): JsonResponse
    {
        $users = User::select('id', 'name', 'email')->orderBy('name')->get();
        return response()->json($users);
    }
}
