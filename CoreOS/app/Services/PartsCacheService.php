<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class PartsCacheService
{

    /**
     * Get filter options with optimized queries
     */
    public function getFilterOptions(): array
    {
        // Use parallel queries for better performance
        $results = collect([
            'manufacturers' => $this->getManufacturersOptimized(),
            'categories' => $this->getCategoriesOptimized(),
            'models' => $this->getModelsOptimized(),
            'partTypes' => $this->getPartTypesOptimized(),
            'serials' => $this->getSerialsOptimized(),
        ]);

        return $results->toArray();
    }

    /**
     * Optimized manufacturers query using raw SQL for better performance
     */
    private function getManufacturersOptimized(): array
    {
        return DB::connection('parts_database')
            ->table('manufacturers')
            ->join('parts_instances', 'manufacturers.id', '=', 'parts_instances.manufacturer_id')
            ->where('parts_instances.is_active', true)
            ->distinct()
            ->orderBy('manufacturers.name')
            ->pluck('manufacturers.name')
            ->toArray();
    }

    private function getCategoriesOptimized(): array
    {
        return DB::connection('parts_database')
            ->table('part_categories')
            ->join('parts_instances', 'part_categories.id', '=', 'parts_instances.part_category_id')
            ->where('parts_instances.is_active', true)
            ->distinct()
            ->orderBy('part_categories.name')
            ->pluck('part_categories.name')
            ->toArray();
    }

    private function getModelsOptimized(): array
    {
        return DB::connection('parts_database')
            ->table('models')
            ->join('part_instance_models', 'models.id', '=', 'part_instance_models.model_id')
            ->join('parts_instances', 'part_instance_models.part_instance_id', '=', 'parts_instances.id')
            ->where('parts_instances.is_active', true)
            ->distinct()
            ->orderBy('models.name')
            ->pluck('models.name')
            ->toArray();
    }

    private function getPartTypesOptimized(): array
    {
        return DB::connection('parts_database')
            ->table('parts_instances')
            ->where('is_active', true)
            ->whereNotNull('part_type')
            ->where('part_type', '!=', '')
            ->distinct()
            ->orderBy('part_type')
            ->pluck('part_type')
            ->toArray();
    }

    private function getSerialsOptimized(): array
    {
        return DB::connection('parts_database')
            ->table('parts_instances')
            ->where('is_active', true)
            ->whereNotNull('manufacturer_serial')
            ->where('manufacturer_serial', '!=', '')
            ->distinct()
            ->orderBy('manufacturer_serial')
            ->limit(100)
            ->pluck('manufacturer_serial')
            ->toArray();
    }





}
