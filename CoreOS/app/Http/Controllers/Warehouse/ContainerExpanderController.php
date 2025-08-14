<?php

namespace App\Http\Controllers\Warehouse;

use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ContainerExpanderController extends Controller
{
    public function index(): InertiaResponse
    {
        return Inertia::render('Warehouse/ContainerExpander');
    }

    public function upload(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'spreadsheet' => 'required|file|mimes:xlsx,xls|max:10240',
                'startRow' => 'required|integer|min:1',
            ]);

            $file = $request->file('spreadsheet');
            $startRow = $request->input('startRow', 1);

            $spreadsheetReader = IOFactory::load($file->getRealPath());
            $worksheet = $spreadsheetReader->getActiveSheet();

            $rowData = $worksheet->toArray();
            $headerRow = $rowData[$startRow - 1] ?? [];
            $columns = array_values(array_filter($headerRow, function($value) {
                return !is_null($value) && $value !== '';
            }));

            $highestRow = $worksheet->getHighestRow();
            $highestColumn = $worksheet->getHighestColumn();
            $sheetPreview = [];

            for ($row = 1; $row <= min(10, $highestRow); $row++) {
                $rowData = $worksheet->rangeToArray(
                    'A'.$row.':'.$highestColumn.$row,
                    null,
                    true,
                    true,
                    true
                );
                $sheetPreview[] = [
                    'row' => $row,
                    'data' => $rowData[$row] ?? []
                ];
            }

            $tempPath = $file->store('temp', 'local');

            return response()->json([
                'success' => true,
                'columns' => $columns,
                'sheetPreview' => $sheetPreview,
                'tempPath' => $tempPath
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error processing spreadsheet: '.$e->getMessage()
            ], 422);
        }
    }

    public function updateColumns(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'tempPath' => 'required|string',
                'startRow' => 'required|integer|min:1',
            ]);

            $tempPath = $request->input('tempPath');
            $startRow = $request->input('startRow');

            $fullPath = Storage::disk('local')->path($tempPath);
            if (!file_exists($fullPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Temporary file not found. Please upload the file again.'
                ], 404);
            }

            $spreadsheetReader = IOFactory::load($fullPath);
            $worksheet = $spreadsheetReader->getActiveSheet();

            $rowData = $worksheet->toArray();
            $headerRow = $rowData[$startRow - 1] ?? [];
            $columns = array_values(array_filter($headerRow, function($value) {
                return !is_null($value) && $value !== '';
            }));

            return response()->json([
                'success' => true,
                'columns' => $columns
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating columns: '.$e->getMessage()
            ], 422);
        }
    }

    public function expand(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'tempPath' => 'required|string',
                'startRow' => 'required|integer|min:1',
                'mappedColumns.container' => 'required|integer',
                'mappedColumns.part' => 'required|integer',
                'mappedColumns.quantity' => 'required|integer',
            ]);

            $tempPath = $request->input('tempPath');
            $startRow = $request->input('startRow');
            $mappedColumns = $request->input('mappedColumns');

            $fullPath = Storage::disk('local')->path($tempPath);
            if (!file_exists($fullPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Temporary file not found. Please upload the file again.'
                ], 404);
            }

            $spreadsheetReader = IOFactory::load($fullPath);
            $worksheet = $spreadsheetReader->getActiveSheet();
            $data = $worksheet->toArray();

            $data = array_slice($data, $startRow);

            $containerCol = $mappedColumns['container'];
            $partCol = $mappedColumns['part'];
            $quantityCol = $mappedColumns['quantity'];

            $expandedData = [];

            foreach ($data as $row) {
                if (!isset($row[$containerCol], $row[$partCol], $row[$quantityCol])) {
                    continue;
                }

                if (empty($row[$containerCol]) || empty($row[$partCol]) || empty($row[$quantityCol])) {
                    continue;
                }

                $containerNumbers = explode(',', $row[$containerCol]);

                foreach ($containerNumbers as $containerNumber) {
                    $containerNumber = trim($containerNumber);

                    if (strtolower($containerNumber) === 'stop' ||
                        strtolower($containerNumber) === 'remaining parts in previous order:') {
                        break 2;
                    }

                    if (strpos($containerNumber, '-') !== false) {
                        $rangeParts = explode('-', $containerNumber);
                        if (count($rangeParts) === 2) {
                            $start = (int)trim($rangeParts[0]);
                            $end = (int)trim($rangeParts[1]);
                            for ($i = $start; $i <= $end; $i++) {
                                $expandedData[] = [
                                    'container' => $i,
                                    'part' => $row[$partCol],
                                    'quantity' => $row[$quantityCol],
                                ];
                            }
                        }
                    } else {
                        if (is_numeric($containerNumber)) {
                            $expandedData[] = [
                                'container' => (int)$containerNumber,
                                'part' => $row[$partCol],
                                'quantity' => $row[$quantityCol],
                            ];
                        }
                    }
                }
            }

            session(['expanded_data' => $expandedData]);

            return response()->json([
                'success' => true,
                'expandedData' => $expandedData
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error expanding containers: '.$e->getMessage()
            ], 422);
        }
    }

    public function download()
    {
        $expandedData = session('expanded_data', []);

        if (empty($expandedData)) {
            abort(404, 'No data available to download. Please expand containers first.');
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Expanded Containers');

        $sheet->setCellValue('A1', 'Carton #');
        $sheet->setCellValue('B1', 'Part #');
        $sheet->setCellValue('C1', 'PCS Per Carton');

        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E2E8F0']
            ]
        ];
        $sheet->getStyle('A1:C1')->applyFromArray($headerStyle);

        $row = 2;
        foreach ($expandedData as $data) {
            $sheet->setCellValue('A' . $row, $data['container']);
            $sheet->setCellValue('B' . $row, $data['part']);
            $sheet->setCellValue('C' . $row, $data['quantity']);
            $row++;
        }

        $sheet->getColumnDimension('A')->setAutoSize(true);
        $sheet->getColumnDimension('B')->setAutoSize(true);
        $sheet->getColumnDimension('C')->setAutoSize(true);

        $writer = new Xlsx($spreadsheet);
        $filename = 'expanded_containers_' . now()->format('Y-m-d_H-i') . '.xlsx';
        $tempFile = tempnam(sys_get_temp_dir(), 'export_');

        $writer->save($tempFile);

        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ])->deleteFileAfterSend(true);
    }
}
