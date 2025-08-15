<?php

use App\Http\Middleware\AuthKitAuthenticationRequest;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\WorkOS\Http\Requests\AuthKitLoginRequest;
use Laravel\WorkOS\Http\Requests\AuthKitLogoutRequest;

Route::get('login', function (AuthKitLoginRequest $request) {
    // Handle Inertia requests differently
    if ($request->header('X-Inertia')) {
        // Build the WorkOS URL manually using your config
        $clientId = config('workos.client_id') ?: env('WORKOS_CLIENT_ID');
        $redirectUri = config('workos.redirect_url') ?: env('WORKOS_REDIRECT_URL');
        $state = base64_encode(json_encode(['state' => \Illuminate\Support\Str::random(20)]));

        $workosUrl = "https://api.workos.com/user_management/authorize?" . http_build_query([
                'client_id' => $clientId,
                'response_type' => 'code',
                'redirect_uri' => $redirectUri,
                'state' => $state,
                'provider' => 'authkit'
            ]);

        return Inertia::location($workosUrl);
    }

    // For regular requests, redirect normally
    return $request->redirect();
})->middleware(['guest'])->name('login');

Route::get('authenticate', function (AuthKitAuthenticationRequest $request) {
    return tap(to_route('dashboard'), fn () => $request->authenticate());
})->middleware(['guest']);

Route::get('logout', function () {
    return '
    <!DOCTYPE html>
    <html>
    <head>
        <title>Logging Out...</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; background: #f5f5f5; }
            .logout-container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: inline-block; min-width: 300px; }
            .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
        <script>
            window.onload = function() { document.getElementById("logout-form").submit(); }
        </script>
    </head>
    <body>
        <div class="logout-container">
            <h2>Logging you out...</h2>
            <div class="spinner"></div>
            <p>Please wait while we securely log you out.</p>
        </div>
        <form id="logout-form" action="' . route('logout') . '" method="POST" style="display: none;">
            ' . csrf_field() . '
        </form>
    </body>
    </html>';
})->middleware(['auth'])->name('logout.form');

Route::post('logout', function (AuthKitLogoutRequest $request) {
    return $request->logout();
})->middleware(['auth'])->name('logout');
