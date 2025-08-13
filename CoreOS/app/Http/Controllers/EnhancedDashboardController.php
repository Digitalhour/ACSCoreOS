<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class EnhancedDashboardController extends Controller
{
    protected $dataWarehouseConnection = 'acsdatawarehouse';

    public function index(Request $request)
    {
        try {
            $allTables = $this->getAllTablesFromWarehouse();
            $tableList = collect($allTables)->map(fn($t) => $t->table_name ?? $t->TABLE_NAME)->filter()->values();

            // Get table metadata for better UX
            $tablesWithMetadata = $this->getTablesWithMetadata($tableList);
        } catch (\Exception $e) {
            Log::error("Data Warehouse connection/listing failed: ".$e->getMessage());
            return Inertia::render('Dashboard/PowerBI', ['error' => 'Could not connect to the data Warehouse.']);
        }

        return Inertia::render('Dashboard/PowerBI', [
            'tables' => $tableList,
            'tablesMetadata' => $tablesWithMetadata,
        ]);
    }

    public function getTableDetails(Request $request)
    {
        $request->validate(['table' => 'required|string']);
        try {
            $columns = $this->getTableColumnsFromWarehouse($request->table);
            $rowCount = $this->getTableRowCount($request->table);

            return response()->json([
                'columns' => $columns,
                'rowCount' => $rowCount,
                'tableName' => $request->table
            ]);
        } catch (\Exception $e) {
            Log::error("Error getting table details for {$request->table}: ".$e->getMessage());
            return response()->json(['error' => 'Could not retrieve table details.'], 500);
        }
    }

    public function query(Request $request)
    {
        $type = $request->get('type', 'bar');

        // Enhanced validation for mixed table support
        if ($type === 'datatable') {
            $request->validate([
                'table' => 'required|string',
                'columns' => 'required|json',
                'filters' => 'nullable|json'
            ]);
        } else {
            $request->validate([
                'table' => 'required|string',
                'dimension' => 'string|nullable',
                'metric' => 'required|string',
                'aggregation' => 'required|in:sum,avg,count',
                'filters' => 'nullable|json'
            ]);
        }

        $table = $request->table;

        try {
            // Validate table exists and is allowed
            if (!$this->isTableAllowed($table)) {
                return response()->json(['error' => 'Table not found or access denied.'], 403);
            }

            $query = DB::connection($this->dataWarehouseConnection)->table($table);

            // Apply filters if provided
            if ($request->filters) {
                $filters = json_decode($request->filters, true);
                foreach ($filters as $column => $values) {
                    if (is_array($values) && !empty($values)) {
                        // Validate column exists in table
                        if ($this->columnExistsInTable($table, $column)) {
                            $query->whereIn($column, $values);
                        }
                    }
                }
            }

            // Handle different query types
            if ($type === 'datatable') {
                $columns = json_decode($request->columns, true);
                if (!is_array($columns) || empty($columns)) {
                    return response()->json(['error' => 'At least one column must be selected for the data table.'],
                        400);
                }

                // Validate all columns exist in the table
                $validColumns = $this->validateColumnsForTable($table, $columns);
                if (empty($validColumns)) {
                    return response()->json(['error' => 'No valid columns found.'], 400);
                }

                $data = $query->select($validColumns)->limit(2000)->get();

            } else {
                if (!$request->dimension) { // KPI
                    $metric = $request->metric;

                    // Validate metric column exists
                    if (!$this->columnExistsInTable($table, $metric)) {
                        return response()->json(['error' => 'Metric column not found.'], 400);
                    }

                    $aggregation = strtoupper($request->aggregation);
                    $result = $query->aggregate($aggregation, [$metric]);
                    $data = [['value' => $result]];

                } else { // Charts (bar, line, pie)
                    $dimension = $request->dimension;
                    $metric = $request->metric;

                    // Validate both columns exist
                    if (!$this->columnExistsInTable($table, $dimension) ||
                        !$this->columnExistsInTable($table, $metric)) {
                        return response()->json(['error' => 'Dimension or metric column not found.'], 400);
                    }

                    $aggregation = strtoupper($request->aggregation);

                    $quotedDimension = '`'.str_replace('`', '``', $dimension).'`';
                    $quotedMetric = '`'.str_replace('`', '``', $metric).'`';

                    $data = $query->select(DB::raw("{$quotedDimension} as dimension, {$aggregation}({$quotedMetric}) as value"))
                        ->groupBy(DB::raw($quotedDimension))
                        ->orderBy(DB::raw($quotedDimension))
                        ->limit(1000)
                        ->get();
                }
            }

            return response()->json($data);

        } catch (\Exception $e) {
            Log::error("Data query failed for table {$table}: ".$e->getMessage());
            return response()->json(['error' => 'The data query failed. Please check column selections and try again.'],
                500);
        }
    }

    public function getFilterOptions(Request $request)
    {
        $request->validate([
            'table' => 'required|string',
            'column' => 'required|string'
        ]);

        try {
            // Validate table and column exist
            if (!$this->isTableAllowed($request->table) ||
                !$this->columnExistsInTable($request->table, $request->column)) {
                return response()->json(['error' => 'Invalid table or column.'], 400);
            }

            $options = DB::connection($this->dataWarehouseConnection)
                ->table($request->table)
                ->select($request->column)
                ->distinct()
                ->orderBy($request->column)
                ->limit(500)
                ->pluck($request->column);

            return response()->json($options);
        } catch (\Exception $e) {
            Log::error("Error getting filter options: ".$e->getMessage());
            return response()->json(['error' => 'Could not get filter options.'], 500);
        }
    }

    // New endpoint for getting all available tables with metadata
    public function getAllTablesWithMetadata(Request $request)
    {
        try {
            $allTables = $this->getAllTablesFromWarehouse();
            $tableNames = collect($allTables)->map(fn($t) => $t->table_name ?? $t->TABLE_NAME)->filter();

            $tablesWithMetadata = $tableNames->map(function ($tableName) {
                try {
                    return [
                        'name' => $tableName,
                        'rowCount' => $this->getTableRowCount($tableName),
                        'columnCount' => count($this->getTableColumnsFromWarehouse($tableName)),
                        'lastUpdated' => null, // Could add this if available
                    ];
                } catch (\Exception $e) {
                    return [
                        'name' => $tableName,
                        'rowCount' => 0,
                        'columnCount' => 0,
                        'lastUpdated' => null,
                        'error' => 'Could not load metadata'
                    ];
                }
            });

            return response()->json($tablesWithMetadata);
        } catch (\Exception $e) {
            Log::error("Error getting tables metadata: ".$e->getMessage());
            return response()->json(['error' => 'Could not retrieve tables metadata.'], 500);
        }
    }

    // Private helper methods
    private function getAllTablesFromWarehouse()
    {
        $database = config("database.connections.{$this->dataWarehouseConnection}.database");
        return DB::connection($this->dataWarehouseConnection)->select(
            "SELECT table_name FROM information_schema.tables
             WHERE table_schema = ?
             AND table_type = 'BASE TABLE'
             AND table_name NOT IN ('migrations', 'password_resets', 'failed_jobs', 'personal_access_tokens', 'dashboards')
             ORDER BY table_name",
            [$database]
        );
    }

    private function getTableColumnsFromWarehouse($tableName)
    {
        return collect(Schema::connection($this->dataWarehouseConnection)->getColumnListing($tableName))
            ->map(function ($name) use ($tableName) {
                try {
                    $type = Schema::connection($this->dataWarehouseConnection)->getColumnType($tableName, $name);
                } catch (\Exception $e) {
                    $type = 'string';
                }
                return ['name' => $name, 'type' => $this->mapColumnType($type)];
            });
    }

    private function getTableRowCount($tableName)
    {
        try {
            return DB::connection($this->dataWarehouseConnection)
                ->table($tableName)
                ->count();
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getTablesWithMetadata($tableNames)
    {
        return $tableNames->map(function ($tableName) {
            try {
                return [
                    'name' => $tableName,
                    'rowCount' => $this->getTableRowCount($tableName),
                    'columnCount' => count($this->getTableColumnsFromWarehouse($tableName)),
                ];
            } catch (\Exception $e) {
                return [
                    'name' => $tableName,
                    'rowCount' => 0,
                    'columnCount' => 0,
                    'error' => true
                ];
            }
        });
    }

    private function isTableAllowed($tableName)
    {
        $allowedTables = collect($this->getAllTablesFromWarehouse())
            ->map(fn($t) => $t->table_name ?? $t->TABLE_NAME)
            ->filter();

        return $allowedTables->contains($tableName);
    }

    private function columnExistsInTable($tableName, $columnName)
    {
        try {
            $columns = Schema::connection($this->dataWarehouseConnection)->getColumnListing($tableName);
            return in_array($columnName, $columns);
        } catch (\Exception $e) {
            return false;
        }
    }

    private function validateColumnsForTable($tableName, $columns)
    {
        try {
            $tableColumns = Schema::connection($this->dataWarehouseConnection)->getColumnListing($tableName);
            return array_intersect($columns, $tableColumns);
        } catch (\Exception $e) {
            return [];
        }
    }

    private function mapColumnType(string $type): string
    {
        $type = strtolower($type);
        if (in_array($type,
            ['int', 'integer', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'double'])) {
            return 'numeric';
        }
        if (in_array($type, ['date', 'datetime', 'timestamp'])) {
            return 'date';
        }
        return 'text';
    }
}
