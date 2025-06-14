<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\UpdateShopifyMatches;
use App\Models\Parts\PartInstance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminShopifyController extends Controller
{
    /**
     * Force update Shopify matches for all parts or specific criteria
     */
    public function forceUpdateMatches(Request $request)
    {
        $request->validate([
            'force_all' => 'boolean',
            'batch_id' => 'nullable|string',
            'batch_size' => 'integer|min:10|max:500'
        ]);

        $forceAll = $request->boolean('force_all', false);
        $batchId = $request->input('batch_id');
        $batchSize = $request->integer('batch_size', 100);

        try {
            // Get statistics before starting
            $stats = $this->getMatchingStats($batchId);

            Log::info('[AdminShopifyController] Manual Shopify matching triggered', [
                'force_all' => $forceAll,
                'batch_id' => $batchId,
                'batch_size' => $batchSize,
                'stats_before' => $stats,
                'user_id' => auth()->id()
            ]);

            // Dispatch the job
            UpdateShopifyMatches::dispatch($forceAll, $batchId, $batchSize);

            $message = $forceAll
                ? 'Force update job dispatched for all parts'
                : 'Update job dispatched for parts without Shopify IDs';

            if ($batchId) {
                $message .= " (batch: {$batchId})";
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'stats_before' => $stats,
                'job_dispatched' => true
            ]);

        } catch (\Exception $e) {
            Log::error('[AdminShopifyController] Failed to dispatch Shopify matching job', [
                'error' => $e->getMessage(),
                'force_all' => $forceAll,
                'batch_id' => $batchId,
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to start Shopify matching job: '.$e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current matching statistics
     */
    public function getMatchingStats(string $batchId = null)
    {
        try {
            $query = PartInstance::active();

            if ($batchId) {
                $query->where('import_batch_id', $batchId);
            }

            $totalParts = $query->count();
            $partsWithShopifyId = $query->whereNotNull('shopify_id')->count();
            $partsWithoutShopifyId = $totalParts - $partsWithShopifyId;
            $matchPercentage = $totalParts > 0 ? round(($partsWithShopifyId / $totalParts) * 100, 2) : 0;

            $stats = [
                'total_parts' => $totalParts,
                'parts_with_shopify_id' => $partsWithShopifyId,
                'parts_without_shopify_id' => $partsWithoutShopifyId,
                'match_percentage' => $matchPercentage,
                'batch_id' => $batchId
            ];

            return $stats;

        } catch (\Exception $e) {
            Log::error('[AdminShopifyController] Failed to get matching stats', [
                'error' => $e->getMessage(),
                'batch_id' => $batchId
            ]);

            return [
                'total_parts' => 0,
                'parts_with_shopify_id' => 0,
                'parts_without_shopify_id' => 0,
                'match_percentage' => 0,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * API endpoint to get current matching statistics
     */
    public function stats(Request $request)
    {
        $batchId = $request->input('batch_id');
        $stats = $this->getMatchingStats($batchId);

        return response()->json([
            'success' => true,
            'stats' => $stats
        ]);
    }

    /**
     * Get available batch IDs for filtering
     */
    public function getBatches()
    {
        try {
            $batches = PartInstance::active()
                ->select('import_batch_id')
                ->whereNotNull('import_batch_id')
                ->distinct()
                ->orderBy('import_batch_id', 'desc')
                ->limit(50)
                ->pluck('import_batch_id')
                ->values();

            return response()->json([
                'success' => true,
                'batches' => $batches
            ]);

        } catch (\Exception $e) {
            Log::error('[AdminShopifyController] Failed to get batches', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get batches: '.$e->getMessage(),
                'batches' => []
            ], 500);
        }
    }

    /**
     * Clear all Shopify IDs (for testing/reset purposes)
     */
    public function clearAllMatches(Request $request)
    {
        $request->validate([
            'confirm' => 'required|boolean|accepted',
            'batch_id' => 'nullable|string'
        ]);

        try {
            $query = PartInstance::active();

            if ($batchId = $request->input('batch_id')) {
                $query->where('import_batch_id', $batchId);
            }

            $affected = $query->whereNotNull('shopify_id')->update([
                'shopify_id' => null,
                'shopify_image_url' => null,
                'shopify_matched_at' => null,
                'shopify_match_attempts' => 0
            ]);

            Log::warning('[AdminShopifyController] Shopify IDs cleared', [
                'affected_rows' => $affected,
                'batch_id' => $batchId,
                'user_id' => auth()->id()
            ]);

            $message = $batchId
                ? "Cleared Shopify IDs for {$affected} parts in batch {$batchId}"
                : "Cleared Shopify IDs for {$affected} parts";

            return response()->json([
                'success' => true,
                'message' => $message,
                'affected_rows' => $affected
            ]);

        } catch (\Exception $e) {
            Log::error('[AdminShopifyController] Failed to clear Shopify IDs', [
                'error' => $e->getMessage(),
                'batch_id' => $request->input('batch_id'),
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to clear Shopify IDs: '.$e->getMessage()
            ], 500);
        }
    }
}
