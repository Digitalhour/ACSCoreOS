<?php

namespace App\Http\Controllers\Admin;

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

        return Inertia::render('Admin/Reports/Index', [
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

        return Inertia::render('Admin/Reports/Modules', [
            'modules' => $modules,
            'description' => $moduleDescription,
        ]);
    }

    public function students()
    {
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
                $user->completion_rate = $user->enrollments_count > 0
                    ? round(($user->completed_enrollments_count / $user->enrollments_count) * 100, 2)
                    : 0;
                return $user;
            });

        return Inertia::render('Admin/Reports/Students', [
            'students' => $students,
            'all_students' => $allStudents,
        ]);
    }

    public function progress(Request $request)
    {
        $moduleId = $request->get('module_id');
        $status = $request->get('status');
        $userId = $request->get('user_id');

        $query = Enrollment::with(['user', 'module'])
            ->select([
                'enrollments.*'
            ]);

        if ($moduleId) {
            $query->where('module_id', $moduleId);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        // Apply status filter
        if ($status) {
            switch ($status) {
                case 'completed':
                    $query->whereNotNull('completed_at');
                    break;
                case 'in_progress':
                    $query->whereNull('completed_at');
                    // Add condition for some progress made
                    break;
                case 'not_started':
                    $query->whereNull('completed_at');
                    // Add condition for no progress made
                    break;
            }
        }

        $enrollments = $query->get();

        $students = $enrollments->map(function($enrollment) {
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
                    'email' => $enrollment->user->email
                ],
                'module' => [
                    'id' => $enrollment->module->id,
                    'title' => $enrollment->module->title
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

        return Inertia::render('Admin/Reports/Progress', [
            'students' => $students,
            'modules' => Module::select('id', 'title')->get(),
            'users' => $users,
            'filters' => [
                'module_id' => $moduleId,
                'status' => $status,
                'user_id' => $userId
            ]
        ]);
    }
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

        return response()->json([
            'student' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
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
        ]);
    }
}
