<?php

namespace App\Services\PartsDataset;

use PhpOffice\PhpSpreadsheet\Reader\IReadFilter;

/**
 * Custom read filter for chunk processing
 */
class ChunkReadFilter implements IReadFilter
{
    private int $startRow;
    private int $endRow;

    public function __construct(int $startRow, int $endRow)
    {
        $this->startRow = $startRow;
        $this->endRow = $endRow;
    }

    public function readCell(string $columnAddress, int $row, string $worksheetName = ''): bool
    {
        // Always read header row (row 1) to maintain structure
        if ($row === 1) {
            return true;
        }

        // Read only rows in our chunk range
        return ($row >= $this->startRow && $row <= $this->endRow);
    }
}
