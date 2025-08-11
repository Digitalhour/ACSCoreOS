<?php


use App\Http\Controllers\ProductPictureManagerController;
use Illuminate\Support\Facades\Route;

Route::group(['middleware' => ['role_or_permission:Developer|Warehouse-Product Picture Manager']], function () {
        Route::prefix('product-picture-manager')->name('product-picture-manager')->group(function (
        ) {
            // Main page
            Route::get('/', [ProductPictureManagerController::class, 'index'])->name('index');

            // Search operations
            Route::get('/search-folders',
                [ProductPictureManagerController::class, 'searchFolders'])->name('search-folders');
            Route::get('/search-netsuite',
                [ProductPictureManagerController::class, 'searchNetSuite'])->name('search-netsuite');

            // Google Drive operations
            Route::get('/fetch-drive-images',
                [ProductPictureManagerController::class, 'fetchDriveImages'])->name('fetch-drive-images');
            Route::post('/delete-drive-image',
                [ProductPictureManagerController::class, 'deleteGoogleDriveImage'])->name('delete-drive-image');
            Route::post('/create-folders',
                [ProductPictureManagerController::class, 'createFolders'])->name('create-folders');

            // Image upload operations
            Route::post('/upload-images', [ProductPictureManagerController::class, 'uploadImages'])->name('upload-images');
            Route::post('/upload-processed-images',
                [ProductPictureManagerController::class, 'uploadProcessedImages'])->name('upload-processed-images');

            // Shopify operations
            Route::get('/shopify-images',
                [ProductPictureManagerController::class, 'getShopifyImages'])->name('shopify-images');
            Route::post('/delete-shopify-image',
                [ProductPictureManagerController::class, 'deleteShopifyImage'])->name('delete-shopify-image');
        });
        Route::get('/temp-image/{userId}/{filename}', function ($userId, $filename) {
            $path = storage_path('app/public/google_temp/' . $userId . '/' . $filename);

            if (!file_exists($path)) {
                abort(404);
            }

            return response()->file($path);
        })->where('filename', '.*');

        Route::get('/google/auth', function () {
            $client = new \Google\Client();
            $client->setClientId(config('services.google.client_id'));
            $client->setClientSecret(config('services.google.client_secret'));
            $client->setRedirectUri(config('services.google.redirect'));
            $client->setAccessType('offline');
            $client->setPrompt('consent');
            $client->addScope(\Google\Service\Drive::DRIVE);

            return redirect($client->createAuthUrl());
        })->name('google.auth');

        Route::get('/google/callback', function (Request $request) {
            $client = new \Google\Client();
            $client->setClientId(config('services.google.client_id'));
            $client->setClientSecret(config('services.google.client_secret'));
            $client->setRedirectUri(config('services.google.redirect'));

            $token = $client->fetchAccessTokenWithAuthCode($request->code);

            auth()->user()->update([
                'google_token' => $token['access_token'],
                'google_refresh_token' => $token['refresh_token'] ?? null,
            ]);

            return redirect('/product-picture-manager');
        })->name('google.callback');


});
