<?php


// app/Services/PartsDataset/ManufacturerNormalizer.php

namespace App\Services\PartsDataset;

class ManufacturerNormalizer
{
    /**
     * Normalize manufacturer name - simple version
     * Replaces underscores with spaces and capitalizes words
     */
    public static function normalize(?string $manufacturer): ?string
    {
        if (empty($manufacturer)) {
            return null;
        }

        // Replace underscores with spaces and capitalize
        $normalized = str_replace('_', ' ', trim($manufacturer));
        $normalized = ucwords(strtolower($normalized));
        $normalized = preg_replace('/\s+/', ' ', $normalized);

        return trim($normalized);
    }
}
