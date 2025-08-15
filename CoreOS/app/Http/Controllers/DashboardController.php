<?php

namespace App\Http\Controllers;

use App\Models\BlogArticle;
use App\Models\BreakType;
use App\Models\TimeClock;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function monthlySalesData(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);

        // Get sales data from all the lovely little tables
        $salesData = DB::connection('acsdatawarehouse')
            ->select("
                SELECT
                    DATE(combined_date) as date,
                    DAY(combined_date) as day,
                    SUM(COALESCE(sales_amount, 0)) as gross_sales,
                    SUM(COALESCE(return_amount, 0)) as returns,
                    SUM(COALESCE(cancelled_amount, 0)) as cancelled,
                    SUM(
                        COALESCE(sales_amount, 0) -
                        ABS(COALESCE(return_amount, 0)) -
                        COALESCE(cancelled_amount, 0)
                    ) as net_sales
                FROM (
                    -- Sales Orders (ADD)
                    SELECT
                        so.date as combined_date,
                        (so.amount - so.etail_tax_amount) as sales_amount,
                        0 as return_amount,
                        0 as cancelled_amount
                    FROM nssalesorder so
                    WHERE DATE(so.date) BETWEEN ? AND ?

                    UNION ALL

                    -- Return Orders (SUBTRACT from sales)
                    SELECT
                        ro.date_refunded as combined_date,
                        0 as sales_amount,
                        -(ro.amount - ro.tax_amount) as return_amount,
                        0 as cancelled_amount
                    FROM nsreturnorder ro
                    WHERE DATE(ro.date_refunded) BETWEEN ? AND ?
                    AND ro.order_status IN ('Closed', 'Refunded')

                    UNION ALL

                    -- Cancelled Order Lines (SUBTRACT from sales)
                    SELECT
                        col.cancelled_date as combined_date,
                        0 as sales_amount,
                        0 as return_amount,
                        (col.cancelled_qty * col.unit_sold_price) as cancelled_amount
                    FROM nscancelledorderlines col
                    WHERE DATE(col.cancelled_date) BETWEEN ? AND ?
                ) combined_sales
                GROUP BY DATE(combined_date), DAY(combined_date)
                ORDER BY date ASC
            ", [
                $startDate->format('Y-m-d'),
                $endDate->format('Y-m-d'),
                $startDate->format('Y-m-d'),
                $endDate->format('Y-m-d'),
                $startDate->format('Y-m-d'),
                $endDate->format('Y-m-d')
            ]);

        // Get target data for the current "NOW" month
        $targetData = DB::connection('acsdatawarehouse')
            ->select("
                SELECT
                    st.month_start_date,
                    st.target_amount,
                    DAY(LAST_DAY(st.month_start_date)) as days_in_month
                FROM salestargets st
                WHERE st.month_start_date = ?
            ", [
                $startDate->startOfMonth()->format('Y-m-d')
            ]);

        // Calculate daily goal amount
        $dailyTarget = 0;
        if (!empty($targetData)) {
            $monthlyTarget = $targetData[0]->target_amount;
            $daysInMonth = $targetData[0]->days_in_month;
            $dailyTarget = $monthlyTarget / $daysInMonth;
        }

        // Create complete dataset with all days in range
        $result = [];
        $current = $startDate->copy();

        while ($current <= $endDate) {
            $dayNumber = $current->day;

            // Find actual sales for this day
            $dayData = null;
            foreach ($salesData as $sale) {
                if ($sale->day == $dayNumber) {
                    $dayData = $sale;
                    break;
                }
            }

            // If no data for this day, use zeros
            if (!$dayData) {
                $dayData = (object)[
                    'gross_sales' => 0,
                    'returns' => 0,
                    'cancelled' => 0,
                    'net_sales' => 0
                ];
            }

            $result[] = [
                'day' => (string) $dayNumber,
                'grossSales' => (int) round($dayData->gross_sales),
                'returns' => (int) round(abs($dayData->returns)), // Make positive for display
                'cancelled' => (int) round($dayData->cancelled),
                'netSales' => (int) round($dayData->net_sales),
                'target' => (int) round($dailyTarget)
            ];

            $current->addDay();
        }

        return response()->json($result);
    }

    public function yearlySalesData(Request $request)
    {
        $year = $request->input('year', date('Y'));

        $salesData = DB::connection('acsdatawarehouse')
            ->select("
                SELECT
                    MONTH(combined_date) as month_number,
                    MONTHNAME(combined_date) as month_name,
                    SUM(
                        COALESCE(sales_amount, 0) +
                        COALESCE(return_amount, 0) -
                        COALESCE(cancelled_amount, 0)
                    ) as sales
                FROM (
                    -- Sales Orders
                    SELECT
                        so.date as combined_date,
                        (so.amount - so.etail_tax_amount) as sales_amount,
                        0 as return_amount,
                        0 as cancelled_amount
                    FROM nssalesorder so
                    WHERE YEAR(so.date) = ?

                    UNION ALL

                    -- Return Orders
                    SELECT
                        ro.date_refunded as combined_date,
                        0 as sales_amount,
                        (ro.amount - ro.tax_amount) as return_amount,
                        0 as cancelled_amount
                    FROM nsreturnorder ro
                    WHERE YEAR(ro.date_refunded) = ?
                    AND ro.order_status IN ('Closed', 'Refunded')

                    UNION ALL

                    -- Cancelled Order Lines
                    SELECT
                        col.cancelled_date as combined_date,
                        0 as sales_amount,
                        0 as return_amount,
                        (col.cancelled_qty * col.unit_sold_price) as cancelled_amount
                    FROM nscancelledorderlines col
                    WHERE YEAR(col.cancelled_date) = ?
                ) combined_sales
                GROUP BY MONTH(combined_date), MONTHNAME(combined_date)
                ORDER BY month_number ASC
            ", [$year, $year, $year]);


        $months = [
            1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
            5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Aug',
            9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dec'
        ];

        $result = [];
        foreach ($months as $monthNum => $monthAbbr) {
            $monthData = collect($salesData)->firstWhere('month_number', $monthNum);

            $result[] = [
                'month' => $monthAbbr,
                'sales' => (int) round($monthData->sales ?? 0),
                'repeatSales' => 0 // Repeat takes fcuking for ever!
            ];
        }

        return response()->json($result);
    }

    public function index()
    {
        $user = Auth::user();

        // Get your existing articles data
        $articles = BlogArticle::with(['user:id,name,email,avatar'])
            ->withCount('approvedComments')
            ->published()
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($article) {
                $articleArray = $article->toArray();
                $articleArray['featured_image'] = $article->featured_image
                    ? Storage::disk('s3')->temporaryUrl($article->featured_image, now()->addHours(24))
                    : null;
                return $articleArray;
            });
        // Add TimeClock data for the dashboard component
        $currentStatus = TimeClock::getUserCurrentStatus($user->id);
        $breakTypes = BreakType::active()->ordered()->get();

        return Inertia::render('dashboard', [
            'articles' => $articles,
            // Add these new props
            'currentStatus' => $currentStatus,
            'breakTypes' => $breakTypes,
            'User' => $user, // Make sure to pass the full user object
        ]);
    }


}
