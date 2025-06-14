<?php

namespace App\Providers;

use App\Services\GoogleDriveService;
use App\Services\NetSuiteService;
use App\Services\ProductImageService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(GoogleDriveService::class);
        $this->app->singleton(NetSuiteService::class);
        $this->app->singleton(ProductImageService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
