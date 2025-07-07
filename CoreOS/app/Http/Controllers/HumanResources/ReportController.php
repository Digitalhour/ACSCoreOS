<?php

namespace App\Http\Controllers\HumanResources;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\GradesResults;
use App\Models\Module;
use App\Models\Quiz;
use App\Models\Test;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index()
    {
        // Overall stats for dashboard
        $totalUsers = User::whereHas('enrollments')->count();
        $totalModules = Module::count();
        $totalEnrollments = Enrollment::count();
        $completedEnrollments = Enrollment::whereNotNull('completed_at')->count();

        // Recent activity
        $recentEnrollments = Enrollment::with(['user', 'module'])
            ->latest('enrolled_at')
            ->take(5)
            ->get();

        $recentCompletions = Enrollment::with(['user', 'module'])
            ->whereNotNull('completed_at')
            ->latest('completed_at')
            ->take(5)
            ->get();

        // Quiz/Test activity
        $totalQuizAttempts = GradesResults::where('gradeable_type', 'App\\Models\\Quiz')->count();
        $totalTestAttempts = GradesResults::where('gradeable_type', 'App\\Models\\Test')->count();

        // Top performing students
        $topStudents = User::withCount([
            'enrollments',
            'enrollments as completed_enrollments_count' => function ($query) {
                $query->whereNotNull('completed_at');
            }
        ])
            ->whereHas('enrollments')
            ->get()
            ->map(function ($user) {
                $user->completion_rate = $user->enrollments_count > 0
                    ? round(($user->completed_enrollments_count / $user->enrollments_count) * 100, 2)
                    : 0;
                return $user;
            })
            ->sortByDesc('completion_rate')
            ->take(5);

        // Module performance
        $modulePerformance = Module::withCount([
            'enrollments',
            'enrollments as completed_enrollments_count' => function ($query) {
                $query->whereNotNull('completed_at');
            }
        ])
            ->get()
            ->map(function ($module) {
                $module->completion_rate = $module->enrollments_count > 0
                    ? round(($module->completed_enrollments_count / $module->enrollments_count) * 100, 2)
                    : 0;
                return $module;
            })
            ->sortByDesc('completion_rate')
            ->take(5);

        return Inertia::render('human-resources/Training/Reports/Index', [
            'stats' => [
                'total_users' => $totalUsers,
                'total_modules' => $totalModules,
                'total_enrollments' => $totalEnrollments,
                'completed_enrollments' => $completedEnrollments,
                'completion_rate' => $totalEnrollments > 0 ? round(($completedEnrollments / $totalEnrollments) * 100, 2) : 0,
                'total_quiz_attempts' => $totalQuizAttempts,
                'total_test_attempts' => $totalTestAttempts,
            ],
            'recent_enrollments' => $recentEnrollments,
            'recent_completions' => $recentCompletions,
            'top_students' => $topStudents,
            'module_performance' => $modulePerformance,
        ]);
    }

    public function modules()
    {
        $moduleDescription = Module::all();
        $modules = Module::withCount([
            'enrollments',
            'lessons',
            'enrollments as completed_enrollments_count' => function ($query) {
                $query->whereNotNull('completed_at');
            }
        ])->get()->map(function ($module) {
            $module->completion_rate = $module->enrollments_count > 0
                ? round(($module->completed_enrollments_count / $module->enrollments_count) * 100, 2)
                : 0;
            return $module;
        });

        return Inertia::render('human-resources/Training/Reports/Modules', [
            'modules' => $modules,
            'description' => $moduleDescription,
        ]);
    }

    /**
     * Combined Students and Progress Report
     */
    public function combinedStudentsProgress(Request $request)
    {
        // Get all students with their basic stats
        $allStudents = User::count();
        $students = User::withCount([
            'enrollments',
            'enrollments as completed_enrollments_count' => function ($query) {
                $query->whereNotNull('completed_at');
            }
        ])
            ->whereHas('enrollments')
            ->get()
            ->map(function ($user) {
                // Calculate total time spent across all modules
                $totalTimeSpent = DB::table('progress_tracking')
                    ->where('user_id', $user->id)
                    ->where('trackable_type', 'App\\Models\\Lesson')
                    ->sum('time_spent');

                $user->completion_rate = $user->enrollments_count > 0
                    ? round(($user->completed_enrollments_count / $user->enrollments_count) * 100, 2)
                    : 0;

                $user->total_time_spent = round($totalTimeSpent / 60); // Convert to minutes

                // Add additional user information
                $user->department = $user->department ?? null;
                $user->position = $user->position ?? null;
                $user->phone = $user->phone ?? null;
                $user->location = $user->location ?? null;
                $user->hire_date = $user->hire_date ?? null;
                $user->manager = $user->manager ?? null;

                return $user;
            });

        // Get detailed progress data
        $moduleId = $request->get('module_id');
        $status = $request->get('status');
        $userId = $request->get('user_id');

        $progressQuery = Enrollment::with(['user', 'module'])
            ->select(['enrollments.*']);

        if ($moduleId) {
            $progressQuery->where('module_id', $moduleId);
        }

        if ($userId) {
            $progressQuery->where('user_id', $userId);
        }

        // Apply status filter
        if ($status) {
            switch ($status) {
                case 'completed':
                    $progressQuery->whereNotNull('completed_at');
                    break;
                case 'in_progress':
                    $progressQuery->whereNull('completed_at');
                    break;
                case 'not_started':
                    $progressQuery->whereNull('completed_at');
                    break;
            }
        }

        $enrollments = $progressQuery->get();

        $studentProgress = $enrollments->map(function($enrollment) {
            // Get total lessons in the module
            $totalLessons = $enrollment->module->lessons()->where('is_active', true)->count();

            // Get completed lessons using progress_tracking table
            $completedLessons = DB::table('progress_tracking')
                ->where('user_id', $enrollment->user_id)
                ->where('trackable_type', 'App\\Models\\Lesson')
                ->whereIn('trackable_id', $enrollment->module->lessons()->pluck('id'))
                ->where('completed', true)
                ->count();

            // Calculate progress percentage
            $progressPercentage = $totalLessons > 0 ? round(($completedLessons / $totalLessons) * 100) : 0;

            // Get quiz attempts for this user in this module's lessons
            $moduleQuizIds = DB::table('quizzes')
                ->join('lessons', 'lessons.id', '=', 'quizzes.lesson_id')
                ->where('lessons.module_id', $enrollment->module_id)
                ->pluck('quizzes.id');

            $quizAttempts = GradesResults::where('user_id', $enrollment->user_id)
                ->where('gradeable_type', 'App\\Models\\Quiz')
                ->whereIn('gradeable_id', $moduleQuizIds)
                ->count();

            // Get best test score for this module
            $testScore = GradesResults::where('user_id', $enrollment->user_id)
                ->where('gradeable_type', 'App\\Models\\Test')
                ->whereIn('gradeable_id', function($query) use ($enrollment) {
                    $query->select('id')
                        ->from('tests')
                        ->where('module_id', $enrollment->module_id);
                })
                ->max('score');

            // Get total time spent in minutes from progress_tracking
            $timeSpentSeconds = DB::table('progress_tracking')
                ->where('user_id', $enrollment->user_id)
                ->whereIn('trackable_id', function($query) use ($enrollment) {
                    $query->select('id')
                        ->from('lessons')
                        ->where('module_id', $enrollment->module_id);
                })
                ->where('trackable_type', 'App\\Models\\Lesson')
                ->sum('time_spent');

            $timeSpent = round($timeSpentSeconds / 60); // Convert to minutes

            return [
                'user' => [
                    'id' => $enrollment->user->id,
                    'name' => $enrollment->user->name,
                    'email' => $enrollment->user->email,
                    'avatar' => $enrollment->user->avatar,
                    'department' => $enrollment->user->department ?? null,
                    'position' => $enrollment->user->position ?? null,
                    'phone' => $enrollment->user->phone ?? null,
                    'location' => $enrollment->user->location ?? null,
                    'hire_date' => $enrollment->user->hire_date ?? null,
                    'manager' => $enrollment->user->manager ?? null,
                ],
                'module' => [
                    'id' => $enrollment->module->id,
                    'title' => $enrollment->module->title,
                    'description' => $enrollment->module->description
                ],
                'enrolled_at' => $enrollment->enrolled_at,
                'completed_at' => $enrollment->completed_at,
                'progress_percentage' => $progressPercentage,
                'lessons_completed' => $completedLessons,
                'total_lessons' => $totalLessons,
                'quiz_attempts' => $quizAttempts,
                'test_score' => $testScore,
                'time_spent' => $timeSpent
            ];
        });

        // Get all users who have enrollments for the filter dropdown
        $users = User::whereHas('enrollments')
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        // Get all modules for filter dropdown
        $modules = Module::select('id', 'title', 'description')->get();

        // Prepare chart data
        $chartData = [
            'completion_trends' => $this->getCompletionTrends(),
            'module_performance' => $this->getModulePerformance(),
            'student_activity' => $this->getStudentActivity(),
        ];

        return Inertia::render('human-resources/Training/Reports/CombinedStudentsProgress', [
            'students' => $students,
            'all_students' => $allStudents,
            'student_progress' => $studentProgress,
            'modules' => $modules,
            'users' => $users,
            'chart_data' => $chartData,
            'filters' => [
                'module_id' => $moduleId,
                'status' => $status,
                'user_id' => $userId
            ]
        ]);
    }

    /**
     * Get completion trends for charts
     */
    private function getCompletionTrends()
    {
        $trends = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $enrolled = Enrollment::whereMonth('enrolled_at', $month->month)
                ->whereYear('enrolled_at', $month->year)
                ->count();
            $completed = Enrollment::whereMonth('completed_at', $month->month)
                ->whereYear('completed_at', $month->year)
                ->count();

            $trends[] = [
                'month' => $month->format('M Y'),
                'enrolled' => $enrolled,
                'completed' => $completed
            ];
        }
        return $trends;
    }

    /**
     * Get module performance for charts
     */
    private function getModulePerformance()
    {
        return Module::withCount([
            'enrollments',
            'enrollments as completed_enrollments_count' => function ($query) {
                $query->whereNotNull('completed_at');
            }
        ])
            ->get()
            ->map(function ($module) {
                $completion_rate = $module->enrollments_count > 0
                    ? round(($module->completed_enrollments_count / $module->enrollments_count) * 100, 2)
                    : 0;

                return [
                    'module' => $module->title,
                    'completion_rate' => $completion_rate,
                    'students' => $module->enrollments_count
                ];
            })
            ->take(10);
    }

    /**
     * Get student activity for charts
     */
    private function getStudentActivity()
    {
        return User::withCount([
            'enrollments',
            'enrollments as completed_enrollments_count' => function ($query) {
                $query->whereNotNull('completed_at');
            }
        ])
            ->whereHas('enrollments')
            ->get()
            ->map(function ($user) {
                $totalTimeSpent = DB::table('progress_tracking')
                    ->where('user_id', $user->id)
                    ->where('trackable_type', 'App\\Models\\Lesson')
                    ->sum('time_spent');

                return [
                    'name' => $user->name,
                    'time_spent' => round($totalTimeSpent / 60), // Convert to minutes
                    'modules_completed' => $user->completed_enrollments_count
                ];
            })
            ->sortByDesc('time_spent')
            ->take(10);
    }

    /**
     * Legacy students method - now redirects to combined report
     */
    public function students()
    {
        return redirect()->route('admin.reports.combined-students-progress');
    }

    /**
     * Legacy progress method - now redirects to combined report
     */
    public function progress(Request $request)
    {
        return redirect()->route('admin.reports.combined-students-progress', $request->all());
    }

    /**
     * Get detailed student information
     */
    public function studentDetails(User $user)
    {
        $moduleProgress = $user->enrollments()->with('module')->get()->map(function($enrollment) {
            $totalLessons = $enrollment->module->lessons()->where('is_active', true)->count();
            $completedLessons = DB::table('progress_tracking')
                ->where('user_id', $enrollment->user_id)
                ->where('trackable_type', 'App\\Models\\Lesson')
                ->whereIn('trackable_id', $enrollment->module->lessons()->pluck('id'))
                ->where('completed', true)
                ->count();

            $timeSpentSeconds = DB::table('progress_tracking')
                ->where('user_id', $enrollment->user_id)
                ->whereIn('trackable_id', $enrollment->module->lessons()->pluck('id'))
                ->where('trackable_type', 'App\\Models\\Lesson')
                ->sum('time_spent');

            $timeSpent = round($timeSpentSeconds / 60); // Convert to minutes

            return [
                'id' => $enrollment->module->id,
                'title' => $enrollment->module->title,
                'description' => $enrollment->module->description,
                'thumbnail' => $enrollment->module->thumbnail_url,
                'progress_percentage' => $totalLessons > 0 ? round(($completedLessons / $totalLessons) * 100) : 0,
                'lessons_completed' => $completedLessons,
                'total_lessons' => $totalLessons,
                'time_spent' => $timeSpent,
                'enrolled_at' => $enrollment->enrolled_at,
                'completed_at' => $enrollment->completed_at,
            ];
        });

        // Get quiz attempts with safer relationship loading
        $quizAttempts = collect();
        $quizGrades = GradesResults::where('user_id', $user->id)
            ->where('gradeable_type', 'App\\Models\\Quiz')
            ->get();

        foreach ($quizGrades as $grade) {
            // Load the quiz directly
            $quiz = Quiz::find($grade->gradeable_id);
            if ($quiz && $quiz->lesson) {
                $quizAttempts->push([
                    'id' => $grade->id,
                    'quiz_title' => $quiz->title ?? 'Unknown Quiz',
                    'lesson_title' => $quiz->lesson->title ?? 'Unknown Lesson',
                    'score' => $grade->score,
                    'attempt_number' => $grade->attempt_number,
                    'completed_at' => $grade->completed_at,
                    'passed' => $grade->passed,
                ]);
            }
        }

        // Get test attempts with safer relationship loading
        $testAttempts = collect();
        $testGrades = GradesResults::where('user_id', $user->id)
            ->where('gradeable_type', 'App\\Models\\Test')
            ->get();

        foreach ($testGrades as $grade) {
            // Load the test directly
            $test = Test::find($grade->gradeable_id);
            if ($test && $test->module) {
                $testAttempts->push([
                    'id' => $grade->id,
                    'test_title' => $test->title ?? 'Unknown Test',
                    'module_title' => $test->module->title ?? 'Unknown Module',
                    'score' => $grade->score,
                    'attempt_number' => $grade->attempt_number,
                    'completed_at' => $grade->completed_at,
                    'passed' => $grade->passed,
                ]);
            }
        }

        // Get activity tracking
        $firstEnrollment = $user->enrollments()->min('enrolled_at');
        $lastActivity = DB::table('progress_tracking')
            ->where('user_id', $user->id)
            ->max('updated_at');

        // Calculate learning streak (simplified - days since last activity)
        $learningStreak = 0;
        if ($lastActivity) {
            $learningStreak = now()->diffInDays($lastActivity);
        }

        // Get performance trends (last 6 months)
        $performanceTrends = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $monthlyCompletions = $user->enrollments()
                ->whereMonth('completed_at', $month->month)
                ->whereYear('completed_at', $month->year)
                ->count();
            $monthlyEnrollments = $user->enrollments()
                ->whereMonth('enrolled_at', $month->month)
                ->whereYear('enrolled_at', $month->year)
                ->count();

            $completionRate = $monthlyEnrollments > 0 ? round(($monthlyCompletions / $monthlyEnrollments) * 100) : 0;

            $performanceTrends[] = [
                'month' => $month->format('M Y'),
                'completion_rate' => $completionRate
            ];
        }

        // Get quiz performance by module
        $quizPerformance = [];
        $moduleQuizData = DB::table('grades_results')
            ->join('quizzes', 'grades_results.gradeable_id', '=', 'quizzes.id')
            ->join('lessons', 'quizzes.lesson_id', '=', 'lessons.id')
            ->join('modules', 'lessons.module_id', '=', 'modules.id')
            ->where('grades_results.user_id', $user->id)
            ->where('grades_results.gradeable_type', 'App\\Models\\Quiz')
            ->select('modules.title as module_title', 'grades_results.score')
            ->get()
            ->groupBy('module_title');

        foreach ($moduleQuizData as $moduleTitle => $scores) {
            $averageScore = $scores->avg('score');
            $quizPerformance[] = [
                'module' => $moduleTitle,
                'average_score' => round($averageScore, 2)
            ];
        }

        return response()->json([
            'student' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'department' => $user->department ?? null,
                'position' => $user->position ?? null,
                'phone' => $user->phone ?? null,
                'location' => $user->location ?? null,
                'hire_date' => $user->hire_date ?? null,
                'manager' => $user->manager ?? null,
                'enrollments_count' => $user->enrollments()->count(),
                'completed_enrollments_count' => $user->enrollments()->whereNotNull('completed_at')->count(),
                'completion_rate' => $user->enrollments()->count() > 0
                    ? round(($user->enrollments()->whereNotNull('completed_at')->count() / $user->enrollments()->count()) * 100, 2)
                    : 0,
            ],
            'module_progress' => $moduleProgress,
            'quiz_attempts' => $quizAttempts,
            'test_attempts' => $testAttempts,
            'total_time_spent' => $moduleProgress->sum('time_spent'),
            'first_enrollment' => $firstEnrollment,
            'last_activity' => $lastActivity ?? $firstEnrollment,
            'learning_streak' => $learningStreak,
            'performance_trend' => $performanceTrends,
            'quiz_performance' => $quizPerformance,
        ]);
    }

    /**
     * Export combined report data to CSV
     */
    public function exportCombinedReport(Request $request)
    {
        // Get filtered data based on request parameters
        $moduleId = $request->get('module_id');
        $status = $request->get('status');
        $userId = $request->get('user_id');
        $reportType = $request->get('type', 'overview'); // 'overview' or 'progress'

        if ($reportType === 'progress') {
            // Export progress data
            $progressQuery = Enrollment::with(['user', 'module'])
                ->select(['enrollments.*']);

            if ($moduleId) {
                $progressQuery->where('module_id', $moduleId);
            }

            if ($userId) {
                $progressQuery->where('user_id', $userId);
            }

            if ($status) {
                switch ($status) {
                    case 'completed':
                        $progressQuery->whereNotNull('completed_at');
                        break;
                    case 'in_progress':
                        $progressQuery->whereNull('completed_at');
                        break;
                    case 'not_started':
                        $progressQuery->whereNull('completed_at');
                        break;
                }
            }

            $enrollments = $progressQuery->get();
            $data = [];

            foreach ($enrollments as $enrollment) {
                $totalLessons = $enrollment->module->lessons()->where('is_active', true)->count();
                $completedLessons = DB::table('progress_tracking')
                    ->where('user_id', $enrollment->user_id)
                    ->where('trackable_type', 'App\\Models\\Lesson')
                    ->whereIn('trackable_id', $enrollment->module->lessons()->pluck('id'))
                    ->where('completed', true)
                    ->count();

                $progressPercentage = $totalLessons > 0 ? round(($completedLessons / $totalLessons) * 100) : 0;

                $data[] = [
                    'Student Name' => $enrollment->user->name,
                    'Student Email' => $enrollment->user->email,
                    'Module Title' => $enrollment->module->title,
                    'Enrolled Date' => $enrollment->enrolled_at,
                    'Completed Date' => $enrollment->completed_at ?? 'Not Completed',
                    'Progress Percentage' => $progressPercentage . '%',
                    'Lessons Completed' => $completedLessons,
                    'Total Lessons' => $totalLessons,
                    'Status' => $enrollment->completed_at ? 'Completed' : ($progressPercentage > 0 ? 'In Progress' : 'Not Started'),
                ];
            }

            $filename = 'student_progress_report_' . date('Y-m-d_H-i-s') . '.csv';
        } else {
            // Export overview data
            $students = User::withCount([
                'enrollments',
                'enrollments as completed_enrollments_count' => function ($query) {
                    $query->whereNotNull('completed_at');
                }
            ])
                ->whereHas('enrollments')
                ->get()
                ->map(function ($user) {
                    $user->completion_rate = $user->enrollments_count > 0
                        ? round(($user->completed_enrollments_count / $user->enrollments_count) * 100, 2)
                        : 0;
                    return $user;
                });

            $data = [];
            foreach ($students as $student) {
                $data[] = [
                    'Name' => $student->name,
                    'Email' => $student->email,
                    'Total Enrollments' => $student->enrollments_count,
                    'Completed Enrollments' => $student->completed_enrollments_count,
                    'Completion Rate' => $student->completion_rate . '%',
                ];
            }

            $filename = 'student_overview_report_' . date('Y-m-d_H-i-s') . '.csv';
        }

        // Generate CSV response
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($data) {
            $file = fopen('php://output', 'w');

            // Add UTF-8 BOM for Excel compatibility
            fwrite($file, "\xEF\xBB\xBF");

            if (!empty($data)) {
                // Write headers
                fputcsv($file, array_keys($data[0]));

                // Write data rows
                foreach ($data as $row) {
                    fputcsv($file, $row);
                }
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
