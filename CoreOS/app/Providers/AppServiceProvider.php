<?php

namespace App\Providers;

use App\Services\GoogleDriveService;
use App\Services\NetSuiteService;
use App\Services\ProductImageService;
use App\Services\RouteDiscoveryService;
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
        $this->app->singleton(RouteDiscoveryService::class);

        $this->app->singleton(\App\Services\PartsDataset\ShopifyService::class);
        $this->app->singleton(\App\Services\PartsDataset\S3ImageService::class);

        // Bind UploadProcessingService with both dependencies
        $this->app->singleton(\App\Services\PartsDataset\UploadProcessingService::class, function ($app) {
            return new \App\Services\PartsDataset\UploadProcessingService(
                $app->make(\App\Services\PartsDataset\ShopifyService::class),
                $app->make(\App\Services\PartsDataset\S3ImageService::class)
            );
        });

      

    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
